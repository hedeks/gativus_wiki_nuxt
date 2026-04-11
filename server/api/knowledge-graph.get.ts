/**
 * GET /api/knowledge-graph
 * Returns nodes and links for the D3.js force-directed graph.
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()

  // 1. Fetch Categories
  const categories = await db.prepare(`
    SELECT id, slug, title, description, parent_id, icon, 'category' as type 
    FROM categories
  `).all() as any[]

  // 2. Fetch Books
  const books = await db.prepare(`
    SELECT id, slug, title, description, 'book' as type 
    FROM books
  `).all() as any[]

  // 3. Fetch Articles
  const articles = await db.prepare(`
    SELECT id, slug, title, excerpt as description, category_id, book_id, 'article' as type 
    FROM articles 
    WHERE is_published = 1 AND is_term_article = 0
  `).all() as any[]

  // 4. Fetch Terms
  const terms = await db.prepare(`
    SELECT t.id, t.slug, t.title, t.definition as description, t.term_article_id, 'term' as type, a.category_id
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
  `).all() as any[]

  // 5. Fetch Book-Category relationships
  const bookCategories = await db.prepare(`
    SELECT book_id, category_id FROM book_categories
  `).all() as any[]

  // --- Process Nodes ---
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
    ...articles.map(a => ({ ...a, id: `art-${a.id}`, originalId: a.id })),
    ...terms.map(t => ({ ...t, id: `term-${t.id}`, originalId: t.id }))
  ]

  // --- Process Links ---
  const links: any[] = []

  // Case 1: Category -> Parent Category (belongs to category)
  categories.forEach(c => {
    if (c.parent_id) {
      links.push({
        source: `cat-${c.id}`,
        target: `cat-${c.parent_id}`,
        type: 'belongs_to_category'
      })
    }
  })

  // Case 2: Article -> Category (belongs to category)
  articles.forEach(a => {
    if (a.category_id) {
      links.push({
        source: `art-${a.id}`,
        target: `cat-${a.category_id}`,
        type: 'belongs_to_category'
      })
    }
    // Case 2b: Article -> Book (part of book)
    if (a.book_id) {
      links.push({
        source: `art-${a.id}`,
        target: `book-${a.book_id}`,
        type: 'part_of_book'
      })
    }
  })

  // Case 3: Book -> Category (belongs to category)
  bookCategories.forEach(bc => {
    links.push({
      source: `book-${bc.book_id}`,
      target: `cat-${bc.category_id}`,
      type: 'belongs_to_category'
    })
  })

  // Case 4: Term -> Article (part of article)
  terms.forEach(t => {
    if (t.term_article_id) {
      links.push({
        source: `term-${t.id}`,
        target: `art-${t.term_article_id}`,
        type: 'part_of_article'
      })
    } else if (t.category_id) {
       links.push({
        source: `term-${t.id}`,
        target: `cat-${t.category_id}`,
        type: 'belongs_to_category'
      })
    }
  })

  // Case 5: Mentions and References
  const crossLinks = await db.prepare(`
    SELECT article_id, term_id FROM article_terms
  `).all() as any[]

  crossLinks.forEach(cl => {
    const termForArticle = terms.find(t => t.term_article_id === cl.article_id)
    if (termForArticle) {
      links.push({
        source: `term-${termForArticle.id}`,
        target: `term-${cl.term_id}`,
        type: 'reference'
      })
    } else {
      links.push({
        source: `art-${cl.article_id}`,
        target: `term-${cl.term_id}`,
        type: 'mention'
      })
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
