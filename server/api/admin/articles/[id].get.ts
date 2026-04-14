/**
 * GET /api/admin/articles/:id
 * Fetch a single article by its numeric ID. Role: editor+.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  }

  const article = await db.prepare(`
    SELECT 
      a.*,
      b.title as book_title,
      c.title as category_title,
      t.id as term_id,
      t.slug as term_slug,
      t.title as term_title
    FROM articles a
    LEFT JOIN books b ON a.book_id = b.id
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN terms t ON a.id = t.term_article_id
    WHERE a.id = ?
  `).get(id) as any

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  return {
    ...article,
    is_published: Boolean(article.is_published),
    is_term_article: Boolean(article.is_term_article)
  }
})
