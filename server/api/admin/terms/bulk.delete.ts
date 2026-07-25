import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const body = await readBody(event)
  
  if (!body || !Array.isArray(body.ids)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'ids array is required' })
  }
  
  if (body.ids.length === 0) return { success: true, count: 0 }
  
  const ids = body.ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
  if (ids.length === 0) return { success: true, count: 0 }

  const placeholders = ids.map(() => '?').join(',')
  
  // First delete associated relations (article_terms)
  await db.prepare(`DELETE FROM article_terms WHERE term_id IN (${placeholders})`).run(...ids)
  
  // Then delete terms
  const stmt = db.prepare(`DELETE FROM terms WHERE id IN (${placeholders})`)
  const info = await stmt.run(...ids) as any
  
  return { success: true, count: info?.meta?.changes ?? ids.length }
})
