import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'editor')
  const db = useDatabase()
  
  const body = await readBody(event)
  if (!Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Expected an array of routes' })
  }
  
  for (const route of body) {
    if (!route.title) continue // Skip invalid
    const nodes_path = JSON.stringify(route.nodes_path || [])
    const custom_messages = JSON.stringify(route.custom_messages || {})
    await db.sql`
      INSERT INTO story_routes (title, description, nodes_path, custom_messages, created_by)
      VALUES (${route.title}, ${route.description || null}, ${nodes_path}, ${custom_messages}, ${user.id})
    `
  }
  
  return { success: true, count: body.length }
})
