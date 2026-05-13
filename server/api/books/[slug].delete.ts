/**
 * DELETE /api/books/:slug
 * Delete a book. Role: admin.
 * Query param: delete_articles=true — also delete all articles belonging to the book.
 * Without the param, returns 409 if the book has articles.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const deleteArticles = query.delete_articles === 'true' || query.delete_articles === '1'

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

  if (articleCount?.count > 0 && !deleteArticles) {
    throw createError({
      statusCode: 409,
      statusMessage: `Невозможно удалить: книга содержит ${articleCount.count} статей. Сначала удалите или переместите статьи.`
    })
  }

  if (deleteArticles && articleCount?.count > 0) {
    const articles = await db.prepare('SELECT id FROM articles WHERE book_id = ?').all(book.id) as any[]
    for (const article of articles) {
      await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(article.id)
      await db.prepare('DELETE FROM article_revisions WHERE article_id = ?').run(article.id)
    }
    await db.prepare('DELETE FROM articles WHERE book_id = ?').run(book.id)
  }

  await db.prepare('DELETE FROM book_categories WHERE book_id = ?').run(book.id)
  await db.prepare('DELETE FROM books WHERE id = ?').run(book.id)

  return {
    message: 'Книга удалена',
    deleted_articles: deleteArticles ? (articleCount?.count ?? 0) : 0,
  }
})
