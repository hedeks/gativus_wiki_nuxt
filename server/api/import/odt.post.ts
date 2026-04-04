/**
 * POST /api/import/odt
 * Full ODT import: parse, split into articles, save to DB.
 * Role: editor+.
 *
 * Multipart form data:
 *  - file: ODT file
 *  - options: JSON string with OdtImportOptions
 */

import { parseOdtBuffer, splitIntoArticles, extractFirstHeading, generateExcerpt } from '~/server/utils/odtParser'
import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })
  }

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })
  }

  const optionsField = formData.find(f => f.name === 'options')
  const options = optionsField ? JSON.parse(optionsField.data.toString('utf-8')) : {}

  const bookId = options.book_id || null
  const categoryId = options.category_id || null
  const splitLevel = options.split_level || 'h2'
  const locale = options.locale || 'en'

  try {
    // 1. Parse ODT
    const parsed = await parseOdtBuffer(fileField.data, 'articles')

    // 2. Split into articles
    let articles = []
    if (splitLevel === 'none') {
      const title = extractFirstHeading(parsed.fullHtml) || fileField.filename || 'Untitled'
      articles = [{
        title,
        slug: slugify(title),
        html: parsed.fullHtml,
        excerpt: generateExcerpt(parsed.fullHtml)
      }]
    } else {
      // Note: parser shifts headings +1 (h1→h2, h2→h3), so we shift the split level too
      const shiftedSplitLevel = splitLevel === 'h1' ? 'h2' : 'h3'
      articles = splitIntoArticles(parsed.fullHtml, shiftedSplitLevel as 'h1' | 'h2' | 'h3')
    }

    // 3. Save original ODT file
    const odtStorageDir = join(process.cwd(), 'server', 'storage', 'odt')
    if (!existsSync(odtStorageDir)) {
      mkdirSync(odtStorageDir, { recursive: true })
    }
    const originalFileName = fileField.filename || 'imported.odt'
    const odtFileName = `${Date.now()}-${originalFileName}`
    const odtPath = join(odtStorageDir, odtFileName)
    writeFileSync(odtPath, new Uint8Array(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength))

    // 4. Get current max sort_order for the book
    let maxSortOrder = 0
    if (bookId) {
      const maxResult = await db.prepare(
        'SELECT MAX(sort_order) as max_sort FROM articles WHERE book_id = ?'
      ).get(bookId) as any
      maxSortOrder = maxResult?.max_sort || 0
    }

    // 5. Save each article to DB
    const importedArticles: { slug: string; title: string; id: number }[] = []

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      const slug = await ensureUniqueSlug(db, 'articles', article.slug)

      await db.prepare(`
        INSERT INTO articles (slug, title, html_content, raw_odt_path, book_id, category_id, sort_order, excerpt, locale, created_by, is_published)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        slug,
        article.title,
        article.html,
        odtPath,
        bookId,
        categoryId,
        maxSortOrder + i + 1,
        article.excerpt,
        locale,
        auth.id
      )

      const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
      const articleId = inserted?.id

      // Create revision v1
      await db.prepare(`
        INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
        VALUES (?, ?, 1, ?, ?)
      `).run(articleId, article.html, 'Импорт из ODT', auth.id)

      importedArticles.push({ slug, title: article.title, id: articleId })
    }

    return {
      message: `Импортировано ${importedArticles.length} статей`,
      imported: importedArticles.length,
      articles: importedArticles,
      odt_path: odtPath,
    }
  } catch (err: any) {
    throw createError({
      statusCode: 422,
      statusMessage: `Ошибка импорта: ${err.message}`
    })
  }
})
