/**
 * PUT /api/articles/:slug
 * Update an article. Role: editor+.
 * Creates a new revision on every save.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

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

  const { title, html_content, book_id, category_id, locale, is_published, sort_order, excerpt, change_summary } = body

  // Handle slug change
  let newSlug = existing.slug
  if (body.slug && body.slug !== existing.slug) {
    const baseSlug = slugify(body.slug)
    newSlug = await ensureUniqueSlug(db, 'articles', baseSlug, existing.id)
  }

  const finalExcerpt = excerpt || (html_content ? generateExcerptFromHtml(html_content) : undefined)

  // Build update
  const updates: string[] = []
  const params: any[] = []

  if (title !== undefined) { updates.push('title = ?'); params.push(title) }
  if (html_content !== undefined) { updates.push('html_content = ?'); params.push(html_content) }
  if (newSlug !== existing.slug) { updates.push('slug = ?'); params.push(newSlug) }
  if (book_id !== undefined) { updates.push('book_id = ?'); params.push(book_id || null) }
  if (category_id !== undefined) { updates.push('category_id = ?'); params.push(category_id || null) }
  if (locale !== undefined) { updates.push('locale = ?'); params.push(locale) }
  if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order) }
  if (finalExcerpt !== undefined) { updates.push('excerpt = ?'); params.push(finalExcerpt) }

  updates.push("updated_at = datetime('now')")

  if (updates.length === 1) {
    throw createError({ statusCode: 400, statusMessage: 'Нет данных для обновления' })
  }

  await db.prepare(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`
  ).run(...params, existing.id)

  // Create new revision if html_content changed
  if (html_content !== undefined) {
    const lastRevision = await db.prepare(
      'SELECT MAX(revision_num) as max_num FROM article_revisions WHERE article_id = ?'
    ).get(existing.id) as any

    const nextNum = (lastRevision?.max_num || 0) + 1

    await db.prepare(`
      INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(existing.id, html_content, nextNum, change_summary || null, auth.id)
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
