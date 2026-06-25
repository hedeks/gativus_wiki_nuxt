/**
 * POST /api/import/odm/project/:id/part
 * Добавление нового пустого слота главы в скелет книги.
 */

import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(projectId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный ID проекта' })

  const body = await readBody(event) as {
    display_title?: string
    display_title_ru?: string | null
    display_title_zh?: string | null
    article_id?: number | string | null
  }

  // 1. Проверяем существование проекта
  const project = await db.prepare('SELECT id, book_id, category_id FROM odm_projects WHERE id = ?').get(projectId) as { id: number; book_id: number | null; category_id: number | null } | undefined
  if (!project)
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  let displayTitle = body.display_title?.trim() || 'New Chapter'
  let displayTitleRu = body.display_title_ru?.trim() || null
  let displayTitleZh = body.display_title_zh?.trim() || null
  let status = 'pending'
  let importedArticleIds: string | null = null
  let odtOriginalName: string | null = null

  const articleId = body.article_id ? Number(body.article_id) : null
  if (articleId) {
    const article = await db.prepare('SELECT id, title, title_ru, title_zh, slug FROM articles WHERE id = ?').get(articleId) as { id: number; title: string; title_ru: string | null; title_zh: string | null; slug: string } | undefined
    if (!article) {
      throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
    }
    displayTitle = article.title
    displayTitleRu = article.title_ru
    displayTitleZh = article.title_zh
    status = 'imported'
    importedArticleIds = JSON.stringify([article.id])
    odtOriginalName = `${article.slug}.odt`
  }

  // 2. Находим максимальный sort_order
  const maxRow = await db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM odm_project_parts WHERE project_id = ?'
  ).get(projectId) as { max_sort: number }
  const nextSort = maxRow.max_sort + 1

  // 3. Генерируем уникальный master_href
  const dummyHref = articleId ? `manual_article_${articleId}.odt` : `manual_chapter_${nextSort}_${Date.now()}.odt`

  // 4. Вставляем новый слот
  await db.prepare(`
    INSERT INTO odm_project_parts (
      project_id, sort_order, master_href, display_title,
      display_title_ru, display_title_zh,
      master_href_en, master_href_ru, master_href_zh,
      is_enabled, status, imported_article_ids, odt_original_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    projectId,
    nextSort,
    dummyHref,
    displayTitle,
    displayTitleRu,
    displayTitleZh,
    dummyHref,
    dummyHref,
    null,
    status,
    importedArticleIds,
    odtOriginalName
  )

  // Получаем вставленный ID
  const ins = await db.prepare('SELECT id FROM odm_project_parts WHERE project_id = ? ORDER BY id DESC LIMIT 1').get(projectId) as { id: number }
  const partId = Number(ins.id)

  if (articleId) {
    // Связываем саму статью со слотом, книгой и категорией
    await db.prepare(`
      UPDATE articles
      SET book_id = ?,
          category_id = COALESCE(category_id, ?),
          master_href_en = ?,
          master_href_ru = ?
      WHERE id = ?
    `).run(
      project.book_id,
      project.category_id,
      dummyHref,
      dummyHref,
      articleId
    )
  }

  return {
    ok: true,
    partId,
    sort_order: nextSort,
  }
})
