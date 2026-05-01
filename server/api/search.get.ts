import { findArticleAnchor, pickSearchHighlightPhrase } from '../utils/searchAnchors'
import { sanitizeSearchSnippet, sanitizeSlugForPath } from '../utils/searchResponseSanitize'
import { buildWikiFtsPrefixMatch, escapeSqlLikePattern } from '../utils/wikiFtsMatch'

function pickLocalizedArticleHtml(row: {
  html_content?: string | null
  html_content_ru?: string | null
  html_content_zh?: string | null
}, lang: string): string {
  const l = (lang || 'ru').toLowerCase()
  if (l === 'ru' && String(row.html_content_ru ?? '').trim())
    return String(row.html_content_ru)
  if (l === 'zh' && String(row.html_content_zh ?? '').trim())
    return String(row.html_content_zh)
  return String(row.html_content ?? '')
}

function appendArticleSearchQuery(basePath: string, searchQuery: string, highlight: string, anchor: string | null): string {
  const parts: string[] = []
  if (searchQuery)
    parts.push(`sq=${encodeURIComponent(searchQuery)}`)
  if (highlight)
    parts.push(`hl=${encodeURIComponent(highlight)}`)
  const qs = parts.length ? `?${parts.join('&')}` : ''
  let url = `${basePath}${qs}`
  if (anchor)
    url += `#${anchor}`
  return url
}

/** Если FTS не нашёл или упал — быстрый LIKE по всем локализованным заголовкам. */
async function runTitleLikeFallback(db: any, needle: string, typeList: ('article' | 'term')[]): Promise<any[]> {
  const esc = escapeSqlLikePattern(needle)
  const pattern = `%${esc}%`
  const out: any[] = []

  if (typeList.includes('article')) {
    const rows = (await db.prepare(`
      SELECT id, 'article' AS type, title, slug, locale,
             title AS snippet,
             100 AS rank
      FROM articles
      WHERE COALESCE(title, '') LIKE ? ESCAPE '\\'
         OR COALESCE(title_ru, '') LIKE ? ESCAPE '\\'
         OR COALESCE(title_zh, '') LIKE ? ESCAPE '\\'
      LIMIT 15
    `).all(pattern, pattern, pattern)) as any[]
    out.push(...(rows || []))
  }

  if (typeList.includes('term')) {
    const rows = (await db.prepare(`
      SELECT id, 'term' AS type, title, slug, COALESCE(lang, 'en') AS locale,
             title AS snippet,
             100 AS rank
      FROM terms
      WHERE COALESCE(title, '') LIKE ? ESCAPE '\\'
         OR COALESCE(title_ru, '') LIKE ? ESCAPE '\\'
         OR COALESCE(title_zh, '') LIKE ? ESCAPE '\\'
      LIMIT 15
    `).all(pattern, pattern, pattern)) as any[]
    out.push(...(rows || []))
  }

  return out.slice(0, 15)
}

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const qRaw = (query.q as string || '').trim()
  const locale = String(query.locale || 'ru').trim().toLowerCase()

  if (qRaw.length < 2) {
    return { items: [] }
  }

  const ftsMatch = buildWikiFtsPrefixMatch(qRaw)
  if (!ftsMatch) {
    return { items: [] }
  }

  const rawTypes = String(query.types ?? '')
    .split(',')
    .map(s => s.trim())
    .filter((s): s is 'article' | 'term' => s === 'article' || s === 'term')
  const typeList = [...new Set(rawTypes.length ? rawTypes : (['article', 'term'] as const))]
  const typePlaceholders = typeList.map(() => '?').join(', ')

  let results: any[] = []

  try {
    results = (await db.prepare(`
      SELECT
        wiki_fts.id AS id,
        wiki_fts.type AS type,
        COALESCE(a.title, t.title) AS title,
        CASE wiki_fts.type
          WHEN 'article' THEN COALESCE(a.slug, wiki_fts.slug)
          WHEN 'term' THEN COALESCE(t.slug, wiki_fts.slug)
          ELSE wiki_fts.slug
        END AS slug,
        wiki_fts.locale AS locale,
        snippet(wiki_fts, 3, '<b>', '</b>', '...', 32) AS snippet,
        wiki_fts.rank AS rank
      FROM wiki_fts
      LEFT JOIN articles a ON wiki_fts.type = 'article' AND wiki_fts.id = a.id
      LEFT JOIN terms t ON wiki_fts.type = 'term' AND wiki_fts.id = t.id
      WHERE wiki_fts MATCH ?
        AND wiki_fts.type IN (${typePlaceholders})
      ORDER BY wiki_fts.rank
      LIMIT 15
    `).all(ftsMatch, ...typeList)) as any[]
  }
  catch (err) {
    console.error('[search] FTS query failed:', err)
    results = []
  }

  if (!results.length) {
    try {
      results = await runTitleLikeFallback(db, qRaw, typeList)
    }
    catch (err) {
      console.error('[search] LIKE fallback failed:', err)
    }
  }

  const articleRows = (results || []).filter((r: any) => r.type === 'article')
  let htmlById = new Map<number, string>()
  if (articleRows.length > 0) {
    const ids = [...new Set(articleRows.map((r: any) => r.id as number))]
    const ph = ids.map(() => '?').join(', ')
    const rows = (await db.prepare(
      `SELECT id, html_content, html_content_ru, html_content_zh FROM articles WHERE id IN (${ph})`,
    ).all(...ids)) as { id: number, html_content: string, html_content_ru: string | null, html_content_zh: string | null }[]
    htmlById = new Map(rows.map(r => [r.id, pickLocalizedArticleHtml(r, locale)]))
  }

  return {
    items: (results || []).flatMap((item: any) => {
      const slugSafe = sanitizeSlugForPath(item.slug)
      if (!slugSafe)
        return []

      const snippetSafe = sanitizeSearchSnippet(item.snippet)

      const base =
        item.type === 'article'
          ? `/articles/${slugSafe}`
          : `/glossary/${slugSafe}`

      let url = base
      let anchor: string | null = null

      if (item.type === 'article') {
        const html = htmlById.get(item.id)
        anchor = findArticleAnchor(html, snippetSafe || item.snippet || '')
        const hl = pickSearchHighlightPhrase(snippetSafe || item.snippet, qRaw)
        url = appendArticleSearchQuery(base, qRaw, hl, anchor)
      }

      return [{
        id: item.id,
        type: item.type,
        title: item.title,
        slug: slugSafe,
        locale: item.locale,
        snippet: snippetSafe,
        url,
        anchor,
      }]
    }),
  }
})
