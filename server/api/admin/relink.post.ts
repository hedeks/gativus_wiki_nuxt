/**
 * POST /api/admin/relink-articles
 * Version: 1.0.1 (Rebuild trigger)
 * Re-run term auto-linking on ALL published, non-term articles.
 * Role: admin.
 */

import { buildTermsMap, linkTermsInHtml } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  // Load all terms into a map
  const termsMap = await buildTermsMap(db)

  if (termsMap.size === 0) {
    return { updated: 0, message: 'Нет терминов для линковки' }
  }

  // Get all published content articles (exclude term articles)
  const articles = await db.prepare(`
    SELECT id, html_content FROM articles
    WHERE is_published = 1 AND (is_term_article = 0 OR is_term_article IS NULL)
  `).all() as any[]

  let updated = 0
  let relationshipsCreated = 0

  for (const article of articles || []) {
    const { html: linkedHtml, linkedTermIds } = linkTermsInHtml(article.html_content, termsMap)
    
    // 1. Update HTML content if changed
    if (linkedHtml !== article.html_content) {
      await db.prepare(`
        UPDATE articles SET html_content = ?, updated_at = datetime('now') WHERE id = ?
      `).run(linkedHtml, article.id)
      updated++
    }

    // 2. Synchronize article_terms table for Knowledge Graph
    // We clear and rebuild to ensure perfect sync with the current HTML
    await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(article.id)
    
    if (linkedTermIds.length > 0) {
      const insertStmt = db.prepare('INSERT INTO article_terms (article_id, term_id) VALUES (?, ?)')
      for (const termId of linkedTermIds) {
        insertStmt.run(article.id, termId)
        relationshipsCreated++
      }
    }
  }

  return {
    updated,
    relationshipsCreated,
    total: (articles || []).length,
    message: `Обновлено статей: ${updated}. Создано связей для графа: ${relationshipsCreated}.`,
  }
})
