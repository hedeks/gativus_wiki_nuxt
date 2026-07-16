import { defineEventHandler } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'editor')
  const db = useDatabase()
  
  const result = await db.sql`
    SELECT id, title, title_ru, title_zh, description, description_ru, description_zh, 
           nodes_path, custom_messages, custom_messages_ru, custom_messages_zh, 
           created_at, created_by
    FROM story_routes
    ORDER BY created_at DESC
  `
  const rows = result.rows || []
  
  return rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    title_ru: row.title_ru,
    title_zh: row.title_zh,
    description: row.description,
    description_ru: row.description_ru,
    description_zh: row.description_zh,
    nodes_path: row.nodes_path ? JSON.parse(row.nodes_path) : [],
    custom_messages: row.custom_messages ? JSON.parse(row.custom_messages) : {},
    custom_messages_ru: row.custom_messages_ru ? JSON.parse(row.custom_messages_ru) : {},
    custom_messages_zh: row.custom_messages_zh ? JSON.parse(row.custom_messages_zh) : {},
    created_at: row.created_at,
    created_by: row.created_by
  }))
})
