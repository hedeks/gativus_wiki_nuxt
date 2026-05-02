import type { LandingBlockResolved, LandingBlockRow } from '~/types/landing'
import { resolveLandingRow } from '../utils/landingResolve'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lang = typeof query.locale === 'string' ? query.locale : 'en'
  const allowed = ['en', 'ru', 'zh'] as const
  const loc = allowed.includes(lang as 'en' | 'ru' | 'zh') ? (lang as 'en' | 'ru' | 'zh') : 'en'

  const db = useDatabase()
  const rows = await db.prepare(`
    SELECT * FROM landing_blocks
    WHERE COALESCE(is_published, 1) = 1
    ORDER BY sort_order ASC, id ASC
  `).all() as LandingBlockRow[]

  const blocks: LandingBlockResolved[] = (rows || []).map(r => resolveLandingRow(r, loc))
  return { blocks, locale: loc }
})
