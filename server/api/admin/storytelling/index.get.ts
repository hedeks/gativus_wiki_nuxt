import { defineEventHandler } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'editor')
  const db = useDatabase()
  
  const result = await db.sql`
    SELECT id, title, description, nodes_path, custom_messages, created_at, created_by
    FROM story_routes
    ORDER BY created_at DESC
  `
  const rows = result.rows || []
  
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    nodes_path: row.nodes_path ? JSON.parse(row.nodes_path) : [],
    custom_messages: row.custom_messages ? JSON.parse(row.custom_messages) : {},
    created_at: row.created_at,
    created_by: row.created_by
  }))
})
