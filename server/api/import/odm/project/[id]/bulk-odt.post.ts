/**
 * POST /api/import/odm/project/:id/bulk-odt
 * Массовая загрузка .odt файлов для проекта ODM с автоопределением локали.
 * Матчит файлы к слотам по имени файла (vs master_href_en, master_href_ru, master_href_zh).
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import type { NumberingState, OdtContentLocale } from '~/server/utils/odtParser'
import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt, cloneNumberingState } from '~/server/utils/odtParser'
import { defaultOdmChapterTitle } from '~/server/utils/odmParser'
import { reindexHeadingMarkers, type HeadingLocale } from '~/server/utils/reindexHeadingMarkers'
import { slugify, ensureUniqueArticleAnySlug } from '~/server/utils/slugify'
import { requireRole } from '~/server/utils/requireRole'
import { buildTermsMaps, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'

type Lang = 'en' | 'ru' | 'zh'

function parseNumberingJson(raw: string | null | undefined): NumberingState | undefined {
  if (!raw) return undefined
  try {
    const o = JSON.parse(raw) as NumberingState
    if (o && typeof o.listCounters === 'object' && o.listCounters !== null)
      return { listCounters: { ...o.listCounters } }
  }
  catch { /* ignore */ }
  return undefined
}

function basenameOf(href: string): string {
  const n = href.replace(/\\/g, '/')
  const i = n.lastIndexOf('/')
  return (i >= 0 ? n.slice(i + 1) : n).toLowerCase()
}

/** Колонка html_content в зависимости от языка. */
function htmlCol(lang: Lang): 'html_content' | 'html_content_ru' | 'html_content_zh' {
  if (lang === 'ru') return 'html_content_ru'
  if (lang === 'zh') return 'html_content_zh'
  return 'html_content'
}

/** Колонка excerpt в зависимости от языка. */
function excerptCol(lang: Lang): 'excerpt' | 'excerpt_ru' | 'excerpt_zh' {
  if (lang === 'ru') return 'excerpt_ru'
  if (lang === 'zh') return 'excerpt_zh'
  return 'excerpt'
}

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const projectId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(projectId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный projectId' })

  const formData = await readMultipartFormData(event)
  if (!formData?.length)
    throw createError({ statusCode: 400, statusMessage: 'Нет файлов' })

  const hlField = formData.find(f => f.name === 'heading_locale')
  const rawHl = hlField ? hlField.data.toString('utf-8').trim().toLowerCase() : ''
  const headingLocaleOverride: HeadingLocale | null = (rawHl === 'ru' || rawHl === 'en' || rawHl === 'zh' || rawHl === 'none')
    ? rawHl as HeadingLocale
    : null

  const csField = formData.find(f => f.name === 'chapter_start')
  const rawCs = csField ? parseInt(csField.data.toString('utf-8').trim()) : 1
  const chapterStart = Number.isFinite(rawCs) && rawCs >= 1 ? rawCs : 1

  // Part index → chapter number map
  const partChapterNum = new Map<number, number>()

  const project = await db.prepare(
    'SELECT id, book_id, category_id, split_level, content_locale FROM odm_projects WHERE id = ?',
  ).get(projectId) as { id: number; book_id: number | null; category_id: number | null; split_level: string; content_locale: string } | undefined
  if (!project)
    throw createError({ statusCode: 404, statusMessage: 'Проект ODM не найден' })
  if (!project.book_id)
    throw createError({ statusCode: 409, statusMessage: 'Проект не привязан к книге' })

  // Все включённые слоты проекта
  const allParts = await db.prepare(
    `SELECT id, sort_order, master_href, master_href_en, master_href_ru, master_href_zh,
            display_title, display_title_ru, display_title_zh,
            status, is_enabled, numbering_state_in_json, numbering_state_out_json,
            imported_article_ids
     FROM odm_project_parts WHERE project_id = ? AND is_enabled = 1 ORDER BY sort_order`,
  ).all(projectId) as any[]

  if (allParts.length === 0)
    throw createError({ statusCode: 409, statusMessage: 'В проекте нет активных слотов' })

  allParts.forEach((p, i) => partChapterNum.set(p.id, chapterStart + i))

  // Собираем загруженные ODT файлы
  const odtFields = formData.filter(f => f.name === 'files' && f.filename?.toLowerCase().endsWith('.odt'))
  if (odtFields.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'Нет файлов .odt в запросе' })

  // ─── Матчинг файлов к слотам и автоопределение языка ───
  const filesToProcess: { file: typeof odtFields[0]; part: typeof allParts[0]; lang: Lang }[] = []
  const skippedFiles: { filename: string; reason: string }[] = []

  for (const file of odtFields) {
    const fileBn = basename(file.filename || '').toLowerCase()
    let matchedPart: typeof allParts[0] | null = null
    let matchedLang: Lang | null = null

    for (const p of allParts) {
      const bnEn = p.master_href_en ? basenameOf(p.master_href_en) : null
      const bnRu = p.master_href_ru ? basenameOf(p.master_href_ru) : null
      const bnZh = p.master_href_zh ? basenameOf(p.master_href_zh) : null

      if (bnEn && bnEn === fileBn) {
        matchedPart = p
        matchedLang = 'en'
        break
      }
      if (bnRu && bnRu === fileBn) {
        matchedPart = p
        matchedLang = 'ru'
        break
      }
      if (bnZh && bnZh === fileBn) {
        matchedPart = p
        matchedLang = 'zh'
        break
      }
    }

    if (matchedPart && matchedLang) {
      filesToProcess.push({ file, part: matchedPart, lang: matchedLang })
    } else {
      skippedFiles.push({
        filename: file.filename || 'unknown',
        reason: 'Имя файла не найдено в структуре ODM проекта',
      })
    }
  }

  // Упорядочиваем обработку: по sort_order глав, а внутри главы — EN сначала, затем RU и ZH
  const langPriority = { en: 1, ru: 2, zh: 3 }
  filesToProcess.sort((a, b) => {
    if (a.part.sort_order !== b.part.sort_order) {
      return a.part.sort_order - b.part.sort_order
    }
    return langPriority[a.lang] - langPriority[b.lang]
  })

  // ─── Импорт ───
  const odtDir = join(process.cwd(), 'server', 'storage', 'odt')
  if (!existsSync(odtDir)) mkdirSync(odtDir, { recursive: true })

  const splitLevel = String(project.split_level || 'none')
  const results: { partId: number; sortOrder: number; lang: Lang; status: 'created' | 'updated' | 'skipped'; articleIds?: number[]; error?: string }[] = []
  const termsMaps = await buildTermsMaps(db)

  // Несём numbering state между слотами отдельно для каждого языка
  const carryNumberingState = {
    en: undefined as NumberingState | undefined,
    ru: undefined as NumberingState | undefined,
    zh: undefined as NumberingState | undefined,
  }

  for (const item of filesToProcess) {
    const fileField = item.file
    const lang = item.lang

    // Свежая загрузка статуса слота из бд
    const part = await db.prepare(
      `SELECT id, sort_order, display_title, display_title_ru, display_title_zh, status, imported_article_ids,
              odt_storage_path, odt_storage_path_ru, odt_storage_path_zh,
              odt_original_name, odt_original_name_ru, odt_original_name_zh,
              numbering_state_in_json, numbering_state_out_json,
              numbering_state_in_json_ru, numbering_state_out_json_ru,
              numbering_state_in_json_zh, numbering_state_out_json_zh
       FROM odm_project_parts WHERE id = ?`,
    ).get(item.part.id) as any

    if (!part) continue

    if (lang !== 'en' && String(part.status) === 'pending') {
      results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'skipped', error: 'Сначала импортируйте EN версию слота' })
      continue
    }

    const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)
    const originalName = fileField.filename || 'chapter.odt'
    const odtPath: string | null = null

    const fileLocale: OdtContentLocale = lang
    const headingLocale = headingLocaleOverride || (lang as HeadingLocale)
    const chapterNum = partChapterNum.get(part.id) ?? chapterStart

    const stateCol = lang === 'en' ? 'numbering_state_out_json' : `numbering_state_out_json_${lang}`
    const prevRow = await db.prepare(
      `SELECT ${stateCol} as state_json FROM odm_project_parts
       WHERE project_id = ? AND sort_order < ? AND status = 'imported'
       ORDER BY sort_order DESC LIMIT 1`,
    ).get(projectId, part.sort_order) as { state_json: string | null } | undefined

    const numberingState = carryNumberingState[lang] ?? parseNumberingJson(prevRow?.state_json ?? null)
    const numberingStateInJson = numberingState ? JSON.stringify(numberingState) : null

    try {
      if (String(part.status) === 'imported') {
        // ─── Обновляем существующие статьи ───
        const articleIds: number[] = (() => {
          try { return JSON.parse(part.imported_article_ids || '[]') as number[] }
          catch { return [] }
        })()

        if (articleIds.length === 0) {
          results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'skipped', error: 'Нет связанных статей' })
          continue
        }

        const parsed = await parseOdtBuffer(buf, { subDir: 'articles', numberingState, contentLocale: fileLocale })
        const col = htmlCol(lang)
        const exCol = excerptCol(lang)
        const titleCol = lang === 'ru' ? 'title_ru' : 'title_zh'
        const slugCol = lang === 'ru' ? 'slug_ru' : 'slug_zh'

        const titleOdt = extractFirstHeading(parsed.fullHtml)
        const displayTitleLocal = titleOdt || (lang === 'ru' ? part.display_title_ru : part.display_title_zh)

        if (splitLevel === 'none' || articleIds.length === 1) {
          let html = linkTermsInHtml(parsed.fullHtml, lang === 'en' ? termsMaps.en : (lang === 'ru' ? termsMaps.ru : termsMaps.zh)).html
          if (headingLocale) html = reindexHeadingMarkers(html, chapterNum, headingLocale).html
          const ex = generateExcerpt(html)
          let slugVal: string | null = null
          if (lang === 'en') {
            const titleEnVal = titleOdt || part.display_title
            await db.prepare(
              `UPDATE articles SET
                title = ?,
                slug = ?,
                html_content = ?,
                excerpt = ?,
                updated_at = datetime('now')
               WHERE id = ?`,
            ).run(titleEnVal, slugify(titleEnVal), html, ex, articleIds[0])
          } else {
            if (displayTitleLocal) {
              slugVal = await ensureUniqueArticleAnySlug(db, slugify(displayTitleLocal))
            }
            await db.prepare(
              `UPDATE articles SET
                ${col} = ?,
                ${exCol} = ?,
                ${displayTitleLocal ? `${titleCol} = ?, ${slugCol} = ?,` : ''}
                updated_at = datetime('now')
               WHERE id = ?`,
            ).run(
              ...[
                html,
                ex,
                ...(displayTitleLocal ? [displayTitleLocal, slugVal] : []),
                articleIds[0]
              ]
            )
          }
          await syncArticleTermsFromArticleRow(db, articleIds[0], termsMaps)
          const revNum = await db.prepare(
            'SELECT COALESCE(MAX(revision_num), 0) + 1 as n FROM article_revisions WHERE article_id = ?',
          ).get(articleIds[0]) as { n: number }
          await db.prepare(
            `INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by) VALUES (?, ?, ?, ?, ?)`,
          ).run(articleIds[0], html, revNum.n, `Bulk ODM import (${lang}${headingLocale ? ', reindexed' : ''})`, auth.id)
        }
        else {
          const shifted = splitLevel === 'h1' ? 'h2' : 'h3'
          const subArticles = splitIntoArticles(parsed.fullHtml, shifted as 'h2' | 'h3')
          for (let i = 0; i < Math.min(articleIds.length, subArticles.length); i++) {
            let html = linkTermsInHtml(subArticles[i].html, lang === 'en' ? termsMaps.en : (lang === 'ru' ? termsMaps.ru : termsMaps.zh)).html
            if (headingLocale) html = reindexHeadingMarkers(html, chapterNum, headingLocale).html
            const ex = generateExcerpt(html)
            const isFirst = i === 0
            if (lang === 'en') {
              const articleTitle = isFirst ? (titleOdt || subArticles[i].title) : subArticles[i].title
              await db.prepare(
                `UPDATE articles SET
                  title = ?,
                  slug = ?,
                  html_content = ?,
                  excerpt = ?,
                  updated_at = datetime('now')
                 WHERE id = ?`,
              ).run(articleTitle, slugify(articleTitle), html, ex, articleIds[i])
            } else {
              const displayTitleSub = isFirst ? displayTitleLocal : null
              let slugVal: string | null = null
              if (displayTitleSub) {
                slugVal = await ensureUniqueArticleAnySlug(db, slugify(displayTitleSub))
              }
              await db.prepare(
                `UPDATE articles SET
                  ${col} = ?,
                  ${exCol} = ?,
                  ${displayTitleSub ? `${titleCol} = ?, ${slugCol} = ?,` : ''}
                  updated_at = datetime('now')
                 WHERE id = ?`,
              ).run(
                ...[
                  html,
                  ex,
                  ...(displayTitleSub ? [displayTitleSub, slugVal] : []),
                  articleIds[i]
                ]
              )
            }
            await syncArticleTermsFromArticleRow(db, articleIds[i], termsMaps)
          }
        }

        const outState = parsed.numberingState ? cloneNumberingState(parsed.numberingState) : { listCounters: {} }
        carryNumberingState[lang] = outState

        const colPath = lang === 'en' ? 'odt_storage_path' : `odt_storage_path_${lang}`
        const colName = lang === 'en' ? 'odt_original_name' : `odt_original_name_${lang}`
        const colNumIn = lang === 'en' ? 'numbering_state_in_json' : `numbering_state_in_json_${lang}`
        const colNumOut = lang === 'en' ? 'numbering_state_out_json' : `numbering_state_out_json_${lang}`
        const displayTitleCol = lang === 'en' ? 'display_title' : (lang === 'ru' ? 'display_title_ru' : 'display_title_zh')
        const finalDisplayTitle = lang === 'en' ? (titleOdt || part.display_title) : displayTitleLocal

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
            part.id
          ]
        )

        results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'updated', articleIds })
      }
      else if (String(part.status) === 'pending' && lang === 'en') {
        // ─── Создаём статьи (только EN) ───
        const sortOrder = Number(part.sort_order)
        const parsed = await parseOdtBuffer(buf, { subDir: 'articles', numberingState, contentLocale: fileLocale })

        const titleEnOdt = extractFirstHeading(parsed.fullHtml)
        const titleEn = titleEnOdt || String(part.display_title || '').trim() || defaultOdmChapterTitle(sortOrder, fileLocale)
        const titleRu = part.display_title_ru ? String(part.display_title_ru).trim() || null : null
        const titleZh = part.display_title_zh ? String(part.display_title_zh).trim() || null : null

        let articles: ReturnType<typeof splitIntoArticles>
        if (splitLevel === 'none') {
          const title = extractFirstHeading(parsed.fullHtml) || titleEn
          articles = [{ title, slug: slugify(title), html: parsed.fullHtml, excerpt: generateExcerpt(parsed.fullHtml) }]
        }
        else {
          const shifted = splitLevel === 'h1' ? 'h2' : 'h3'
          articles = splitIntoArticles(parsed.fullHtml, shifted as 'h2' | 'h3')
        }

        if (articles.length > 0)
          articles[0] = { ...articles[0], title: titleEn, slug: slugify(titleEn) }

        let maxSortOrder = 0
        const maxResult = await db.prepare(
          'SELECT MAX(sort_order) as max_sort FROM articles WHERE book_id = ?',
        ).get(project.book_id) as { max_sort: number | null }
        maxSortOrder = maxResult?.max_sort ?? 0

        const importedIds: number[] = []

        for (let i = 0; i < articles.length; i++) {
          const article = articles[i]
          const isFirst = i === 0
          const insTitle = isFirst ? titleEn : article.title
          const insTitleRu = isFirst ? titleRu : null
          const insTitleZh = isFirst ? titleZh : null

          const slug = await ensureUniqueArticleAnySlug(db, slugify(isFirst ? titleEn : article.title))
          let slugRu: string | null = null
          let slugZh: string | null = null
          if (isFirst && insTitleRu) slugRu = await ensureUniqueArticleAnySlug(db, slugify(insTitleRu))
          if (isFirst && insTitleZh) slugZh = await ensureUniqueArticleAnySlug(db, slugify(insTitleZh))

          const articleSortOrder = maxSortOrder + sortOrder * 100 + i + 1
          let processedHtml = linkTermsInHtml(article.html, termsMaps.en).html
          if (headingLocale) processedHtml = reindexHeadingMarkers(processedHtml, chapterNum, headingLocale).html
          const excerpt = generateExcerpt(processedHtml)

          // html_content всегда заполняем (первичный контент)
          const htmlRu = null
          const htmlZh = null
          const exRu = null
          const exZh = null

          await db.prepare(`
            INSERT INTO articles (slug, slug_ru, slug_zh, title, title_ru, title_zh,
              html_content, html_content_ru, html_content_zh,
              raw_odt_path, book_id, category_id, sort_order,
              excerpt, excerpt_ru, excerpt_zh, created_by, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `).run(
            slug, slugRu, slugZh,
            insTitle, insTitleRu, insTitleZh,
            processedHtml, htmlRu, htmlZh,
            odtPath,
            project.book_id, project.category_id,
            articleSortOrder,
            excerpt, exRu, exZh,
            auth.id,
          )

          const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }
          const articleId = Number(inserted.id)
          importedIds.push(articleId)

          await db.prepare(
            `INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by) VALUES (?, ?, 1, ?, ?)`,
          ).run(articleId, processedHtml, `Bulk ODM import (${lang})`, auth.id)

          await syncArticleTermsFromArticleRow(db, articleId, termsMaps)
        }

        const outState = parsed.numberingState ? cloneNumberingState(parsed.numberingState) : { listCounters: {} }
        carryNumberingState.en = outState

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
        `).run(odtPath, originalName, numberingStateInJson, JSON.stringify(outState), JSON.stringify(importedIds), titleEn, part.id)

        results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'created', articleIds: importedIds })
      }
      else {
        results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'skipped', error: `Статус слота: ${part.status}` })
      }
    }
    catch (e: any) {
      results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'skipped', error: e?.message || 'Ошибка импорта' })
    }
  }

  const created = results.filter(r => r.status === 'created').length
  const updated = results.filter(r => r.status === 'updated').length
  const skipped = results.filter(r => r.status === 'skipped').length

  return {
    matched: filesToProcess.length,
    created,
    updated,
    skipped: skipped + skippedFiles.length,
    skippedFiles,
    results,
  }
})
