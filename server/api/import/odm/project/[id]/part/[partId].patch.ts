/**
 * PATCH /api/import/odm/project/:id/part/:partId
 * Редактирование локализованных названий слота до импорта .odt.
 */

import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  const partId = Number(getRouterParam(event, 'partId'))
  if (!Number.isFinite(projectId) || !Number.isFinite(partId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректные параметры' })

  const body = await readBody(event) as {
    display_title?: string
    display_title_ru?: string | null
    display_title_zh?: string | null
    is_enabled?: boolean
  }

  const row = await db.prepare(`
    SELECT id, project_id, status, display_title, display_title_ru, display_title_zh, is_enabled
    FROM odm_project_parts WHERE id = ? AND project_id = ?
  `).get(partId, projectId) as {
    id: number
    project_id: number
    status: string
    display_title: string
    display_title_ru: string | null
    display_title_zh: string | null
    is_enabled: number
  } | undefined

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })

  if (String(row.status) !== 'pending')
    throw createError({ statusCode: 409, statusMessage: 'Редактировать названия можно только до загрузки .odt' })

  const nextEn = body.display_title !== undefined ? String(body.display_title).trim() : row.display_title
  const nextRu = body.display_title_ru !== undefined
    ? (body.display_title_ru == null || String(body.display_title_ru).trim() === ''
        ? null
        : String(body.display_title_ru).trim())
    : row.display_title_ru
  const nextZh = body.display_title_zh !== undefined
    ? (body.display_title_zh == null || String(body.display_title_zh).trim() === ''
        ? null
        : String(body.display_title_zh).trim())
    : row.display_title_zh
  const nextEnabled = body.is_enabled !== undefined ? (body.is_enabled ? 1 : 0) : Number(row.is_enabled || 0)

  if (!nextEn)
    throw createError({ statusCode: 400, statusMessage: 'Заголовок EN не может быть пустым' })

  await db.prepare(`
    UPDATE odm_project_parts SET
      display_title = ?,
      display_title_ru = ?,
      display_title_zh = ?,
      is_enabled = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(nextEn, nextRu, nextZh, nextEnabled, partId)

  const updated = await db.prepare(`
    SELECT id, sort_order, master_href, display_title, display_title_ru, display_title_zh, is_enabled, status, odt_original_name, imported_article_ids
    FROM odm_project_parts WHERE id = ?
  `).get(partId)

  return { ok: true, part: updated }
})
