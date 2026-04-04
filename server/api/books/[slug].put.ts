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
  if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description) }
  if (body.cover_image !== undefined) { updates.push('cover_image = ?'); params.push(body.cover_image) }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); params.push(body.sort_order) }
  if (body.locale !== undefined) { updates.push('locale = ?'); params.push(body.locale) }

  if (body.slug && body.slug !== existing.slug) {
    const newSlug = await ensureUniqueSlug(db, 'books', slugify(body.slug), existing.id)
    updates.push('slug = ?')
    params.push(newSlug)
  }

  if (updates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Нет данных для обновления' })
  }

  await db.prepare(`UPDATE books SET ${updates.join(', ')} WHERE id = ?`).run(...params, existing.id)

  return { message: 'Книга обновлена' }
})
