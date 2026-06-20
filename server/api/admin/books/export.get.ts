/**
 * GET /api/admin/books/export
 * Экспорт выбранных книг (и опционально их статей) в JSON (версия 1.3).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')
  const db = useDatabase()
  const query = getQuery(event)

  const includeArticles = query.include_articles === 'true'
  const idsParam = query.ids as string
  const bookIds: number[] = []

  let whereClause = ''
  const params: any[] = []

  if (idsParam) {
    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    if (ids.length > 0) {
      whereClause = `WHERE b.id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    } else {
      whereClause = `WHERE 1=0` // invalid ids
    }
  } else {
    const search = (query.search as string) || null
    const categoryId = query.category_id ? parseInt(query.category_id as string) : null

    const conditions: string[] = []

    if (search) {
      conditions.push('(b.title_ru LIKE ? COLLATE NOCASE OR b.title LIKE ? COLLATE NOCASE OR b.title_zh LIKE ? COLLATE NOCASE OR b.slug LIKE ? COLLATE NOCASE)')
      const s = `%${search}%`
      params.push(s, s, s, s)
    }
    
    // category_id filtering logic uses the book_categories table
    if (categoryId) {
      conditions.push(`EXISTS (SELECT 1 FROM book_categories bc WHERE bc.book_id = b.id AND bc.category_id = ?)`)
      params.push(categoryId)
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }
  }

  // 1. Books
  const booksRaw = await db.prepare(`
    SELECT b.*,
      (
        SELECT GROUP_CONCAT(c.slug) 
        FROM book_categories bc
        JOIN categories c ON bc.category_id = c.id
        WHERE bc.book_id = b.id
      ) as category_slugs
    FROM books b
    ${whereClause}
  `).all(...params) as any[]

  if (booksRaw.length === 0) {
    return {
      version: '1.3',
      timestamp: new Date().toISOString(),
      books: [],
      articles: []
    }
  }

  const books = booksRaw.map(b => ({
    slug: b.slug,
    slug_ru: b.slug_ru || null,
    slug_zh: b.slug_zh || null,
    title: b.title,
    title_ru: b.title_ru || null,
    title_zh: b.title_zh || null,
    description: b.description || null,
    description_ru: b.description_ru || null,
    description_zh: b.description_zh || null,
    cover_image: b.cover_image || null,
    category_slugs: b.category_slugs ? b.category_slugs.split(',') : [],
    sort_order: b.sort_order,
    translation_valid_en: b.translation_valid_en !== undefined ? b.translation_valid_en : 1,
    translation_valid_ru: b.translation_valid_ru !== undefined ? b.translation_valid_ru : 0,
    translation_valid_zh: b.translation_valid_zh !== undefined ? b.translation_valid_zh : 0,
    created_at: b.created_at || null,
    updated_at: b.updated_at || null
  }))

  const dump: any = {
    version: '1.3',
    timestamp: new Date().toISOString(),
    books: books
  }

  // 2. Articles (if requested)
  if (includeArticles) {
    const extractedBookIds = booksRaw.map(b => b.id)
    
    let articlesRaw: any[] = []
    let mentionsRaw: any[] = []
    
    if (extractedBookIds.length > 0) {
      const bookPlaceholders = extractedBookIds.map(() => '?').join(',')
      articlesRaw = await db.prepare(`
        SELECT a.*, c.slug as category_slug, b.slug as book_slug
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN books b ON a.book_id = b.id
        WHERE a.book_id IN (${bookPlaceholders})
      `).all(...extractedBookIds) as any[]
    }

    const articles = articlesRaw.map(a => ({
      slug: a.slug,
      slug_ru: a.slug_ru || null,
      slug_zh: a.slug_zh || null,
      title: a.title,
      title_ru: a.title_ru || null,
      title_zh: a.title_zh || null,
      excerpt: a.excerpt || null,
      excerpt_ru: a.excerpt_ru || null,
      excerpt_zh: a.excerpt_zh || null,
      html_content: a.html_content,
      html_content_ru: a.html_content_ru || null,
      html_content_zh: a.html_content_zh || null,
      raw_odt_path: a.raw_odt_path || null,
      presentation_path: a.presentation_path || null,
      presentation_path_ru: a.presentation_path_ru || null,
      presentation_path_zh: a.presentation_path_zh || null,
      category_slug: a.category_slug || null,
      book_slug: a.book_slug || null,
      is_published: a.is_published,
      is_term_article: a.is_term_article,
      sort_order: a.sort_order,
      locale: a.locale || null,
      translation_valid_en: a.translation_valid_en !== undefined ? a.translation_valid_en : 1,
      translation_valid_ru: a.translation_valid_ru !== undefined ? a.translation_valid_ru : 0,
      translation_valid_zh: a.translation_valid_zh !== undefined ? a.translation_valid_zh : 0,
      created_at: a.created_at || null,
      updated_at: a.updated_at || null,
    }))

    dump.articles = articles
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16)
  let filename = `gativus-books-export-${ts}.json`
  if (booksRaw.length === 1) {
    filename = `book-${books[0].slug}-${ts}.json`
  } else if (idsParam) {
    filename = `books-selected-${booksRaw.length}-${ts}.json`
  } else if (query.search) {
    const safeSearch = (query.search as string).replace(/[^a-z0-9а-яё]/gi, '_').substring(0, 20)
    filename = `books-search-${safeSearch}-${ts}.json`
  } else {
    filename = `books-filtered-${booksRaw.length}-${ts}.json`
  }

  const encodedFilename = encodeURIComponent(filename)
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${encodedFilename}"`)
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  return dump
})
