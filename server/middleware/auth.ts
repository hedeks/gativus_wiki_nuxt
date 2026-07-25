/**
 * Gativus Wiki — Server Auth Middleware
 * Verifies JWT token from Authorization header.
 * Non-blocking: sets event.context.auth = null if no/invalid token.
 * API endpoints use requireRole() to enforce access.
 */

import jwt from 'jsonwebtoken'

export default defineEventHandler((event) => {
  let token: string | undefined

  const authHeader = getHeader(event, 'authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    token = getCookie(event, 'gativus_token')
  }

  if (!token) {
    event.context.auth = null
    return
  }
  const config = useRuntimeConfig()

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any
    event.context.auth = {
      id: decoded.data?.id,
      login: decoded.data?.login,
      email: decoded.data?.email,
      role: decoded.data?.role || 'editor',
      uuid: decoded.data?.uuid
    }
  } catch {
    event.context.auth = null
  }
})
