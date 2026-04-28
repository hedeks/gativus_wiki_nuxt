/**
 * GET /api/admin/users
 * editor — только role = user; admin — все.
 */

import type { AdminUserPublic, AdminUsersListResponse } from '~/types'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()

  const q =
    auth.role === 'admin'
      ? `SELECT id, login, email, role, created_at, last_visited FROM users ORDER BY id ASC`
      : `SELECT id, login, email, role, created_at, last_visited FROM users WHERE role = 'user' ORDER BY id ASC`

  const rows = (await db.prepare(q).all()) as AdminUserPublic[]

  const payload: AdminUsersListResponse = {
    users: rows.map((r) => ({
      ...r,
      role: r.role as AdminUserPublic['role'],
    })),
    scope: auth.role === 'admin' ? 'all' : 'users_only',
  }

  return payload
})
