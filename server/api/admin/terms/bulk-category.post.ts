import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const body = await readBody(event)
  
  if (!body || !Array.isArray(body.ids)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'ids array is required' })
  }
  
  if (body.ids.length === 0) return { success: true, count: 0 }
  
  const categoryId = body.category_id || null
  const ids = body.ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
  
  if (ids.length === 0) return { success: true, count: 0 }
  
  const placeholders = ids.map(() => '?').join(',')
  
  const stmt = db.prepare(`
    UPDATE articles
    SET category_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
      SELECT term_article_id FROM terms WHERE id IN (${placeholders}) AND term_article_id IS NOT NULL
    )
  `)
  
  const info = await stmt.run(categoryId, ...ids) as any
  
  return { success: true, count: info?.meta?.changes ?? ids.length }
})
