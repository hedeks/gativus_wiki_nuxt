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
  const fileField = formData.find(f => f.name === 'file' || f.name === 'image' || f.name === 'video')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле файла не найдено' })
  }

  // 4. Validate file type
  const contentType = fileField.type || ''
  const allowedTypes = ['image/', 'video/', 'application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
  const isAllowed = allowedTypes.some(t => contentType.startsWith(t))
  
  if (!isAllowed) {
    throw createError({ statusCode: 400, statusMessage: 'Неподдерживаемый тип файла' })
  }

  // 5. Prepare storage directory for terms
  const storageDir = join(process.cwd(), 'server', 'storage', 'uploads', 'terms')
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }

  // 6. Generate unique filename
  const originalName = fileField.filename || 'upload'
  const ext = extname(originalName)
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
    url: `/api/uploads/terms/${fileName}`,
    filename: fileName
  }
})
