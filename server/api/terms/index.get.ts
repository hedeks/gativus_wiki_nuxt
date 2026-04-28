/**
 * GET /api/terms
 * List all glossary terms with pagination, search, and letter filter.
 * Category is resolved via term_article_id → articles.category_id.
 * Public endpoint.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const query = getQuery(event)

  const page = Math.max(1, parseInt(query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 50))
  const offset = (page - 1) * limit

  const search = (query.search as string) || null
  const letter = (query.letter as string) || null   // e.g. "A" or "А"
  const categoryId = query.category_id ? parseInt(query.category_id as string) : null
  const lang = (query.lang as string) || 'ru'

  const conditions: string[] = []
  const params: any[] = []

  if (search) {
    if (lang === 'ru') {
      conditions.push('(t.title_ru LIKE ? COLLATE NOCASE OR t.title LIKE ? COLLATE NOCASE OR t.aliases LIKE ? COLLATE NOCASE OR t.definition_ru LIKE ? COLLATE NOCASE OR t.definition LIKE ? COLLATE NOCASE)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    } else if (lang === 'zh') {
      conditions.push('(t.title_zh LIKE ? COLLATE NOCASE OR t.title LIKE ? COLLATE NOCASE OR t.aliases LIKE ? COLLATE NOCASE OR t.definition_zh LIKE ? COLLATE NOCASE OR t.definition LIKE ? COLLATE NOCASE)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    } else {
      conditions.push('(t.title LIKE ? COLLATE NOCASE OR t.aliases LIKE ? COLLATE NOCASE OR t.definition LIKE ? COLLATE NOCASE)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
  }
  if (letter) {
    if (lang === 'ru') {
      conditions.push('(LOWER(t.title_ru) LIKE LOWER(?) OR LOWER(t.title) LIKE LOWER(?))')
      params.push(`${letter}%`, `${letter}%`)
    } else if (lang === 'zh') {
      conditions.push('(LOWER(t.title_zh) LIKE LOWER(?) OR LOWER(t.title) LIKE LOWER(?))')
      params.push(`${letter}%`, `${letter}%`)
    } else {
      conditions.push('(LOWER(t.title) LIKE LOWER(?))')
      params.push(`${letter}%`)
    }
  }
  if (categoryId) {
    conditions.push('a.category_id = ?')
    params.push(categoryId)
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    ${whereClause}
  `).get(...params) as any

  const total = countResult?.count || 0
  const pages = Math.ceil(total / limit)

  const items = await db.prepare(`
    SELECT
      t.id, t.slug, t.slug_ru, t.slug_zh, t.title, t.title_ru, t.title_zh, t.aliases, t.definition, t.definition_ru, t.definition_zh,
      t.term_article_id, t.created_at, t.updated_at,
      a.category_id,
      c.title as category_title,
      c.title_ru as category_title_ru,
      c.title_zh as category_title_zh,
      c.slug as category_slug,
      c.slug_ru as category_slug_ru,
      c.slug_zh as category_slug_zh,
      c.icon as category_icon,
      c.color as category_color
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    ${whereClause}
    ORDER BY CASE 
      WHEN ? = 'ru' AND t.title_ru IS NOT NULL THEN t.title_ru 
      WHEN ? = 'zh' AND t.title_zh IS NOT NULL THEN t.title_zh 
      ELSE t.title END ASC
    LIMIT ? OFFSET ?
  `).all(...params, lang, lang, limit, offset) as any[]

  // Fetch available letters for the alphabet filter
  // We take the first character of each title (in uppercase)
  const lettersResult = await db.prepare(`
    SELECT DISTINCT UPPER(SUBSTR(CASE 
      WHEN ? = 'ru' AND title_ru IS NOT NULL THEN title_ru 
      WHEN ? = 'zh' AND title_zh IS NOT NULL THEN title_zh 
      ELSE title END, 1, 1)) as letter
    FROM terms
    ORDER BY letter ASC
  `).all(lang, lang) as { letter: string }[]
  const availableLetters = lettersResult.map(r => r.letter).filter(l => l && l.trim() !== '')

  return {
    items: (items || []).map(t => {
      const isRu = lang === 'ru'
      const isZh = lang === 'zh'
      return {
        ...t,
        title: isRu ? (t.title_ru || t.title) : (isZh ? (t.title_zh || t.title) : t.title),
        definition: isRu ? (t.definition_ru || t.definition) : (isZh ? (t.definition_zh || t.definition) : t.definition),
        category_title: isRu ? (t.category_title_ru || t.category_title) : (isZh ? (t.category_title_zh || t.category_title) : t.category_title),
        // We keep the primary slug for stability but could support slug_ru if needed
        aliases: t.aliases ? JSON.parse(t.aliases) : [],
        has_article: Boolean(t.term_article_id),
      }
    }),
    total,
    page,
    pages,
    availableLetters,
  }
})
