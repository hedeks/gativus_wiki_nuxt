/**
 * PUT /api/categories/:id
 * Update an existing category.
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
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  }

  // Check if exists
  const existing = await db.prepare('SELECT id, slug, slug_ru, title, title_ru, description, description_ru, icon, sort_order, parent_id FROM categories WHERE id = ?').get(id) as any
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  let slug = existing.slug
  if (body.slug && body.slug !== existing.slug) {
    slug = await ensureUniqueSlug(db, 'categories', slugify(body.slug), parseInt(id))
  }

  let slug_ru = existing.slug_ru
  if (body.slug_ru !== undefined && body.slug_ru !== existing.slug_ru) {
    slug_ru = body.slug_ru ? await ensureUniqueSlug(db, 'categories', slugify(body.slug_ru), parseInt(id)) : null
  }

  const {
    title = existing.title,
    title_ru = existing.title_ru,
    parent_id = existing.parent_id,
    description = existing.description,
    description_ru = existing.description_ru,
    icon = existing.icon,
    sort_order = existing.sort_order
  } = body

  // Prevent circular dependency: parent_id cannot be the category itself
  if (parent_id === parseInt(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Category cannot be its own parent' })
  }

  await db.prepare(`
    UPDATE categories
    SET 
      slug = ?, 
      slug_ru = ?,
      title = ?, 
      title_ru = ?,
      parent_id = ?, 
      description = ?, 
      description_ru = ?,
      icon = ?, 
      sort_order = ?
    WHERE id = ?
  `).run(slug, slug_ru, title, title_ru, parent_id, description, description_ru, icon, sort_order, id)

  return {
    message: 'Category updated successfully',
    id,
    slug
  }
})
