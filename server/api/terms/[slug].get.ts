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

  let term = await db.prepare(`
    SELECT
      t.id, t.slug, t.slug_ru, t.slug_zh, t.title, t.title_ru, t.title_zh, 
      t.aliases, t.definition, t.definition_ru, t.definition_zh,
      t.term_article_id, t.created_at, t.updated_at,
      t.created_by, t.image_url, t.video_url, t.presentation_path, t.presentation_path_ru, t.presentation_path_zh,
      a.html_content as article_html,
      a.excerpt as article_excerpt,
      a.category_id,
      a.presentation_path as article_presentation_path,
      a.presentation_path_ru as article_presentation_path_ru,
      a.presentation_path_zh as article_presentation_path_zh,
      a.updated_at as article_updated_at,
      c.title as category_title,
      c.title_ru as category_title_ru,
      c.title_zh as category_title_zh,
      c.slug as category_slug,
      c.slug_ru as category_slug_ru,
      c.slug_zh as category_slug_zh,
      c.icon as category_icon,
      c.color as category_color,
      u.login as author_login
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.slug = ? OR t.slug_ru = ? OR t.slug_zh = ?
  `).get(slug, slug, slug) as any

  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  const isRu = lang === 'ru'
  const isZh = lang === 'zh'

  const effEn = term.presentation_path || term.article_presentation_path
  const effRu = term.presentation_path_ru || term.article_presentation_path_ru
  const effZh = term.presentation_path_zh || term.article_presentation_path_zh
  const resolvedPres = isRu ? (effRu || effEn) : isZh ? (effZh || effEn) : (effEn || effRu || effZh)

  const { article_presentation_path, article_presentation_path_ru, article_presentation_path_zh, ...rest } = term

  return {
    ...rest,
    title: isRu ? (term.title_ru || term.title) : (isZh ? (term.title_zh || term.title) : term.title),
    definition: isRu ? (term.definition_ru || term.definition) : (isZh ? (term.definition_zh || term.definition) : term.definition),
    category_title: isRu ? (term.category_title_ru || term.category_title) : (isZh ? (term.category_title_zh || term.category_title) : term.category_title),
    aliases: term.aliases ? JSON.parse(term.aliases) : [],
    has_article: Boolean(term.term_article_id),
    presentation_path: resolvedPres
  }
}
)
