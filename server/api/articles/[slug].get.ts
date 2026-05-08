/**
 * GET /api/articles/:slug
 * Get a single article by slug. Public.
 */

import { isEditorOrAbove } from '~/server/utils/requireRole'

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
    WHERE a.slug = ? OR a.slug_ru = ? OR a.slug_zh = ?
  `).get(slug, slug, slug) as any

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  // Non-editors can't see unpublished
  const auth = event.context.auth
  const isEditor = auth && isEditorOrAbove(auth.role)
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

  const localizeNavTitle = (row: any) => {
    if (!row) return null
    const t = row.title
    const tr = row.title_ru
    const tz = row.title_zh
    return {
      slug: row.slug,
      sort_order: row.sort_order,
      chapter_number: row.chapter_number != null ? Number(row.chapter_number) : null,
      title: String(isRu ? (tr || t) : isZh ? (tz || t) : (t || tr || tz || '')),
    }
  }

  const localizeChapterRow = (row: any) => {
    if (!row) return null
    const slugOut
      = isZh && row.slug_zh
        ? row.slug_zh
        : isRu && row.slug_ru
          ? row.slug_ru
          : row.slug
    return {
      slug: String(slugOut || row.slug),
      chapter_number: row.chapter_number != null ? Number(row.chapter_number) : null,
      title: String(
        isRu ? (row.title_ru || row.title) : isZh ? (row.title_zh || row.title) : (row.title || row.title_ru || row.title_zh || ''),
      ),
    }
  }

  const chapterRankSql = `
    (SELECT COUNT(*) FROM articles b
     WHERE b.book_id = articles.book_id
     AND (b.sort_order < articles.sort_order OR (b.sort_order = articles.sort_order AND b.id <= articles.id)))`

  const chapterRankSqlAliased = `
    (SELECT COUNT(*) FROM articles b
     WHERE b.book_id = a.book_id
     AND (b.sort_order < a.sort_order OR (b.sort_order = a.sort_order AND b.id <= a.id)))`

  let chapter_number: number | null = null

  // Get prev/next articles in the same book
  let prevArticle = null
  let nextArticle = null

  if (article.book_id) {
    const rankRow = await db.prepare(`
      SELECT COUNT(*) as n FROM articles
      WHERE book_id = ? AND (sort_order < ? OR (sort_order = ? AND id <= ?))
    `).get(article.book_id, article.sort_order, article.sort_order, article.id) as { n: number } | undefined
    chapter_number = rankRow?.n != null ? Number(rankRow.n) : null

    prevArticle = await db.prepare(`
      SELECT slug, title, title_ru, title_zh, sort_order, ${chapterRankSql} AS chapter_number FROM articles
      WHERE book_id = ? AND sort_order < ? AND is_published = 1
      ORDER BY sort_order DESC LIMIT 1
    `).get(article.book_id, article.sort_order) as any

    nextArticle = await db.prepare(`
      SELECT slug, title, title_ru, title_zh, sort_order, ${chapterRankSql} AS chapter_number FROM articles
      WHERE book_id = ? AND sort_order > ? AND is_published = 1
      ORDER BY sort_order ASC LIMIT 1
    `).get(article.book_id, article.sort_order) as any

    prevArticle = localizeNavTitle(prevArticle)
    nextArticle = localizeNavTitle(nextArticle)
  }

  let book_chapters: { slug: string; title: string; chapter_number: number }[] | null = null
  if (article.book_id) {
    const chapterRows = await db.prepare(`
      SELECT a.slug, a.slug_ru, a.slug_zh, a.title, a.title_ru, a.title_zh, a.sort_order, a.id,
        (${chapterRankSqlAliased}) AS chapter_number
      FROM articles a
      WHERE a.book_id = ? AND (a.is_published = 1 OR a.id = ?)
      ORDER BY a.sort_order ASC, a.id ASC
    `).all(article.book_id, article.id) as any[]
    book_chapters = (chapterRows || [])
      .map(localizeChapterRow)
      .filter((x): x is { slug: string; title: string; chapter_number: number } => x != null && !!x.slug)
      .map(x => ({
        slug: x.slug,
        title: x.title,
        chapter_number: x.chapter_number != null && Number.isFinite(x.chapter_number) ? x.chapter_number : 0,
      }))
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
})
