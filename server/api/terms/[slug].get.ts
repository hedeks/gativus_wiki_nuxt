/**
 * GET /api/terms/:slug
 * Get a single term by slug, including its linked article content if present.
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const lang = (query.lang as string) || 'ru'

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const term = await db.prepare(`
    SELECT
      t.id, t.slug, t.slug_ru, t.title, t.title_ru, t.aliases, t.definition, t.definition_ru,
      t.term_article_id, t.created_at, t.updated_at,
      t.created_by,
      a.html_content as article_html,
      a.excerpt as article_excerpt,
      a.category_id,
      a.presentation_path,
      a.updated_at as article_updated_at,
      c.title as category_title,
      c.title_ru as category_title_ru,
      c.slug as category_slug,
      c.slug_ru as category_slug_ru,
      c.icon as category_icon,
      c.color as category_color,
      u.login as author_login
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.slug = ? OR t.slug_ru = ?
  `).get(slug, slug) as any

  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  const isRu = lang === 'ru'

  return {
    ...term,
    title: (isRu && term.title_ru) ? term.title_ru : term.title,
    definition: (isRu && term.definition_ru) ? term.definition_ru : term.definition,
    category_title: (isRu && term.category_title_ru) ? term.category_title_ru : term.category_title,
    aliases: term.aliases ? JSON.parse(term.aliases) : [],
    has_article: Boolean(term.term_article_id),
  }
}
)
