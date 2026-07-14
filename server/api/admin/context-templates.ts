import { defineEventHandler, readBody } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'editor')
  const db = useDatabase()

  if (event.method === 'GET') {
    const result = await db.sql`SELECT id, template_text FROM context_templates`
    const rows = result.rows || []
    return rows.reduce((acc: any, row: any) => {
      acc[row.id] = row.template_text
      return acc
    }, {})
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const templates = typeof body === 'object' ? body : {}

    // Upsert templates
    for (const [id, text] of Object.entries(templates)) {
      if (typeof text !== 'string') continue
      await db.sql`
        INSERT INTO context_templates (id, template_text, updated_at)
        VALUES (${id}, ${text}, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET template_text = excluded.template_text, updated_at = excluded.updated_at
      `
    }
    return { success: true }
  }
})
