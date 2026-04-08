import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  // 1. Authenticate (editor+)
  const auth = requireRole(event, 'editor')

  // 2. Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  // 3. Extract file field
  const fileField = formData.find(f => f.name === 'file' || f.name === 'image')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  // 4. Validate file type (basic)
  const contentType = fileField.type || ''
  if (!contentType.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Допускаются только изображения' })
  }

  // 5. Prepare storage directory for article images
  const storageDir = join(process.cwd(), 'server', 'storage', 'uploads', 'articles')
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }

  // 6. Generate unique filename
  const originalName = fileField.filename || 'article-image.jpg'
  const ext = extname(originalName) || '.jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`
  const filePath = join(storageDir, fileName)

  // 7. Write file
  try {
    writeFileSync(filePath, new Uint8Array(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength))
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `Ошибка записи файла: ${err.message}` })
  }

  // 8. Return public URL
  return {
    url: `/api/uploads/articles/${fileName}`,
    filename: fileName
  }
})
