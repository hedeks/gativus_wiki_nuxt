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

const SUBLEVEL_RE = /^(\d+)((?:\.\d+)+)$/

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
      const text = raw.trim()

      if (isLevel1(text)) {
        changed++
        return `<span class="odt-heading-marker">${formatLevel1(chapterStart, locale)}</span>`
      }

      const sub = SUBLEVEL_RE.exec(text)
      if (sub) {
        changed++
        const rest = sub[2] // «.2.3»
        return `<span class="odt-heading-marker">${chapterStart}${rest}</span>`
      }

      return _match
    },
  )

  return { html: result, changed }
}
