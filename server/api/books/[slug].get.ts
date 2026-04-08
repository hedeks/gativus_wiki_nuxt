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

  const query = getQuery(event)
  const locale = (query.locale as string) || null

  const isId = /^\d+$/.test(slug)
  const book = await db.prepare(isId ? 'SELECT * FROM books WHERE id = ?' : 'SELECT * FROM books WHERE slug = ?').get(slug) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })
  }

  if (locale) {
    book.title = book[`title_${locale}`] || book.title;
    book.description = book[`description_${locale}`] || book.description;
  }

  // ─── 1. Fetch categories ───
  const categoryRows = await db.prepare('SELECT category_id FROM book_categories WHERE book_id = ?').all(book.id) as any[]
  book.category_ids = categoryRows.map(r => r.category_id)

  const articlesQuery = locale 
    ? `SELECT id, slug, title, excerpt, sort_order, locale, is_published, created_at, updated_at FROM articles WHERE book_id = ? AND locale = ? ORDER BY sort_order ASC`
    : `SELECT id, slug, title, excerpt, sort_order, locale, is_published, created_at, updated_at FROM articles WHERE book_id = ? ORDER BY sort_order ASC`
  
  const articles = locale 
    ? await db.prepare(articlesQuery).all(book.id, locale) as any[]
    : await db.prepare(articlesQuery).all(book.id) as any[]

  return {
    ...book,
    articles: articles || [],
  }
})
