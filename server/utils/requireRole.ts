/**
 * Gativus Wiki — Role Checker Utility
 * Use inside API handlers to enforce role-based access.
 *
 * Usage:
 *   const user = requireRole(event, 'editor')  // editor or admin
 *   const admin = requireRole(event, 'admin')  // admin only
 */

import type { H3Event } from 'h3'

interface AuthContext {
  id: number
  login: string
  email: string
  role: 'editor' | 'admin'
  uuid: string
}

export function requireAuth(event: H3Event): AuthContext {
  const auth = event.context.auth as AuthContext | null
  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Необходима авторизация'
    })
  }
  return auth
}

export function requireRole(event: H3Event, role: 'editor' | 'admin'): AuthContext {
  const auth = requireAuth(event)

  if (role === 'admin' && auth.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Доступ запрещён: требуются права администратора'
    })
  }

  // 'editor' check: both 'editor' and 'admin' pass
  return auth
}
