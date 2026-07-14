import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const db = useDatabase()
  try {
    const result = await db.sql`SELECT id, template_text FROM context_templates`
    const rows = result.rows || []
    return rows.reduce((acc: any, row: any) => {
      acc[row.id] = row.template_text
      return acc
    }, {})
  } catch {
    return {}
  }
})
