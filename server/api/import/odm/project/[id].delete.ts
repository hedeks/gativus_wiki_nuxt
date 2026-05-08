/**
 * DELETE /api/import/odm/project/:id
 * Удаляет проект ODM, все связанные черновики статей (только is_published = 0).
 * Если книга была создана вместе с проектом и после удаления статей не осталось ни одной статьи — удаляет книгу.
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
  if (!Number.isFinite(projectId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id' })

  const project = await db.prepare(`
    SELECT id, book_id, master_storage_path,
           COALESCE(book_created_with_project, 0) AS book_created_with_project
    FROM odm_projects WHERE id = ?
  `).get(projectId) as {
    id: number
    book_id: number | null
    master_storage_path: string
    book_created_with_project: number
  } | undefined

  if (!project)
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  const parts = await db.prepare(`
    SELECT id, odt_storage_path, imported_article_ids
    FROM odm_project_parts WHERE project_id = ?
  `).all(projectId) as { id: number; odt_storage_path: string | null; imported_article_ids: string | null }[]

  const articleIdSet = new Set<number>()
  for (const p of parts) {
    for (const id of parseOdmImportedArticleIds(p.imported_article_ids))
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
        statusMessage:
          'В проекте есть опубликованные статьи. Снимите их с публикации или удалите вручную — отмена проекта доступна только для черновиков.',
      })

    await db.prepare(`DELETE FROM articles WHERE id IN (${ph})`).run(...articleIds)
  }

  const bookId = project.book_id != null ? Number(project.book_id) : null
  const bookCreatedHere = Number(project.book_created_with_project) === 1

  safeUnlink(project.master_storage_path)
  for (const p of parts)
    safeUnlink(p.odt_storage_path)

  await db.prepare(`DELETE FROM odm_projects WHERE id = ?`).run(projectId)

  let bookRemoved = false
  if (bookCreatedHere && bookId != null) {
    const { cnt } = await db.prepare(
      `SELECT COUNT(*) AS cnt FROM articles WHERE book_id = ?`,
    ).get(bookId) as { cnt: number }
    if (cnt === 0) {
      await db.prepare(`DELETE FROM book_categories WHERE book_id = ?`).run(bookId)
      await db.prepare(`DELETE FROM books WHERE id = ?`).run(bookId)
      bookRemoved = true
    }
  }

  return {
    ok: true,
    deletedArticles: articleIds.length,
    book_removed: bookRemoved,
    book_id: bookId,
  }
})
