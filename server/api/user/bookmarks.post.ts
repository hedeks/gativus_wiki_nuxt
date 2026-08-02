import { requireRole } from '../../utils/requireRole'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, ['user', 'editor', 'admin'])
  const body = await readBody(event)
  const db = useDatabase()

  const { articleId, action } = body // action: 'add' | 'remove'

  if (!articleId || !['add', 'remove'].includes(action)) {
    throw createError({ statusCode: 400, message: 'Invalid payload' })
  }

  if (action === 'add') {
    await db.sql`
      INSERT OR IGNORE INTO user_bookmarks (user_id, article_id)
      VALUES (${auth.id}, ${articleId})
    `
  } else {
    await db.sql`
      DELETE FROM user_bookmarks WHERE user_id = ${auth.id} AND article_id = ${articleId}
    `
  }

  return { success: true }
})
