/**
 * GET /api/articles/:slug
 * Get a single article by slug. Public.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const article = await db.prepare(`
    SELECT 
      a.*,
      b.title as book_title,
      b.slug as book_slug,
      c.title as category_title,
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
    is_published: Boolean(article.is_published),
    prev: prevArticle || null,
    next: nextArticle || null,
  }
})
