import { requireRole } from '../../utils/requireRole'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, ['user', 'editor', 'admin'])
  const db = useDatabase()

  const { rows } = await db.sql`
    SELECT article_id FROM user_bookmarks WHERE user_id = ${auth.id}
  `
  return rows.map((r: any) => r.article_id)
})
