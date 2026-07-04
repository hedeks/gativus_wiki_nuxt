/**
 * GET /api/import/odm/project/:id
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

async function enrichPartsWithPublishState(
  db: any,
  parts: Record<string, unknown>[],
) {
  for (const p of parts) {
    const ids = parseImportedIds(p.imported_article_ids as string | null)
    if (ids.length === 0) {
      p.articles_publish = null
      p.has_translation_en = false
      p.has_translation_ru = false
      p.has_translation_zh = false
      continue
    }
    const ph = ids.map(() => '?').join(',')
    const rows = await db.prepare(`
      SELECT id, is_published, title, title_ru, title_zh, html_content, html_content_ru, html_content_zh,
             translation_valid_en, translation_valid_ru, translation_valid_zh
      FROM articles WHERE id IN (${ph})
    `).all(...ids) as { 
      id: number
      is_published: number 
      title: string | null
      title_ru: string | null
      title_zh: string | null
      html_content: string | null
      html_content_ru: string | null
      html_content_zh: string | null
      translation_valid_en: number | null
      translation_valid_ru: number | null
      translation_valid_zh: number | null
    }[]

    // Валидация скелета: если часть привязанных статей была удалена из БД
    if (rows.length !== ids.length) {
      if (rows.length === 0) {
        // Ни одна статья больше не существует - сбрасываем главу
        await db.prepare(`
          UPDATE odm_project_parts 
          SET status = 'pending', imported_article_ids = NULL,
              odt_storage_path = NULL, odt_storage_path_ru = NULL, odt_storage_path_zh = NULL,
              odt_original_name = NULL, odt_original_name_ru = NULL, odt_original_name_zh = NULL,
              updated_at = datetime('now')
          WHERE id = ?
        `).run(p.id)
        
        p.status = 'pending'
        p.imported_article_ids = null
        p.odt_storage_path = null
        p.odt_storage_path_ru = null
        p.odt_storage_path_zh = null
        p.odt_original_name = null
        p.odt_original_name_ru = null
        p.odt_original_name_zh = null
        p.articles_publish = null
        p.has_translation_en = false
        p.has_translation_ru = false
        p.has_translation_zh = false
        continue
      } else {
        // Часть статей была удалена - обновляем список IDs в БД
        const activeIds = rows.map(r => r.id)
        const updatedIdsJson = JSON.stringify(activeIds)
        await db.prepare(`
          UPDATE odm_project_parts 
          SET imported_article_ids = ?, updated_at = datetime('now') 
          WHERE id = ?
        `).run(updatedIdsJson, p.id)
        p.imported_article_ids = updatedIdsJson
      }
    }

    const n = rows.length
    const pub = rows.filter(r => r.is_published).length
    if (pub === 0)
      p.articles_publish = 'draft'
    else if (pub === n)
      p.articles_publish = 'published'
    else
      p.articles_publish = 'mixed'

    p.has_translation_en = rows.every(r => r.translation_valid_en !== null && r.translation_valid_en !== undefined ? Boolean(r.translation_valid_en) : true)
    p.has_translation_ru = rows.every(r => Boolean(r.translation_valid_ru))
    p.has_translation_zh = rows.every(r => Boolean(r.translation_valid_zh))

    // Fallback to article titles if missing in the project part
    if (rows.length > 0) {
      if ((p.display_title == null || String(p.display_title).trim() === '') && rows[0].title)
        p.display_title = rows[0].title
      if ((p.display_title_ru == null || String(p.display_title_ru).trim() === '') && rows[0].title_ru)
        p.display_title_ru = rows[0].title_ru
      if ((p.display_title_zh == null || String(p.display_title_zh).trim() === '') && rows[0].title_zh)
        p.display_title_zh = rows[0].title_zh
    }
  }
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })

  const project = await db.prepare(`SELECT * FROM odm_projects WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!project)
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  const parts = await db.prepare(`
    SELECT id, sort_order, master_href, display_title, display_title_ru, display_title_zh,
           master_href_en, master_href_ru, master_href_zh, is_enabled, status,
           odt_original_name, odt_original_name_ru, odt_original_name_zh,
           odt_storage_path, odt_storage_path_ru, odt_storage_path_zh,
           numbering_state_in_json, numbering_state_out_json,
           numbering_state_in_json_ru, numbering_state_out_json_ru,
           numbering_state_in_json_zh, numbering_state_out_json_zh,
           imported_article_ids
    FROM odm_project_parts WHERE project_id = ? ORDER BY sort_order
  `).all(id) as Record<string, unknown>[]

  await enrichPartsWithPublishState(db, parts)

  let draft_article_count = 0
  let live_article_count = 0
  for (const p of parts) {
    if (Number(p.is_enabled ?? 1) !== 1)
      continue
    const ids = parseImportedIds(p.imported_article_ids as string | null)
    if (ids.length === 0)
      continue
    const ph = ids.map(() => '?').join(',')
    const rows = await db.prepare(`
      SELECT is_published FROM articles WHERE id IN (${ph})
    `).all(...ids) as { is_published: number }[]
    for (const r of rows) {
      if (r.is_published)
        live_article_count++
      else
        draft_article_count++
    }
  }

  return {
    project,
    parts,
    stats: { draft_article_count, live_article_count },
  }
})
