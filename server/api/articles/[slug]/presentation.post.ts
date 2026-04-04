/**
 * POST /api/articles/:slug/presentation
 * Upload an ODP (OpenDocument Presentation) file for an article.
 * Role: editor+.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const article = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as any
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  const originalName = fileField.filename || 'presentation.odp'
  const ext = originalName.split('.').pop()?.toLowerCase()

  if (!['odp', 'pptx', 'pdf'].includes(ext || '')) {
    throw createError({ statusCode: 400, statusMessage: 'Поддерживаемые форматы: .odp, .pptx, .pdf' })
  }

  // Save file
  const uploadDir = join(process.cwd(), 'server', 'storage', 'uploads', 'presentations')
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }

  const fileName = `${Date.now()}-${slug}.${ext}`
  const filePath = join(uploadDir, fileName)
  const data = fileField.data
  writeFileSync(filePath, new Uint8Array(data.buffer, data.byteOffset, data.byteLength))

  const publicPath = `/api/uploads/presentations/${fileName}`

  // Update article
  await db.prepare(
    `UPDATE articles SET presentation_path = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(publicPath, article.id)

  return {
    message: 'Презентация загружена',
    presentation_path: publicPath,
  }
})
