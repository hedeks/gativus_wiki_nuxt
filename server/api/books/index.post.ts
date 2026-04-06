/**
 * POST /api/books
 * Create a new book. Role: editor+.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { title, description, cover_image, locale, sort_order, category_ids } = body

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

  // ─── 2. Handle many-to-many categories ───
  if (Array.isArray(category_ids) && category_ids.length > 0) {
    const insertStmt = db.prepare(`INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)`)
    for (const catId of category_ids) {
      await insertStmt.run(bookId, catId)
    }
  }

  return { id: bookId, slug, title, message: 'Книга создана' }
})
