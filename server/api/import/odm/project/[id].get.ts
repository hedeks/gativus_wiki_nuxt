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
      continue
    }
    const ph = ids.map(() => '?').join(',')
    const rows = await db.prepare(`
      SELECT is_published FROM articles WHERE id IN (${ph})
    `).all(...ids) as { is_published: number }[]
    const n = rows.length
    const pub = rows.filter(r => r.is_published).length
    if (pub === 0)
      p.articles_publish = 'draft'
    else if (pub === n)
      p.articles_publish = 'published'
    else
      p.articles_publish = 'mixed'
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
    SELECT id, sort_order, master_href, display_title, display_title_ru, display_title_zh, status, odt_original_name,
           numbering_state_in_json, numbering_state_out_json, imported_article_ids
    FROM odm_project_parts WHERE project_id = ? ORDER BY sort_order
  `).all(id) as Record<string, unknown>[]

  await enrichPartsWithPublishState(db, parts)

  let draft_article_count = 0
  let live_article_count = 0
  for (const p of parts) {
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
