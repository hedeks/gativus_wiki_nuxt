/**
 * Утилита переиндексации заголовков ODT в HTML.
 * Находит <span class="odt-heading-marker"> и переставляет нумерацию:
 *   - Уровень 1: «Глава N» / «Chapter N» / «第N章» / просто «N» → заменяет N на chapterStart
 *   - Подуровни: «N.M», «N.M.K» → заменяет первый сегмент на chapterStart
 */

export type HeadingLocale = 'ru' | 'en' | 'zh' | 'none'

/** Паттерны для детектирования уровня 1 (любой из поддерживаемых локалей или просто цифра). */
const LEVEL1_PATTERNS: RegExp[] = [
  /^Глава\s+\d+$/,
  /^Chapter\s+\d+$/,
  /^第\d+章$/,
  /^\d+$/, // просто число (locale=none)
]

const SUBLEVEL_RE = /^(\d+)([^\d]+\d+.*)$/

function formatLevel1(n: number, locale: HeadingLocale): string {
  if (locale === 'none') return `${n}`
  if (locale === 'en') return `Chapter ${n}`
  if (locale === 'zh') return `第${n}章`
  return `Глава ${n}`
}

function isLevel1(text: string): boolean {
  return LEVEL1_PATTERNS.some(p => p.test(text))
}

/**
 * Переиндексирует все odt-heading-marker в переданном HTML.
 * @param html         Исходный HTML
 * @param chapterStart Новый стартовый номер главы (уровень 1)
 * @param locale       Язык / формат подписи первого уровня ('none' = только цифра)
 * @returns            { html: string; changed: number }
 */
export function reindexHeadingMarkers(
  html: string,
  chapterStart: number,
  locale: HeadingLocale,
): { html: string; changed: number } {
  if (!html) return { html, changed: 0 }

  let changed = 0

  const result = html.replace(
    /<span class="odt-heading-marker">([^<]*)<\/span>/g,
    (_match, raw: string) => {
      // Preserve original leading and trailing spaces inside the span tag
      const leadingSpaceMatch = raw.match(/^\s+/)
      const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : ''

      const trailingSpaceMatch = raw.match(/\s+$/)
      const trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : ''

      const text = raw.trim()

      // Extract trailing separators (dots, colons)
      const sepMatch = text.match(/[\.:]+$/)
      const separator = sepMatch ? sepMatch[0] : ''
      const cleanText = separator ? text.slice(0, -separator.length).trim() : text

      if (isLevel1(cleanText)) {
        changed++
        const replacement = `${formatLevel1(chapterStart, locale)}${separator}`
        return `<span class="odt-heading-marker">${leadingSpace}${replacement}${trailingSpace}</span>`
      }

      const sub = SUBLEVEL_RE.exec(cleanText)
      if (sub) {
        changed++
        const rest = sub[2]
        const replacement = `${chapterStart}${rest}${separator}`
        return `<span class="odt-heading-marker">${leadingSpace}${replacement}${trailingSpace}</span>`
      }

      return _match
    },
  )

  return { html: result, changed }
}

/**
 * Автоматически нумерует все заголовки h2-h6 с нуля на основе их вложенности.
 * Удаляет старые odt-heading-marker и ручные номера перед вставкой.
 */
export function autoIndexHeadings(
  html: string,
  chapterStart: number,
  locale: HeadingLocale,
): { html: string; changed: number } {
  if (!html) return { html, changed: 0 }

  let changed = 0
  const counters = [0, 0, 0, 0, 0, 0] // 0=h1(skip), 1=h2, 2=h3...

  const result = html.replace(
    /(<h([2-6])[^>]*>)(.*?)(<\/h\2>)/gis,
    (match, openTag: string, levelStr: string, innerHtml: string, closeTag: string) => {
      const level = parseInt(levelStr, 10)
      const depth = level - 1 // h2 -> 1, h3 -> 2

      // Увеличиваем счетчик текущего уровня
      counters[depth] = (counters[depth] || 0) + 1
      // Обнуляем все вложенные
      for (let i = depth + 1; i < counters.length; i++) {
        counters[i] = 0
      }

      // Генерируем номер
      let markerText = ''
      if (depth === 1) {
        // h2 (Первый уровень в статье)
        const actualChapter = chapterStart + counters[1] - 1
        markerText = `${formatLevel1(actualChapter, locale)}. `
      } else {
        // h3, h4 и глубже
        const actualChapter = chapterStart + counters[1] - 1
        markerText = `${actualChapter}.`
        for (let i = 2; i <= depth; i++) {
          markerText += `${counters[i]}.`
        }
        markerText += ' '
      }

      // Очищаем старые маркеры
      let cleanInner = innerHtml.replace(/<span class="odt-heading-marker">.*?<\/span>/gis, '').trim()

      // Очищаем от ручных цифр (например "Глава 1. ", "1.2. ")
      cleanInner = cleanInner.replace(/^(Глава\s+\d+|Chapter\s+\d+|第\d+章|\d+(?:\.\d+)*\.*)\s*/i, '').trim()

      const markerHtml = `<span class="odt-heading-marker">${markerText}</span>`
      
      changed++
      return `${openTag}${markerHtml}${cleanInner}${closeTag}`
    }
  )

  return { html: result, changed }
}
