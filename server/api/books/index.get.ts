/**
 * GET /api/books
 * List all books. Public.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const locale = (query.locale as string) || null

  let whereClause = ''
  const params: any[] = []

  if (locale) {
    whereClause = 'WHERE b.locale = ?'
    params.push(locale)
  }

  const books = await db.prepare(`
    SELECT 
      b.*,
      (SELECT COUNT(*) FROM articles a WHERE a.book_id = b.id AND a.is_published = 1) as article_count
    FROM books b
    ${whereClause}
    ORDER BY b.sort_order ASC, b.created_at ASC
  `).all(...params) as any[]

  return books || []
})
