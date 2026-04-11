/**
 * POST /api/categories
 * Create a new category.
 * Protected: required editor+ role.
 */

import { slugify, ensureUniqueSlug } from '../../utils/slugify'

export default defineEventHandler(async (event) => {
  // Check auth
  const auth = event.context.auth
  if (!auth || (auth.role !== 'editor' && auth.role !== 'admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDatabase()
  const body = await readBody(event)

  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const rawSlug = body.slug ? slugify(body.slug) : slugify(body.title)
  const slug = await ensureUniqueSlug(db, 'categories', rawSlug)

  const {
    title,
    parent_id = null,
    description = '',
    icon = 'i-heroicons-folder',
    sort_order = 0
  } = body

  await db.prepare(`
    INSERT INTO categories (slug, title, parent_id, description, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(slug, title, parent_id, description, icon, sort_order)

  const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any

  return {
    id: inserted?.id,
    slug,
    title,
    message: 'Category created successfully'
  }
})
