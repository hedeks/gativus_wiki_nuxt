/**
 * GET /api/terms/search?q=
 * Fast search for the TermPopover — returns minimal term data.
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const q = (query.q as string || '').trim()

  if (!q || q.length < 1) {
    return { items: [] }
  }

  const items = await db.prepare(`
    SELECT
      t.id, t.slug, t.title, t.aliases, t.definition,
      t.term_article_id,
      c.title as category_title,
      c.slug as category_slug,
      c.icon as category_icon,
      c.color as category_color
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE t.title LIKE ? OR t.aliases LIKE ? OR t.definition LIKE ?
    ORDER BY
      CASE WHEN t.title LIKE ? THEN 0 ELSE 1 END,
      length(t.title) ASC
    LIMIT 10
  `).all(`%${q}%`, `%${q}%`, `%${q}%`, `${q}%`) as any[]

  return {
    items: (items || []).map(t => ({
      ...t,
      aliases: t.aliases ? JSON.parse(t.aliases) : [],
      has_article: Boolean(t.term_article_id),
    })),
  }
})
