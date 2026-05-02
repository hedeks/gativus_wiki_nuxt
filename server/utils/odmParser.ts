/**
 * ODM (OpenDocument Master) — извлечение оглавления глав по ссылкам на поддокументы.
 * Реальные .odt подгружаются отдельно и сшиваются на странице импорта ODM.
 */

import AdmZip from 'adm-zip'
import { DOMParser } from '@xmldom/xmldom'

export interface OdmChapterSlot {
  /** Порядок в мастер-документе (1-based). */
  sortOrder: number
  /** Путь как в ODM (для подсказки пользователю). */
  masterHref: string
  /** Имя секции / заголовка из мастера. */
  displayTitle: string
}

function normHref(href: string): string {
  if (!href) return ''
  try {
    const u = href.replace(/\\/g, '/')
    const hash = u.indexOf('#')
    const base = hash >= 0 ? u.slice(0, hash) : u
    return decodeURIComponent(base.trim())
  }
  catch {
    return href.trim()
  }
}

function basenameHint(href: string): string {
  const n = normHref(href)
  const i = n.lastIndexOf('/')
  return i >= 0 ? n.slice(i + 1) : n
}

/**
 * Разбор мастер-документа ODM: секции с text:section-source xlink:href.
 */
export function parseOdmOutline(buffer: Buffer): OdmChapterSlot[] {
  const zip = new AdmZip(buffer)
  const entry = zip.getEntry('content.xml')
  if (!entry)
    throw new Error('ODM: нет content.xml')

  const xml = entry.getData().toString('utf-8')
  const doc = new DOMParser().parseFromString(xml, 'text/xml') as any
  const body = doc.getElementsByTagName('office:body')[0]
  const textRoot = body?.getElementsByTagName('office:text')[0]
  if (!textRoot)
    throw new Error('ODM: нет office:text')

  const slots: OdmChapterSlot[] = []
  let order = 0

  function walk(node: any) {
    if (!node?.childNodes) return
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      if (child.nodeType !== 1) continue
      const name = child.nodeName || ''
      if (name === 'text:section') {
        const sectionTitle = child.getAttribute?.('text:name')?.trim() || ''
        let href = ''
        const sources = child.getElementsByTagName?.('text:section-source')
        if (sources && sources.length > 0)
          href = sources[0].getAttribute?.('xlink:href') || ''

        if (href) {
          order++
          const hint = basenameHint(href)
          const displayTitle = sectionTitle || hint || `Глава ${order}`
          slots.push({
            sortOrder: order,
            masterHref: normHref(href),
            displayTitle,
          })
        }
        walk(child)
        continue
      }
      walk(child)
    }
  }

  walk(textRoot)

  if (slots.length === 0)
    throw new Error(
      'ODM: не найдено ни одной секции со ссылкой (text:section-source). Добавьте поддокументы в мастер LibreOffice или используйте импорт одного ODT.',
    )

  return slots
}
