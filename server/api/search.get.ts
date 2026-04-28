/**
 * GET /api/search?q=...&locale=...
 * Unified search endpoint using FTS5 virtual table 'wiki_fts'.
 * Returns ranked results from both articles and terms.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const q = (query.q as string || '').trim().replace(/["'*^()[\]:]/g, ' ').trim()

  if (!q || q.length < 2) {
    return { items: [] }
  }

  // FTS5 search query
  // We use BM25 ranking and highlight snippets
  const results = await db.prepare(`
    SELECT
      id,
      type,
      title,
      slug,
      locale,
      snippet(wiki_fts, 3, '<b>', '</b>', '...', 32) as snippet,
      rank
    FROM wiki_fts
    WHERE wiki_fts MATCH ?
    ORDER BY rank
    LIMIT 15
  `).all(`${q}*`) as any[]

  return {
    items: (results || []).map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      slug: item.slug,
      locale: item.locale,
      snippet: item.snippet,
      url: item.type === 'article' ? `/articles/${item.slug}` : `/glossary/${item.slug}`
    }))
  }
})
