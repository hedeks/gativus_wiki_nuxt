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
      (SELECT COUNT(*) FROM articles a WHERE a.book_id = b.id AND a.is_published = 1) as article_count,
      (
        SELECT GROUP_CONCAT(category_id) 
        FROM book_categories 
        WHERE book_id = b.id
      ) as category_ids,
      (
        SELECT CASE 
          WHEN COUNT(p.id) = 0 THEN 0 
          WHEN SUM(
            CASE 
              WHEN p.imported_article_ids IS NOT NULL AND json_valid(p.imported_article_ids) = 1 AND EXISTS (
                SELECT 1 FROM json_each(p.imported_article_ids)
              ) AND NOT EXISTS (
                SELECT 1 
                FROM json_each(p.imported_article_ids) je
                LEFT JOIN articles a ON a.id = je.value
                WHERE a.id IS NULL OR COALESCE(a.translation_valid_en, 1) = 0
              ) THEN 1
              ELSE 0 
            END
          ) = COUNT(p.id) THEN 1
          ELSE 0 
        END
        FROM odm_project_parts p
        WHERE p.project_id = (SELECT id FROM odm_projects WHERE book_id = b.id ORDER BY id DESC LIMIT 1) AND p.is_enabled = 1
      ) as all_translated_en,
      (
        SELECT CASE 
          WHEN COUNT(p.id) = 0 THEN 0 
          WHEN SUM(
            CASE 
              WHEN p.imported_article_ids IS NOT NULL AND json_valid(p.imported_article_ids) = 1 AND EXISTS (
                SELECT 1 FROM json_each(p.imported_article_ids)
              ) AND NOT EXISTS (
                SELECT 1 
                FROM json_each(p.imported_article_ids) je
                LEFT JOIN articles a ON a.id = je.value
                WHERE a.id IS NULL OR COALESCE(a.translation_valid_ru, 0) = 0
              ) THEN 1
              ELSE 0 
            END
          ) = COUNT(p.id) THEN 1
          ELSE 0 
        END
        FROM odm_project_parts p
        WHERE p.project_id = (SELECT id FROM odm_projects WHERE book_id = b.id ORDER BY id DESC LIMIT 1) AND p.is_enabled = 1
      ) as all_translated_ru,
      (
        SELECT CASE 
          WHEN COUNT(p.id) = 0 THEN 0 
          WHEN SUM(
            CASE 
              WHEN p.imported_article_ids IS NOT NULL AND json_valid(p.imported_article_ids) = 1 AND EXISTS (
                SELECT 1 FROM json_each(p.imported_article_ids)
              ) AND NOT EXISTS (
                SELECT 1 
                FROM json_each(p.imported_article_ids) je
                LEFT JOIN articles a ON a.id = je.value
                WHERE a.id IS NULL OR COALESCE(a.translation_valid_zh, 0) = 0
              ) THEN 1
              ELSE 0 
            END
          ) = COUNT(p.id) THEN 1
          ELSE 0 
        END
        FROM odm_project_parts p
        WHERE p.project_id = (SELECT id FROM odm_projects WHERE book_id = b.id ORDER BY id DESC LIMIT 1) AND p.is_enabled = 1
      ) as all_translated_zh
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
      count_en: b.article_count,
      count_ru: b.article_count,
      count_zh: b.article_count,
      all_translated_en: Number(b.all_translated_en || 0) === 1,
      all_translated_ru: Number(b.all_translated_ru || 0) === 1,
      all_translated_zh: Number(b.all_translated_zh || 0) === 1,
      category_ids: b.category_ids ? b.category_ids.split(',').map(Number) : []
    }
  })
})
