import type { LandingBlockRow } from '~/types/landing'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const rows = await db.prepare(`
    SELECT * FROM landing_blocks
    ORDER BY sort_order ASC, id ASC
  `).all() as LandingBlockRow[]
  return rows || []
})
