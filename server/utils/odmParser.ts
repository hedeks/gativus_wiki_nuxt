/**
 * ODM (OpenDocument Master) — извлечение оглавления глав по ссылкам на поддокументы.
 * Реальные .odt подгружаются отдельно и сшиваются на странице импорта ODM.
 *
 * Приоритет названия главы:
 *   1. text:h внутри секции
 *   2. text:h, стоящий непосредственно перед секцией (сосед в документе)
 *   3. text:name секции — если не похоже на имя файла и не авто-сгенерировано
 *   4. Basename href (имя файла) — только как fallback
 *   5. Дефолтная подпись «Глава N» / «Chapter N» / «第N章»
 */

import AdmZip from 'adm-zip'
import { DOMParser } from '@xmldom/xmldom'

export type OdmContentLocale = 'ru' | 'en' | 'zh'
export type OdmHeadingFormat = 'ru' | 'en' | 'zh' | 'none'

export interface ParseOdmOutlineOptions {
  contentLocale?: OdmContentLocale
}

export interface OdmChapterSlot {
  /** Порядок в мастер-документе (1-based). */
  sortOrder: number
  /** Путь как в ODM (для матчинга ODT-файлов). */
  masterHref: string
  /** Название главы, извлечённое из заголовков ODM. */
  displayTitle: string
}

export function defaultOdmChapterTitle(order: number, locale: OdmContentLocale = 'ru'): string {
  switch (locale) {
    case 'en': return `Chapter ${order}`
    case 'zh': return `第${order}章`
    case 'ru':
    default: return `Глава ${order}`
  }
}

/**
 * Detects the numbering format used in ODM chapter headings.
 * Returns null if no numbered headings are detected.
 */
export function detectHeadingFormat(slots: OdmChapterSlot[]): OdmHeadingFormat | null {
  for (const slot of slots) {
    const t = slot.displayTitle.trim()
    if (/^Глава\s+\d+/i.test(t)) return 'ru'
    if (/^Chapter\s+\d+/i.test(t)) return 'en'
    if (/^第\d+章/.test(t)) return 'zh'
    if (/^\d+[.\s):–-]/.test(t)) return 'none'
  }
  return null
}

function normHref(href: string): string {
  if (!href) return ''
  try {
    const u = href.replace(/\\/g, '/')
    const hash = u.indexOf('#')
    const base = hash >= 0 ? u.slice(0, hash) : u
    return decodeURIComponent(base.trim())
  }
  catch { return href.trim() }
}

function basenameHint(href: string): string {
  const n = normHref(href)
  const i = n.lastIndexOf('/')
  return i >= 0 ? n.slice(i + 1) : n
}

/** Извлекает весь текстовый контент узла (рекурсивно), пропуская section-source. */
function extractNodeText(node: any): string {
  if (!node?.childNodes) return ''
  let text = ''
  for (let i = 0; i < node.childNodes.length; i++) {
    const c = node.childNodes[i]
    if (c.nodeType === 3) {
      text += c.nodeValue || ''
    }
    else if (c.nodeType === 1) {
      if (c.nodeName === 'text:section-source') continue
      text += extractNodeText(c)
    }
  }
  return text.replace(/\s+/g, ' ').trim()
}

/** Проверяет, является ли text:name авто-сгенерированным или похожим на имя файла. */
function isMeaningfulSectionName(name: string, hrefBasename: string): boolean {
  if (!name) return false
  // Совпадает с basename файла
  if (name.toLowerCase() === hrefBasename.toLowerCase()) return false
  // Похоже на имя файла
  if (/\.(odt|doc|docx|txt)$/i.test(name)) return false
  // Авто-сгенерированное LibreOffice (Section N / Text N / text_N и т.п.)
  if (/^(section|text|abschnitt|sección)\s*\d*$/i.test(name)) return false
  return true
}

/**
 * Разбор мастер-документа ODM.
 * Возвращает список слотов с реальными названиями глав.
 */
export function parseOdmOutline(buffer: Buffer, options?: ParseOdmOutlineOptions): OdmChapterSlot[] {
  const locale: OdmContentLocale = options?.contentLocale ?? 'ru'
  const zip = new AdmZip(buffer)
  const entry = zip.getEntry('content.xml')
  if (!entry) throw new Error('ODM: нет content.xml')

  const xml = entry.getData().toString('utf-8')
  const doc = new DOMParser().parseFromString(xml, 'text/xml') as any
  const body = doc.getElementsByTagName('office:body')[0]
  const textRoot = body?.getElementsByTagName('office:text')[0]
  if (!textRoot) throw new Error('ODM: нет office:text')

  const slots: OdmChapterSlot[] = []
  let order = 0

  // Текст последнего встреченного заголовка (text:h) — используется для следующей секции
  let pendingHeadingText = ''

  function walkChildren(node: any) {
    if (!node?.childNodes) return

    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      if (child.nodeType !== 1) continue
      const nodeName: string = child.nodeName || ''

      // ─── Заголовок (text:h) ───
      if (nodeName === 'text:h') {
        const txt = extractNodeText(child)
        if (txt) pendingHeadingText = txt
        continue
      }

      // ─── Секция с поддокументом ───
      if (nodeName === 'text:section') {
        let href = ''
        const sources = child.getElementsByTagName?.('text:section-source')
        if (sources && sources.length > 0)
          href = sources[0].getAttribute?.('xlink:href') || ''

        if (href) {
          order++
          const hint = basenameHint(href)
          const sectionName = child.getAttribute?.('text:name')?.trim() || ''

          // Заголовок внутри секции (если есть text:h в дочерних)
          let headingInsideSection = ''
          if (child.childNodes) {
            for (let j = 0; j < child.childNodes.length; j++) {
              const sc = child.childNodes[j]
              if (sc.nodeType === 1 && sc.nodeName === 'text:h') {
                headingInsideSection = extractNodeText(sc)
                if (headingInsideSection) break
              }
            }
          }

          const meaningfulName = isMeaningfulSectionName(sectionName, hint) ? sectionName : ''

          // Приоритет источников названия
          const displayTitle
            = headingInsideSection
            || pendingHeadingText
            || meaningfulName
            || hint
            || defaultOdmChapterTitle(order, locale)

          slots.push({ sortOrder: order, masterHref: normHref(href), displayTitle })

          // Сбрасываем «ожидающий» заголовок — он был потреблён этой секцией
          pendingHeadingText = ''

          // Рекурсия внутрь секции (для вложенных)
          walkChildren(child)
          continue
        }

        // Секция без href — всё равно смотрим внутрь
        walkChildren(child)
        continue
      }

      // ─── Всё остальное — рекурсия ───
      walkChildren(child)
    }
  }

  walkChildren(textRoot)

  if (slots.length === 0)
    throw new Error(
      'ODM: не найдено ни одной секции со ссылкой (text:section-source). '
      + 'Добавьте поддокументы в мастер LibreOffice или используйте импорт одного ODT.',
    )

  return slots
}
