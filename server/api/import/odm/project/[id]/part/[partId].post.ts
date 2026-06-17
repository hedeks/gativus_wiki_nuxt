/**
 * POST /api/import/odm/project/:id/part/:partId
 * Загрузка .odt для слота мастер-документа → импорт статей с продолжением нумерации списков.
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { NumberingState, OdtContentLocale } from '~/server/utils/odtParser'
import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt, cloneNumberingState } from '~/server/utils/odtParser'
import { defaultOdmChapterTitle } from '~/server/utils/odmParser'
import { slugify, ensureUniqueArticleAnySlug } from '~/server/utils/slugify'
import { requireRole } from '~/server/utils/requireRole'
import { cascadeResetOdmSlotsFrom, cascadeResetOdmSlotsTranslationFrom, parseOdmImportedArticleIds } from '~/server/utils/odmSlotReset'
import { buildTermsMaps, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'

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

  const query = getQuery(event)
  const lang = (query.lang as string || 'en').toLowerCase() as 'en' | 'ru' | 'zh'
  if (lang !== 'en' && lang !== 'ru' && lang !== 'zh') {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный параметр lang' })
  }

  const loadPartRow = () => db.prepare(`
    SELECT p.*, pr.book_id, pr.category_id, pr.split_level, pr.content_locale
    FROM odm_project_parts p
    JOIN odm_projects pr ON p.project_id = pr.id
    WHERE p.id = ? AND p.project_id = ?
  `).get(partId, projectId) as Record<string, any> | undefined

  let row = await loadPartRow()

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })

  if (Number(row.is_enabled ?? 1) !== 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Этот слот исключён из импорта. Включите его перед загрузкой .odt.',
    })
  }

  const formData = await readMultipartFormData(event)

  if (lang === 'en' && String(row.status) === 'imported') {
    const so = Number(row.sort_order)
    const { resetSlotCount } = await cascadeResetOdmSlotsFrom(db, projectId, so)
    if (resetSlotCount === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Этот слот уже импортирован',
      })
    }
    row = await loadPartRow()
    if (!row)
      throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })
  } else if (lang !== 'en' && row[`odt_storage_path_${lang}`]) {
    const so = Number(row.sort_order)
    await cascadeResetOdmSlotsTranslationFrom(db, projectId, so, lang)
    row = await loadPartRow()
    if (!row)
      throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })
  }

  if (String(row.status) === 'error') {
    await db.prepare(`
      UPDATE odm_project_parts SET status = 'pending', updated_at = datetime('now') WHERE id = ?
    `).run(partId)
    row = await loadPartRow()
    if (!row)
      throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })
  }

  const titlesField = formData?.find(f => f.name === 'titles')
  if (titlesField?.data) {
    try {
      const t = JSON.parse(titlesField.data.toString('utf-8')) as {
        display_title?: string
        display_title_ru?: string | null
        display_title_zh?: string | null
      }
      const curRu = row.display_title_ru != null ? String(row.display_title_ru).trim() : ''
      const curZh = row.display_title_zh != null ? String(row.display_title_zh).trim() : ''
      const nextEn = t.display_title !== undefined
        ? String(t.display_title).trim()
        : String(row.display_title || '').trim()
      const nextRu = t.display_title_ru !== undefined
        ? (t.display_title_ru == null || String(t.display_title_ru).trim() === ''
            ? null
            : String(t.display_title_ru).trim())
        : (curRu === '' ? null : curRu)
      const nextZh = t.display_title_zh !== undefined
        ? (t.display_title_zh == null || String(t.display_title_zh).trim() === ''
            ? null
            : String(t.display_title_zh).trim())
        : (curZh === '' ? null : curZh)
      if (!nextEn) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Заголовок EN не может быть пустым',
        })
      }
      await db.prepare(`
        UPDATE odm_project_parts SET
          display_title = ?,
          display_title_ru = ?,
          display_title_zh = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(nextEn, nextRu, nextZh, partId)
      row = await loadPartRow()
      if (!row)
        throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })
    }
    catch (e) {
      if (e && typeof e === 'object' && 'statusCode' in e)
        throw e
    }
  }

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Слот не найден' })

  if (lang === 'en' && String(row.status) !== 'pending') {
    throw createError({
      statusCode: 400,
      statusMessage: `Слот в состоянии «${row.status}». Для новой загрузки EN нужен статус «ожидание».`,
    })
  }

  if (lang !== 'en' && String(row.status) !== 'imported') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Сначала необходимо загрузить английскую версию (EN .odt) для этой главы.',
    })
  }

  const fileField = formData?.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, statusMessage: 'Файл .odt не передан' })

  const fname = (fileField.filename || '').toLowerCase()
  if (!fname.endsWith('.odt'))
    throw createError({ statusCode: 400, statusMessage: 'Для слота нужен .odt (фрагмент книги)' })

  const sortOrder = Number(row.sort_order)
  const stateCol = lang === 'en' ? 'numbering_state_out_json' : `numbering_state_out_json_${lang}`
  const prevRow = await db.prepare(`
    SELECT ${stateCol} as state_json FROM odm_project_parts
    WHERE project_id = ? AND sort_order < ? AND status = 'imported'
    ORDER BY sort_order DESC LIMIT 1
  `).get(projectId, sortOrder) as { state_json: string | null } | undefined

  const numberingState = parseNumberingJson(prevRow?.state_json ?? null)
  const numberingStateInJson = numberingState ? JSON.stringify(numberingState) : null

  const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)

  const odtDir = join(process.cwd(), 'server', 'storage', 'odt')
  if (!existsSync(odtDir))
    mkdirSync(odtDir, { recursive: true })
  const originalName = fileField.filename || 'chapter.odt'
  const odtPath = join(odtDir, `${Date.now()}-odm${projectId}-p${partId}-${lang}-${originalName}`)
  writeFileSync(odtPath, buf as any)

  try {
    const fileLocale: OdtContentLocale = lang
    const parsed = await parseOdtBuffer(buf, {
      subDir: 'articles',
      numberingState,
      contentLocale: fileLocale,
    })

    const splitLevel = String(row.split_level || 'none')
    const titleEnOdt = extractFirstHeading(parsed.fullHtml)
    const titleEn = titleEnOdt || String(row.display_title || '').trim() || defaultOdmChapterTitle(sortOrder, 'en')
    const titleRuRaw = row.display_title_ru != null ? String(row.display_title_ru).trim() : ''
    const titleZhRaw = row.display_title_zh != null ? String(row.display_title_zh).trim() : ''
    const titleRu = titleRuRaw || null
    const titleZh = titleZhRaw || null

    const displayTitle = titleEn

    let articles: ReturnType<typeof splitIntoArticles>

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
    if (!bookId)
      throw new Error('Проект ODM не привязан к книге — импорт слота невозможен')
    const categoryId = row.category_id != null ? Number(row.category_id) : null

    if (lang === 'en') {
      let maxSortOrder = 0
      if (bookId) {
        const maxResult = await db.prepare(
          'SELECT MAX(sort_order) as max_sort FROM articles WHERE book_id = ?',
        ).get(bookId) as { max_sort: number | null }
        maxSortOrder = maxResult?.max_sort ?? 0
      }

      const importedIds: number[] = []
      const termsMaps = await buildTermsMaps(db)

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i]
        const isFirst = i === 0
        const insTitle = isFirst ? displayTitle : article.title
        const insTitleRu = isFirst ? titleRu : null
        const insTitleZh = isFirst ? titleZh : null

        const basePrimary = slugify(isFirst ? displayTitle : article.title)
        const slug = await ensureUniqueArticleAnySlug(db, basePrimary)

        let slugRu: string | null = null
        let slugZh: string | null = null
        if (isFirst && insTitleRu)
          slugRu = await ensureUniqueArticleAnySlug(db, slugify(insTitleRu))
        if (isFirst && insTitleZh)
          slugZh = await ensureUniqueArticleAnySlug(db, slugify(insTitleZh))

        const articleSortOrder = maxSortOrder + sortOrder * 100 + i + 1
        const processedHtml = linkTermsInHtml(article.html, termsMaps.en).html
        const excerpt = generateExcerpt(processedHtml)

        await db.prepare(`
          INSERT INTO articles (slug, slug_ru, slug_zh, title, title_ru, title_zh, html_content, raw_odt_path, book_id, category_id, sort_order, excerpt, created_by, is_published)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(
          slug,
          slugRu,
          slugZh,
          insTitle,
          insTitleRu,
          insTitleZh,
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

        await syncArticleTermsFromArticleRow(db, articleId, termsMaps)
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
          display_title = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        odtPath,
        originalName,
        numberingStateInJson,
        JSON.stringify(outState),
        JSON.stringify(importedIds),
        displayTitle,
        partId,
      )

      return {
        ok: true,
        imported: importedIds.length,
        articleIds: importedIds,
        numberingContinues: Object.keys(outState.listCounters).length > 0,
      }
    }
    else {
      const importedIds = parseOdmImportedArticleIds(row.imported_article_ids as string | null)
      if (importedIds.length === 0)
        throw new Error('Связанные статьи не найдены в этом слоте')

      const termsMaps = await buildTermsMaps(db)
      const col = lang === 'ru' ? 'html_content_ru' : 'html_content_zh'
      const exCol = lang === 'ru' ? 'excerpt_ru' : 'excerpt_zh'
      const titleCol = lang === 'ru' ? 'title_ru' : 'title_zh'
      const slugCol = lang === 'ru' ? 'slug_ru' : 'slug_zh'

      const titleOdt = extractFirstHeading(parsed.fullHtml)
      const localizedTitle = titleOdt || (lang === 'ru' ? titleRu : titleZh)

      for (let i = 0; i < Math.min(importedIds.length, articles.length); i++) {
        const article = articles[i]
        const articleId = importedIds[i]
        const isFirst = i === 0

        const processedHtml = linkTermsInHtml(article.html, lang === 'ru' ? termsMaps.ru : termsMaps.zh).html
        const excerpt = generateExcerpt(processedHtml)

        let slugVal: string | null = null
        if (isFirst && localizedTitle) {
          slugVal = await ensureUniqueArticleAnySlug(db, slugify(localizedTitle))
        }

        await db.prepare(`
          UPDATE articles SET
            ${col} = ?,
            ${exCol} = ?,
            ${isFirst && localizedTitle ? `${titleCol} = ?, ${slugCol} = ?,` : ''}
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          ...[
            processedHtml,
            excerpt,
            ...(isFirst && localizedTitle ? [localizedTitle, slugVal] : []),
            articleId,
          ],
        )

        const revNum = await db.prepare(
          'SELECT COALESCE(MAX(revision_num), 0) + 1 as n FROM article_revisions WHERE article_id = ?',
        ).get(articleId) as { n: number }

        await db.prepare(`
          INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(articleId, processedHtml, revNum.n, `Импорт перевода ODM (${lang.toUpperCase()})`, auth.id)

        await syncArticleTermsFromArticleRow(db, articleId, termsMaps)
      }

      const outState = parsed.numberingState ? cloneNumberingState(parsed.numberingState) : { listCounters: {} }

      const displayTitleCol = lang === 'ru' ? 'display_title_ru' : 'display_title_zh'
      await db.prepare(`
        UPDATE odm_project_parts SET
          odt_storage_path_${lang} = ?,
          odt_original_name_${lang} = ?,
          numbering_state_in_json_${lang} = ?,
          numbering_state_out_json_${lang} = ?,
          ${localizedTitle ? `${displayTitleCol} = ?,` : ''}
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        odtPath,
        originalName,
        numberingStateInJson,
        JSON.stringify(outState),
        ...(localizedTitle ? [localizedTitle] : []),
        partId,
      )

      return {
        ok: true,
        imported: Math.min(importedIds.length, articles.length),
        articleIds: importedIds,
        numberingContinues: Object.keys(outState.listCounters).length > 0,
      }
    }
  }
  catch (e: any) {
    if (lang === 'en') {
      await db.prepare(`
        UPDATE odm_project_parts SET status = 'error', updated_at = datetime('now') WHERE id = ?
      `).run(partId)
    }
    throw createError({
      statusCode: 422,
      statusMessage: e?.message || 'Ошибка импорта слота',
    })
  }
})
