/**
 * DELETE /api/books/:slug
 * Delete a book (only if it has no articles). Role: admin.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const book = await db.prepare('SELECT id FROM books WHERE slug = ?').get(slug) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })
  }

  const articleCount = await db.prepare(
    'SELECT COUNT(*) as count FROM articles WHERE book_id = ?'
  ).get(book.id) as any

  if (articleCount?.count > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `Невозможно удалить: книга содержит ${articleCount.count} статей. Сначала удалите или переместите статьи.`
    })
  }

  await db.prepare('DELETE FROM books WHERE id = ?').run(book.id)

  return { message: 'Книга удалена' }
})
