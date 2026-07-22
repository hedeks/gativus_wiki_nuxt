/**
 * POST /api/admin/relink-article/[id]
 * Re-run term auto-linking on a SPECIFIC article.
 * Role: admin.
 */

import { buildTermsMaps, linkTermsInHtml, mergeMentionCountMaps, replaceArticleTermMentions } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  
  const idStr = getRouterParam(event, 'id')
  const id = Number(idStr)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Неверный ID статьи' })

  const article = await db.prepare(`
    SELECT id, html_content, html_content_ru, html_content_zh FROM articles WHERE id = ?
  `).get(id) as any
  
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Статья не найдена' })

  const termsMaps = await buildTermsMaps(db)

  if (termsMaps.en.size === 0 && termsMaps.ru.size === 0 && termsMaps.zh.size === 0) {
    return { updated: 0, message: 'Нет терминов для линковки' }
  }

  const maps: Array<Map<number, number>> = []
  let newEn = article.html_content
  let newRu = article.html_content_ru
  let newZh = article.html_content_zh
  let bodyChanged = false

  if (article.html_content?.trim()) {
    const r = linkTermsInHtml(article.html_content, termsMaps.en)
    maps.push(r.mentionCountByTermId)
    if (r.html !== article.html_content) {
      newEn = r.html
      bodyChanged = true
    }
  }
  if (article.html_content_ru?.trim()) {
    const r = linkTermsInHtml(article.html_content_ru, termsMaps.ru)
    maps.push(r.mentionCountByTermId)
    if (r.html !== article.html_content_ru) {
      newRu = r.html
      bodyChanged = true
    }
  }
  if (article.html_content_zh?.trim()) {
    const r = linkTermsInHtml(article.html_content_zh, termsMaps.zh)
    maps.push(r.mentionCountByTermId)
    if (r.html !== article.html_content_zh) {
      newZh = r.html
      bodyChanged = true
    }
  }

  if (bodyChanged) {
    await db.prepare(`
      UPDATE articles
      SET html_content = ?, html_content_ru = ?, html_content_zh = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      newEn ?? null,
      newRu ?? null,
      newZh ?? null,
      article.id,
    )
  }

  const merged = mergeMentionCountMaps(maps)
  await replaceArticleTermMentions(db, article.id, merged)

  return {
    success: true,
    relationshipsCreated: merged.size,
    bodyChanged,
    message: `Статья успешно перелинкована. Найдено уникальных терминов: ${merged.size}.`
  }
})
