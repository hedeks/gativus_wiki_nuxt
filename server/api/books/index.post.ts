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
    cover_image, category_ids 
  } = body

  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'title (English) обязателен' })
  }

  const baseSlug = body.slug ? slugify(body.slug) : slugify(title)
  const slug = await ensureUniqueSlug(db, 'books', baseSlug)

  let sort_order = Number(body.sort_order || 0)
  const sort_position = body.sort_position || 'at_end'

  if (sort_position === 'at_end') {
    const maxRow = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM books').get() as { max_sort: number }
    sort_order = maxRow.max_sort + 1
  } else if (sort_position.startsWith('before_')) {
    const targetId = Number(sort_position.replace('before_', ''))
    const targetBook = await db.prepare('SELECT sort_order FROM books WHERE id = ?').get(targetId) as { sort_order: number } | undefined
    if (targetBook) {
      const k = targetBook.sort_order
      await db.prepare('UPDATE books SET sort_order = sort_order + 1 WHERE sort_order >= ?').run(k)
      sort_order = k
    } else {
      const maxRow = await db.prepare('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM books').get() as { max_sort: number }
      sort_order = maxRow.max_sort + 1
    }
  }

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
    cover_image || null, sort_order
  )

  const row = await db.prepare('SELECT id FROM books WHERE slug = ?').get(slug) as { id: number }
  const bookId = row ? Number(row.id) : 0
  if (!bookId) {
    throw createError({ statusCode: 500, statusMessage: 'Не удалось получить ID созданной книги' })
  }

  // ─── 2. Handle many-to-many categories ───
  if (Array.isArray(category_ids) && category_ids.length > 0) {
    const insertStmt = db.prepare(`INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)`)
    for (const catId of category_ids) {
      await insertStmt.run(bookId, catId)
    }
  }

  return { id: bookId, slug, title, message: 'Книга создана' }
})
