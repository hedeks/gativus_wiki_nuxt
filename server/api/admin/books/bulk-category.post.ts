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
  
  let totalChanges = 0
  
  if (categoryId) {
    // Insert or ignore for each book
    const stmt = db.prepare(`INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)`)
    for (const id of ids) {
      await stmt.run(id, categoryId)
      totalChanges++
    }
  } else {
    // Clear categories
    const stmt = db.prepare(`DELETE FROM book_categories WHERE book_id IN (${placeholders})`)
    const info = await stmt.run(...ids) as any
    totalChanges = info?.meta?.changes ?? ids.length
  }
  
  return { success: true, count: totalChanges }
})
