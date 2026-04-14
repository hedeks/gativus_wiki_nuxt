import { requireRole } from '~/server/utils/requireRole'
import { parseOdtBuffer } from '~/server/utils/odtParser'

export default defineEventHandler(async (event) => {
  // 1. Authenticate (editor+)
  requireRole(event, 'editor')

  // 2. Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  // 3. Extract file field
  const fileField = formData.find(f => f.name === 'file' || f.name === 'odt')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  // 4. Validate file type (minimal)
  // ODT content types can be 'application/vnd.oasis.opendocument.text'
  // but sometimes the browser sends generic types. We'll check the filename if type is generic.
  const filename = fileField.filename || ''
  if (!filename.toLowerCase().endsWith('.odt')) {
     throw createError({ statusCode: 400, statusMessage: 'Поддерживаются только .odt файлы' })
  }

  // 5. Parse ODT to HTML
  try {
    const html = await parseOdtBuffer(fileField.data)
    return { html }
  } catch (err: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Ошибка при парсинге ODT: ${err.message}` 
    })
  }
})
