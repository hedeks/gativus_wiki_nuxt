import { defineEventHandler, createError } from 'h3'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'editor')
  const db = useDatabase()
  
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'ID is required' })
  }
  
  await db.sql`DELETE FROM story_routes WHERE id = ${id}`
  
  return { success: true }
})
