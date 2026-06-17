/**
 * POST /api/admin/articles/:id/reindex
 * Переиндексирует odt-heading-marker во всех языковых версиях статьи.
 * Body: { chapter_start: number, locale_en?, locale_ru?, locale_zh? }
 * Поддерживаемые локали: 'ru' | 'en' | 'zh' | 'none' (только цифра).
 */

import { reindexHeadingMarkers, type HeadingLocale } from '~/server/utils/reindexHeadingMarkers'
import { requireRole } from '~/server/utils/requireRole'
import { linkTermsInHtml, buildTermsMaps, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id статьи' })

  const body = await readBody(event) as {
    chapter_start: number
    locale_en?: HeadingLocale
    locale_ru?: HeadingLocale
    locale_zh?: HeadingLocale
  }

  const chapterStart = Number(body.chapter_start)
  if (!Number.isFinite(chapterStart) || chapterStart < 1)
    throw createError({ statusCode: 400, statusMessage: 'chapter_start должен быть числом ≥ 1' })

  const localeEn: HeadingLocale = body.locale_en ?? 'en'
  const localeRu: HeadingLocale = body.locale_ru ?? 'ru'
  const localeZh: HeadingLocale = body.locale_zh ?? 'zh'

  const article = await db.prepare(
    'SELECT id, html_content, html_content_ru, html_content_zh FROM articles WHERE id = ?',
  ).get(id) as { id: number; html_content: string | null; html_content_ru: string | null; html_content_zh: string | null } | undefined

  if (!article)
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })

  const termsMaps = await buildTermsMaps(db)

  let totalChanged = 0

  const rEn = article.html_content
    ? reindexHeadingMarkers(article.html_content, chapterStart, localeEn)
    : null
  const rRu = article.html_content_ru
    ? reindexHeadingMarkers(article.html_content_ru, chapterStart, localeRu)
    : null
  const rZh = article.html_content_zh
    ? reindexHeadingMarkers(article.html_content_zh, chapterStart, localeZh)
    : null

  if (rEn) totalChanged += rEn.changed
  if (rRu) totalChanged += rRu.changed
  if (rZh) totalChanged += rZh.changed

  const newEn = rEn ? linkTermsInHtml(rEn.html, termsMaps.en).html : null
  const newRu = rRu ? linkTermsInHtml(rRu.html, termsMaps.ru).html : null
  const newZh = rZh ? linkTermsInHtml(rZh.html, termsMaps.zh).html : null

  await db.prepare(`
    UPDATE articles SET
      html_content    = COALESCE(?, html_content),
      html_content_ru = COALESCE(?, html_content_ru),
      html_content_zh = COALESCE(?, html_content_zh),
      updated_at      = datetime('now')
    WHERE id = ?
  `).run(newEn, newRu, newZh, id)

  if (newEn) {
    const revNum = await db.prepare(
      'SELECT COALESCE(MAX(revision_num), 0) + 1 as n FROM article_revisions WHERE article_id = ?',
    ).get(id) as { n: number }
    await db.prepare(
      'INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by) VALUES (?, ?, ?, ?, ?)',
    ).run(id, newEn, revNum.n, `Переиндексация: глава ${chapterStart}`, auth.id)
  }

  await syncArticleTermsFromArticleRow(db, id, termsMaps)

  return {
    ok: true,
    chapterStart,
    localeEn,
    localeRu,
    localeZh,
    markersChanged: totalChanged,
    html_content: newEn,
    html_content_ru: newRu,
    html_content_zh: newZh,
  }
})
