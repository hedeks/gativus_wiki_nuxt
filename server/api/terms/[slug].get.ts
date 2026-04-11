/**
 * GET /api/terms/:slug
 * Get a single term by slug, including its linked article content if present.
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const term = await db.prepare(`
    SELECT
      t.id, t.slug, t.title, t.aliases, t.definition,
      t.term_article_id, t.created_at, t.updated_at,
      t.created_by,
      a.html_content as article_html,
      a.excerpt as article_excerpt,
      a.category_id,
      a.presentation_path,
      a.updated_at as article_updated_at,
      c.title as category_title,
      c.slug as category_slug,
      c.icon as category_icon,
      c.color as category_color,
      u.login as author_login
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.slug = ?
  `).get(slug) as any

  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  return {
    ...term,
    aliases: term.aliases ? JSON.parse(term.aliases) : [],
    has_article: Boolean(term.term_article_id),
  }
})
