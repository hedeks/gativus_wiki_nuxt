/**
 * PUT /api/categories/reorder
 * Batch update sort_order for categories.
 * Expects { orders: [ { id: 1, sort_order: 0 }, ... ] }
 * Protected: required editor+ role.
 */

import { isEditorOrAbove } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  // Check auth
  const auth = event.context.auth
  if (!auth || !isEditorOrAbove(auth.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const db = useDatabase()
  const body = await readBody(event)

  if (!body.orders || !Array.isArray(body.orders)) {
    throw createError({ statusCode: 400, statusMessage: 'Orders array is required' })
  }

  // Update in a transaction (simulated with manual loop for simplicity here, but atomic is better)
  for (const item of body.orders) {
    if (item.id && typeof item.sort_order === 'number') {
      await db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run(item.sort_order, item.id)
    }
  }

  return {
    message: 'Categories reordered successfully'
  }
})
