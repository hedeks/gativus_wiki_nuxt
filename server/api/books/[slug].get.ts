/**
 * GET /api/books/:slug
 * Get a book with its articles. Public.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const book = await db.prepare('SELECT * FROM books WHERE slug = ?').get(slug) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })
  }

  const articles = await db.prepare(`
    SELECT id, slug, title, excerpt, sort_order, locale, is_published, created_at, updated_at
    FROM articles
    WHERE book_id = ? AND is_published = 1
    ORDER BY sort_order ASC
  `).all(book.id) as any[]

  return {
    ...book,
    articles: articles || [],
  }
})
