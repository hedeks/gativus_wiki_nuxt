import { requireRole } from '../../utils/requireRole'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, ['user', 'editor', 'admin'])
  const db = useDatabase()

  // 1. Get stats for user
  const { rows: stats } = await db.sql`
    SELECT time_on_site_seconds, created_at, last_visited
    FROM users WHERE id = ${auth.id}
  `

  // 2. Get reading progress
  const { rows: reading } = await db.sql`
    SELECT * FROM user_reading_progress WHERE user_id = ${auth.id}
  `

  // 3. Get bookmarks with article info
  const { rows: bookmarks } = await db.sql`
    SELECT b.id, b.article_id, a.title, a.title_ru, a.title_zh, a.slug
    FROM user_bookmarks b
    JOIN articles a ON b.article_id = a.id
    WHERE b.user_id = ${auth.id}
    ORDER BY b.created_at DESC
  `

  // 4. Editor stats
  let authoredArticles = 0
  let authoredTerms = 0
  if (['editor', 'admin'].includes(auth.role)) {
    const { rows: articlesCnt } = await db.sql`SELECT COUNT(*) as cnt FROM articles WHERE created_by = ${auth.id}`
    const { rows: termsCnt } = await db.sql`SELECT COUNT(*) as cnt FROM terms WHERE created_by = ${auth.id}`
    authoredArticles = Number(articlesCnt[0]?.cnt || 0)
    authoredTerms = Number(termsCnt[0]?.cnt || 0)
  }

  return {
    time_on_site_seconds: stats[0]?.time_on_site_seconds || 0,
    created_at: stats[0]?.created_at,
    last_visited: stats[0]?.last_visited,
    reading_progress: reading,
    bookmarks: bookmarks,
    stats: {
      authored_articles: authoredArticles,
      authored_terms: authoredTerms
    }
  }
})
