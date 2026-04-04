/**
 * GET /api/articles/:slug/revisions/:id
 * Get a single revision's HTML content. Role: editor+.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const revisionId = getRouterParam(event, 'id')

  if (!slug || !revisionId) {
    throw createError({ statusCode: 400, statusMessage: 'Slug and revision ID are required' })
  }

  const article = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as any
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  const revision = await db.prepare(`
    SELECT r.*, u.login as created_by_login
    FROM article_revisions r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ? AND r.article_id = ?
  `).get(parseInt(revisionId), article.id) as any

  if (!revision) {
    throw createError({ statusCode: 404, statusMessage: 'Ревизия не найдена' })
  }

  return revision
})
