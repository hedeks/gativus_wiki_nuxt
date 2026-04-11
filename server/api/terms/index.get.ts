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

  const conditions: string[] = []
  const params: any[] = []

  if (search) {
    conditions.push('(t.title LIKE ? OR t.aliases LIKE ? OR t.definition LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (letter) {
    conditions.push('(t.title LIKE ? OR t.title LIKE ?)')
    params.push(`${letter.toLowerCase()}%`, `${letter.toUpperCase()}%`)
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
      t.id, t.slug, t.title, t.aliases, t.definition,
      t.term_article_id, t.created_at, t.updated_at,
      a.category_id,
      c.title as category_title,
      c.slug as category_slug,
      c.icon as category_icon,
      c.color as category_color
    FROM terms t
    LEFT JOIN articles a ON t.term_article_id = a.id
    LEFT JOIN categories c ON a.category_id = c.id
    ${whereClause}
    ORDER BY t.title ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[]

  // Fetch available letters for the alphabet filter
  // We take the first character of each title (in uppercase)
  const lettersResult = await db.prepare(`
    SELECT DISTINCT UPPER(SUBSTR(title, 1, 1)) as letter
    FROM terms
    ORDER BY letter ASC
  `).all() as { letter: string }[]
  const availableLetters = lettersResult.map(r => r.letter).filter(l => /^[A-ZА-Я]$/i.test(l))

  return {
    items: (items || []).map(t => ({
      ...t,
      aliases: t.aliases ? JSON.parse(t.aliases) : [],
      has_article: Boolean(t.term_article_id),
    })),
    total,
    page,
    pages,
    availableLetters,
  }
})
