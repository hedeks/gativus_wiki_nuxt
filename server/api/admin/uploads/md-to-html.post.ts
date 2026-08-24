import { requireRole } from '~/server/utils/requireRole'
import { parseMarkdownBuffer } from '~/server/utils/mdParser'

export default defineEventHandler(async (event) => {
  // 1. Authenticate (editor+)
  requireRole(event, 'editor')

  // 2. Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  // 3. Extract file field
  const fileField = formData.find(f => f.name === 'file' || f.name === 'md')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  // 4. Validate file type
  const filename = fileField.filename || ''
  if (!filename.toLowerCase().endsWith('.md') && !filename.toLowerCase().endsWith('.zip')) {
     throw createError({ statusCode: 400, statusMessage: 'Поддерживаются только .md или .zip файлы' })
  }

  // 5. Parse Markdown to HTML
  try {
    const result = parseMarkdownBuffer(fileField.data, filename)
    return { 
      html: result.html,
      missingImages: result.missingImages,
      title: result.title,
      excerpt: result.excerpt
    }
  } catch (err: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Ошибка при парсинге Markdown: ${err.message}` 
    })
  }
})
