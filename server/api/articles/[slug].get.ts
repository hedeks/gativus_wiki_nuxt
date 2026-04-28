/**
 * GET /api/articles/:slug
 * Get a single article by slug. Public.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const lang = (query.lang as string) || 'ru'

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  // 1. Initial lookup by slug
  let article = await db.prepare(`
    SELECT 
      a.*,
      b.title as book_title_en,
      b.title_ru as book_title_ru,
      b.title_zh as book_title_zh,
      b.slug as book_slug,
      c.title as category_title_en,
      c.title_ru as category_title_ru,
      c.title_zh as category_title_zh,
      c.slug as category_slug,
      u.login as author_login
    FROM articles a
    LEFT JOIN books b ON a.book_id = b.id
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.slug = ?
  `).get(slug) as any

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  // Non-editors can't see unpublished
  const auth = event.context.auth
  const isEditor = auth && (auth.role === 'editor' || auth.role === 'admin')
  if (!article.is_published && !isEditor) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  // 3. Localize Metadata
  const isRu = lang === 'ru'
  const isZh = lang === 'zh'
  article.book_title = isRu ? article.book_title_ru : (isZh ? article.book_title_zh : article.book_title_en)
  article.category_title = isRu ? article.category_title_ru : (isZh ? article.category_title_zh : article.category_title_en)

  const presEn = article.presentation_path
  const presRu = article.presentation_path_ru
  const presZh = article.presentation_path_zh
  article.presentation_path = isRu ? (presRu || presEn) : isZh ? (presZh || presEn) : (presEn || presRu || presZh)
  delete article.presentation_path_ru
  delete article.presentation_path_zh

  // Get prev/next articles in the same book
  let prevArticle = null
  let nextArticle = null

  if (article.book_id) {
    prevArticle = await db.prepare(`
      SELECT slug, title, sort_order FROM articles
      WHERE book_id = ? AND sort_order < ? AND is_published = 1
      ORDER BY sort_order DESC LIMIT 1
    `).get(article.book_id, article.sort_order) as any

    nextArticle = await db.prepare(`
      SELECT slug, title, sort_order FROM articles
      WHERE book_id = ? AND sort_order > ? AND is_published = 1
      ORDER BY sort_order ASC LIMIT 1
    `).get(article.book_id, article.sort_order) as any
  }

  return {
    ...article,
    locale: 'global',
    is_published: Boolean(article.is_published),
    prev: prevArticle || null,
    next: nextArticle || null,
  }
}
)
