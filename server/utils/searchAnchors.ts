/**
 * Подбор якоря статьи для результатов FTS: совпадение выделений snippet (<b>) с заголовками h2–h5.
 * Логика id заголовка совпадает с клиентом (`pages/articles/[slug].vue`): явный id или slugify текста.
 */
import { slugify } from './slugify'

const HEADING_RE = /<h([2-5])[^>]*?(?:id="([^"]*)")?[^>]*>(.*?)<\/h\1>/gis

const HL_PHRASE_MAX = 120

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

/** Фрагменты, которые FTS подсветил в snippet. */
export function extractSnippetBoldFragments(snippet: string): string[] {
  const re = /<b>(.*?)<\/b>/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(snippet)) !== null) {
    const t = stripHtml(m[1]).trim()
    if (t.length >= 2)
      out.push(t)
  }
  return out
}

/** Фраза для подсветки в заголовке статьи (`?hl=`): сначала из FTS-snippet (`<b>`), иначе первый осмысленный токен запроса. */
export function pickSearchHighlightPhrase(snippet: string | undefined | null, userQuery: string): string {
  const fromSnippet = extractSnippetBoldFragments(snippet || '')
  if (fromSnippet[0]?.trim())
    return fromSnippet[0].trim().slice(0, HL_PHRASE_MAX)

  const q = userQuery.normalize('NFKC').trim()
  if (!q)
    return ''

  const tokens = q.split(/\s+/).filter(Boolean)
  for (const t of tokens) {
    const core = t.replace(/[^\p{L}\p{N}_]+/gu, '')
    if (core.length >= 2)
      return core.slice(0, HL_PHRASE_MAX)

    if (core.length === 1 && (core.codePointAt(0)! > 127))
      return core.slice(0, HL_PHRASE_MAX)
  }

  return q.slice(0, HL_PHRASE_MAX)
}

export function findArticleAnchor(htmlContent: string | null | undefined, snippet: string): string | null {
  if (!htmlContent?.trim())
    return null

  const fragments = extractSnippetBoldFragments(snippet)
  const plainSnippet = stripHtml(snippet).replace(/\s+/g, ' ').trim().toLowerCase()

  const scored: { id: string; score: number }[] = []

  const re = new RegExp(HEADING_RE.source, HEADING_RE.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(htmlContent)) !== null) {
    const inner = match[3]
    const text = stripHtml(inner).trim()
    if (!text)
      continue

    const explicitId = match[2]?.trim()
    const id = explicitId || slugify(text)

    let score = 0
    const tl = text.toLowerCase()

    for (const frag of fragments) {
      const fl = frag.toLowerCase()
      if (tl.includes(fl))
        score += fl.length * 3
      else if (fl.includes(tl) && tl.length >= 4)
        score += tl.length * 2
    }

    if (!fragments.length && plainSnippet.includes(tl))
      score += Math.min(tl.length, 48)

    if (score > 0)
      scored.push({ id, score })
  }

  if (!scored.length)
    return null

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0].id
  return best || null
}
