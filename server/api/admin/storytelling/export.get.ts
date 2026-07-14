import { defineEventHandler } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'editor')
  const db = useDatabase()
  
  const result = await db.sql`
    SELECT title, description, nodes_path, custom_messages
    FROM story_routes
  `
  const rows = result.rows || []
  
  const formattedRows = rows.map((row: any) => ({
    title: row.title,
    description: row.description,
    nodes_path: row.nodes_path ? JSON.parse(row.nodes_path) : [],
    custom_messages: row.custom_messages ? JSON.parse(row.custom_messages) : {}
  }))
  
  event.node.res.setHeader('Content-Type', 'application/json')
  event.node.res.setHeader('Content-Disposition', 'attachment; filename="story_routes_export.json"')
  
  return formattedRows
})
