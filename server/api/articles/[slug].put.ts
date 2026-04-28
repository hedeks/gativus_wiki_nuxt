/**
 * PUT /api/articles/:slug
 * Update an article. Role: editor+.
 * Creates a new revision on every save.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { buildTermsMap, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  // Find existing article
  const existing = await db.prepare('SELECT id, slug FROM articles WHERE slug = ?').get(slug) as any
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  const { title, title_ru, title_zh, slug_ru, slug_zh, html_content, html_content_ru, html_content_zh, book_id, category_id, is_published, sort_order, excerpt, change_summary, presentation_path, presentation_path_ru, presentation_path_zh } = body

  // Handle slug change
  let newSlug = existing.slug
  if (body.slug && body.slug !== existing.slug) {
    const baseSlug = slugify(body.slug)
    newSlug = await ensureUniqueSlug(db, 'articles', baseSlug, existing.id)
  }

  // ─── Phase 3: Auto-linking terms ───
  let processedHtml = html_content
  let processedHtmlRu = html_content_ru
  let processedHtmlZh = html_content_zh
  const termsMap = await buildTermsMap(db)

  if (html_content !== undefined) {
    const result = linkTermsInHtml(html_content, termsMap)
    processedHtml = result.html
  }
  
  if (html_content_ru !== undefined && html_content_ru !== null) {
    processedHtmlRu = linkTermsInHtml(html_content_ru, termsMap).html
  }
  
  if (html_content_zh !== undefined && html_content_zh !== null) {
    processedHtmlZh = linkTermsInHtml(html_content_zh, termsMap).html
  }

  const finalExcerpt = excerpt || (processedHtml ? generateExcerptFromHtml(processedHtml) : undefined)

  // Build update
  const updates: string[] = []
  const params: any[] = []

  if (title !== undefined) { updates.push('title = ?'); params.push(title) }
  if (title_ru !== undefined) { updates.push('title_ru = ?'); params.push(title_ru || null) }
  if (title_zh !== undefined) { updates.push('title_zh = ?'); params.push(title_zh || null) }
  if (slug_ru !== undefined) { updates.push('slug_ru = ?'); params.push(slug_ru || null) }
  if (slug_zh !== undefined) { updates.push('slug_zh = ?'); params.push(slug_zh || null) }
  if (html_content !== undefined) { updates.push('html_content = ?'); params.push(processedHtml) }
  if (html_content_ru !== undefined) { updates.push('html_content_ru = ?'); params.push(processedHtmlRu || null) }
  if (html_content_zh !== undefined) { updates.push('html_content_zh = ?'); params.push(processedHtmlZh || null) }
  if (newSlug !== existing.slug) { updates.push('slug = ?'); params.push(newSlug) }
  if (book_id !== undefined) { updates.push('book_id = ?'); params.push(book_id || null) }
  if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id || null) }
  if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order) }
  if (finalExcerpt !== undefined) { updates.push('excerpt = ?'); params.push(finalExcerpt) }
  if (presentation_path !== undefined) { updates.push('presentation_path = ?'); params.push(presentation_path) }
  if (presentation_path_ru !== undefined) { updates.push('presentation_path_ru = ?'); params.push(presentation_path_ru || null) }
  if (presentation_path_zh !== undefined) { updates.push('presentation_path_zh = ?'); params.push(presentation_path_zh || null) }

  updates.push("updated_at = datetime('now')")

  if (updates.length === 1) {
    throw createError({ statusCode: 400, statusMessage: 'Нет данных для обновления' })
  }

  await db.prepare(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`
  ).run(...params, existing.id)

  // ─── Phase 4: Sync Knowledge Graph (все локали, mention_count) ───
  if (html_content !== undefined || html_content_ru !== undefined || html_content_zh !== undefined) {
    syncArticleTermsFromArticleRow(db, existing.id, termsMap)
  }

  // Create new revision if html_content changed
  if (html_content !== undefined) {
    const lastRevision = await db.prepare(
      'SELECT MAX(revision_num) as max_num FROM article_revisions WHERE article_id = ?'
    ).get(existing.id) as any

    const nextNum = (lastRevision?.max_num || 0) + 1

    await db.prepare(`
      INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(existing.id, processedHtml, nextNum, change_summary || null, auth.id)
  }

  return {
    slug: newSlug,
    message: 'Статья обновлена'
  }
})

function generateExcerptFromHtml(html: string, maxLength = 200): string {
  const text = html.replace(/<[^>]*>/g, '').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}
