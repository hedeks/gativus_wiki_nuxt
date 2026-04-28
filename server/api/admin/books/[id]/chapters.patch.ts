/**
 * PATCH /api/admin/books/:id/chapters
 * Batch update articles (chapters) for a book.
 * Body: { article_ids: number[] }
 * The order in article_ids array will determine the sort_order.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const bookId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!bookId) {
    throw createError({ statusCode: 400, statusMessage: 'Book ID is required' })
  }

  const { article_ids } = body

  if (!Array.isArray(article_ids)) {
    throw createError({ statusCode: 400, statusMessage: 'article_ids must be an array' })
  }

  // Reset book_id for articles that were in this book but are not in the new list
  if (article_ids.length > 0) {
    const placeholders = article_ids.map(() => '?').join(',')
    db.prepare(`UPDATE articles SET book_id = NULL, sort_order = 0 WHERE book_id = ? AND id NOT IN (${placeholders})`)
      .run(bookId, ...article_ids)
  } else {
    db.prepare('UPDATE articles SET book_id = NULL, sort_order = 0 WHERE book_id = ?').run(bookId)
  }

  const updateStmt = db.prepare('UPDATE articles SET book_id = ?, sort_order = ? WHERE id = ?')

  for (let i = 0; i < article_ids.length; i++) {
    const articleId = article_ids[i]
    await updateStmt.run(bookId, i + 1, articleId)
  }

  return { message: 'Порядок глав обновлен' }
})
