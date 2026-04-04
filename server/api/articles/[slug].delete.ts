/**
 * DELETE /api/articles/:slug
 * Delete an article. Role: admin only.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const article = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as any
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  // Revisions cascade-delete via FK
  await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(article.id)
  await db.prepare('DELETE FROM article_revisions WHERE article_id = ?').run(article.id)
  await db.prepare('DELETE FROM articles WHERE id = ?').run(article.id)

  return { message: 'Статья удалена' }
})
