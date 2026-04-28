/**
 * Gativus Wiki — Term Auto-Linker
 *
 * Scans HTML content and wraps found term titles/aliases in wiki-term links.
 * - Skips content inside <a>, <code>, <pre>, <h1>-<h6> tags
 * - Линкует **все** вхождения каждой фразы в обрабатываемых текстовых сегментах (не одно на всю статью)
 * - Sorts terms by length (longest first) to avoid partial matches
 * - Skips matches inside raw tags and inside any <a>…</a> (including non–wiki-term links)
 */

/**
 * Build a Map<phrase, {id, slug}> from the database.
 * Ключи: title, title_ru, title_zh, slug, aliases (нижний регистр для сопоставления).
 */
export async function buildTermsMap(db: any): Promise<Map<string, { id: number, slug: string }>> {
  const terms = await db.prepare(`
    SELECT id, slug, title, title_ru, title_zh, aliases FROM terms
  `).all() as any[]
  const map = new Map<string, { id: number, slug: string }>()

  const add = (phrase: string | null | undefined, data: { id: number, slug: string }) => {
    const k = phrase?.trim().toLowerCase()
    if (k) map.set(k, data)
  }

  for (const term of terms || []) {
    const data = { id: term.id, slug: term.slug }
    add(term.title, data)
    add(term.title_ru, data)
    add(term.title_zh, data)
    add(term.slug, data)
    if (term.aliases) {
      try {
        const aliases: string[] = JSON.parse(term.aliases)
        for (const alias of aliases) add(alias, data)
      } catch { /* invalid JSON — skip */ }
    }
  }

  return map
}

/**
 * Remove any existing wiki-term links from HTML, keeping only inner text.
 * Повторяет проход, чтобы размотать вложенные / каскадные поломки.
 */
function stripWikiTermLinks(html: string): string {
  let out = html
  let prev = ''
  let guard = 0
  while (out !== prev && guard++ < 64) {
    prev = out
    out = out.replace(/<a\s[^>]*class="wiki-term"[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  }
  return out
}


/** Символы slug / якорного текста (дефис только в начале класса) */
const SLUG_CHARS = '-a-zA-Z0-9\\u0400-\\u04FF_'

/**
 * Чинит поломки автолинковки. Безопасно для обычного HTML: не трогает `word" href` внутри открывающих тегов.
 * Сильная «распутка» wiki-term + снятие мусорных </a> только в хвостах `…</a>slug</a>`.
 * После выполнения — обязательно «Перелинковать статьи».
 */
export function repairTermLinkerCorruption(html: string): string {
  if (!html) return html
  let out = fixNestedWikiClassCorruption(html)
  out = salvageShreddedWikiTermMarkup(out)
  out = stripOrphanGlossaryFragments(out)
  return out
}

function fixNestedWikiClassCorruption(html: string): string {
  let out = html
  let prev = ''
  let guard = 0
  while (out !== prev && guard++ < 12) {
    prev = out
    out = out.replace(
      new RegExp(
        `class="wiki-<a\\s+class="wiki-term"[^>]*data-term-slug="([${SLUG_CHARS}]+)"[^>]*href="/glossary/\\1"[^>]*>([^<]*)</a>"`,
        'gi',
      ),
      'class="wiki-term"',
    )
    out = out.replace(
      new RegExp(
        `class="wiki-<a\\s+class="wiki-term"[^>]*href="/glossary/([${SLUG_CHARS}]+)"[^>]*data-term-slug="[^"]*"[^>]*>([^<]*)</a>"`,
        'gi',
      ),
      'class="wiki-term"',
    )
    out = out.replace(
      new RegExp(
        `class="wiki-<a\\s+class="wiki-term"[^>]*href="/glossary/([${SLUG_CHARS}]+)"[^>]*>([^<]*)</a>"`,
        'gi',
      ),
      'class="wiki-term"',
    )
  }
  return out
}

/** Снять каскады wiki-term и типичный мусор вида `</a>slug</a>slug</a>` без глобального удаления всех `</a>`. */
function salvageShreddedWikiTermMarkup(html: string): string {
  let out = html
  let prev = ''
  let guard = 0
  while (out !== prev && guard++ < 48) {
    prev = out
    out = out.replace(/<a\s[^>]*class="wiki-term"[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    out = out.replace(/<a\s[^>]*class="wiki-term"[^>]*>/gi, '')
    out = out.replace(/<\/a>\s*([a-z0-9_-]{1,24})(?=\s*<\/a>)/gi, '$1')
  }
  guard = 0
  prev = ''
  while (out !== prev && guard++ < 32) {
    prev = out
    out = out.replace(/\b([a-z0-9_-]{2,24})\1\b/gi, '$1')
  }
  return out
}

/** Фрагменты ссылок в явном тексте (не внутри сырого тега <…>). Только укорочение до слова/clear — без вставки <a>. */
function stripOrphanGlossaryFragments(html: string): string {
  if (!html.includes('glossary')) return html

  const hrefEcho = new RegExp(`([${SLUG_CHARS}]{2,})"\\s+href="/glossary/([${SLUG_CHARS}]+)"\\s*>`, 'gi')
  let out = html.replace(hrefEcho, (full, word, _slug, offset) =>
    (canAutoLinkAt(html, Number(offset)) ? word : full),
  )

  const dataEcho = new RegExp(`data-term-slug="([${SLUG_CHARS}]+)"\\s+href="/glossary/\\1"\\s*>`, 'gi')
  out = out.replace(dataEcho, (full, _slug, offset) =>
    (canAutoLinkAt(out, Number(offset)) ? '' : full),
  )

  return out
}

/**
 * Replace term occurrences in HTML with <a class="wiki-term"> links.
 * Считает число вхождений на термин (mention_count для графа).
 */
export function linkTermsInHtml(html: string, termsMap: Map<string, { id: number, slug: string }>): {
  html: string
  linkedTermIds: number[]
  mentionCountByTermId: Map<number, number>
} {
  if (!html || termsMap.size === 0) {
    return { html, linkedTermIds: [], mentionCountByTermId: new Map() }
  }

  const cleanHtml = stripWikiTermLinks(html)
  const phrases = Array.from(termsMap.keys()).sort((a, b) => b.length - a.length)
  const parts = splitHtmlIntoSegments(cleanHtml)
  const mentionCountByTermId = new Map<number, number>()

  const linkedHtml = parts.map(part => {
    if (part.isTag) return part.content

    let text = part.content
    const range = 'a-zA-Z0-9_\\u0400-\\u04FF\\-'
    const suffixRange = 'a-zA-Z0-9\\u0400-\\u04FF\\-'

    for (const phrase of phrases) {
      const { id, slug } = termsMap.get(phrase)!
      const escaped = escapeRegex(phrase)
      const regex = new RegExp(`(?<![${range}])(${escaped}[${suffixRange}]*)(?![${range}])`, 'gi')

      text = text.replace(regex, (full, originalWord: string, off: number) => {
        if (!canAutoLinkAt(text, off)) return full
        mentionCountByTermId.set(id, (mentionCountByTermId.get(id) || 0) + 1)
        return `<a class="wiki-term" data-term-slug="${slug}" href="/glossary/${slug}">${originalWord}</a>`
      })
    }
    return text
  }).join('')

  return {
    html: linkedHtml,
    linkedTermIds: [...mentionCountByTermId.keys()],
    mentionCountByTermId,
  }
}

export function mergeMentionCountMaps(maps: Array<Map<number, number> | undefined | null>): Map<number, number> {
  const out = new Map<number, number>()
  for (const m of maps) {
    if (!m) continue
    for (const [id, c] of m) {
      out.set(id, (out.get(id) || 0) + c)
    }
  }
  return out
}

/** slug термина → id (для подсчёта уже сохранённого HTML). */
export function buildSlugToIdMap(termsMap: Map<string, { id: number, slug: string }>): Map<string, number> {
  const m = new Map<string, number>()
  for (const v of termsMap.values()) {
    m.set(String(v.slug).toLowerCase(), v.id)
  }
  return m
}

/** Считает &lt;a class="wiki-term"&gt; в готовом HTML без повторной линковки. */
export function countWikiTermMentionsInHtml(html: string | null | undefined, slugToId: Map<string, number>): Map<number, number> {
  const counts = new Map<number, number>()
  if (!html?.trim()) return counts
  const re = /<a\s[^>]*\bclass="[^"]*wiki-term[^"]*"[^>]*\bdata-term-slug="([^"]+)"[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const tid = slugToId.get(m[1].toLowerCase())
    if (tid != null) counts.set(tid, (counts.get(tid) || 0) + 1)
  }
  return counts
}

export function replaceArticleTermMentions(db: any, articleId: number, counts: Map<number, number>) {
  db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(articleId)
  if (counts.size === 0) return
  const stmt = db.prepare('INSERT INTO article_terms (article_id, term_id, mention_count) VALUES (?, ?, ?)')
  for (const [termId, n] of counts) {
    if (n > 0) stmt.run(articleId, termId, n)
  }
}

/** Пересобрать article_terms по трём полям HTML статьи (после сохранения в БД). */
export function syncArticleTermsFromArticleRow(db: any, articleId: number, termsMap: Map<string, { id: number, slug: string }>) {
  const row = db.prepare('SELECT html_content, html_content_ru, html_content_zh FROM articles WHERE id = ?').get(articleId) as any
  if (!row) return
  const slugToId = buildSlugToIdMap(termsMap)
  const merged = mergeMentionCountMaps([
    countWikiTermMentionsInHtml(row.html_content, slugToId),
    countWikiTermMentionsInHtml(row.html_content_ru, slugToId),
    countWikiTermMentionsInHtml(row.html_content_zh, slugToId),
  ])
  replaceArticleTermMentions(db, articleId, merged)
}

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

/**
 * True only when index points at plain text: not inside `<…>`, not inside an anchor's text Content (after a real `<a …>` open and before `</a>`).
 */
function canAutoLinkAt(html: string, index: number): boolean {
  let inTag = false
  let anchorDepth = 0

  for (let i = 0; i < index; i++) {
    const c = html[i]
    if (inTag) {
      if (c === '>') inTag = false
      continue
    }
    if (c === '<') {
      if (isClosingAnchorAt(html, i)) anchorDepth = Math.max(0, anchorDepth - 1)
      else if (isOpeningAnchorAt(html, i)) anchorDepth++
      inTag = true
    }
  }

  return !inTag && anchorDepth === 0
}

function isOpeningAnchorAt(html: string, i: number): boolean {
  return /^<a\b/i.test(html.slice(i))
}

function isClosingAnchorAt(html: string, i: number): boolean {
  return /^<\/a\b/i.test(html.slice(i))
}
