/**
 * Сброс импорта слотов ODM начиная с заданного sort_order (каскад вниз по оглавлению).
 */

import { existsSync, unlinkSync } from 'fs'

type Db = any

export function parseOdmImportedArticleIds(raw: string | null): number[] {
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

function safeUnlink(path: string | null | undefined) {
  if (!path)
    return
  try {
    if (existsSync(path))
      unlinkSync(path)
  }
  catch {
    /* ignore */
  }
}

export async function cascadeResetOdmSlotsFrom(
  db: Db,
  projectId: number,
  fromSortOrder: number,
): Promise<{ articleIds: number[]; resetSlotCount: number }> {
  const toReset = await db.prepare(`
    SELECT id, odt_storage_path, imported_article_ids
    FROM odm_project_parts
    WHERE project_id = ? AND sort_order >= ? AND status = 'imported'
    ORDER BY sort_order
  `).all(projectId, fromSortOrder) as {
    id: number
    odt_storage_path: string | null
    imported_article_ids: string | null
  }[]

  if (toReset.length === 0)
    return { articleIds: [], resetSlotCount: 0 }

  const articleIdSet = new Set<number>()
  for (const row of toReset) {
    for (const id of parseOdmImportedArticleIds(row.imported_article_ids))
      articleIdSet.add(id)
  }
  const articleIds = [...articleIdSet]

  if (articleIds.length > 0) {
    const ph = articleIds.map(() => '?').join(',')
    const pubRows = await db.prepare(`
      SELECT id, is_published FROM articles WHERE id IN (${ph})
    `).all(...articleIds) as { id: number; is_published: number }[]

    if (pubRows.some(r => r.is_published))
      throw createError({
        statusCode: 409,
        statusMessage: 'Сброс невозможен: среди затронутых статей есть опубликованные.',
      })

    await db.prepare(`DELETE FROM articles WHERE id IN (${ph})`).run(...articleIds)
  }

  for (const row of toReset) {
    safeUnlink(row.odt_storage_path)
    await db.prepare(`
      UPDATE odm_project_parts SET
        odt_storage_path = NULL,
        odt_original_name = NULL,
        numbering_state_in_json = NULL,
        numbering_state_out_json = NULL,
        imported_article_ids = NULL,
        status = 'pending',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(row.id)
  }

  return { articleIds, resetSlotCount: toReset.length }
}
