/**
 * POST /api/admin/relink
 * Re-run term auto-linking on ALL articles with content (en/ru/zh).
 * Role: admin.
 */

import { buildTermsMap, linkTermsInHtml, mergeMentionCountMaps, replaceArticleTermMentions } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  const termsMap = await buildTermsMap(db)

  if (termsMap.size === 0) {
    return { updated: 0, message: 'Нет терминов для линковки' }
  }

  const articles = await db.prepare(`
    SELECT id, html_content, html_content_ru, html_content_zh FROM articles
    WHERE (
      (html_content IS NOT NULL AND TRIM(html_content) != '')
      OR (html_content_ru IS NOT NULL AND TRIM(html_content_ru) != '')
      OR (html_content_zh IS NOT NULL AND TRIM(html_content_zh) != '')
    )
  `).all() as any[]

  let updated = 0
  let relationshipRows = 0

  for (const article of articles || []) {
    const maps: Array<Map<number, number>> = []
    let newEn = article.html_content
    let newRu = article.html_content_ru
    let newZh = article.html_content_zh
    let bodyChanged = false

    if (article.html_content?.trim()) {
      const r = linkTermsInHtml(article.html_content, termsMap)
      maps.push(r.mentionCountByTermId)
      if (r.html !== article.html_content) {
        newEn = r.html
        bodyChanged = true
      }
    }
    if (article.html_content_ru?.trim()) {
      const r = linkTermsInHtml(article.html_content_ru, termsMap)
      maps.push(r.mentionCountByTermId)
      if (r.html !== article.html_content_ru) {
        newRu = r.html
        bodyChanged = true
      }
    }
    if (article.html_content_zh?.trim()) {
      const r = linkTermsInHtml(article.html_content_zh, termsMap)
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
      updated++
    }

    const merged = mergeMentionCountMaps(maps)
    await replaceArticleTermMentions(db, article.id, merged)
    relationshipRows += merged.size
  }

  return {
    updated,
    relationshipsCreated: relationshipRows,
    total: (articles || []).length,
    message: `Обновлено статей (тело HTML): ${updated}. Связей статья–термин с mention_count: ${relationshipRows}.`,
  }
})
