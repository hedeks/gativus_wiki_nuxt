/**
 * POST /api/admin/books/:id/bulk-odt-lang
 * Массовая загрузка .odt для одного языка существующих статей книги.
 *
 * Логика матчинга:
 *   - Статьи с master_href_{lang} → ТОЛЬКО по имени файла (basename)
 *   - Статьи без master_href_{lang} → позиционный fallback из оставшихся файлов
 *   - Лишние файлы, не совпавшие ни с чем → пропускаются (skippedFiles)
 *
 * Body: FormData {
 *   files: .odt[],
 *   lang: 'en'|'ru'|'zh',
 *   heading_locale?: 'ru'|'en'|'zh'|'none',  // формат нумерации из ODM
 *   chapter_start?: number,                   // первый номер главы (default 1)
 * }
 */

import { join, basename } from 'path'
import { mkdirSync, existsSync, writeFileSync } from 'fs'
import type { OdtContentLocale } from '~/server/utils/odtParser'
import { parseOdtBuffer, generateExcerpt, extractFirstHeading } from '~/server/utils/odtParser'
import { slugify, ensureUniqueArticleAnySlug } from '~/server/utils/slugify'
import { requireRole } from '~/server/utils/requireRole'
import { buildTermsMaps, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'
import { reindexHeadingMarkers, type HeadingLocale } from '~/server/utils/reindexHeadingMarkers'

type Lang = 'en' | 'ru' | 'zh'

const htmlCol = (l: Lang) => l === 'ru' ? 'html_content_ru' : l === 'zh' ? 'html_content_zh' : 'html_content'
const exCol = (l: Lang) => l === 'ru' ? 'excerpt_ru' : l === 'zh' ? 'excerpt_zh' : 'excerpt'
const hrefCol = (l: Lang) => l === 'en' ? 'master_href_en' : l === 'ru' ? 'master_href_ru' : 'master_href_zh'

function bn(href: string): string {
  const n = href.replace(/\\/g, '/')
  const i = n.lastIndexOf('/')
  return (i >= 0 ? n.slice(i + 1) : n).toLowerCase()
}

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const bookId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(bookId))
    throw createError({ statusCode: 400, statusMessage: 'Некорректный bookId' })

  if (!await db.prepare('SELECT id FROM books WHERE id = ?').get(bookId))
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })

  const formData = await readMultipartFormData(event)
  if (!formData?.length)
    throw createError({ statusCode: 400, statusMessage: 'Нет файлов' })

  const langField = formData.find(f => f.name === 'lang')
  const rawLang = langField ? langField.data.toString('utf-8').trim().toLowerCase() : 'en'
  const lang: Lang = rawLang === 'ru' || rawLang === 'zh' ? rawLang : 'en'

  // Heading reindex params
  const hlField = formData.find(f => f.name === 'heading_locale')
  const rawHl = hlField ? hlField.data.toString('utf-8').trim().toLowerCase() : ''
  const headingLocale: HeadingLocale | null = (rawHl === 'ru' || rawHl === 'en' || rawHl === 'zh' || rawHl === 'none')
    ? rawHl as HeadingLocale
    : null

  const csField = formData.find(f => f.name === 'chapter_start')
  const rawCs = csField ? parseInt(csField.data.toString('utf-8').trim()) : 1
  const chapterStart = Number.isFinite(rawCs) && rawCs >= 1 ? rawCs : 1

  const odtFields = formData.filter(f => f.name === 'files' && f.filename?.toLowerCase().endsWith('.odt'))
  if (odtFields.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'Нет .odt файлов в запросе' })

  const hc = hrefCol(lang)
  const articles = await db.prepare(
    `SELECT id, sort_order, title, title_ru, title_zh, slug, slug_ru, slug_zh, master_href_en, master_href_ru, master_href_zh
     FROM articles WHERE book_id = ? ORDER BY sort_order ASC`,
  ).all(bookId) as any[]

  if (articles.length === 0)
    throw createError({ statusCode: 409, statusMessage: 'В книге нет статей' })

  // Article index map for chapter numbering (0-based position → chapterStart-based number)
  const articleChapterNum = new Map(articles.map((a, i) => [a.id, chapterStart + i]))

  // ─── Матчинг ───────────────────────────────────────────────────────────────
  const articlesWithHref = articles.filter(a => !!a[hc])
  const articlesWithoutHref = articles.filter(a => !a[hc])

  const matched = new Map<number, (typeof odtFields)[0]>()
  const usedFileIdxs = new Set<number>()

  const hrefIndex = new Map<string, number>()
  for (const a of articlesWithHref) {
    const b = bn(a[hc])
    if (b) hrefIndex.set(b, a.id)
  }

  for (let fi = 0; fi < odtFields.length; fi++) {
    const fileBn = basename(odtFields[fi].filename || '').toLowerCase()
    const aid = hrefIndex.get(fileBn)
    if (aid !== undefined && !matched.has(aid)) {
      matched.set(aid, odtFields[fi])
      usedFileIdxs.add(fi)
    }
  }

  const remainingFiles = odtFields.filter((_, fi) => !usedFileIdxs.has(fi))
  for (let i = 0; i < Math.min(articlesWithoutHref.length, remainingFiles.length); i++) {
    matched.set(articlesWithoutHref[i].id, remainingFiles[i])
    const origIdx = odtFields.indexOf(remainingFiles[i])
    if (origIdx >= 0) usedFileIdxs.add(origIdx)
  }

  const skippedFiles = odtFields
    .filter((_, fi) => !usedFileIdxs.has(fi))
    .map(f => f.filename || '?')

  if (matched.size === 0)
    throw createError({ statusCode: 400, statusMessage: 'Ни один файл не совпал со статьями книги' })

  // ─── Импорт ────────────────────────────────────────────────────────────────
  const odtDir = join(process.cwd(), 'server', 'storage', 'odt')
  if (!existsSync(odtDir)) mkdirSync(odtDir, { recursive: true })

  const contentLocale: OdtContentLocale = lang === 'ru' ? 'ru' : lang === 'zh' ? 'zh' : 'en'
  const col = htmlCol(lang)
  const ec = exCol(lang)
  const termsMaps = await buildTermsMaps(db)

  const results: { articleId: number; filename: string; status: 'updated' | 'skipped'; error?: string }[] = []

  for (const article of articles) {
    const fileField = matched.get(article.id)
    if (!fileField) continue

    try {
      const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)
      const originalName = fileField.filename || 'chapter.odt'
      const odtPath = join(odtDir, `${Date.now()}-book${bookId}-a${article.id}-${originalName}`)
      writeFileSync(odtPath, buf as any)

      const parsed = await parseOdtBuffer(buf, { subDir: 'articles', contentLocale })
      let html = linkTermsInHtml(parsed.fullHtml, lang === 'en' ? termsMaps.en : (lang === 'ru' ? termsMaps.ru : termsMaps.zh)).html

      if (headingLocale) {
        const chapterNum = articleChapterNum.get(article.id) ?? chapterStart
        html = reindexHeadingMarkers(html, chapterNum, headingLocale).html
      }

      const ex = generateExcerpt(html)

      const titleOdt = extractFirstHeading(parsed.fullHtml)
      const titleCol = lang === 'en' ? 'title' : lang === 'ru' ? 'title_ru' : 'title_zh'
      const slugCol = lang === 'en' ? 'slug' : lang === 'ru' ? 'slug_ru' : 'slug_zh'

      const curTitle = lang === 'en' ? article.title : lang === 'ru' ? article.title_ru : article.title_zh
      const nextTitle = titleOdt || curTitle || `Chapter ${articleChapterNum.get(article.id) ?? chapterStart}`

      let slugVal = null
      if (titleOdt) {
        slugVal = await ensureUniqueArticleAnySlug(db, slugify(titleOdt))
      }

      await db.prepare(
        `UPDATE articles SET
          ${col} = ?,
          ${ec} = ?,
          ${titleCol} = ?,
          ${slugVal ? `${slugCol} = ?,` : ''}
          updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        ...[
          html,
          ex,
          nextTitle,
          ...(slugVal ? [slugVal] : []),
          article.id,
        ]
      )

      await syncArticleTermsFromArticleRow(db, article.id, termsMaps)

      const revNum = await db.prepare(
        'SELECT COALESCE(MAX(revision_num), 0) + 1 as n FROM article_revisions WHERE article_id = ?',
      ).get(article.id) as { n: number }
      await db.prepare(
        'INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by) VALUES (?, ?, ?, ?, ?)',
      ).run(article.id, html, revNum.n, `Bulk ODT import (${lang}${headingLocale ? ', reindexed' : ''})`, auth.id)

      results.push({ articleId: article.id, filename: originalName, status: 'updated' })
    }
    catch (e: any) {
      results.push({ articleId: article.id, filename: fileField.filename || '?', status: 'skipped', error: e?.message })
    }
  }

  return {
    lang,
    totalFiles: odtFields.length,
    matched: matched.size,
    updated: results.filter(r => r.status === 'updated').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    skippedFiles,
    results,
  }
})
