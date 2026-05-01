/**
 * GET /api/knowledge-graph
 * Returns nodes and links for the D3.js force-directed graph.
 * Public endpoint.
 *
 * Query `lang`: `en` | `ru` | `zh`. Default `en`. Unknown values fall back to `en`.
 * Labels: запрошенная локаль → непустой перевод → базовые (en) колонки. У статей `description` = локализованный краткий текст (`excerpt` / `excerpt_ru` / `excerpt_zh`).
 * Рёбра mention/reference строятся по всем строкам article_terms для опубликованных статей;
 * при отключённом FK догружаем узлы терминов, чтобы не отбрасывать связи в validLinks.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)
  const requestedLang = String(query.lang ?? 'en').toLowerCase()
  const lang = (['ru', 'en', 'zh'].includes(requestedLang) ? requestedLang : 'en') as 'en' | 'ru' | 'zh'

  const locSlug = `COALESCE(
    CASE ?
    WHEN 'en' THEN slug
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(slug_ru), ''), slug)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(slug_zh), ''), slug)
      ELSE slug
    END,
    slug
  )`

  const locTitle = `COALESCE(
    CASE ?
    WHEN 'en' THEN title
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(title_ru), ''), title)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(title_zh), ''), title)
      ELSE title
    END,
    title
  )`

  const locDescrCat = `COALESCE(
    CASE ?
    WHEN 'en' THEN description
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(description_ru), ''), description)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(description_zh), ''), description)
      ELSE description
    END,
    description
  )`

  const locDescrBook = locDescrCat

  const locTermSlug = `COALESCE(
    CASE ?
    WHEN 'en' THEN t.slug
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(t.slug_ru), ''), t.slug)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(t.slug_zh), ''), t.slug)
      ELSE t.slug
    END,
    t.slug
  )`

  const locTermTitle = `COALESCE(
    CASE ?
    WHEN 'en' THEN t.title
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(t.title_ru), ''), t.title)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(t.title_zh), ''), t.title)
      ELSE t.title
    END,
    t.title
  )`

  const locTermDef = `COALESCE(
    CASE ?
    WHEN 'en' THEN t.definition
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(t.definition_ru), ''), t.definition)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(t.definition_zh), ''), t.definition)
      ELSE t.definition
    END,
    t.definition
  )`

  const locArticleExcerpt = `COALESCE(
    CASE ?
    WHEN 'en' THEN excerpt
      WHEN 'ru' THEN COALESCE(NULLIF(TRIM(excerpt_ru), ''), excerpt)
      WHEN 'zh' THEN COALESCE(NULLIF(TRIM(excerpt_zh), ''), excerpt)
      ELSE excerpt
    END,
    excerpt
  )`

  // 1. Categories
  const categories = await db.prepare(`
    SELECT 
      id, 
      ${locSlug} as slug,
      ${locTitle} as title,
      ${locDescrCat} as description,
      parent_id, icon, 'category' as type 
    FROM categories
  `).all(lang, lang, lang) as any[]

  // 2. Books (slug один на все локали в схеме)
  const books = await db.prepare(`
    SELECT 
      id, slug, 
      ${locTitle} as title,
      ${locDescrBook} as description,
      'book' as type 
    FROM books
  `).all(lang, lang) as any[]

  // 3. Articles: description = локализованный excerpt
  let articles = await db.prepare(`
    SELECT 
      id,
      ${locSlug} as slug,
      ${locTitle} as title,
      ${locArticleExcerpt} as description,
      category_id,
      book_id,
      locale,
      is_term_article,
      'article' as type 
    FROM articles 
    WHERE is_published = 1
  `).all(lang, lang, lang) as any[]

  // Кластеры статей по origin_id (цепочка → один корень)
  const pubArticleMeta = await db.prepare(`
    SELECT id, origin_id FROM articles WHERE is_published = 1
  `).all() as Array<{ id: number; origin_id: number | null }>

  const originByArticleId = new Map<number, number | null>()
  for (const row of pubArticleMeta) {
    const id = Number(row.id)
    const o = row.origin_id != null ? Number(row.origin_id) : null
    originByArticleId.set(id, o != null && o !== id ? o : null)
  }

  function clusterRootArticleId(dbId: number): number {
    let x = Number(dbId)
    const visited = new Set<number>()
    for (let g = 0; g < 64; g++) {
      const p = originByArticleId.get(x)
      if (p == null || p === x) break
      if (visited.has(x)) break
      visited.add(x)
      x = p
    }
    return x
  }

  const clusterMembersByRoot = new Map<number, Set<number>>()
  for (const row of pubArticleMeta) {
    const id = Number(row.id)
    const root = clusterRootArticleId(id)
    if (!clusterMembersByRoot.has(root))
      clusterMembersByRoot.set(root, new Set())
    clusterMembersByRoot.get(root)!.add(id)
  }

  const articleGraphIdSet = new Set<number>(articles.map((a: any) => Number(a.id)))

  function siblingArticleDbIdsWithGraphNode(atArticleDbId: number): number[] {
    const root = clusterRootArticleId(atArticleDbId)
    const sibs = [...(clusterMembersByRoot.get(root) ?? new Set<number>([atArticleDbId]))]
    const onGraph = sibs.filter(aid => articleGraphIdSet.has(aid))
    return onGraph.length ? onGraph : (articleGraphIdSet.has(atArticleDbId) ? [atArticleDbId] : [])
  }

  // 4. Terms
  let terms = await db.prepare(`
    SELECT 
      t.id, 
      ${locTermSlug} as slug,
      ${locTermTitle} as title,
      ${locTermDef} as description,
      t.term_article_id,
      'term' as type,
      a.category_id,
      a.id as article_id
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
  `).all(lang, lang, lang) as any[]

  // 5. Book-Category relationships
  const bookCategories = await db.prepare(`
    SELECT book_id, category_id FROM book_categories
  `).all() as any[]

  // Mentions: все пары для опубликованных статей (язык не влияет на набор рёбер)
  const crossLinksRaw = await db.prepare(`
    SELECT at.article_id as article_id, at.term_id, COALESCE(at.mention_count, 1) as mention_count
    FROM article_terms at
    JOIN articles a ON at.article_id = a.id AND a.is_published = 1
  `).all() as any[]

  const termIdsFromMentions = new Set<number>()
  for (const cl of crossLinksRaw)
    termIdsFromMentions.add(Number(cl.term_id))

  const termIdsLoaded = new Set(terms.map((t: any) => Number(t.id)))
  const termIdsToBackfill = [...termIdsFromMentions].filter(id => !termIdsLoaded.has(id))
  if (termIdsToBackfill.length) {
    const ph = termIdsToBackfill.map(() => '?').join(',')
    const backfill = await db.prepare(`
      SELECT 
        t.id, 
        ${locTermSlug} as slug,
        ${locTermTitle} as title,
        ${locTermDef} as description,
        t.term_article_id,
        'term' as type,
        a.category_id,
        a.id as article_id
      FROM terms t
      LEFT JOIN articles a ON t.term_article_id = a.id
      WHERE t.id IN (${ph})
    `).all(lang, lang, lang, ...termIdsToBackfill) as any[]
    terms = terms.concat(backfill)
  }

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
      depth: getCategoryDepth(c.id),
    })),
    ...books.map(b => ({ ...b, id: `book-${b.id}`, originalId: b.id })),
    ...articles.map(a => ({ ...a, id: `art-${a.id}`, originalId: a.id })),
    ...terms.map(t => ({ ...t, id: `term-${t.id}`, originalId: t.id })),
  ]

  // --- Process Links ---
  const linksSet = new Set<string>()
  const links: any[] = []

  function addLink(source: string, target: string, type: string, mentionCount?: number) {
    const key = `${source}|${target}|${type}`
    if (!linksSet.has(key)) {
      linksSet.add(key)
      const link: Record<string, unknown> = { source, target, type }
      const mc = mentionCount != null && Number(mentionCount) > 0 ? Math.floor(Number(mentionCount)) : undefined
      if (mc != null) link.mentionCount = mc
      links.push(link)
    }
  }

  categories.forEach(c => {
    if (c.parent_id) addLink(`cat-${c.id}`, `cat-${c.parent_id}`, 'belongs_to_category')
  })

  articles.forEach(a => {
    if (a.category_id) addLink(`art-${a.id}`, `cat-${a.category_id}`, 'belongs_to_category')
    if (a.book_id) addLink(`art-${a.id}`, `book-${a.book_id}`, 'part_of_book')
  })

  bookCategories.forEach(bc => {
    addLink(`book-${bc.book_id}`, `cat-${bc.category_id}`, 'belongs_to_category')
  })

  terms.forEach(t => {
    if (t.article_id) {
      addLink(`term-${t.id}`, `art-${t.article_id}`, 'part_of_article')
    }
    else if (t.category_id) {
      addLink(`term-${t.id}`, `cat-${t.category_id}`, 'belongs_to_category')
    }
  })

  crossLinksRaw.forEach((cl: any) => {
    const mc = Number(cl.mention_count) > 0 ? Math.floor(Number(cl.mention_count)) : 1
    const baseAid = Number(cl.article_id)
    const ckBase = clusterRootArticleId(baseAid)
    const discloseTerm = terms.find((t: any) => {
      const ai = t.article_id == null ? NaN : Number(t.article_id)
      return Number.isFinite(ai) && clusterRootArticleId(ai) === ckBase
    })

    const articleSides = siblingArticleDbIdsWithGraphNode(baseAid)
    for (const aid of articleSides)
      addLink(`art-${aid}`, `term-${cl.term_id}`, 'mention', mc)

    if (discloseTerm)
      addLink(`term-${discloseTerm.id}`, `term-${cl.term_id}`, 'reference', mc)
  })

  const nodeIds = new Set(nodes.map(n => n.id))
  const validLinks = links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))

  return {
    lang,
    nodes,
    links: validLinks,
  }
})
