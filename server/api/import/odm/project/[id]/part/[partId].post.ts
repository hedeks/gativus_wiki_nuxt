/**
 * POST /api/import/odm/project/:id/part/:partId
 * Загрузка .odt для слота мастер-документа → импорт статей с продолжением нумерации списков.
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import AdmZip from 'adm-zip'
import type { NumberingState, OdtContentLocale } from '~/server/utils/odtParser'
import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt, cloneNumberingState } from '~/server/utils/odtParser'
import { defaultOdmChapterTitle } from '~/server/utils/odmParser'
import { slugify, ensureUniqueArticleAnySlug } from '~/server/utils/slugify'
import { requireRole } from '~/server/utils/requireRole'
import { cascadeResetOdmSlotsFrom, cascadeResetOdmSlotsTranslationFrom, parseOdmImportedArticleIds } from '~/server/utils/odmSlotReset'
import { buildTermsMaps, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'
import { reindexHeadingMarkers, type HeadingLocale } from '~/server/utils/reindexHeadingMarkers'

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

  const isPendingOrError = String(row.status) === 'pending' || String(row.status) === 'error'

  if (lang === 'en' && !isPendingOrError) {
    throw createError({
      statusCode: 400,
      statusMessage: `Слот в состоянии «${row.status}». Для новой загрузки EN нужен статус «ожидание» или «ошибка».`,
    })
  }

  const rawHl = query.heading_locale || formData?.find(f => f.name === 'heading_locale')?.data.toString('utf-8')
  const headingLocaleOverride: HeadingLocale | null = (rawHl === 'ru' || rawHl === 'en' || rawHl === 'zh' || rawHl === 'none')
    ? rawHl as HeadingLocale
    : null
  const headingLocale = headingLocaleOverride || (lang as HeadingLocale)

  const fileField = formData?.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, statusMessage: 'Файл .odt не передан' })

  const fname = (fileField.filename || '').toLowerCase()
  if (!fname.endsWith('.odt'))
    throw createError({ statusCode: 400, statusMessage: 'Для слота нужен .odt (фрагмент книги)' })

  const sortOrder = Number(row.sort_order)
  const suffix = lang === 'en' ? '' : `_${lang}`
  const stateCol = `numbering_state_out_json${suffix}`
  const prevRow = await db.prepare(`
    SELECT ${stateCol} as state_json FROM odm_project_parts
    WHERE project_id = ? AND sort_order < ? AND status = 'imported'
    ORDER BY sort_order DESC LIMIT 1
  `).get(projectId, sortOrder) as { state_json: string | null } | undefined

  const numberingState = parseNumberingJson(prevRow?.state_json ?? null)
  const numberingStateInJson = numberingState ? JSON.stringify(numberingState) : null

  const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)

  const originalName = fileField.filename || 'chapter.odt'
  const odtPath: string | null = null

  // Вспомогательная функция для извлечения картинок (дублирует логику из odtParser.ts)
  const extractImagesLocal = (zip: AdmZip, subDir: string): { originalPath: string; savedPath: string }[] => {
    const results: { originalPath: string; savedPath: string }[] = []
    const uploadDir = join(process.cwd(), 'server', 'storage', 'uploads', subDir)
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }
    const entries = zip.getEntries()
    for (const entry of entries) {
      if (entry.entryName.startsWith('Pictures/') && !entry.isDirectory) {
        const fileName = `${Date.now()}-${basename(entry.entryName)}`
        const savePath = join(uploadDir, fileName)
        const data = entry.getData()
        writeFileSync(savePath, new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
        results.push({
          originalPath: entry.entryName,
          savedPath: `/api/uploads/${subDir}/${fileName}`,
        })
      }
    }
    return results
  }

  // Извлекаем картинки из загружаемого ODT
  let fileImages: { originalPath: string; savedPath: string }[] = []
  try {
    const zip = new AdmZip(buf)
    fileImages = extractImagesLocal(zip, 'articles')
  } catch (e) {
    console.error('[Part Import] Error pre-extracting images:', e)
  }

  // Свежая загрузка картинок из БД для связанных статей
  const articleIds: number[] = (() => {
    try { return JSON.parse(row.imported_article_ids || '[]') as number[] }
    catch { return [] }
  })()

  const dbImages: { originalPath: string; savedPath: string }[] = []
  if (articleIds.length > 0) {
    const rows = await db.prepare(
      `SELECT html_content, html_content_ru, html_content_zh FROM articles WHERE id IN (${articleIds.map(() => '?').join(',')})`
    ).all(...articleIds) as any[]
    
    for (const r of rows) {
      const htmls = [r.html_content, r.html_content_ru, r.html_content_zh]
      for (const html of htmls) {
        if (html) {
          const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi
          let m
          while ((m = imgRegex.exec(html)) !== null) {
            const savedPath = m[1]
            if (!dbImages.some(img => img.savedPath === savedPath)) {
              dbImages.push({ originalPath: '', savedPath })
            }
          }
        }
      }
    }
  }

  const combinedImages = [...fileImages]
  for (const dbImg of dbImages) {
    if (!combinedImages.some(img => img.savedPath === dbImg.savedPath)) {
      combinedImages.push(dbImg)
    }
  }

  try {
    const fileLocale: OdtContentLocale = lang
    const parsed = await parseOdtBuffer(buf, {
      subDir: 'articles',
      numberingState,
      contentLocale: fileLocale,
      images: combinedImages
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

    if (isPendingOrError) {
      let maxSortOrder = 0
      if (bookId) {
        const maxResult = await db.prepare(
          'SELECT MAX(sort_order) as max_sort FROM articles WHERE book_id = ?',
        ).get(bookId) as { max_sort: number | null }
        maxSortOrder = maxResult?.max_sort ?? 0
      }

      const importedIds: number[] = []
      const termsMaps = await buildTermsMaps(db)

      const titleOdt = extractFirstHeading(parsed.fullHtml)
      const titleLocal = titleOdt || (lang === 'ru' ? titleRu : (lang === 'zh' ? titleZh : null)) || defaultOdmChapterTitle(sortOrder, lang)

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i]
        const isFirst = i === 0

        const articleSortOrder = maxSortOrder + sortOrder * 100 + i + 1
        let processedHtml = linkTermsInHtml(article.html, lang === 'en' ? termsMaps.en : (lang === 'ru' ? termsMaps.ru : termsMaps.zh)).html
        if (headingLocale) processedHtml = reindexHeadingMarkers(processedHtml, sortOrder, headingLocale).html
        const excerpt = generateExcerpt(processedHtml)

        // Determine titles and slugs
        let baseTitle = isFirst ? titleEn : `Subchapter ${i + 1}`
        let baseSlug = await ensureUniqueArticleAnySlug(db, slugify(baseTitle))

        let insTitleRu: string | null = null
        let insSlugRu: string | null = null
        let insHtmlRu: string | null = null
        let insExRu: string | null = null

        let insTitleZh: string | null = null
        let insSlugZh: string | null = null
        let insHtmlZh: string | null = null
        let insExZh: string | null = null

        if (lang === 'en') {
          baseTitle = isFirst ? displayTitle : article.title
          baseSlug = await ensureUniqueArticleAnySlug(db, slugify(baseTitle))
        } else if (lang === 'ru') {
          insTitleRu = isFirst ? titleLocal : article.title
          insSlugRu = await ensureUniqueArticleAnySlug(db, slugify(insTitleRu))
          insHtmlRu = processedHtml
          insExRu = excerpt
        } else if (lang === 'zh') {
          insTitleZh = isFirst ? titleLocal : article.title
          insSlugZh = await ensureUniqueArticleAnySlug(db, slugify(insTitleZh))
          insHtmlZh = processedHtml
          insExZh = excerpt
        }

        const baseHtml = lang === 'en' ? processedHtml : ''
        const baseExcerpt = lang === 'en' ? excerpt : ''

        await db.prepare(`
          INSERT INTO articles (
            slug, slug_ru, slug_zh, title, title_ru, title_zh,
            html_content, html_content_ru, html_content_zh,
            raw_odt_path, book_id, category_id, sort_order, excerpt, excerpt_ru, excerpt_zh,
            created_by, is_published, translation_valid_ru, translation_valid_zh
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `).run(
          baseSlug,
          insSlugRu,
          insSlugZh,
          baseTitle,
          insTitleRu,
          insTitleZh,
          baseHtml,
          insHtmlRu,
          insHtmlZh,
          odtPath,
          bookId,
          categoryId,
          articleSortOrder,
          baseExcerpt,
          insExRu,
          insExZh,
          auth.id,
          lang === 'ru' ? 1 : 0,
          lang === 'zh' ? 1 : 0
        )

        const inserted = await db.prepare(`SELECT last_insert_rowid() as id`).get() as { id: number }
        const articleId = Number(inserted.id)
        importedIds.push(articleId)

        await db.prepare(`
          INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
          VALUES (?, ?, 1, ?, ?)
        `).run(articleId, processedHtml, `Imported ${lang.toUpperCase()} version`, auth.id)

        await syncArticleTermsFromArticleRow(db, articleId, termsMaps)
      }

      const outState = parsed.numberingState ? cloneNumberingState(parsed.numberingState) : { listCounters: {} }

      const colPath = `odt_storage_path${suffix}`
      const colName = `odt_original_name${suffix}`
      const colNumIn = `numbering_state_in_json${suffix}`
      const colNumOut = `numbering_state_out_json${suffix}`

      const displayTitleCol = lang === 'en' ? 'display_title' : (lang === 'ru' ? 'display_title_ru' : 'display_title_zh')
      const finalDisplayTitle = lang === 'en' ? displayTitle : titleLocal

      await db.prepare(`
        UPDATE odm_project_parts SET
          ${colPath} = ?,
          ${colName} = ?,
          ${colNumIn} = ?,
          ${colNumOut} = ?,
          imported_article_ids = ?,
          status = 'imported',
          display_title = COALESCE(display_title, ?),
          ${finalDisplayTitle ? `${displayTitleCol} = ?,` : ''}
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        ...[
          odtPath,
          originalName,
          numberingStateInJson,
          JSON.stringify(outState),
          JSON.stringify(importedIds),
          defaultOdmChapterTitle(sortOrder, 'en'),
          ...(finalDisplayTitle ? [finalDisplayTitle] : []),
          partId,
        ]
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
      const col = `html_content${suffix}`
      const exCol = `excerpt${suffix}`
      const titleCol = lang === 'en' ? 'title' : `title_${lang}`
      const slugCol = lang === 'en' ? 'slug' : `slug_${lang}`

      const titleOdt = extractFirstHeading(parsed.fullHtml)
      const localizedTitle = titleOdt || (lang === 'en' ? row.display_title : (lang === 'ru' ? titleRu : titleZh))

      for (let i = 0; i < Math.min(importedIds.length, articles.length); i++) {
        const article = articles[i]
        const articleId = importedIds[i]
        const isFirst = i === 0

        let processedHtml = linkTermsInHtml(article.html, lang === 'en' ? termsMaps.en : (lang === 'ru' ? termsMaps.ru : termsMaps.zh)).html
        if (headingLocale) processedHtml = reindexHeadingMarkers(processedHtml, sortOrder, headingLocale).html
        const excerpt = generateExcerpt(processedHtml)

        const displayTitleSub = isFirst ? localizedTitle : article.title
        let slugVal: string | null = null
        if (displayTitleSub) {
          slugVal = await ensureUniqueArticleAnySlug(db, slugify(displayTitleSub))
        }

        if (lang === 'en') {
          await db.prepare(`
            UPDATE articles SET
              html_content = ?,
              excerpt = ?,
              ${displayTitleSub ? 'title = ?, slug = ?,' : ''}
              updated_at = datetime('now')
            WHERE id = ?
          `).run(
            ...[
              processedHtml,
              excerpt,
              ...(displayTitleSub ? [displayTitleSub, slugVal] : []),
              articleId,
            ],
          )
        } else {
          await db.prepare(`
            UPDATE articles SET
              ${col} = ?,
              ${exCol} = ?,
              translation_valid_${lang} = 1,
              ${displayTitleSub ? `${titleCol} = ?, ${slugCol} = ?,` : ''}
              updated_at = datetime('now')
            WHERE id = ?
          `).run(
            ...[
              processedHtml,
              excerpt,
              ...(displayTitleSub ? [displayTitleSub, slugVal] : []),
              articleId,
            ],
          )
        }

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

      const colPath = `odt_storage_path${suffix}`
      const colName = `odt_original_name${suffix}`
      const colNumIn = `numbering_state_in_json${suffix}`
      const colNumOut = `numbering_state_out_json${suffix}`
      const displayTitleCol = lang === 'en' ? 'display_title' : (lang === 'ru' ? 'display_title_ru' : 'display_title_zh')
      const finalDisplayTitle = lang === 'en' ? (titleOdt || row.display_title) : localizedTitle

      await db.prepare(`
        UPDATE odm_project_parts SET
          ${colPath} = ?,
          ${colName} = ?,
          ${colNumIn} = ?,
          ${colNumOut} = ?,
          ${finalDisplayTitle ? `${displayTitleCol} = ?,` : ''}
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        ...[
          odtPath,
          originalName,
          numberingStateInJson,
          JSON.stringify(outState),
          ...(finalDisplayTitle ? [finalDisplayTitle] : []),
          partId,
        ]
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
