/**
 * POST /api/articles/:slug/revert
 * Revert article to a previous revision. Role: editor+.
 * Creates a new revision with the old content (non-destructive).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const { revision_id } = body
  if (!revision_id) {
    throw createError({ statusCode: 400, statusMessage: 'revision_id обязателен' })
  }

  const article = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as any
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  // Get the target revision
  const targetRevision = await db.prepare(
    'SELECT html_content, revision_num FROM article_revisions WHERE id = ? AND article_id = ?'
  ).get(revision_id, article.id) as any

  if (!targetRevision) {
    throw createError({ statusCode: 404, statusMessage: 'Ревизия не найдена' })
  }

  // Get current max revision number
  const lastRevision = await db.prepare(
    'SELECT MAX(revision_num) as max_num FROM article_revisions WHERE article_id = ?'
  ).get(article.id) as any

  const nextNum = (lastRevision?.max_num || 0) + 1

  // Update article with old content
  await db.prepare(
    `UPDATE articles SET html_content = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(targetRevision.html_content, article.id)

  // Create new revision (revert is non-destructive)
  await db.prepare(`
    INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    article.id,
    targetRevision.html_content,
    nextNum,
    `Откат к ревизии #${targetRevision.revision_num}`,
    auth.id
  )

  return {
    message: `Откат к ревизии #${targetRevision.revision_num} выполнен`,
    new_revision_num: nextNum,
  }
})
