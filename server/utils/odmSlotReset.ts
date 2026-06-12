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

export async function cascadeResetOdmSlotsTranslationFrom(
  db: Db,
  projectId: number,
  fromSortOrder: number,
  lang: 'ru' | 'zh'
): Promise<{ resetSlotCount: number }> {
  const toReset = await db.prepare(`
    SELECT id, odt_storage_path_${lang} as path, imported_article_ids
    FROM odm_project_parts
    WHERE project_id = ? AND sort_order >= ?
    ORDER BY sort_order
  `).all(projectId, fromSortOrder) as {
    id: number
    path: string | null
    imported_article_ids: string | null
  }[]

  if (toReset.length === 0)
    return { resetSlotCount: 0 }

  const articleIdSet = new Set<number>()
  for (const row of toReset) {
    for (const id of parseOdmImportedArticleIds(row.imported_article_ids))
      articleIdSet.add(id)
  }
  const articleIds = [...articleIdSet]

  if (articleIds.length > 0) {
    const ph = articleIds.map(() => '?').join(',')
    const col = lang === 'ru' ? 'html_content_ru' : 'html_content_zh'
    const exCol = lang === 'ru' ? 'excerpt_ru' : 'excerpt_zh'
    const titleCol = lang === 'ru' ? 'title_ru' : 'title_zh'
    const slugCol = lang === 'ru' ? 'slug_ru' : 'slug_zh'
    const pathCol = lang === 'ru' ? 'raw_odt_path_ru' : 'raw_odt_path_zh' // Wait, articles might not have raw_odt_path_ru/zh, let's check SCHEMA.md

    // In SCHEMA.md, articles has:
    // html_content_ru, html_content_zh, excerpt_ru, excerpt_zh, title_ru, title_zh, slug_ru, slug_zh
    // It does NOT have raw_odt_path_ru/zh. Let's make sure we only set these to NULL.
    await db.prepare(`
      UPDATE articles SET
        ${col} = NULL,
        ${exCol} = NULL,
        ${titleCol} = NULL,
        ${slugCol} = NULL,
        updated_at = datetime('now')
      WHERE id IN (${ph})
    `).run(...articleIds)
  }

  for (const row of toReset) {
    safeUnlink(row.path)
    await db.prepare(`
      UPDATE odm_project_parts SET
        odt_storage_path_${lang} = NULL,
        odt_original_name_${lang} = NULL,
        numbering_state_in_json_${lang} = NULL,
        numbering_state_out_json_${lang} = NULL,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(row.id)
  }

  return { resetSlotCount: toReset.length }
}
