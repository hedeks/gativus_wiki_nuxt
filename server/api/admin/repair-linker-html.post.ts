/**
 * POST /api/admin/repair-linker-html
 * Чинит типичные поломки wiki-term разметки в статьях (после старых багов автолинковки).
 * Role: admin.
 */

import { repairTermLinkerCorruption } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  const articles = await db.prepare(`
    SELECT id, html_content, html_content_ru, html_content_zh FROM articles
    WHERE (html_content IS NOT NULL AND TRIM(html_content) != '')
       OR (html_content_ru IS NOT NULL AND TRIM(html_content_ru) != '')
       OR (html_content_zh IS NOT NULL AND TRIM(html_content_zh) != '')
  `).all() as any[]

  let updated = 0

  for (const row of articles || []) {
    let nh = row.html_content as string
    let nhr = row.html_content_ru as string | null
    let nhz = row.html_content_zh as string | null
    let changed = false

    const needsRepair = (s: string | null | undefined) =>
      !!s && (s.includes('glossary') || s.includes('wiki-term'))

    if (needsRepair(nh)) {
      const r = repairTermLinkerCorruption(nh)
      if (r !== nh) {
        nh = r
        changed = true
      }
    }
    if (needsRepair(nhr)) {
      const r = repairTermLinkerCorruption(nhr!)
      if (r !== nhr) {
        nhr = r
        changed = true
      }
    }
    if (needsRepair(nhz)) {
      const r = repairTermLinkerCorruption(nhz!)
      if (r !== nhz) {
        nhz = r
        changed = true
      }
    }

    if (changed) {
      await db.prepare(`
        UPDATE articles SET html_content = ?, html_content_ru = ?, html_content_zh = ?, updated_at = datetime('now') WHERE id = ?
      `).run(nh, nhr, nhz, row.id)
      updated++
    }
  }

  const total = (articles || []).length
  return {
    updated,
    total,
    message:
      `Исправлен HTML у статей: ${updated} из ${total}. ` +
      'Автолинки wiki-term сняты/очищены — сразу после этого нажмите «Перелинковать статьи», иначе термины не будут кликабельны.',
  }
})
