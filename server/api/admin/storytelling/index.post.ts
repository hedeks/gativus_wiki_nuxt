import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'editor')
  const db = useDatabase()
  
  const body = await readBody(event)
  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Title is required' })
  }
  
  const nodes_path = JSON.stringify(body.nodes_path || [])
  const custom_messages = JSON.stringify(body.custom_messages || {})
  
  const { lastInsertRowid } = await db.sql`
    INSERT INTO story_routes (title, description, nodes_path, custom_messages, created_by)
    VALUES (${body.title}, ${body.description || null}, ${nodes_path}, ${custom_messages}, ${user.id})
  `
  
  return { id: lastInsertRowid, message: 'Story route created successfully' }
})
