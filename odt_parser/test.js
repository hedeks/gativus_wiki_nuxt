const { processOdmProject, processOdtFile } = require('./index.js');
const path = require('path');
const fs = require('fs');

// Пример использования (раскомментируйте нужное)

// ==========================================
// 1. Парсинг всего ODM-проекта (с авто-деплоем для Nuxt)
// ==========================================
const odmPath = path.join(__dirname, './files/книга GTOM.odm'); // Замените на реальный .odm файл
const tempOutputDir = path.join(__dirname, 'output');

// === Ваша полная автоматизация ===
const targetImagesDir = path.join(__dirname, '../public'); 
const targetMdFile = path.join(__dirname, '../content/courses/book-gtom.md');

if (fs.existsSync(odmPath)) {
    console.log(`=== Запуск парсинга ODM ===\nФайл: ${odmPath}`);
    
    processOdmProject(odmPath, tempOutputDir, {
        imagesDir: targetImagesDir, // Кидаем картинки прямо в папку public !
        imagesUrlPrefix: '/'        // В MD документе картинки будут как ![image](/Имя_файла.png)
    });

    console.log(`[+] Картинки успешно выгружены в ${targetImagesDir}`);

    // Перекладываем готовый Markdown прямиком в папку /content вашего сайта!
    const generatedMd = path.join(tempOutputDir, 'merged-master.md');
    if (fs.existsSync(generatedMd)) {
        fs.copyFileSync(generatedMd, targetMdFile);
        console.log(`[+] Маркдаун успешно доставлен в: ${targetMdFile}`);
        console.log(`[ГОТОВО] Можете заходить на сайт, курс обновлен!`);
    }

} else {
    console.log(`Файл ${odmPath} не найден. Измените путь в test.js на ваш реальный файл.`);
}

// ==========================================
// 2. Парсинг одиночного ODT-файла
// ==========================================
/*
const singleOdtPath = path.join(__dirname, 'single.odt');
if (fs.existsSync(singleOdtPath)) {
    console.log(`=== Запуск парсинга одиночного ODT ===`);
    processOdtFile(singleOdtPath, outputDir, 'my_prefix');
}
*/
