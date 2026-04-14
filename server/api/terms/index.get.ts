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
      conditions.push('(t.title_ru LIKE ? OR t.title LIKE ? OR t.aliases LIKE ? OR t.definition_ru LIKE ? OR t.definition LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    } else {
      conditions.push('(t.title LIKE ? OR t.aliases LIKE ? OR t.definition LIKE ?)')
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
  }
  if (letter) {
    if (lang === 'ru') {
      conditions.push('(t.title_ru LIKE ? OR t.title_ru LIKE ? OR t.title LIKE ? OR t.title LIKE ?)')
      params.push(`${letter.toLowerCase()}%`, `${letter.toUpperCase()}%`, `${letter.toLowerCase()}%`, `${letter.toUpperCase()}%`)
    } else {
      conditions.push('(t.title LIKE ? OR t.title LIKE ?)')
      params.push(`${letter.toLowerCase()}%`, `${letter.toUpperCase()}%`)
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
      t.id, t.slug, t.slug_ru, t.title, t.title_ru, t.aliases, t.definition, t.definition_ru,
      t.term_article_id, t.created_at, t.updated_at,
      a.category_id,
      c.title as category_title,
      c.title_ru as category_title_ru,
      c.slug as category_slug,
      c.slug_ru as category_slug_ru,
      c.icon as category_icon,
      c.color as category_color
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    ${whereClause}
    ORDER BY CASE WHEN ? = 'ru' AND t.title_ru IS NOT NULL THEN t.title_ru ELSE t.title END ASC
    LIMIT ? OFFSET ?
  `).all(...params, lang, limit, offset) as any[]

  // Fetch available letters for the alphabet filter
  // We take the first character of each title (in uppercase)
  const lettersResult = await db.prepare(`
    SELECT DISTINCT UPPER(SUBSTR(title, 1, 1)) as letter
    FROM terms
    ORDER BY letter ASC
  `).all() as { letter: string }[]
  const availableLetters = lettersResult.map(r => r.letter).filter(l => /^[A-ZА-Я]$/i.test(l))

  return {
    items: (items || []).map(t => {
      const isRu = lang === 'ru'
      return {
        ...t,
        title: (isRu && t.title_ru) ? t.title_ru : t.title,
        definition: (isRu && t.definition_ru) ? t.definition_ru : t.definition,
        category_title: (isRu && t.category_title_ru) ? t.category_title_ru : t.category_title,
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
