/**
 * POST /api/import/preview
 * Preview ODT import without saving to database.
 * Returns parsed articles with their HTML content.
 * Role: editor+.
 */

import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt } from '~/server/utils/odtParser'
import { requireRole } from '~/server/utils/requireRole'
import { slugify } from '~/server/utils/slugify'

function multipartFileToBuffer(data: Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(data))
    return data
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  // Find the ODT file
  const fileField = formData.find(f => f.name === 'file')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  const name = (fileField.filename || '').toLowerCase()
  if (!name.endsWith('.odt')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Preview поддерживает только .odt. Для мастер-документа используйте импорт ODM.',
    })
  }

  // Find options
  const optionsField = formData.find(f => f.name === 'options')
  const options = optionsField ? JSON.parse(optionsField.data.toString('utf-8')) : {}
  const splitLevel = options.split_level || 'none'

  try {
    const buf = multipartFileToBuffer(fileField.data as Buffer | Uint8Array)
    const parsed = await parseOdtBuffer(buf, 'preview')
    
    let articles = []
    if (splitLevel === 'none') {
      const title = extractFirstHeading(parsed.fullHtml) || fileField.filename || 'Untitled'
      articles = [{
        title,
        slug: slugify(title),
        html: parsed.fullHtml,
        excerpt: generateExcerpt(parsed.fullHtml)
      }]
    } else {
      // Parser shifts headings +1, so shift split level to match
      const shiftedSplitLevel = splitLevel === 'h1' ? 'h2' : 'h3'
      articles = splitIntoArticles(parsed.fullHtml, shiftedSplitLevel as 'h1' | 'h2' | 'h3')
    }

    return {
      articles,
      images: parsed.images,
      total: articles.length,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 422,
      statusMessage: `Ошибка парсинга ODT: ${err.message}`
    })
  }
})
