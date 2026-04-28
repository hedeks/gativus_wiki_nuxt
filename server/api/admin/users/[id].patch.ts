/**
 * PATCH /api/admin/users/:id — только admin; смена роли.
 */

type Body = { role?: string }

const ROLES = ['user', 'editor', 'admin'] as const

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

  const body = (await readBody(event)) as Body
  const newRole = body.role?.toLowerCase()

  if (!newRole || !ROLES.includes(newRole as (typeof ROLES)[number])) {
    throw createError({ statusCode: 400, statusMessage: 'Нужна роль: user, editor или admin' })
  }

  const db = useDatabase()
  const row = (await db
    .prepare(`SELECT id, role FROM users WHERE id = ?`)
    .get(id)) as { id: number; role: string } | undefined

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Пользователь не найден' })
  }

  if (newRole !== 'admin' && row.role === 'admin') {
    const { c } = (await db
      .prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'admin'`)
      .get()) as { c: number }
    if (Number(c) <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Нельзя снять последнего администратора',
      })
    }
  }

  await db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(newRole, id)

  const out = (await db
    .prepare(
      `SELECT id, login, email, role, created_at, last_visited FROM users WHERE id = ?`
    )
    .get(id)) as {
    id: number
    login: string
    email: string
    role: string
    created_at: string | null
    last_visited: string | null
  }

  return {
    user: {
      ...out,
      role: out.role as (typeof ROLES)[number],
    },
    updatedBy: auth.login,
  }
})
