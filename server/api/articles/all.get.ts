// server/api/articles/all.get.ts

/**
 * GET /api/articles/all
 * Returns ALL articles for client-side filtering.
 */

export default defineEventHandler(async (event) => {
    const db = useDatabase()
    const query = getQuery(event)
  
    const lang = (query.lang as string) || (query.locale as string) || 'ru'
  
    const auth = event.context.auth
    const isEditor = auth && (auth.role === 'editor' || auth.role === 'admin')
  
    const conditions: string[] = []
    const params: any[] = []
  
    // Hide unpublished from public
    if (!isEditor) {
      conditions.push('a.is_published = 1')
    }
  
    // Hide term-articles from main listing
    conditions.push('(a.is_term_article = 0 OR a.is_term_article IS NULL)')
  
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  
    const items = await db.prepare(`
      SELECT 
        a.id,
        a.slug,
        a.title,
        a.title_ru,
        a.title_zh,
        a.excerpt,
        a.book_id,
        a.category_id,
        a.sort_order,
        a.is_published,
        a.is_term_article,
        a.created_at,
        a.updated_at,
        a.presentation_path,
        a.presentation_path_ru,
        a.presentation_path_zh,
        b.title AS book_title_en,
        b.title_ru AS book_title_ru,
        b.title_zh AS book_title_zh,
        c.title AS category_title,
        c.title_ru AS category_title_ru,
        c.icon AS category_icon,
        c.color AS category_color,
        c.slug AS category_slug
      FROM articles a
      LEFT JOIN books b ON a.book_id = b.id
      LEFT JOIN categories c ON a.category_id = c.id
      ${whereClause}
      ORDER BY a.sort_order ASC, a.updated_at DESC
    `).all(...params) as any[]
  
    const isRu = lang === 'ru'
    const isZh = lang === 'zh'
  
    return (items || []).map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      title_ru: a.title_ru,
      title_zh: a.title_zh,
      excerpt: a.excerpt || '',
      book_id: a.book_id,
      category_id: a.category_id,
      locale: 'global',
      sort_order: a.sort_order,
      is_published: a.is_published,
      is_term_article: a.is_term_article,
      created_at: a.created_at,
      updated_at: a.updated_at,
      presentation_path: a.presentation_path,
      presentation_path_ru: a.presentation_path_ru,
      presentation_path_zh: a.presentation_path_zh,
      // Resolved by language
      book_title: resolveLocalized(
        a.book_title_en,
        a.book_title_ru,
        a.book_title_zh,
        isRu,
        isZh
      ),
      category_title: resolveLocalized(
        a.category_title,
        a.category_title_ru,
        undefined,
        isRu,
        false
      ),
      category_icon: a.category_icon || null,
      category_color: a.category_color || null,
      category_slug: a.category_slug || null,
    }))
  })
  
  /**
   * Helper: picks the correct localized title.
   */
  function resolveLocalized(
    en: string | null,
    ru: string | null,
    zh: string | null | undefined,
    isRu: boolean,
    isZh: boolean
  ): string | null {
    if (isRu && ru) return ru
    if (isZh && zh) return zh
    return en || null
  }