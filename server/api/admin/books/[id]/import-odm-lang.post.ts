/**
 * POST /api/admin/books/:id/import-odm-lang
 * Загрузка ODM-файла для конкретного языка книги.
 * Матчит главы ODM к статьям книги по позиции (sort_order).
 * Обновляет title_{lang} и master_href_{lang} для каждой статьи.
 *
 * Body: FormData { file: .odm, lang: 'en'|'ru'|'zh' }
 */

import { parseOdmOutline, detectHeadingFormat, type OdmContentLocale } from '~/server/utils/odmParser'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const bookId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(bookId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный bookId' })

  const book = await db.prepare('SELECT id FROM books WHERE id = ?').get(bookId) as { id: number } | undefined
  if (!book)
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })

  const formData = await readMultipartFormData(event)
  if (!formData?.length)
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })

  const name = (fileField.filename || '').toLowerCase()
  if (!name.endsWith('.odm'))
    throw createError({ statusCode: 400, statusMessage: 'Нужен файл .odm' })

  const langField = formData.find(f => f.name === 'lang')
  const rawLang = langField ? langField.data.toString('utf-8').trim().toLowerCase() : 'en'
  const lang: OdmContentLocale = rawLang === 'ru' || rawLang === 'zh' ? rawLang : 'en'

  const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)
  const slots = parseOdmOutline(buf, { contentLocale: lang })
  const detectedHeadingFormat = detectHeadingFormat(slots)

  // Все статьи книги, включая черновики, по порядку
  const articles = await db.prepare(
    `SELECT id, sort_order, title, title_ru, title_zh, master_href_en, master_href_ru, master_href_zh
     FROM articles WHERE book_id = ? ORDER BY sort_order ASC`,
  ).all(bookId) as any[]

  if (articles.length === 0)
    throw createError({ statusCode: 409, statusMessage: 'В книге нет статей. Сначала создайте главы.' })

  const titleCol = lang === 'en' ? 'title' : lang === 'ru' ? 'title_ru' : 'title_zh'
  const hrefCol = lang === 'en' ? 'master_href_en' : lang === 'ru' ? 'master_href_ru' : 'master_href_zh'

  const updateStmt = db.prepare(
    `UPDATE articles SET ${titleCol} = ?, ${hrefCol} = ?, updated_at = datetime('now') WHERE id = ?`,
  )

  const matched: { articleId: number; position: number; title: string; href: string }[] = []

  for (let i = 0; i < Math.min(articles.length, slots.length); i++) {
    const article = articles[i]
    const slot = slots[i]
    await updateStmt.run(slot.displayTitle, slot.masterHref, article.id)
    matched.push({ articleId: article.id, position: i + 1, title: slot.displayTitle, href: slot.masterHref })
  }

  return {
    lang,
    updatedCount: matched.length,
    totalArticles: articles.length,
    totalSlots: slots.length,
    matched,
    detectedHeadingFormat,
  }
})
