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
  const lang = (query.lang as string) || 'ru'

  // Fetch all categories ordered by sort_order
  const categories = await db.prepare(`
    SELECT id, slug, slug_ru, title, title_ru, parent_id, description, description_ru, icon, sort_order 
    FROM categories
    ORDER BY sort_order ASC, title ASC
  `).all() as any[]

  const isRu = lang === 'ru'
  const mappedCategories = categories.map(cat => ({
    ...cat,
    title: (isRu && cat.title_ru) ? cat.title_ru : cat.title,
    slug: (isRu && cat.slug_ru) ? cat.slug_ru : cat.slug,
    description: (isRu && cat.description_ru) ? cat.description_ru : cat.description
  }))

  if (!isTree) {
    return mappedCategories
  }

  // Build tree structure
  return buildCategoryTree(mappedCategories)
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
