/**
 * Gativus Wiki — Term Auto-Linker
 *
 * Scans HTML content and wraps found term titles/aliases in wiki-term links.
 * - Skips content inside <a>, <code>, <pre>, <h1>-<h6> tags
 * - Wraps only the FIRST occurrence of each term per article
 * - Sorts terms by length (longest first) to avoid partial matches
 */

/**
 * Build a Map<phrase, {id, slug}> from the database.
 * Includes both titles and aliases for each term.
 */
export async function buildTermsMap(db: any): Promise<Map<string, { id: number, slug: string }>> {
  const terms = await db.prepare('SELECT id, slug, title, aliases FROM terms').all() as any[]
  const map = new Map<string, { id: number, slug: string }>()

  for (const term of terms || []) {
    const data = { id: term.id, slug: term.slug }
    map.set(term.title.toLowerCase(), data)
    if (term.aliases) {
      try {
        const aliases: string[] = JSON.parse(term.aliases)
        for (const alias of aliases) {
          if (alias.trim()) map.set(alias.trim().toLowerCase(), data)
        }
      } catch { /* invalid JSON — skip */ }
    }
  }

  return map
}

/**
 * Replace term occurrences in HTML with <a class="wiki-term"> links.
 * Returns both the updated HTML and the list of linked term IDs.
 */
export function linkTermsInHtml(html: string, termsMap: Map<string, { id: number, slug: string }>): { html: string, linkedTermIds: number[] } {
  if (!html || termsMap.size === 0) return { html, linkedTermIds: [] }

  // Sort phrases by length descending
  const phrases = Array.from(termsMap.keys()).sort((a, b) => b.length - a.length)

  const parts = splitHtmlIntoSegments(html)
  const linkedSlugs = new Set<string>() 
  const linkedTermIds = new Set<number>() 

  const linkedHtml = parts.map(part => {
    if (part.isTag) return part.content

    let text = part.content
    for (const phrase of phrases) {
      const { id, slug } = termsMap.get(phrase)!
      if (linkedSlugs.has(slug)) continue

      const escaped = escapeRegex(phrase)
      const range = 'a-zA-Z0-9_\\u0400-\\u04FF'
      const suffixRange = 'a-zA-Z\\u0400-\\u04FF'
      const regex = new RegExp(`(?<![${range}])(${escaped}[${suffixRange}]*)(?![${range}])`, 'i')
      const match = regex.exec(text)
      if (match) {
        const originalWord = match[1]
        const link = `<a class="wiki-term" data-term-slug="${slug}" href="/glossary/${slug}">${originalWord}</a>`
        text = text.slice(0, match.index) + link + text.slice(match.index + originalWord.length)
        linkedSlugs.add(slug)
        linkedTermIds.add(id)
      }
    }
    return text
  }).join('')

  return { html: linkedHtml, linkedTermIds: Array.from(linkedTermIds) }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Segment {
  content: string
  isTag: boolean
  skipChildren?: boolean
}

/**
 * Split HTML string into alternating text/tag segments.
 * Tags that should skip inner text (a, code, pre, h1-h6) are flagged.
 */
function splitHtmlIntoSegments(html: string): Segment[] {
  const segments: Segment[] = []
  const tagRegex = /<[^>]+>/g
  let lastIndex = 0
  let skipUntil = ''
  let inSkip = false

  const openTagRegex = /^<(a|code|pre|h[1-6])\b/i
  const closeTagRegex = /^<\/(a|code|pre|h[1-6])>/i

  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0]
    const before = html.slice(lastIndex, match.index)

    if (before.length > 0) {
      segments.push({ content: before, isTag: false })
    }

    if (!inSkip && openTagRegex.test(tag)) {
      const tagName = tag.match(/^<(\w+)/i)?.[1]?.toLowerCase() || ''
      skipUntil = tagName
      inSkip = true
    } else if (inSkip && closeTagRegex.test(tag)) {
      const closing = tag.match(/^<\/(\w+)/i)?.[1]?.toLowerCase() || ''
      if (closing === skipUntil) inSkip = false
    }

    segments.push({ content: tag, isTag: true, skipChildren: inSkip })
    lastIndex = match.index + tag.length
  }

  // Remaining text after last tag
  const remaining = html.slice(lastIndex)
  if (remaining.length > 0) {
    segments.push({ content: remaining, isTag: false })
  }

  // Mark text segments that are inside skip blocks
  let inside = false
  return segments.map(seg => {
    if (seg.isTag) {
      if (openTagRegex.test(seg.content)) inside = true
      else if (closeTagRegex.test(seg.content)) { inside = false; return { ...seg, isTag: true } }
      return seg
    }
    return inside ? { ...seg, isTag: true } : seg // treat inner text as unprocessable
  })
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
