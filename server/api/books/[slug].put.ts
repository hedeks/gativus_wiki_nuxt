/**
 * PUT /api/books/:slug
 * Update a book. Role: editor+.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const existing = await db.prepare('SELECT id, slug FROM books WHERE slug = ?').get(slug) as any
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })
  }

  const updates: string[] = []
  const params: any[] = []

  if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title) }
  if (body.title_ru !== undefined) { updates.push('title_ru = ?'); params.push(body.title_ru) }
  if (body.title_zh !== undefined) { updates.push('title_zh = ?'); params.push(body.title_zh) }
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
  if (body.description_ru !== undefined) { updates.push('description_ru = ?'); params.push(body.description_ru) }
  if (body.description_zh !== undefined) { updates.push('description_zh = ?'); params.push(body.description_zh) }
  if (body.cover_image !== undefined) { updates.push('cover_image = ?'); params.push(body.cover_image) }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(body.sort_order) }

  if (body.slug && body.slug !== existing.slug) {
    const newSlug = await ensureUniqueSlug(db, 'books', slugify(body.slug), existing.id)
    updates.push('slug = ?')
    params.push(newSlug)
  }

  // ─── 2. Update book record ───
  if (updates.length > 0) {
    await db.prepare(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`).run(...params, existing.id)
  }

  // ─── 3. Sync categories ───
  if (body.category_ids !== undefined) {
    const categoryIds = Array.isArray(body.category_ids) ? body.category_ids : []
    // Delete existing
    await db.prepare('DELETE FROM book_categories WHERE book_id = ?').run(existing.id)
    // Insert new
    if (categoryIds.length > 0) {
      const insertStmt = db.prepare('INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)')
      for (const catId of categoryIds) {
        await insertStmt.run(existing.id, catId)
      }
    }
  }

  return { message: 'Книга обновлена' }
})
