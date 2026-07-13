/**
 * POST /api/admin/articles/parse-odt
 * Parse an ODT file and return the resulting HTML.
 * Images are saved to uploads/articles/.
 * Role: editor+.
 */

import { parseOdtBuffer } from '~/server/utils/odtParser'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField?.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  if (!(fileField.filename || '').toLowerCase().endsWith('.odt')) {
    throw createError({ statusCode: 400, statusMessage: 'Поддерживается только .odt' })
  }

  try {
    const buf = fileField.data

    const parsed = await parseOdtBuffer(buf, 'articles')
    return { html: parsed.fullHtml, metadata: parsed.metadata }
  } catch (err: any) {
    throw createError({ statusCode: 422, statusMessage: `Ошибка парсинга ODT: ${err.message}` })
  }
})
