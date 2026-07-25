/**
 * POST /api/admin/relink-term/[id]
 * Re-run term auto-linking on ALL articles that MIGHT contain this term.
 * This is much faster than global relink because it filters articles via LIKE.
 */

import { buildTermsMaps, linkTermsInHtml, mergeMentionCountMaps, replaceArticleTermMentions } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  
  const idStr = getRouterParam(event, 'id')
  const termId = Number(idStr)
  if (!termId) throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Неверный ID термина' })

  const term = await db.prepare('SELECT * FROM terms WHERE id = ?').get(termId) as any
  if (!term) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Термин не найден' })

  const termsMaps = await buildTermsMaps(db)

  // Collect all possible variations (title, aliases, slug) to search in articles
  const searchStrings: string[] = [term.slug]
  if (term.title) searchStrings.push(term.title)
  if (term.title_ru) searchStrings.push(term.title_ru)
  if (term.title_zh) searchStrings.push(term.title_zh)
  
  const tryParseAliases = (str: string) => {
    try { return JSON.parse(str) || [] } catch { return [] }
  }
  if (term.aliases) searchStrings.push(...tryParseAliases(term.aliases))
  if (term.aliases_ru) searchStrings.push(...tryParseAliases(term.aliases_ru))
  if (term.aliases_zh) searchStrings.push(...tryParseAliases(term.aliases_zh))

  // Filter out short strings (e.g. < 3 chars) to avoid full table scan matches on common letters
  // but since we must find them, we will include them. Just unique them.
  const uniqueSearches = Array.from(new Set(searchStrings.map(s => String(s).trim().toLowerCase()))).filter(Boolean)

  if (uniqueSearches.length === 0) {
    return { updated: 0, message: 'У термина нет данных для поиска' }
  }

  // Build LIKE clauses
  const likeClauses: string[] = []
  const values: string[] = []
  
  for (const s of uniqueSearches) {
    // We check all 3 HTML fields
    likeClauses.push('(LOWER(html_content) LIKE ? OR LOWER(html_content_ru) LIKE ? OR LOWER(html_content_zh) LIKE ?)')
    const likeVal = `%${s}%`
    values.push(likeVal, likeVal, likeVal)
  }

  const articles = await db.prepare(`
    SELECT id, html_content, html_content_ru, html_content_zh FROM articles
    WHERE ${likeClauses.join(' OR ')}
  `).all(...values) as any[]

  if (articles.length === 0) {
    return { updated: 0, relationshipsCreated: 0, total: 0, message: 'Статьи с упоминанием данного термина не найдены.' }
  }

  let updated = 0
  let relationshipRows = 0

  for (const article of articles) {
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
      updated++
    }

    const merged = mergeMentionCountMaps(maps)
    await replaceArticleTermMentions(db, article.id, merged)
    relationshipRows += merged.size
  }

  return {
    updated,
    relationshipsCreated: relationshipRows,
    total: articles.length,
    message: `Обработано статей-кандидатов: ${articles.length}. Обновлен HTML в: ${updated}.`,
  }
})
