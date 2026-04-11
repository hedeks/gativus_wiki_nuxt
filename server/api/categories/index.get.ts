/**
 * GET /api/categories
 * List all categories. Supports returning a flat list or a tree structure.
 * Query params: ?tree=1
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const isTree = query.tree === '1' || query.tree === 'true'

  // Fetch all categories ordered by sort_order
  const categories = await db.prepare(`
    SELECT id, slug, title, parent_id, description, icon, sort_order 
    FROM categories
    ORDER BY sort_order ASC, title ASC
  `).all() as any[]

  if (!isTree) {
    return categories
  }

  // Build tree structure
  return buildCategoryTree(categories)
})

/**
 * Helper to build a tree from a flat list of categories
 */
function buildCategoryTree(list: any[], parentId: number | null = null): any[] {
  return list
    .filter(item => item.parent_id === parentId)
    .map(item => ({
      ...item,
      children: buildCategoryTree(list, item.id)
    }))
}
