/**
 * GET /api/admin/terms/export
 * Экспорт выбранных терминов (и опционально их статей) в JSON (версия 1.3).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')
  const db = useDatabase()
  const query = getQuery(event)

  const includeArticles = query.include_articles === 'true'
  const idsParam = query.ids as string
  const termIds: number[] = []

  let whereClause = ''
  const params: any[] = []

  if (idsParam) {
    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    if (ids.length > 0) {
      whereClause = `WHERE t.id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    } else {
      whereClause = `WHERE 1=0` // invalid ids
    }
  } else {
    // Filter logic similar to terms/index.get.ts
    const search = (query.search as string) || null
    const categoryId = query.category_id ? parseInt(query.category_id as string) : null
    const translationFilter = (query.translation_filter as string) || null

    const conditions: string[] = []

    if (search) {
      conditions.push('(t.title_ru LIKE ? COLLATE NOCASE OR t.title LIKE ? COLLATE NOCASE OR t.title_zh LIKE ? COLLATE NOCASE OR t.aliases_ru LIKE ? COLLATE NOCASE OR t.aliases LIKE ? COLLATE NOCASE OR t.aliases_zh LIKE ? COLLATE NOCASE OR t.definition_ru LIKE ? COLLATE NOCASE OR t.definition LIKE ? COLLATE NOCASE OR t.definition_zh LIKE ? COLLATE NOCASE)')
      const s = `%${search}%`
      params.push(s, s, s, s, s, s, s, s, s)
    }
    if (categoryId) {
      conditions.push('a.category_id = ?')
      params.push(categoryId)
    }
    if (translationFilter === 'complete') {
      conditions.push('(COALESCE(t.translation_valid_en,1)=1 AND COALESCE(t.translation_valid_ru,0)=1 AND COALESCE(t.translation_valid_zh,0)=1)')
    } else if (translationFilter === 'incomplete') {
      conditions.push('NOT (COALESCE(t.translation_valid_en,1)=1 AND COALESCE(t.translation_valid_ru,0)=1 AND COALESCE(t.translation_valid_zh,0)=1)')
    } else if (translationFilter === 'missing_ru') {
      conditions.push('(COALESCE(t.translation_valid_ru,0)=0)')
    } else if (translationFilter === 'missing_zh') {
      conditions.push('(COALESCE(t.translation_valid_zh,0)=0)')
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }
  }

  // 1. Terms
  const termsRaw = await db.prepare(`
    SELECT t.*, a.slug as term_article_slug
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    ${whereClause}
  `).all(...params) as any[]

  const extractedTermIds = termsRaw.map(t => t.id)
  if (extractedTermIds.length === 0) {
    return {
      version: '1.3',
      timestamp: new Date().toISOString(),
      terms: [],
      articles: [],
      article_mentions: []
    }
  }

  const terms = termsRaw.map(t => ({
    slug: t.slug,
    slug_ru: t.slug_ru || null,
    slug_zh: t.slug_zh || null,
    title: t.title,
    title_ru: t.title_ru || null,
    title_zh: t.title_zh || null,
    aliases: t.aliases || null,
    aliases_ru: t.aliases_ru || null,
    aliases_zh: t.aliases_zh || null,
    definition: t.definition,
    definition_ru: t.definition_ru || null,
    definition_zh: t.definition_zh || null,
    image_url: t.image_url || null,
    video_url: t.video_url || null,
    presentation_path: t.presentation_path || null,
    presentation_path_ru: t.presentation_path_ru || null,
    presentation_path_zh: t.presentation_path_zh || null,
    term_article_slug: t.term_article_slug || null,
    translation_valid_en: t.translation_valid_en,
    translation_valid_ru: t.translation_valid_ru,
    translation_valid_zh: t.translation_valid_zh,
    created_at: t.created_at || null,
    updated_at: t.updated_at || null
  }))

  const dump: any = {
    version: '1.3',
    timestamp: new Date().toISOString(),
    terms: terms
  }

  // 2. Articles and Mentions (if requested)
  if (includeArticles) {
    const articleIds = termsRaw.map(t => t.term_article_id).filter(id => id != null)
    
    let articlesRaw: any[] = []
    let mentionsRaw: any[] = []
    
    if (articleIds.length > 0) {
      const artPlaceholders = articleIds.map(() => '?').join(',')
      articlesRaw = await db.prepare(`
        SELECT a.*, c.slug as category_slug, b.slug as book_slug
        FROM articles a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN books b ON a.book_id = b.id
        WHERE a.id IN (${artPlaceholders})
      `).all(...articleIds) as any[]

      // Article Mentions for these articles
      mentionsRaw = await db.prepare(`
        SELECT a.slug as article_slug, t.slug as term_slug, at.mention_count
        FROM article_terms at
        JOIN articles a ON at.article_id = a.id
        JOIN terms t ON at.term_id = t.id
        WHERE at.article_id IN (${artPlaceholders})
      `).all(...articleIds) as any[]
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
      origin_id: a.origin_id ?? null,
      created_at: a.created_at || null,
      updated_at: a.updated_at || null,
    }))

    dump.articles = articles
    dump.article_mentions = mentionsRaw
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16)
  let filename = `gativus-terms-export-${ts}.json`
  if (extractedTermIds.length === 1) {
    filename = `term-${terms[0].slug}-${ts}.json`
  } else if (idsParam) {
    filename = `terms-selected-${extractedTermIds.length}-${ts}.json`
  } else if (query.search) {
    const safeSearch = (query.search as string).replace(/[^a-z0-9а-яё]/gi, '_').substring(0, 20)
    filename = `terms-search-${safeSearch}-${ts}.json`
  } else {
    filename = `terms-filtered-${extractedTermIds.length}-${ts}.json`
  }

  const encodedFilename = encodeURIComponent(filename)
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${encodedFilename}"`)
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  return dump
})
