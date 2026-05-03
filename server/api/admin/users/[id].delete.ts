/**
 * DELETE /api/admin/users/:id — только admin.
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')
  const idParam = getRouterParam(event, 'id')
  if (!idParam) {
    throw createError({ statusCode: 400, statusMessage: 'ID обязателен' })
  }

  const id = Number(idParam)
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный ID' })
  }

  if (id === auth.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Нельзя удалить свою учётную запись',
    })
  }

  const db = useDatabase()
  const row = (await db
    .prepare(`SELECT id, role, uuid FROM users WHERE id = ?`)
    .get(id)) as { id: number; role: string; uuid: string | null } | undefined

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })
  }

  if (row.role === 'admin') {
    const { c } = (await db
      .prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`)
      .get()) as { c: number }
    if (Number(c) <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Нельзя удалить последнего администратора',
      })
    }
  }

  if (row.uuid) {
    await db.prepare(`DELETE FROM sessions WHERE uuid = ?`).run(row.uuid)
  }

  await db.prepare(`DELETE FROM users WHERE id = ?`).run(id)

  return { ok: true, deletedId: id }
})
