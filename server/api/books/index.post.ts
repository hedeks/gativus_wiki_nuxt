/**
 * POST /api/books
 * Create a new book. Role: editor+.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { 
    title, title_ru, title_zh, 
    description, description_ru, description_zh, 
    cover_image, sort_order, category_ids 
  } = body

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title (English) обязателен' })
  }

  const baseSlug = body.slug ? slugify(body.slug) : slugify(title)
  const slug = await ensureUniqueSlug(db, 'books', baseSlug)

  const result = await db.prepare(`
    INSERT INTO books (
      slug, title, title_ru, title_zh, 
      description, description_ru, description_zh, 
      cover_image, sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug, title, title_ru || null, title_zh || null, 
    description || null, description_ru || null, description_zh || null, 
    cover_image || null, sort_order || 0
  )

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
