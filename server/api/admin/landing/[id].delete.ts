export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const db = useDatabase()
  await db.prepare('DELETE FROM landing_blocks WHERE id = ?').run(id)
  return { ok: true }
})
