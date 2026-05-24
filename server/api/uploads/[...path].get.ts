/**
 * GET /api/uploads/[...path]
 * Serve uploaded files from server/storage/uploads/.
 * This avoids storing uploads in public/ (which goes into git).
 */

import { createReadStream, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { sendStream, setResponseHeader, getRequestHeader } from 'h3'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
}

export default defineEventHandler(async (event) => {
  const pathParam = getRouterParam(event, 'path')

  if (!pathParam) {
    throw createError({ statusCode: 400, statusMessage: 'Path is required' })
  }

  // Sanitize path to prevent directory traversal
  const safePath = pathParam.replace(/\.\./g, '').replace(/\\/g, '/')
  const filePath = join(process.cwd(), 'server', 'storage', 'uploads', safePath)

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Файл не найден' })
  }

  const stat = statSync(filePath)
  if (!stat.isFile()) {
    throw createError({ statusCode: 404, statusMessage: 'Файл не найден' })
  }

  const ext = extname(filePath).toLowerCase()
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
  const isPdf = ext === '.pdf'
  const fileSize = stat.size

  setResponseHeader(event, 'Content-Type', mimeType)
  setResponseHeader(event, 'Accept-Ranges', 'bytes')
  if (isPdf) {
    setResponseHeader(event, 'Content-Disposition', 'inline')
  }

  // Handle byte-range requests (required by PDF.js and iOS for streaming)
  const rangeHeader = getRequestHeader(event, 'range')
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1
      const chunkSize = end - start + 1

      setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${fileSize}`)
      setResponseHeader(event, 'Content-Length', chunkSize.toString())
      event.node.res.statusCode = 206

      return sendStream(event, createReadStream(filePath, { start, end }))
    }
  }

  setResponseHeader(event, 'Content-Length', fileSize.toString())
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  return sendStream(event, createReadStream(filePath))
})
