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

  const data = body.data || {}
  
  const updates: string[] = []
  const values: any[] = []
  
  if (data.is_published !== undefined) {
    updates.push('is_published = ?')
    values.push(data.is_published)
  }
  if (data.category_id !== undefined) {
    updates.push('category_id = ?')
    values.push(data.category_id)
  }
  if (data.book_id !== undefined) {
    updates.push('book_id = ?')
    values.push(data.book_id)
  }
  
  if (updates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'No valid data fields provided' })
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP')
  
  const placeholders = ids.map(() => '?').join(',')
  values.push(...ids)
  
  const stmt = db.prepare(`
    UPDATE articles
    SET ${updates.join(', ')}
    WHERE id IN (${placeholders})
  `)
  
  const info = await stmt.run(...values) as any
  
  return { success: true, count: info?.meta?.changes ?? ids.length }
})
