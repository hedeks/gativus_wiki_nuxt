/**
 * POST /api/import/odm/project/:id/publish
 * Публикация всех статей, созданных из импорта ODM по этому проекту (черновик → сайт).
 */

import { requireRole } from '~/server/utils/requireRole'

function parseImportedIds(raw: string | null): number[] {
  if (!raw)
    return []
  try {
    const a = JSON.parse(raw) as unknown
    if (!Array.isArray(a))
      return []
    return a.map(x => Number(x)).filter(id => Number.isFinite(id))
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
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })

  const project = await db.prepare(`SELECT id, book_id FROM odm_projects WHERE id = ?`).get(projectId) as { id: number; book_id: number | null } | undefined
  if (!project)
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  const parts = await db.prepare(`
    SELECT id, status, imported_article_ids FROM odm_project_parts
    WHERE project_id = ? ORDER BY sort_order
  `).all(projectId) as { id: number; status: string; imported_article_ids: string | null }[]

  if (parts.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'В проекте нет слотов' })

  const notImported = parts.filter(p => p.status !== 'imported')
  if (notImported.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Сначала импортируйте все главы (${notImported.length} слотов не готовы)`,
    })
  }

  const allIds = new Set<number>()
  for (const p of parts) {
    for (const id of parseImportedIds(p.imported_article_ids))
      allIds.add(id)
  }

  if (allIds.size === 0)
    throw createError({ statusCode: 400, statusMessage: 'Нет импортированных статей для публикации' })

  const ids = [...allIds]
  const placeholders = ids.map(() => '?').join(',')
  await db.prepare(`
    UPDATE articles SET is_published = 1, updated_at = datetime('now') WHERE id IN (${placeholders})
  `).run(...ids)

  await db.prepare(`UPDATE odm_projects SET updated_at = datetime('now') WHERE id = ?`).run(projectId)

  return {
    ok: true,
    publishedCount: ids.length,
    book_id: project.book_id,
  }
})
