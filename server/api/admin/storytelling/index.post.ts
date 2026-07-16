import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'editor')
  const db = useDatabase()
  
  const body = await readBody(event); console.log('BODY:', body)
  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Title is required' })
  }
  
  const nodes_path = JSON.stringify(body.nodes_path || [])
  const custom_messages = JSON.stringify(body.custom_messages || {})
  const custom_messages_ru = JSON.stringify(body.custom_messages_ru || {})
  const custom_messages_zh = JSON.stringify(body.custom_messages_zh || {})
  
  const { lastInsertRowid } = await db.sql`
    INSERT INTO story_routes (
      title, title_ru, title_zh, 
      description, description_ru, description_zh, 
      nodes_path, 
      custom_messages, custom_messages_ru, custom_messages_zh, 
      created_by
    )
    VALUES (
      ${body.title}, ${body.title_ru || null}, ${body.title_zh || null}, 
      ${body.description || null}, ${body.description_ru || null}, ${body.description_zh || null}, 
      ${nodes_path}, 
      ${custom_messages}, ${custom_messages_ru}, ${custom_messages_zh}, 
      ${user.id}
    )
  `
  
  return { id: lastInsertRowid, message: 'Story route created successfully' }
})
