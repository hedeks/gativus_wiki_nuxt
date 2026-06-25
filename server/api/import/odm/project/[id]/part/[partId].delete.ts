/**
 * DELETE /api/import/odm/project/:id/part/:partId
 * Удаление слота главы из скелета книги (неразрушающее).
 */

import { existsSync, unlinkSync } from 'fs'
import { requireRole } from '~/server/utils/requireRole'
import { parseOdmImportedArticleIds } from '~/server/utils/odmSlotReset'

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

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  const partId = Number(getRouterParam(event, 'partId'))
  if (!Number.isFinite(projectId) || !Number.isFinite(partId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректные параметры' })

  // 1. Получаем детали удаляемого слота
  const part = await db.prepare(
    `SELECT id, sort_order, odt_storage_path, odt_storage_path_ru, odt_storage_path_zh, imported_article_ids 
     FROM odm_project_parts WHERE id = ? AND project_id = ?`
  ).get(partId, projectId) as {
    id: number
    sort_order: number
    odt_storage_path: string | null
    odt_storage_path_ru: string | null
    odt_storage_path_zh: string | null
    imported_article_ids: string | null
  } | undefined

  if (!part)
    throw createError({ statusCode: 404, statusMessage: 'Слот не найден в проекте' })

  const sortOrder = part.sort_order

  // 2. Обрабатываем привязанные статьи
  const articleIds = parseOdmImportedArticleIds(part.imported_article_ids)
  if (articleIds.length > 0) {
    const ph = articleIds.map(() => '?').join(',')
    const pubRows = await db.prepare(`
      SELECT id, is_published FROM articles WHERE id IN (${ph})
    `).all(...articleIds) as { id: number; is_published: number }[]

    const publishedIds = pubRows.filter(r => r.is_published === 1).map(r => r.id)
    const draftIds = articleIds.filter(id => !publishedIds.includes(id))

    // Опубликованные статьи отвязываем от книги (оставляем на сайте)
    if (publishedIds.length > 0) {
      const pubPh = publishedIds.map(() => '?').join(',')
      await db.prepare(`
        UPDATE articles 
        SET book_id = NULL, sort_order = 0, updated_at = datetime('now')
        WHERE id IN (${pubPh})
      `).run(...publishedIds)
    }

    // Черновые статьи удаляем из базы данных
    if (draftIds.length > 0) {
      const draftPh = draftIds.map(() => '?').join(',')
      await db.prepare(`DELETE FROM articles WHERE id IN (${draftPh})`).run(...draftIds)
    }
  }

  // 3. Удаляем файлы ODT с диска для этого слота
  safeUnlink(part.odt_storage_path)
  safeUnlink(part.odt_storage_path_ru)
  safeUnlink(part.odt_storage_path_zh)

  // 4. Удаляем сам слот
  await db.prepare('DELETE FROM odm_project_parts WHERE id = ?').run(partId)

  // 5. Смещаем индексы sort_order всех последующих слотов на 1
  await db.prepare(`
    UPDATE odm_project_parts 
    SET sort_order = sort_order - 1 
    WHERE project_id = ? AND sort_order > ?
  `).run(projectId, sortOrder)

  // 6. Пересчитываем сквозной sort_order оставшихся статей в этой книге
  const project = await db.prepare('SELECT book_id FROM odm_projects WHERE id = ?').get(projectId) as { book_id: number | null } | undefined
  const bookId = project?.book_id

  if (bookId != null) {
    const remainingParts = await db.prepare(`
      SELECT imported_article_ids 
      FROM odm_project_parts 
      WHERE project_id = ? 
      ORDER BY sort_order
    `).all(projectId) as { imported_article_ids: string | null }[]

    const updateArticleSort = db.prepare('UPDATE articles SET sort_order = ? WHERE id = ? AND book_id = ?')
    let articleSortIndex = 1

    for (const p of remainingParts) {
      const artIds = parseOdmImportedArticleIds(p.imported_article_ids)
      for (const aid of artIds) {
        await updateArticleSort.run(articleSortIndex, aid, bookId)
        articleSortIndex++
      }
    }
  }

  return {
    ok: true,
    deletedPartId: partId,
    shiftedFromSortOrder: sortOrder
  }
})
