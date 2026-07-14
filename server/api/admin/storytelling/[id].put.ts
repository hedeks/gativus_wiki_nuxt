import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'editor')
  const db = useDatabase()
  
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'ID is required' })
  }
  
  const body = await readBody(event)
  if (!body.title) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Title is required' })
  }
  
  const nodes_path = JSON.stringify(body.nodes_path || [])
  const custom_messages = JSON.stringify(body.custom_messages || {})
  
  await db.sql`
    UPDATE story_routes
    SET title = ${body.title},
        description = ${body.description || null},
        nodes_path = ${nodes_path},
        custom_messages = ${custom_messages}
    WHERE id = ${id}
  `
  
  return { success: true }
})
