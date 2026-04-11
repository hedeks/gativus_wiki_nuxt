/**
 * DELETE /api/categories/:id
 * Delete a category.
 * Moves children to the parent of the deleted category.
 * Protected: required admin role.
 */

export default defineEventHandler(async (event) => {
  // Check auth
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden (Admin ONLY)' })
  }

  const db = useDatabase()
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID is required' })
  }

  // Get current category to know its parent
  const category = await db.prepare('SELECT parent_id FROM categories WHERE id = ?').get(id) as any
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  // Move children to the parent of the deleted category
  await db.prepare('UPDATE categories SET parent_id = ? WHERE parent_id = ?').run(category.parent_id, id)

  // Unlink from articles (set to NULL as per migration ON DELETE SET NULL, but being explicit here)
  await db.prepare('UPDATE articles SET category_id = NULL WHERE category_id = ?').run(id)
  
  // Unlink from book_categories
  await db.prepare('DELETE FROM book_categories WHERE category_id = ?').run(id)

  // Delete the category
  await db.prepare('DELETE FROM categories WHERE id = ?').run(id)

  return {
    message: 'Category deleted successfully'
  }
})
