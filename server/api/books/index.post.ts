/**
 * POST /api/books
 * Create a new book. Role: editor+.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { title, description, cover_image, locale, sort_order } = body

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title обязателен' })
  }

  const baseSlug = body.slug ? slugify(body.slug) : slugify(title)
  const slug = await ensureUniqueSlug(db, 'books', baseSlug)

  const result = await db.prepare(`
    INSERT INTO books (slug, title, description, cover_image, sort_order, locale)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(slug, title, description || null, cover_image || null, sort_order || 0, locale || 'en')

  const bookId = (result as any).lastInsertRowid || (result as any).lastID

  return { id: bookId, slug, title, message: 'Книга создана' }
})
