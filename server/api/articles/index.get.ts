/**
 * GET /api/articles
 * List articles with pagination, filtering, and search.
 * Public endpoint (unpublished articles hidden unless editor+).
 */

import { isEditorOrAbove } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)

  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20))
  const offset = (page - 1) * limit

  const bookId = query.book_id ? parseInt(query.book_id as string) : null
  const categoryId = query.category_id ? parseInt(query.category_id as string) : null
  const lang = (query.lang as string) || (query.locale as string) || null
  const search = (query.search as string) || null
  const publishedOnly = query.published_only !== 'false'
  const includeTermArticles = query.include_term_articles === 'true'
  // translation_filter: 'all' | 'complete' | 'incomplete' | 'missing_ru' | 'missing_zh'
  const translationFilter = (query.translation_filter as string) || null

  // Check if user is editor+
  const auth = event.context.auth
  const isEditor = auth && isEditorOrAbove(auth.role)

  // Build WHERE clause
  const conditions: string[] = []
  const params: any[] = []

  if (publishedOnly && !isEditor) {
    conditions.push('a.is_published = 1')
  }
  // Hide term-articles from public listings by default
  if (!includeTermArticles) {
    conditions.push('(a.is_term_article = 0 OR a.is_term_article IS NULL)')
  }
  if (bookId) {
    conditions.push('a.book_id = ?')
    params.push(bookId)
  }
  if (categoryId) {
    conditions.push('a.category_id = ?')
    params.push(categoryId)
  }
  
  if (search) {
    conditions.push('(a.title LIKE ? COLLATE NOCASE OR a.excerpt LIKE ? COLLATE NOCASE)')
    params.push(`%${search}%`, `%${search}%`)
  }
  if (translationFilter === 'complete') {
    conditions.push('(a.translation_valid_en = 1 AND a.translation_valid_ru = 1 AND a.translation_valid_zh = 1)')
  } else if (translationFilter === 'incomplete') {
    conditions.push('NOT (a.translation_valid_en = 1 AND a.translation_valid_ru = 1 AND a.translation_valid_zh = 1)')
  } else if (translationFilter === 'missing_ru') {
    conditions.push('(a.translation_valid_ru = 0 OR a.translation_valid_ru IS NULL)')
  } else if (translationFilter === 'missing_zh') {
    conditions.push('(a.translation_valid_zh = 0 OR a.translation_valid_zh IS NULL)')
  }

  const whereClause = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : ''

  // Count total
  const countResult = await db.prepare(
    `SELECT COUNT(*) as count FROM articles a ${whereClause}`
  ).get(...params) as any

  const total = countResult?.count || 0
  const pages = Math.ceil(total / limit)

  // Fetch items
  const items = await db.prepare(`
    SELECT 
      a.id, a.slug, a.title, a.excerpt, a.book_id, a.category_id,
      a.sort_order, a.is_published, a.is_term_article, a.created_at, a.updated_at, a.presentation_path,
      COALESCE(a.translation_valid_en, 1) as translation_valid_en,
      COALESCE(a.translation_valid_ru, 0) as translation_valid_ru,
      COALESCE(a.translation_valid_zh, 0) as translation_valid_zh,
      b.title as book_title_en,
      b.title_ru as book_title_ru,
      b.title_zh as book_title_zh,
      c.title as category_title,
      c.title_ru as category_title_ru
    FROM articles a
    LEFT JOIN books b ON a.book_id = b.id
    LEFT JOIN categories c ON a.category_id = c.id
    ${whereClause}
    ORDER BY a.sort_order ASC, a.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[]

  return {
    items: (items || []).map(a => {
      const isRu = lang === 'ru'
      const isZh = lang === 'zh'
      return {
        ...a,
        locale: 'global',
        book_title: (isRu ? a.book_title_ru : (isZh ? a.book_title_zh : a.book_title_en)) || a.book_title_en,
        category_title: (isRu && a.category_title_ru) ? a.category_title_ru : a.category_title
      }
    }),
    total,
    page,
    pages,
  }
})
