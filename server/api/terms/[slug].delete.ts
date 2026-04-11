/**
 * DELETE /api/terms/:slug
 * Delete a term and its linked article (if any). Role: admin.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const term = await db.prepare('SELECT id, term_article_id FROM terms WHERE slug = ?').get(slug) as any
  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  // Delete term first (FK constraint: term_article_id can be null)
  await db.prepare('DELETE FROM terms WHERE id = ?').run(term.id)

  // Delete the linked term-article if it exists
  if (term.term_article_id) {
    await db.prepare('DELETE FROM article_revisions WHERE article_id = ?').run(term.term_article_id)
    await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(term.term_article_id)
    await db.prepare('DELETE FROM articles WHERE id = ? AND is_term_article = 1').run(term.term_article_id)
  }

  return { message: 'Термин удалён' }
})
