/**
 * POST /api/import/odm/project/:id/enrich-locale
 * Загрузка дополнительного ODM-файла на другом языке → заполнение display_title_{locale}
 * и master_href_{locale} для существующих слотов проекта (матчинг по позиции / sort_order).
 */

import { parseOdmOutline, type OdmContentLocale } from '~/server/utils/odmParser'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(projectId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный projectId' })

  const formData = await readMultipartFormData(event)
  if (!formData?.length)
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })

  const name = (fileField.filename || '').toLowerCase()
  if (!name.endsWith('.odm'))
    throw createError({ statusCode: 400, statusMessage: 'Нужен файл .odm' })

  const localeField = formData.find(f => f.name === 'locale')
  const rawLc = localeField ? localeField.data.toString('utf-8').trim().toLowerCase() : 'ru'
  const locale: OdmContentLocale = rawLc === 'en' || rawLc === 'zh' ? rawLc : 'ru'

  const project = await db.prepare('SELECT id FROM odm_projects WHERE id = ?').get(projectId) as { id: number } | undefined
  if (!project)
    throw createError({ statusCode: 404, statusMessage: 'Проект ODM не найден' })

  const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)
  const slots = parseOdmOutline(buf, { contentLocale: locale })

  // Существующие слоты отсортированы по sort_order — матчим по позиции
  const parts = await db.prepare(
    'SELECT id, sort_order FROM odm_project_parts WHERE project_id = ? ORDER BY sort_order',
  ).all(projectId) as { id: number; sort_order: number }[]

  if (parts.length === 0)
    throw createError({ statusCode: 409, statusMessage: 'В проекте нет слотов. Сначала создайте проект.' })

  const titleCol = locale === 'en' ? 'display_title' : locale === 'ru' ? 'display_title_ru' : 'display_title_zh'
  const hrefCol = locale === 'en' ? 'master_href_en' : locale === 'ru' ? 'master_href_ru' : 'master_href_zh'

  const updateStmt = db.prepare(
    `UPDATE odm_project_parts SET ${titleCol} = ?, ${hrefCol} = ?, updated_at = datetime('now') WHERE id = ?`,
  )

  const updated: { partId: number; sortOrder: number; title: string; href: string }[] = []

  for (let i = 0; i < Math.min(parts.length, slots.length); i++) {
    const part = parts[i]
    const slot = slots[i]
    await updateStmt.run(slot.displayTitle, slot.masterHref, part.id)
    updated.push({ partId: part.id, sortOrder: part.sort_order, title: slot.displayTitle, href: slot.masterHref })
  }

  return {
    locale,
    updatedCount: updated.length,
    totalSlots: parts.length,
    totalParsed: slots.length,
    updated,
  }
})
