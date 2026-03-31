const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { DOMParser } = require('@xmldom/xmldom');

/**
 * Парсер ODT/ODM файлов
 */

function processOdmProject(odmPath, outputDir, options = {}) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const odmDir = path.dirname(odmPath);
  const zip = new AdmZip(odmPath);
  const contentXmlEntry = zip.getEntry("content.xml");
  
  if (!contentXmlEntry) {
    throw new Error('Not a valid ODM file: content.xml not found');
  }

  const xmlStr = contentXmlEntry.getData().toString('utf8');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  
  // Парсим тело мастер-документа, чтобы собрать "родные" заголовки
  const officeBodyList = doc.getElementsByTagName('office:text');
  if (!officeBodyList.length) return;
  const officeBody = officeBodyList[0];

  const tocMap = {};
  // Ищем оглавление, чтобы вытащить оттуда нумерацию (Глава X.)
  const tocs = doc.getElementsByTagName('text:table-of-content');
  for (let i = 0; i < tocs.length; i++) {
      // Ищем все параграфы (строки) внутри оглавления
      const pNodes = tocs[i].getElementsByTagName('text:p');
      for (let j = 0; j < pNodes.length; j++) {
          const line = extractTextContent(pNodes[j]);
          // Убираем номер страницы с конца
          const cleanedLine = line.replace(/[\d\s]+$/, '').trim();
          // Отрезаем префикс
          const titleWithoutChapter = cleanedLine.replace(/^Глава\s+\d+\.?\s*/i, '').trim();
          
          if (titleWithoutChapter && titleWithoutChapter !== cleanedLine) {
              // Нормализуем пробелы для надежного совпадения при поиске
              const normalizedTitle = titleWithoutChapter.replace(/\s+/g, ' ').toLowerCase();
              tocMap[normalizedTitle] = cleanedLine;
          }
      }
  }

  console.log("Словарь оглавления построен, записей:", Object.keys(tocMap).length);

  const context = { 
      odmDir, 
      outputDir, 
      tocMap,
      imagesDir: options.imagesDir || path.join(outputDir, 'images'),
      imagesUrlPrefix: options.imagesUrlPrefix || 'images/'
  };

  let mergedContent = '';
  // Проходим по всему дереву мастер-документа
  for (let i = 0; i < officeBody.childNodes.length; i++) {
     mergedContent += traverseOdmNode(officeBody.childNodes[i], context) + '\n';
  }

  // Очистка лишних переносов строк
  mergedContent = mergedContent.replace(/\n{3,}/g, '\n\n').trim();

  // Добавляем Frontmatter к сшитому мастер-файлу (чтобы его тоже можно было отображать как статью)
  const frontmatter = `---\ntitle: "Полный курс (мастер)"\nmeta: "master"\nmetaTitle: "Сшитый курс"\nname: "master-course"\ndescription: "Сшитый документ из ODM"\ncourseID: 2\nimgPath: "/hacker.jpg"\n---\n\n`;

  const mergedPath = path.join(outputDir, 'merged-master.md');
  fs.writeFileSync(mergedPath, frontmatter + mergedContent, 'utf8');
  console.log(`Успешно сшито: ${mergedPath}`);
}

// Специальная версия функции обхода дерева для ODM файлов.
function traverseOdmNode(node, context) {
  if (node.nodeType === 3) return node.nodeValue;
  if (node.nodeType !== 1) return '';

  const tagName = node.tagName;
  
  // Игнорируем вывод внутреннего оглавления документа
  if (tagName === 'text:table-of-content') {
      return '';
  }
  
  // Если это секция - ищем ссылку на встраиваемый ODT файл
  if (tagName === 'text:section') {
      const sourceNode = Array.from(node.childNodes).find(n => n.tagName === 'text:section-source');
      if (sourceNode) {
          const xlinkHref = sourceNode.getAttribute('xlink:href');
          if (xlinkHref && xlinkHref.endsWith('.odt')) {
              const decodedFile = decodeURIComponent(xlinkHref);
              const justFileName = path.basename(decodedFile);
              const fullOdtPath = path.join(context.odmDir, justFileName);
              const prefix = path.basename(decodedFile, '.odt');
              
              if (fs.existsSync(fullOdtPath)) {
                  console.log(`[ODM] Сшивание раздела ${xlinkHref}...`);
                  try {
                      // Запускаем парсер отдельного ODT с передачей context (для tocMap)
                      return '\n' + processOdtFile(fullOdtPath, context.outputDir, prefix, context) + '\n';
                  } catch (e) {
                      console.error(`Ошибка при сшивании ${xlinkHref}: ${e.message}`);
                      return '';
                  }
              } else {
                  console.error(`Файл под-главы не найден, пропускаем: ${fullOdtPath}`);
              }
          }
      }
  }

  let childrenResult = '';
  for (let i = 0; i < node.childNodes.length; i++) {
     childrenResult += traverseOdmNode(node.childNodes[i], context);
  }

  switch(tagName) {
    case 'text:h': { // Мастер-документ может содержать собственные заголовки
      const outlineLevel = node.getAttribute('text:outline-level') || '1';
      const level = Math.min(parseInt(outlineLevel, 10), 6);
      let headerText = childrenResult.trim();
      
      if (!headerText) return ''; // Убираем пустые #, которые образуются из-за невидимых заголовков

      let lookup = headerText.replace(/\s+/g, ' ').toLowerCase();
      if (context.tocMap && context.tocMap[lookup]) {
          headerText = context.tocMap[lookup];
      }
      return `\n${'#'.repeat(level)} ${headerText}\n\n`;
    }
    case 'text:p': return `\n${childrenResult}\n`;
    case 'text:list': return `\n${childrenResult}\n`;
    case 'text:list-item': return `- ${childrenResult.replace(/^\s+|\s+$/g, '')}\n`;
    case 'text:span': return childrenResult;
    default:
      if (tagName && tagName.startsWith('table:')) return childrenResult;
      if (tagName && tagName.startsWith('text:')) return childrenResult;
      return childrenResult;
  }
}

function processOdtFile(odtPath, outputDir, filePrefix, context = {}) {
  const imagesDir = context.imagesDir || path.join(outputDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const zip = new AdmZip(odtPath);
  
  // Извлечение картинок
  const zipEntries = zip.getEntries();
  zipEntries.forEach(entry => {
    if (entry.entryName.startsWith('Pictures/') && !entry.isDirectory) {
      const originalName = path.basename(entry.entryName);
      const newName = `${filePrefix}_${originalName}`;
      const targetPath = path.join(imagesDir, newName);
      fs.writeFileSync(targetPath, entry.getData());
    }
  });

  const contentXmlEntry = zip.getEntry("content.xml");
  if (!contentXmlEntry) return "";
  
  const xmlStr = contentXmlEntry.getData().toString('utf8');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  // Парсинг тела документа (office:body -> office:text)
  const officeBodyList = doc.getElementsByTagName('office:text');
  if (!officeBodyList.length) return "";
  const officeBody = officeBodyList[0];

  let mdContent = '';
  for (let i = 0; i < officeBody.childNodes.length; i++) {
     mdContent += traverseNode(officeBody.childNodes[i], filePrefix, 0, context) + '\n';
  }

  // Удаляем дублирующиеся пустые строки для чистоты маркдауна
  mdContent = mdContent.replace(/\n{3,}/g, '\n\n').trim();

  // Генерируем YAML Frontmatter для Gatsby/Next.js/Markdown парсеров
  // Конвертируем имя файла в slug (например: Глава 1 -> glava-1, или просто убираем пробелы)
  const slug = filePrefix.toLowerCase().replace(/[\s_]+/g, '-');
  const frontmatter = `---
title: "${filePrefix}"
meta: "${slug}"
metaTitle: "${filePrefix}"
name: "${slug}"
description: ""
courseID: 1
imgPath: "/hacker.jpg"
---\n\n`;

  const outputPath = path.join(outputDir, `${filePrefix}.md`);
  fs.writeFileSync(outputPath, frontmatter + mdContent, 'utf8');

  return mdContent;
}

function traverseNode(node, filePrefix, indentLevel = 0, context = {}) {
  if (node.nodeType === 3) { // Text node
    return node.nodeValue;
  }

  if (node.nodeType !== 1) return ''; // Игнорируем не элементы (например атрибуты, комментарии)

  const tagName = node.tagName;
  
  if (tagName === 'text:table-of-content') {
      return ''; // Игнорируем вывод внутреннего оглавления
  }

  let childrenResult = '';
  
  for (let i = 0; i < node.childNodes.length; i++) {
     childrenResult += traverseNode(node.childNodes[i], filePrefix, indentLevel, context);
  }

  switch(tagName) {
    case 'text:h': { // Заголовки (H1-H6)
      const outlineLevel = node.getAttribute('text:outline-level') || '1';
      // Сдвигаем на 1 уровень вниз (H1 -> H2), чтобы Nuxt Content видел их в TOC
      const level = Math.min(parseInt(outlineLevel, 10) + 1, 6);
      let headerText = childrenResult.trim();
      
      if (!headerText) return ''; // Убираем пустые #, если заголовок был пустой в ODT
      
      let lookup = headerText.replace(/\s+/g, ' ').toLowerCase();
      if (context.tocMap && context.tocMap[lookup]) {
          headerText = context.tocMap[lookup];
      }
      return `\n${'#'.repeat(level)} ${headerText}\n\n`;
    }
    case 'text:p': { // Параграфы
      return `\n${childrenResult}\n`;
    }
    case 'text:list': { // Списки
      return `\n${childrenResult}\n`;
    }
    case 'text:list-item': { // Элемент списка
      const indent = '  '.repeat(indentLevel);
      // Для простоты пока выводим маркером "- " (bullet point)
      // В будущем можно расширить для нумерованных списков
      return `${indent}- ${childrenResult.replace(/^\s+|\s+$/g, '')}\n`;
    }
    case 'text:span': {
      // Игнорируем сложные стили (bold, italic) в первой версии, 
      // так как ODT прячет их в теги <style:style> в начале XML-файла.
      return childrenResult;
    }
    case 'draw:frame': 
    case 'draw:image': {
      // Извлечение картинок
      // Проверяем как полное имя с префиксом, так и localName
      let src = node.getAttribute('xlink:href') || node.getAttribute('href');
      
      // Иногда draw:image лежит внутри draw:frame
      if (!src && (tagName === 'draw:frame' || node.localName === 'frame')) {
         const imgNode = Array.from(node.childNodes).find(n => n.nodeType === 1 && (n.tagName === 'draw:image' || n.localName === 'image'));
         if (imgNode) {
             src = imgNode.getAttribute('xlink:href') || imgNode.getAttribute('href');
         } else {
             // Если картинки нет, пробуем сконвертировать векторные данные в SVG
             const width = node.getAttribute('svg:width');
             const height = node.getAttribute('svg:height');
             const svg = convertDrawToSvg(node, width, height);
             if (svg) return `\n\n${svg}\n\n`;
         }
      }

      if (src) {
        // Декодируем путь (иногда там могут быть %20)
        const decodedSrc = decodeURIComponent(src);
        if (decodedSrc.startsWith('Pictures/')) {
          const originalName = path.basename(decodedSrc);
          const newName = `${filePrefix}_${originalName}`;
          const prefix = context.imagesUrlPrefix || 'images/';
          return `\n![image](${prefix}${newName})\n`;
        }
      }
      return '';
    }
    case 'table:table': { // Таблицы
      let tableMd = '\n';
      const rows = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.tagName === 'table:table-row') {
          rows.push(child);
        }
      }

      if (rows.length === 0) return '';

      // Извлечение данных из ячеек
      const parsedRows = rows.map(row => {
        const cells = [];
        for (let j = 0; j < row.childNodes.length; j++) {
           const cell = row.childNodes[j];
           if (cell.tagName === 'table:table-cell' || cell.tagName === 'table:covered-table-cell') {
              // Для таблицы достаем чистый текст, заменяя переносы строк <br>
              // чтобы таблица не сломалась в маркдауне
              const cellText = extractTextContent(cell).trim().replace(/\n/g, '<br>');
              cells.push(cellText);
           }
        }
        return cells;
      });

      if (parsedRows.length === 0) return '';

      const colsCount = Math.max(...parsedRows.map(r => r.length));
      
      // Генерация заголовка (Header) — Markdown требует обязательный заголовок для рендеринга
      const headerRow = parsedRows[0];
      tableMd += '| ' + Array(colsCount).fill(0).map((_, i) => headerRow[i] || ' ').join(' | ') + ' |\n';
      tableMd += '| ' + Array(colsCount).fill('---').join(' | ') + ' |\n';

      // Генерация тела таблицы
      for (let r = 1; r < parsedRows.length; r++) {
         const row = parsedRows[r];
         tableMd += '| ' + Array(colsCount).fill(0).map((_, i) => row[i] || ' ').join(' | ') + ' |\n';
      }
      
      return tableMd + '\n';
    }
    default:
      if (tagName && tagName.startsWith('table:')) return childrenResult; // пропускаем внутренности таблиц (table:table-column и тд)
      if (tagName && tagName.startsWith('text:')) return childrenResult; // Прочие текстовые элементы
      
      return childrenResult;
  }
}

// Конвертирует векторные объекты draw:* в SVG код
function convertDrawToSvg(frameNode, widthStr, heightStr) {
  // Конвертация см/мм в пиксели (1см = 37.8px)
  const toPx = (val) => {
    if (!val) return 0;
    const num = parseFloat(val);
    if (val.includes('cm')) return Math.round(num * 37.8);
    if (val.includes('mm')) return Math.round(num * 3.78);
    if (val.includes('in')) return Math.round(num * 96);
    return Math.round(num);
  };

  const w = toPx(widthStr) || 300;
  const h = toPx(heightStr) || 200;
  
  let shapesSvg = '';
  
  // Ищем вложенные фигуры (rect, custom-shape и т.д.)
  const children = Array.from(frameNode.childNodes).filter(n => n.nodeType === 1);
  children.forEach(child => {
    const localName = child.localName || child.tagName.split(':').pop();
    
    if (localName === 'custom-shape') {
      const path = child.getAttribute('draw:enhanced-path');
      if (path) {
          // Отрезаем специфичные для ODT префиксы у пути (например "M" или команды)
          // В простейшем случае ODT path совпадает с SVG path
          shapesSvg += `<path d="${path}" fill="rgba(63, 63, 70, 0.2)" stroke="currentColor" stroke-width="1" />`;
      }
    } else if (localName === 'rect') {
      shapesSvg += `<rect width="100%" height="100%" fill="rgba(63, 63, 70, 0.2)" stroke="currentColor" stroke-width="1" />`;
    }
  });

  if (!shapesSvg) return null;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="mx-auto my-8 dark:text-zinc-400 text-zinc-600 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900/50 shadow-sm">${shapesSvg}</svg>`;
}

// Рекурсивно собирает только сырой текст, минуя все теги (полезно для таблиц)
function extractTextContent(node) {
  if (node.nodeType === 3) return node.nodeValue;
  if (!node.childNodes) return '';
  let res = '';
  for (let i = 0; i < node.childNodes.length; i++) {
     res += extractTextContent(node.childNodes[i]);
  }
  return res;
}

module.exports = {
  processOdmProject,
  processOdtFile
};
