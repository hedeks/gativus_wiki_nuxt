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
  
  if (data.translation_valid_en !== undefined) {
    updates.push('translation_valid_en = ?')
    values.push(data.translation_valid_en)
  }
  if (data.translation_valid_ru !== undefined) {
    updates.push('translation_valid_ru = ?')
    values.push(data.translation_valid_ru)
  }
  if (data.translation_valid_zh !== undefined) {
    updates.push('translation_valid_zh = ?')
    values.push(data.translation_valid_zh)
  }
  
  if (updates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'No valid data fields provided' })
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP')
  
  const placeholders = ids.map(() => '?').join(',')
  values.push(...ids)
  
  const stmt = db.prepare(`
    UPDATE terms
    SET ${updates.join(', ')}
    WHERE id IN (${placeholders})
  `)
  
  const info = await stmt.run(...values) as any
  
  return { success: true, count: info?.meta?.changes ?? ids.length }
})
