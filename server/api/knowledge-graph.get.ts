/**
 * GET /api/knowledge-graph
 * Returns nodes and links for the D3.js force-directed graph.
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const lang = (query.lang as string) || 'ru'

  // 1. Fetch Categories (localized)
  const categories = await db.prepare(`
    SELECT 
      id, 
      COALESCE(CASE WHEN ? = 'ru' AND slug_ru IS NOT NULL THEN slug_ru END, slug) as slug,
      COALESCE(CASE WHEN ? = 'ru' AND title_ru IS NOT NULL THEN title_ru END, title) as title,
      COALESCE(CASE WHEN ? = 'ru' AND description_ru IS NOT NULL THEN description_ru END, description) as description,
      parent_id, icon, 'category' as type 
    FROM categories
  `).all(lang, lang, lang) as any[]

  // 2. Fetch Books (localized - books already have title_ru columns)
  const books = await db.prepare(`
    SELECT 
      id, slug, 
      COALESCE(CASE WHEN ? = 'ru' AND title_ru IS NOT NULL THEN title_ru END, title) as title,
      COALESCE(CASE WHEN ? = 'ru' AND description_ru IS NOT NULL THEN description_ru END, description) as description,
      'book' as type 
    FROM books
  `).all(lang, lang) as any[]

  // 3. Fetch Articles (grouped by origin_id)
  // We pick the best translation for each Article Concept (origin_id)
  const rawArticles = await db.prepare(`
    SELECT 
      id, 
      COALESCE(origin_id, id) as concept_id,
      slug, title, excerpt as description, category_id, book_id, locale,
      'article' as type 
    FROM articles 
    WHERE is_published = 1 AND is_term_article = 0
  `).all() as any[]

  // Article Concept aggregation
  const articleConceptsMap = new Map<number, any>()
  rawArticles.forEach(a => {
    const cid = a.concept_id
    const existing = articleConceptsMap.get(cid)
    
    // Logic: Prefer the article that matches the requested locale. 
    // If no match, prefer the origin (where id == concept_id).
    // Otherwise, keep what we have.
    if (!existing || a.locale === lang || (a.id === cid && existing.locale !== lang)) {
      articleConceptsMap.set(cid, a)
    }
  })
  const articles = Array.from(articleConceptsMap.values())

  // 4. Fetch Terms (localized)
  const terms = await db.prepare(`
    SELECT 
      t.id, 
      COALESCE(CASE WHEN ? = 'ru' AND t.slug_ru IS NOT NULL THEN t.slug_ru END, t.slug) as slug,
      COALESCE(CASE WHEN ? = 'ru' AND t.title_ru IS NOT NULL THEN t.title_ru END, t.title) as title,
      COALESCE(CASE WHEN ? = 'ru' AND t.definition_ru IS NOT NULL THEN t.definition_ru END, t.definition) as description,
      t.term_article_id,
      'term' as type,
      a.category_id,
      COALESCE(a.origin_id, a.id) as article_concept_id
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
  `).all(lang, lang, lang) as any[]

  // 5. Fetch Book-Category relationships
  const bookCategories = await db.prepare(`
    SELECT book_id, category_id FROM book_categories
  `).all() as any[]

  // --- Process Nodes (IDs are concept-based) ---
  const depthCache = new Map<number, number>()
  function getCategoryDepth(id: number | null): number {
    if (!id) return 0
    if (depthCache.has(id)) return depthCache.get(id)!
    const cat = categories.find(c => c.id === id)
    if (!cat || !cat.parent_id) {
      depthCache.set(id, 0)
      return 0
    }
    const d = getCategoryDepth(cat.parent_id) + 1
    depthCache.set(id, d)
    return d
  }

  const nodes = [
    ...categories.map(c => ({ 
      ...c, 
      id: `cat-${c.id}`, 
      originalId: c.id, 
      depth: getCategoryDepth(c.id) 
    })),
    ...books.map(b => ({ ...b, id: `book-${b.id}`, originalId: b.id })),
    ...articles.map(a => ({ ...a, id: `art-${a.concept_id}`, originalId: a.concept_id })),
    ...terms.map(t => ({ ...t, id: `term-${t.id}`, originalId: t.id }))
  ]

  // --- Process Links (Universal Edges) ---
  const linksSet = new Set<string>() // To deduplicate universal edges
  const links: any[] = []

  function addLink(source: string, target: string, type: string) {
    const key = `${source}|${target}|${type}`
    if (!linksSet.has(key)) {
      linksSet.add(key)
      links.push({ source, target, type })
    }
  }

  // Case 1: Category -> Parent Category
  categories.forEach(c => {
    if (c.parent_id) addLink(`cat-${c.id}`, `cat-${c.parent_id}`, 'belongs_to_category')
  })

  // Case 2: Article -> Category / Book
  rawArticles.forEach(a => {
    if (a.category_id) addLink(`art-${a.concept_id}`, `cat-${a.category_id}`, 'belongs_to_category')
    if (a.book_id) addLink(`art-${a.concept_id}`, `book-${a.book_id}`, 'part_of_book')
  })

  // Case 3: Book -> Category
  bookCategories.forEach(bc => {
    addLink(`book-${bc.book_id}`, `cat-${bc.category_id}`, 'belongs_to_category')
  })

  // Case 4: Term -> Article / Category
  terms.forEach(t => {
    if (t.article_concept_id) {
      addLink(`term-${t.id}`, `art-${t.article_concept_id}`, 'part_of_article')
    } else if (t.category_id) {
      addLink(`term-${t.id}`, `cat-${t.category_id}`, 'belongs_to_category')
    }
  })

  // Case 5: Mentions and References (aggregated across all translations)
  const crossLinksRaw = await db.prepare(`
    SELECT a.id as article_id, COALESCE(a.origin_id, a.id) as article_concept_id, at.term_id 
    FROM article_terms at
    JOIN articles a ON at.article_id = a.id
  `).all() as any[]

  crossLinksRaw.forEach(cl => {
    // Check if this article concept itself is a disclosure article for some term
    const termForArticleInfo = terms.find(t => t.article_concept_id === cl.article_concept_id)
    
    if (termForArticleInfo) {
      addLink(`term-${termForArticleInfo.id}`, `term-${cl.term_id}`, 'reference')
    } else {
      addLink(`art-${cl.article_concept_id}`, `term-${cl.term_id}`, 'mention')
    }
  })

  // --- Final Filtering ---
  const nodeIds = new Set(nodes.map(n => n.id))
  const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))

  return {
    nodes,
    links: validLinks
  }
})
