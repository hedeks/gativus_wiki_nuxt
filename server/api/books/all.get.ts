// server/api/books/all.get.ts

/**
 * GET /api/books/all
 * Returns ALL books with category relations and article counts.
 */

export default defineEventHandler(async (event) => {
    const db = useDatabase()
    const query = getQuery(event)
  
    const lang = (query.lang as string) || (query.locale as string) || 'ru'
  
    // Books
    const books = await db.prepare(`
      SELECT 
        b.id,
        b.slug,
        b.title,
        b.title_ru,
        b.title_zh,
        b.description,
        b.description_ru,
        b.description_zh,
        b.cover_image,
        b.sort_order,
        b.created_at
      FROM books b
      ORDER BY b.sort_order ASC, b.title ASC
    `).all() as any[]
  
    // Book ↔ Category relations
    const bookCategories = await db.prepare(`
      SELECT book_id, category_id FROM book_categories
    `).all() as { book_id: number; category_id: number }[]
  
    const categoryMap = new Map<number, number[]>()
    for (const bc of bookCategories) {
      if (!categoryMap.has(bc.book_id)) {
        categoryMap.set(bc.book_id, [])
      }
      categoryMap.get(bc.book_id)!.push(bc.category_id)
    }
  
    // Article counts per book
    const articleCounts = await db.prepare(`
      SELECT book_id, COUNT(*) AS count
      FROM articles
      WHERE book_id IS NOT NULL
      GROUP BY book_id
    `).all() as { book_id: number; count: number }[]
  
    const countMap = new Map<number, number>()
    for (const ac of articleCounts) {
      countMap.set(ac.book_id, ac.count)
    }
  
    const isRu = lang === 'ru'
    const isZh = lang === 'zh'
  
    return (books || []).map((b: any) => ({
      id: b.id,
      slug: b.slug,
      title: resolveLocalized(b.title, b.title_ru, b.title_zh, isRu, isZh),
      description:
        resolveLocalized(b.description, b.description_ru, b.description_zh, isRu, isZh) || '',
      cover_image: b.cover_image || null,
      category_ids: categoryMap.get(b.id) || [],
      article_count: countMap.get(b.id) || 0,
      sort_order: b.sort_order,
      created_at: b.created_at,
    }))
  })
  
  function resolveLocalized(
    en: string | null,
    ru: string | null | undefined,
    zh: string | null | undefined,
    isRu: boolean,
    isZh: boolean
  ): string | null {
    if (isRu && ru) return ru
    if (isZh && zh) return zh
    return en || null
  }