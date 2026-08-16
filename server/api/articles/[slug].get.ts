/**
 * GET /api/articles/:slug
 * Get a single article by slug. Public.
 */

import { isEditorOrAbove } from '~/server/utils/requireRole'

export default defineCachedEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const lang = (query.lang as string) || 'en'

  if (!['en', 'ru', 'zh'].includes(lang)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid language' })
  }

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Slug is required' })
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
    WHERE a.slug = ? OR a.slug_ru = ? OR a.slug_zh = ?
  `).get(slug, slug, slug) as any

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Статья не найдена' })
  }

  // Non-editors can't see unpublished
  const auth = event.context.auth
  const isEditor = auth && isEditorOrAbove(auth.role)
  if (!article.is_published && !isEditor) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Статья не найдена' })
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

  const htmlEn = article.html_content
  const htmlRu = article.html_content_ru
  const htmlZh = article.html_content_zh
  article.html_content = String(
    isRu ? (htmlRu || htmlEn || '') : isZh ? (htmlZh || htmlEn || '') : (htmlEn || htmlRu || htmlZh || ''),
  )
  delete article.html_content_ru
  delete article.html_content_zh

  article.title = String(
    isRu ? (article.title_ru || article.title) : isZh ? (article.title_zh || article.title) : (article.title || article.title_ru || article.title_zh || ''),
  )
  delete article.title_ru
  delete article.title_zh

  const excerptEn = article.excerpt
  const excerptRu = article.excerpt_ru
  const excerptZh = article.excerpt_zh
  article.excerpt = String(
    isRu ? (excerptRu || excerptEn || '') : isZh ? (excerptZh || excerptEn || '') : (excerptEn || excerptRu || excerptZh || ''),
  )
  delete article.excerpt_ru
  delete article.excerpt_zh

  const localizeNavTitle = (row: any, rank?: number) => {
    if (!row) return null
    const t = row.title
    const tr = row.title_ru
    const tz = row.title_zh
    return {
      slug: row.slug,
      sort_order: row.sort_order,
      chapter_number: rank != null ? rank : (row.chapter_number != null ? Number(row.chapter_number) : null),
      title: String(isRu ? (tr || t) : isZh ? (tz || t) : (t || tr || tz || '')),
    }
  }

  const localizeChapterRow = (row: any, rank: number) => {
    if (!row) return null
    const slugOut
      = isZh && row.slug_zh
        ? row.slug_zh
        : isRu && row.slug_ru
          ? row.slug_ru
          : row.slug
    return {
      slug: String(slugOut || row.slug),
      slug_canonical: String(row.slug),
      chapter_number: rank,
      title: String(
        isRu ? (row.title_ru || row.title) : isZh ? (row.title_zh || row.title) : (row.title || row.title_ru || row.title_zh || ''),
      ),
    }
  }

  let chapter_number: number | null = null
  let prevArticle = null
  let nextArticle = null
  let book_chapters: { slug: string; slug_canonical: string; title: string; chapter_number: number }[] | null = null

  if (article.book_id) {
    // Single fast query for all chapters of the book (editors see drafts, guests only published)
    const rawChapters = (await db.prepare(`
      SELECT id, slug, slug_ru, slug_zh, title, title_ru, title_zh, sort_order, is_published
      FROM articles
      WHERE book_id = ? AND (is_published = 1 OR ? = 1 OR id = ?)
      ORDER BY sort_order ASC, id ASC
    `).all(article.book_id, isEditor ? 1 : 0, article.id)) as any[]

    const chaptersList = isEditor
      ? (rawChapters || [])
      : (rawChapters || []).filter(c => c.is_published === 1 || c.id === article.id)
    const currentIdx = chaptersList.findIndex(c => c.id === article.id)

    if (currentIdx !== -1) {
      chapter_number = currentIdx + 1

      // Find previous chapter (published for guests, any for editors)
      for (let i = currentIdx - 1; i >= 0; i--) {
        if (isEditor || chaptersList[i].is_published === 1) {
          prevArticle = localizeNavTitle(chaptersList[i], i + 1)
          break
        }
      }

      // Find next chapter (published for guests, any for editors)
      for (let i = currentIdx + 1; i < chaptersList.length; i++) {
        if (isEditor || chaptersList[i].is_published === 1) {
          nextArticle = localizeNavTitle(chaptersList[i], i + 1)
          break
        }
      }
    }

    book_chapters = chaptersList
      .map((row, idx) => localizeChapterRow(row, idx + 1))
      .filter((x): x is { slug: string; slug_canonical: string; title: string; chapter_number: number } => x != null && !!x.slug)
  }

  return {
    ...article,
    locale: 'global',
    is_published: Boolean(article.is_published),
    chapter_number,
    prev: prevArticle || null,
    next: nextArticle || null,
    book_chapters,
  }
}, {
  maxAge: 3600,
  name: 'articles',
  shouldBypassCache: (event) => {
    const role = event.context.auth?.role
    return role === 'admin' || role === 'editor'
  },
  getKey: (event) => {
    const role = event.context.auth?.role || 'guest'
    const slug = getRouterParam(event, 'slug')
    const lang = getQuery(event).lang || 'en'
    // Normalize lang to prevent cache key explosion
    const safeLang = ['en', 'ru', 'zh'].includes(lang as string) ? lang : 'en'
    return `${slug}_role_${role}_lang_${safeLang}`
  }
})
