/**
 * GET /api/books
 * List all books. Public.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const locale = (query.locale as string) || 'en'

  const books = await db.prepare(`
    SELECT 
      b.*,
      (SELECT COUNT(*) FROM articles a WHERE a.book_id = b.id AND a.is_published = 1 AND a.locale = 'en') as count_en,
      (SELECT COUNT(*) FROM articles a WHERE a.book_id = b.id AND a.is_published = 1 AND a.locale = 'ru') as count_ru,
      (SELECT COUNT(*) FROM articles a WHERE a.book_id = b.id AND a.is_published = 1 AND a.locale = 'zh') as count_zh,
      (
        SELECT GROUP_CONCAT(category_id) 
        FROM book_categories 
        WHERE book_id = b.id
      ) as category_ids
    FROM books b
    ORDER BY b.sort_order ASC, b.created_at ASC
  `).all() as any[]

  return (books || []).map(b => {
    // Map the requested localized string, fallback to en (the base columns)
    const title = b[`title_${locale}`] || b.title;
    const description = b[`description_${locale}`] || b.description;
    
    return {
      ...b,
      title,
      description,
      category_ids: b.category_ids ? b.category_ids.split(',').map(Number) : []
    }
  })
})
