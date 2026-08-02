import { requireRole } from '../../utils/requireRole'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, ['user', 'editor', 'admin'])
  const body = await readBody(event)
  const db = useDatabase()

  const { secondsAdded } = body

  if (typeof secondsAdded !== 'number' || secondsAdded <= 0 || secondsAdded > 3600) {
    return { success: false, reason: 'Invalid secondsAdded' }
  }

  await db.sql`
    UPDATE users SET time_on_site_seconds = COALESCE(time_on_site_seconds, 0) + ${secondsAdded}
    WHERE id = ${auth.id}
  `

  return { success: true }
})
