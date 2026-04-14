/**
 * GET /api/admin/sync/export
 * Exports the entire knowledge graph structure to JSON.
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')
  const db = useDatabase()

  // 1. Categories
  const categoriesRaw = await db.prepare('SELECT * FROM categories ORDER BY sort_order').all() as any[]
  
  // 2. Books
  const booksRaw = await db.prepare('SELECT * FROM books ORDER BY sort_order').all() as any[]
  
  // Book Category slugs
  const bookCategoriesRaw = await db.prepare(`
    SELECT bc.book_id, c.slug as category_slug 
    FROM book_categories bc
    JOIN categories c ON bc.category_id = c.id
  `).all() as any[]

  // 3. Articles
  const articlesRaw = await db.prepare(`
    SELECT a.*, c.slug as category_slug, b.slug as book_slug
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN books b ON a.book_id = b.id
  `).all() as any[]

  // 4. Terms
  const termsRaw = await db.prepare(`
    SELECT t.*, a.slug as term_article_slug
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
  `).all() as any[]

  // 5. Article Mentions (Article to terms)
  const mentionsRaw = await db.prepare(`
    SELECT a.slug as article_slug, t.slug as term_slug
    FROM article_terms at
    JOIN articles a ON at.article_id = a.id
    JOIN terms t ON at.term_id = t.id
  `).all() as any[]

  // --- Processing ---
  
  const categoryIdToSlug = new Map(categoriesRaw.map(c => [c.id, c.slug]))

  const categories = categoriesRaw.map(c => ({
    slug: c.slug,
    slug_ru: c.slug_ru || null,
    title: c.title,
    title_ru: c.title_ru || null,
    description: c.description || null,
    description_ru: c.description_ru || null,
    icon: c.icon || null,
    parent_slug: c.parent_id ? categoryIdToSlug.get(c.parent_id) : null,
    sort_order: c.sort_order,
    created_at: c.created_at || null
  }))

  const books = booksRaw.map(b => ({
    slug: b.slug,
    title: b.title,
    title_ru: b.title_ru || null,
    title_zh: b.title_zh || null,
    description: b.description || null,
    description_ru: b.description_ru || null,
    description_zh: b.description_zh || null,
    cover_image: b.cover_image || null,
    category_slugs: bookCategoriesRaw.filter(bc => bc.book_id === b.id).map(bc => bc.category_slug),
    sort_order: b.sort_order,
    created_at: b.created_at || null
  }))

  const terms = termsRaw.map(t => ({
    slug: t.slug,
    slug_ru: t.slug_ru || null,
    title: t.title,
    title_ru: t.title_ru || null,
    aliases: t.aliases || null,
    definition: t.definition,
    definition_ru: t.definition_ru || null,
    term_article_slug: t.term_article_slug || null,
    created_at: t.created_at || null,
    updated_at: t.updated_at || null
  }))

  // Articles - Group translations
  const originalArticles = articlesRaw.filter(a => !a.origin_id || a.origin_id === a.id)
  
  const articles = originalArticles.map(orig => {
    // Find translations
    const translatedRows = articlesRaw.filter(a => a.origin_id === orig.id && a.id !== orig.id)
    
    return {
      slug: orig.slug,
      locale: orig.locale || 'en',
      title: orig.title,
      excerpt: orig.excerpt || null,
      html_content: orig.html_content,
      raw_odt_path: orig.raw_odt_path || null,
      presentation_path: orig.presentation_path || null,
      category_slug: orig.category_slug || null,
      book_slug: orig.book_slug || null,
      is_published: orig.is_published,
      is_term_article: orig.is_term_article,
      sort_order: orig.sort_order,
      created_at: orig.created_at || null,
      updated_at: orig.updated_at || null,
      translations: translatedRows.map(t => ({
        slug: t.slug,
        locale: t.locale || 'ru',
        title: t.title,
        excerpt: t.excerpt || null,
        html_content: t.html_content,
        raw_odt_path: t.raw_odt_path || null,
        presentation_path: t.presentation_path || null,
        created_at: t.created_at || null,
        updated_at: t.updated_at || null,
      }))
    }
  })

  // Format the output
  const dump = {
    version: "1.1",
    timestamp: new Date().toISOString(),
    categories,
    books,
    articles,
    terms,
    article_mentions: mentionsRaw
  }

  // Set response headers to prompt file download
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="gativus-backup-${new Date().toISOString().split('T')[0]}.json"`)
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  return dump
})
