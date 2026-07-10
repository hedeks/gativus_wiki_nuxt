/**
 * GET /api/categories/[slug]
 * Fetch a single category by its slug (supports localized slugs).
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const params = event.context.params || {}
  const slug = params.id || params.slug || Object.values(params)[0]
  const lang = (query.lang as string) || 'ru'

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Slug is required. Params were: ${JSON.stringify(params)}`,
    })
  }

  // Find the category where any of the localized slugs match
  const cat = await db.prepare(`
    SELECT id, slug, slug_ru, slug_zh, title, title_ru, title_zh, parent_id, description, description_ru, description_zh, icon, sort_order 
    FROM categories
    WHERE slug = ? OR slug_ru = ? OR slug_zh = ?
  `).get(slug, slug, slug) as any

  if (!cat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Category not found',
    })
  }

  const isRu = lang === 'ru'
  const isZh = lang === 'zh'
  
  let title = cat.title
  let catSlug = cat.slug
  let description = cat.description

  if (isRu) {
    title = cat.title_ru || cat.title
    catSlug = cat.slug_ru || cat.slug
    description = cat.description_ru || cat.description
  } else if (isZh) {
    title = cat.title_zh || cat.title
    catSlug = cat.slug_zh || cat.slug
    description = cat.description_zh || cat.description
  }

  return {
    ...cat,
    title,
    slug: catSlug,
    description
  }
})
