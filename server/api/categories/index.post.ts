/**
 * POST /api/categories
 * Create a new category.
 * Protected: required editor+ role.
 */

import { slugify, ensureUniqueSlug } from '../../utils/slugify'
import { isEditorOrAbove } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  // Check auth
  const auth = event.context.auth
  if (!auth || !isEditorOrAbove(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDatabase()
  const body = await readBody(event)

  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const rawSlug = body.slug ? slugify(body.slug) : slugify(body.title)
  const slug = await ensureUniqueSlug(db, 'categories', rawSlug)

  let slug_ru = null
  if (body.slug_ru) {
    slug_ru = await ensureUniqueSlug(db, 'categories', slugify(body.slug_ru))
  }

  let slug_zh = null
  if (body.slug_zh) {
    slug_zh = await ensureUniqueSlug(db, 'categories', slugify(body.slug_zh))
  }

  const {
    title,
    title_ru = null,
    title_zh = null,
    parent_id = null,
    description = '',
    description_ru = null,
    description_zh = null,
    icon = 'i-heroicons-folder',
    sort_order = 0
  } = body

  await db.prepare(`
    INSERT INTO categories (slug, slug_ru, slug_zh, title, title_ru, title_zh, parent_id, description, description_ru, description_zh, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(slug, slug_ru, slug_zh, title, title_ru, title_zh, parent_id, description, description_ru, description_zh, icon, sort_order)

  const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any

  return {
    id: inserted?.id,
    slug,
    title,
    message: 'Category created successfully'
  }
})
