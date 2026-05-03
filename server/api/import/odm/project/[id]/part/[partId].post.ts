/**
 * POST /api/import/odm/project/:id/part/:partId
 * Загрузка .odt для слота мастер-документа → импорт статей с продолжением нумерации списков.
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { NumberingState } from '~/server/utils/odtParser'
import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt, cloneNumberingState } from '~/server/utils/odtParser'
import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { requireRole } from '~/server/utils/requireRole'
import { buildTermsMap, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'

function parseNumberingJson(raw: string | null): NumberingState | undefined {
  if (!raw) return undefined
  try {
    const o = JSON.parse(raw) as NumberingState
    if (o && typeof o.listCounters === 'object' && o.listCounters !== null)
      return { listCounters: { ...o.listCounters } }
  }
  catch { /* ignore */ }
  return undefined
}

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  const partId = Number(getRouterParam(event, 'partId'))
  if (!Number.isFinite(projectId) || !Number.isFinite(partId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректные параметры' })

  const row = await db.prepare(`
    SELECT p.*, pr.book_id, pr.category_id, pr.split_level
    FROM odm_project_parts p
    JOIN odm_projects pr ON p.project_id = pr.id
    WHERE p.id = ? AND p.project_id = ?
  `).get(partId, projectId) as Record<string, unknown> | undefined

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })

  if (String(row.status) === 'imported')
    throw createError({ statusCode: 409, statusMessage: 'Этот слот уже импортирован' })

  const formData = await readMultipartFormData(event)
  const fileField = formData?.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, statusMessage: 'Файл .odt не передан' })

  const fname = (fileField.filename || '').toLowerCase()
  if (!fname.endsWith('.odt'))
    throw createError({ statusCode: 400, statusMessage: 'Для слота нужен .odt (фрагмент книги)' })

  const sortOrder = Number(row.sort_order)
  const prevRow = await db.prepare(`
    SELECT numbering_state_out_json FROM odm_project_parts
    WHERE project_id = ? AND sort_order < ? AND status = 'imported'
    ORDER BY sort_order DESC LIMIT 1
  `).get(projectId, sortOrder) as { numbering_state_out_json: string | null } | undefined

  const numberingState = parseNumberingJson(prevRow?.numbering_state_out_json ?? null)
  const numberingStateInJson = numberingState ? JSON.stringify(numberingState) : null

  const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)

  const odtDir = join(process.cwd(), 'server', 'storage', 'odt')
  if (!existsSync(odtDir))
    mkdirSync(odtDir, { recursive: true })
  const originalName = fileField.filename || 'chapter.odt'
  const odtPath = join(odtDir, `${Date.now()}-odm${projectId}-p${partId}-${originalName}`)
  writeFileSync(odtPath, buf)

  try {
    const parsed = await parseOdtBuffer(buf, {
      subDir: 'articles',
      numberingState,
    })

    const splitLevel = String(row.split_level || 'none')
    const displayTitle = String(row.display_title || '').trim() || `Глава ${sortOrder}`

    let articles: ReturnType<typeof splitIntoArticles> | Array<{ title: string; slug: string; html: string; excerpt: string }>

    if (splitLevel === 'none') {
      const title = extractFirstHeading(parsed.fullHtml) || displayTitle
      articles = [{
        title,
        slug: slugify(title),
        html: parsed.fullHtml,
        excerpt: generateExcerpt(parsed.fullHtml),
      }]
    }
    else {
      const shifted = splitLevel === 'h1' ? 'h2' : 'h3'
      articles = splitIntoArticles(parsed.fullHtml, shifted as 'h1' | 'h2' | 'h3')
    }

    if (articles.length > 0) {
      const first = articles[0]
      articles[0] = {
        ...first,
        title: displayTitle,
        slug: slugify(displayTitle),
      }
    }

    const bookId = row.book_id != null ? Number(row.book_id) : null
    const categoryId = row.category_id != null ? Number(row.category_id) : null

    let maxSortOrder = 0
    if (bookId) {
      const maxResult = await db.prepare(
        'SELECT MAX(sort_order) as max_sort FROM articles WHERE book_id = ?',
      ).get(bookId) as { max_sort: number | null }
      maxSortOrder = maxResult?.max_sort ?? 0
    }

    /**
     * sort_order задаёт только порядок сортировки (в т.ч. продолжение после уже существующих глав).
     * Человекочитаемый «номер главы» на странице статьи — поле chapter_number из API (позиция в оглавлении).
     */
    const importedIds: number[] = []
    const termsMap = await buildTermsMap(db)

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      const slug = await ensureUniqueSlug(db, 'articles', article.slug)
      const articleSortOrder = maxSortOrder + sortOrder * 100 + i + 1
      const processedHtml = linkTermsInHtml(article.html, termsMap).html
      const excerpt = generateExcerpt(processedHtml)

      await db.prepare(`
        INSERT INTO articles (slug, title, html_content, raw_odt_path, book_id, category_id, sort_order, excerpt, created_by, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        slug,
        article.title,
        processedHtml,
        odtPath,
        bookId,
        categoryId,
        articleSortOrder,
        excerpt,
        auth.id,
      )

      const inserted = await db.prepare(`SELECT last_insert_rowid() as id`).get() as { id: number }
      const articleId = Number(inserted.id)
      importedIds.push(articleId)

      await db.prepare(`
        INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
        VALUES (?, ?, 1, ?, ?)
      `).run(articleId, processedHtml, 'Импорт ODM (слой книги)', auth.id)

      syncArticleTermsFromArticleRow(db, articleId, termsMap)
    }

    const outState = parsed.numberingState ? cloneNumberingState(parsed.numberingState) : { listCounters: {} }

    await db.prepare(`
      UPDATE odm_project_parts SET
        odt_storage_path = ?,
        odt_original_name = ?,
        numbering_state_in_json = ?,
        numbering_state_out_json = ?,
        imported_article_ids = ?,
        status = 'imported',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      odtPath,
      originalName,
      numberingStateInJson,
      JSON.stringify(outState),
      JSON.stringify(importedIds),
      partId,
    )

    return {
      ok: true,
      imported: importedIds.length,
      articleIds: importedIds,
      numberingContinues: Object.keys(outState.listCounters).length > 0,
    }
  }
  catch (e: any) {
    await db.prepare(`
      UPDATE odm_project_parts SET status = 'error', updated_at = datetime('now') WHERE id = ?
    `).run(partId)
    throw createError({
      statusCode: 422,
      statusMessage: e?.message || 'Ошибка импорта слота',
    })
  }
})
