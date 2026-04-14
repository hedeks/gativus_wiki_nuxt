/**
 * GET /api/admin/terms/:id
 * Get a single term by numeric ID for admin editing. Role: editor+.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const idValue = getRouterParam(event, 'id')
  if (!idValue) {
    throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  }
  const id = parseInt(idValue)

  const term = await db.prepare(`
    SELECT
      t.id, t.slug, t.slug_ru, t.title, t.title_ru, t.aliases, t.definition, t.definition_ru,
      t.term_article_id, t.created_at, t.updated_at,
      t.created_by,
      a.html_content as article_html,
      a.id as article_id,
      a.slug as article_slug,
      a.category_id,
      a.presentation_path,
      c.title as category_title
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE t.id = ?
  `).get(id) as any

  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  return {
    ...term,
    aliases: term.aliases ? JSON.parse(term.aliases) : [],
    has_article: Boolean(term.term_article_id),
  }
})
