/**
 * Gativus Wiki — Admin Stats API
 * Returns counts of all major entities for the dashboard.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()

  const articles = await db.prepare('SELECT COUNT(*) as count FROM articles').get() as any
  const terms = await db.prepare('SELECT COUNT(*) as count FROM terms').get() as any
  const categories = await db.prepare('SELECT COUNT(*) as count FROM categories').get() as any
  const books = await db.prepare('SELECT COUNT(*) as count FROM books').get() as any
  const users = await db.prepare('SELECT COUNT(*) as count FROM users').get() as any

  return {
    articles: articles?.count || 0,
    terms: terms?.count || 0,
    categories: categories?.count || 0,
    books: books?.count || 0,
    users: users?.count || 0,
  }
})
