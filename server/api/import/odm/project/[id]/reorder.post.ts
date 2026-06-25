/**
 * POST /api/import/odm/project/:id/reorder
 * Изменение порядка (сортировки) глав в скелете книги.
 */

import { requireRole } from '~/server/utils/requireRole'

function parseImportedIds(raw: string | null): number[] {
  if (!raw)
    return []
  try {
    const a = JSON.parse(raw) as unknown
    if (!Array.isArray(a))
      return []
    return a.map(x => Number(x)).filter(x => Number.isFinite(x))
  }
  catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(projectId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный ID проекта' })

  const body = await readBody(event) as { partIds?: number[] }
  const partIds = body.partIds

  if (!Array.isArray(partIds) || partIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Не передан список ID глав для сортировки' })
  }

  // 1. Получаем текущие слоты проекта
  const currentParts = await db.prepare(
    'SELECT id, status, sort_order, imported_article_ids FROM odm_project_parts WHERE project_id = ?'
  ).all(projectId) as { id: number; status: string; sort_order: number; imported_article_ids: string | null }[]

  const currentIds = currentParts.map(p => p.id)

  // 2. Проверяем валидность списка ID
  const matches = partIds.length === currentIds.length && partIds.every(id => currentIds.includes(id))
  if (!matches) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Переданный список глав не совпадает со структурой книги'
    })
  }

  // 4. Записываем новый порядок слотов и связанных статей
  // Во избежание UNIQUE constraint failed: project_id, sort_order при промежуточных апдейтах
  // сначала переносим все слоты во временную отрицательную зону.
  const tempStmt = db.prepare(
    'UPDATE odm_project_parts SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND project_id = ?'
  )
  for (let i = 0; i < partIds.length; i++) {
    await tempStmt.run(-(i + 1), partIds[i], projectId)
  }

  const updateStmt = db.prepare(
    'UPDATE odm_project_parts SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND project_id = ?'
  )
  const updateArticleSort = db.prepare(
    'UPDATE articles SET sort_order = ? WHERE id = ?'
  )

  let articleSortIndex = 1

  for (let i = 0; i < partIds.length; i++) {
    const partId = partIds[i]
    await updateStmt.run(i + 1, partId, projectId)

    // Находим соответствующий слот и его импортированные статьи
    const part = currentParts.find(p => p.id === partId)
    if (part && part.imported_article_ids) {
      const artIds = parseImportedIds(part.imported_article_ids)
      for (const aid of artIds) {
        await updateArticleSort.run(articleSortIndex, aid)
        articleSortIndex++
      }
    }
  }

  return { ok: true }
})
