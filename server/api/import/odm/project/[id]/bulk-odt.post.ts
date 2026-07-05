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

  const mappingsField = formData.find(f => f.name === 'mappings')
  const mappingsRaw = mappingsField ? mappingsField.data.toString('utf-8') : null
  let mappings: { filename: string; partId: number; lang: Lang }[] | null = null
  if (mappingsRaw) {
    try {
      mappings = JSON.parse(mappingsRaw)
      console.log('[Bulk ODT] Mappings successfully parsed:', mappings)
    } catch (e: any) {
      console.error('[Bulk ODT] Error parsing mappings JSON:', mappingsRaw, e)
    }
  }

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

  console.log('[Bulk ODT] Total ODT files to match:', odtFields.map(f => f.filename))
  console.log('[Bulk ODT] Active parts structure in DB:', allParts.map(p => ({ id: p.id, sort_order: p.sort_order, display_title: p.display_title, status: p.status })))

  for (const file of odtFields) {
    const fileBn = basename(file.filename || '').toLowerCase()
    let matchedPart: typeof allParts[0] | null = null
    let matchedLang: Lang | null = null

    // 0. Попытка сопоставить по ручной карте mappings (если передана)
    if (mappings) {
      const match = mappings.find(m => m.filename.toLowerCase() === (file.filename || '').toLowerCase())
      if (match) {
        matchedPart = allParts.find(p => p.id === Number(match.partId))
        matchedLang = match.lang
        console.log(`[Bulk ODT] File ${file.filename} matched via manual mappings to partId: ${match.partId}, lang: ${match.lang}`)
      }
    }

    // 1. Попытка точного соответствия по имени из ODM
    if (!matchedPart) {
      for (const p of allParts) {
        const bnEn = p.master_href_en ? basenameOf(p.master_href_en) : null
        const bnRu = p.master_href_ru ? basenameOf(p.master_href_ru) : null
        const bnZh = p.master_href_zh ? basenameOf(p.master_href_zh) : null

        if (bnEn && (bnEn === fileBn || fileBn === `${bnEn.replace(/\.odt$/, '')}_en.odt` || fileBn === `${bnEn.replace(/\.odt$/, '')}.en.odt`)) {
          matchedPart = p
          matchedLang = 'en'
          break
        }
        if (bnRu && (bnRu === fileBn || fileBn === `${bnRu.replace(/\.odt$/, '')}_ru.odt` || fileBn === `${bnRu.replace(/\.odt$/, '')}.ru.odt` || fileBn.includes('_ru') || fileBn.includes('.ru.'))) {
          matchedPart = p
          matchedLang = 'ru'
          break
        }
        if (bnZh && (bnZh === fileBn || fileBn === `${bnZh.replace(/\.odt$/, '')}_zh.odt` || fileBn === `${bnZh.replace(/\.odt$/, '')}.zh.odt` || fileBn.includes('_zh') || fileBn.includes('.zh.'))) {
          matchedPart = p
          matchedLang = 'zh'
          break
        }
      }
      if (matchedPart) {
        console.log(`[Bulk ODT] File ${file.filename} matched via ODM filename to partId: ${matchedPart.id}, lang: ${matchedLang}`)
      }
    }

    // 2. Позиционный fallback по номеру из названия файла
    if (!matchedPart) {
      const numMatch = fileBn.match(/\d+/)
      if (numMatch) {
        const order = parseInt(numMatch[0])
        const found = allParts.find(p => p.sort_order === order)
        if (found) {
          matchedPart = found
          matchedLang = (fileBn.includes('ru') || fileBn.includes('rus'))
            ? 'ru'
            : (fileBn.includes('zh') || fileBn.includes('chi') || fileBn.includes('cn'))
              ? 'zh'
              : 'en'
          console.log(`[Bulk ODT] File ${file.filename} matched via sort_order fallback to partId: ${matchedPart.id}, lang: ${matchedLang}`)
        }
      }
    }

    if (matchedPart && matchedLang) {
      filesToProcess.push({ file, part: matchedPart, lang: matchedLang })
    } else {
      console.warn(`[Bulk ODT] File skipped - no match found in DB structure: ${file.filename}`)
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

    // Allow RU/ZH even if EN is not imported yet

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
                translation_valid_${lang} = 1,
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
              const displayTitleSub = isFirst ? displayTitleLocal : subArticles[i].title
              let slugVal: string | null = null
              if (displayTitleSub) {
                slugVal = await ensureUniqueArticleAnySlug(db, slugify(displayTitleSub))
              }
              await db.prepare(
                `UPDATE articles SET
                  ${col} = ?,
                  ${exCol} = ?,
                  translation_valid_${lang} = 1,
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
      else if (String(part.status) === 'pending' || String(part.status) === 'error') {
        // ─── Создаём статьи (для любого языка) ───
        const sortOrder = Number(part.sort_order)
        const parsed = await parseOdtBuffer(buf, { subDir: 'articles', numberingState, contentLocale: fileLocale })

        const titleEnOdt = extractFirstHeading(parsed.fullHtml)
        const titleEn = titleEnOdt || String(part.display_title || '').trim() || defaultOdmChapterTitle(sortOrder, 'en')
        const titleRu = part.display_title_ru ? String(part.display_title_ru).trim() || null : null
        const titleZh = part.display_title_zh ? String(part.display_title_zh).trim() || null : null
        const titleLocal = titleEnOdt || (lang === 'ru' ? titleRu : (lang === 'zh' ? titleZh : null)) || defaultOdmChapterTitle(sortOrder, lang)

        let articles: ReturnType<typeof splitIntoArticles>
        if (splitLevel === 'none') {
          const title = titleEnOdt || titleLocal
          articles = [{ title, slug: slugify(title), html: parsed.fullHtml, excerpt: generateExcerpt(parsed.fullHtml) }]
        }
        else {
          const shifted = splitLevel === 'h1' ? 'h2' : 'h3'
          articles = splitIntoArticles(parsed.fullHtml, shifted as 'h2' | 'h3')
        }

        if (articles.length > 0) {
          const first = articles[0]
          articles[0] = {
            ...first,
            title: lang === 'en' ? titleEn : first.title,
            slug: slugify(lang === 'en' ? titleEn : first.title)
          }
        }

        let maxSortOrder = 0
        const maxResult = await db.prepare(
          'SELECT MAX(sort_order) as max_sort FROM articles WHERE book_id = ?',
        ).get(project.book_id) as { max_sort: number | null }
        maxSortOrder = maxResult?.max_sort ?? 0

        const importedIds: number[] = []

        for (let i = 0; i < articles.length; i++) {
          const article = articles[i]
          const isFirst = i === 0

          const articleSortOrder = maxSortOrder + sortOrder * 100 + i + 1
          let processedHtml = linkTermsInHtml(article.html, lang === 'en' ? termsMaps.en : (lang === 'ru' ? termsMaps.ru : termsMaps.zh)).html
          if (headingLocale) processedHtml = reindexHeadingMarkers(processedHtml, chapterNum, headingLocale).html
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
            baseTitle = isFirst ? titleEn : article.title
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
            INSERT INTO articles (slug, slug_ru, slug_zh, title, title_ru, title_zh,
              html_content, html_content_ru, html_content_zh,
              raw_odt_path, book_id, category_id, sort_order,
              excerpt, excerpt_ru, excerpt_zh, created_by, is_published,
              translation_valid_ru, translation_valid_zh)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
          `).run(
            baseSlug, insSlugRu, insSlugZh,
            baseTitle, insTitleRu, insTitleZh,
            baseHtml, insHtmlRu, insHtmlZh,
            odtPath,
            project.book_id, project.category_id,
            articleSortOrder,
            baseExcerpt, insExRu, insExZh,
            auth.id,
            lang === 'ru' ? 1 : 0,
            lang === 'zh' ? 1 : 0
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
        carryNumberingState[lang] = outState

        const suffix = lang === 'en' ? '' : `_${lang}`
        const colPath = `odt_storage_path${suffix}`
        const colName = `odt_original_name${suffix}`
        const colNumIn = `numbering_state_in_json${suffix}`
        const colNumOut = `numbering_state_out_json${suffix}`
        const displayTitleCol = lang === 'en' ? 'display_title' : (lang === 'ru' ? 'display_title_ru' : 'display_title_zh')
        const finalDisplayTitle = lang === 'en' ? titleEn : titleLocal

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
            part.id
          ]
        )

        results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'created', articleIds: importedIds })
      }
      else {
        console.warn(`[Bulk ODT] File skipped due to unsupported slot status: ${part.status} (partId: ${part.id})`)
        results.push({ partId: part.id, sortOrder: part.sort_order, lang, status: 'skipped', error: `Статус слота: ${part.status}` })
      }
    }
    catch (e: any) {
      console.error('[Bulk ODT] Error processing file inside import loop:', item.file.filename, e)
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
