/**
 * POST /api/admin/users
 * editor — только создание role user; admin — user | editor | admin.
 */

import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

type Body = {
  login?: string
  email?: string
  password?: string
  role?: string
}

const ROLES = ['user', 'editor', 'admin'] as const

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const body = (await readBody(event)) as Body

  if (!body.login?.trim() || !body.email?.trim() || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Нужны login, email и password',
    })
  }

  let role: (typeof ROLES)[number] = 'user'
  if (auth.role === 'admin') {
    const r = body.role?.toLowerCase()
    if (r && ROLES.includes(r as (typeof ROLES)[number])) {
      role = r as (typeof ROLES)[number]
    }
  }

  const existingLogin = await db
    .prepare('SELECT id FROM users WHERE login = ?')
    .get(body.login.trim())
  const existingEmail = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(body.email.trim())

  if (existingLogin || existingEmail) {
    throw createError({
      statusCode: 406,
      statusMessage: 'Логин или email уже заняты',
    })
  }

  const encrypted_password = await bcrypt.hash(body.password, 10)
  const uuid = uuidv4()
  const created_at = new Date().toISOString()

  await db
    .prepare(
      `INSERT INTO users (login, email, encrypted_password, role, created_at, uuid)
       VALUES (?,?,?,?,?,?)`
    )
    .run(body.login.trim(), body.email.trim(), encrypted_password, role, created_at, uuid)

  const row = (await db
    .prepare(
      `SELECT id, login, email, role, created_at, last_visited FROM users WHERE uuid = ?`
    )
    .get(uuid)) as {
    id: number
    login: string
    email: string
    role: string
    created_at: string | null
    last_visited: string | null
  }

  return {
    user: {
      id: row.id,
      login: row.login,
      email: row.email,
      role: row.role as (typeof ROLES)[number],
      created_at: row.created_at,
      last_visited: row.last_visited,
    },
  }
})
