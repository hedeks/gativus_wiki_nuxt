/**
 * GET /api/articles/:slug/revisions
 * List all revisions for an article. Role: editor+.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const article = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as any
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  const revisions = await db.prepare(`
    SELECT 
      r.id, r.article_id, r.revision_num, r.change_summary, r.created_at,
      r.created_by, u.login as created_by_login
    FROM article_revisions r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.article_id = ?
    ORDER BY r.revision_num DESC
  `).all(article.id) as any[]

  return revisions || []
})
