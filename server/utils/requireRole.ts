/**
 * Gativus Wiki — Role Checker Utility
 * Use inside API handlers to enforce role-based access.
 *
 * Usage:
 *   requireRole(event, 'editor')  // editor или admin
 *   requireRole(event, 'admin')   // только admin
 */

import type { H3Event } from 'h3'

/** Роли из JWT / `users.role` */
export type AuthRole = 'user' | 'editor' | 'admin'

interface AuthContext {
  id: number
  login: string
  email: string
  role: AuthRole
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

export function isEditorOrAbove(role: string | undefined | null): boolean {
  return role === 'editor' || role === 'admin'
}

export function isAdminOrAbove(role: string | undefined | null): boolean {
  return role === 'admin'
}

export function requireRole(event: H3Event, role: 'editor' | 'admin'): AuthContext {
  const auth = requireAuth(event)

  if (role === 'admin' && auth.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Доступ запрещён: требуются права администратора'
    })
  }

  // `editor`: и editor, и admin
  return auth
}
