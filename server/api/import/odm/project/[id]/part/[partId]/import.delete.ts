/**
 * DELETE /api/import/odm/project/:id/part/:partId/import
 * Сброс слота: удаляет черновики статей этого слота и всех последующих импортированных слотов.
 */

import { requireRole } from '~/server/utils/requireRole'
import { cascadeResetOdmSlotsFrom } from '~/server/utils/odmSlotReset'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  const partId = Number(getRouterParam(event, 'partId'))
  if (!Number.isFinite(projectId) || !Number.isFinite(partId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректные параметры' })

  const target = await db.prepare(`
    SELECT id, project_id, sort_order
    FROM odm_project_parts WHERE id = ? AND project_id = ?
  `).get(partId, projectId) as { id: number; project_id: number; sort_order: number } | undefined

  if (!target)
    throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })

  const sortOrder = Number(target.sort_order)
  const { articleIds, resetSlotCount } = await cascadeResetOdmSlotsFrom(db, projectId, sortOrder)

  if (resetSlotCount === 0)
    throw createError({ statusCode: 400, statusMessage: 'В этом и следующих слотах нет импорта для сброса' })

  return {
    ok: true,
    resetSlots: resetSlotCount,
    deletedArticles: articleIds.length,
  }
})
