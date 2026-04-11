/**
 * PUT /api/categories/:id
 * Update an existing category.
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
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  }

  // Check if exists
  const existing = await db.prepare('SELECT id, slug FROM categories WHERE id = ?').get(id) as any
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  let slug = existing.slug
  if (body.slug && body.slug !== existing.slug) {
    slug = await ensureUniqueSlug(db, 'categories', slugify(body.slug), parseInt(id))
  } else if (body.title && body.title !== existing.title && !body.slug) {
    // Optionally re-generate slug if title changed and slug wasn't explicitly provided
    // But usually for SEO we keep the slug stable unless explicitly changed.
    // For now, only change if slug is in body.
  }

  const {
    title = existing.title,
    parent_id = existing.parent_id,
    description = existing.description,
    icon = existing.icon,
    sort_order = existing.sort_order
  } = body

  // Prevent circular dependency: parent_id cannot be the category itself
  if (parent_id === parseInt(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Category cannot be its own parent' })
  }

  await db.prepare(`
    UPDATE categories
    SET slug = ?, title = ?, parent_id = ?, description = ?, icon = ?, sort_order = ?
    WHERE id = ?
  `).run(slug, title, parent_id, description, icon, sort_order, id)

  return {
    message: 'Category updated successfully',
    id,
    slug
  }
})
