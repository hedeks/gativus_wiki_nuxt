/**
 * POST /api/import/preview
 * Preview ODT import without saving to database.
 * Returns parsed articles with their HTML content.
 * Role: editor+.
 */

import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt } from '~/server/utils/odtParser'
import { slugify } from '~/server/utils/slugify'

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

  // Find options
  const optionsField = formData.find(f => f.name === 'options')
  const options = optionsField ? JSON.parse(optionsField.data.toString('utf-8')) : {}
  const splitLevel = options.split_level || 'none'

  try {
    const parsed = await parseOdtBuffer(fileField.data, 'preview')
    
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
