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
    SELECT id, slug, slug_ru, slug_zh, title, title_ru, title_zh, parent_id, description, description_ru, description_zh, icon, sort_order 
    FROM categories
    ORDER BY sort_order ASC, title ASC
  `).all() as any[]

  const isRu = lang === 'ru'
  const isZh = lang === 'zh'
  const mappedCategories = categories.map(cat => {
    let title = cat.title
    let slug = cat.slug
    let description = cat.description

    if (isRu) {
      title = cat.title_ru || cat.title
      slug = cat.slug_ru || cat.slug
      description = cat.description_ru || cat.description
    } else if (isZh) {
      title = cat.title_zh || cat.title
      slug = cat.slug_zh || cat.slug
      description = cat.description_zh || cat.description
    }

    return {
      ...cat,
      title,
      slug,
      description
    }
  })

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
