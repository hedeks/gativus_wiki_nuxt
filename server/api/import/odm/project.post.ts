/**
 * POST /api/import/odm/project
 * Загрузка мастер-документа .odm → создание черновика проекта и слотов глав.
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parseOdmOutline, type OdmContentLocale } from '~/server/utils/odmParser'
import { requireRole } from '~/server/utils/requireRole'
import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()

  const formData = await readMultipartFormData(event)
  if (!formData?.length)
    throw createError({ statusCode: 400, statusMessage: 'Файл не предоставлен' })

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, statusMessage: 'Поле "file" не найдено' })

  const name = (fileField.filename || '').toLowerCase()
  if (!name.endsWith('.odm'))
    throw createError({ statusCode: 400, statusMessage: 'Нужен файл .odm (мастер-документ)' })

  const optionsField = formData.find(f => f.name === 'options')
  const options = optionsField ? JSON.parse(optionsField.data.toString('utf-8')) : {} as Record<string, any>

  let bookId: number | null = options.book_id != null && options.book_id !== '' ? Number(options.book_id) : null
  let categoryId: number | null = options.category_id != null && options.category_id !== '' ? Number(options.category_id) : null
  const splitLevel = ['none', 'h1', 'h2'].includes(options.split_level) ? options.split_level : 'none'

  const rawLc = String(options.content_locale ?? options.locale ?? 'ru').toLowerCase()
  const contentLocale: OdmContentLocale = rawLc === 'en' || rawLc === 'zh' ? rawLc : 'ru'

  const usedCreateBook = Boolean(
    options.create_book
    && typeof options.create_book === 'object'
    && String((options.create_book as { title?: string }).title || '').trim(),
  )

  const createBook = options.create_book as
    | {
        title?: string
        title_ru?: string
        title_zh?: string
        description?: string
        description_ru?: string
        description_zh?: string
        slug?: string
        cover_image?: string
        sort_order?: number
        category_ids?: number[]
      }
    | undefined

  if (createBook?.title?.trim()) {
    const baseSlug = createBook.slug ? slugify(String(createBook.slug)) : slugify(createBook.title!.trim())
    const slug = await ensureUniqueSlug(db, 'books', baseSlug)
    await db.prepare(`
      INSERT INTO books (
        slug, title, title_ru, title_zh,
        description, description_ru, description_zh,
        cover_image, sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      slug,
      createBook.title!.trim(),
      createBook.title_ru || null,
      createBook.title_zh || null,
      createBook.description || null,
      createBook.description_ru || null,
      createBook.description_zh || null,
      createBook.cover_image || null,
      createBook.sort_order ?? 0,
    )
    const row = await db.prepare(`SELECT last_insert_rowid() as id`).get() as { id: number }
    bookId = Number(row.id)

    if (Array.isArray(createBook.category_ids) && createBook.category_ids.length > 0) {
      const insCat = db.prepare(`INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)`)
      for (const catId of createBook.category_ids)
        await insCat.run(bookId, Number(catId))
      if (categoryId == null)
        categoryId = Number(createBook.category_ids[0])
    }
  }

  if (bookId == null || !Number.isFinite(Number(bookId))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Импорт ODM только для книги: выберите существующую книгу или создайте новую.',
    })
  }

  const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)
  const slots = parseOdmOutline(buf, { contentLocale })

  const dir = join(process.cwd(), 'server', 'storage', 'odm')
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })

  const originalName = fileField.filename || 'master.odm'
  const masterPath = join(dir, `${Date.now()}-${originalName}`)
  writeFileSync(masterPath, buf)

  await db.prepare(`
    INSERT INTO odm_projects (book_id, category_id, master_storage_path, master_original_name, split_level, content_locale, created_by, book_created_with_project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bookId, categoryId, masterPath, originalName, splitLevel, contentLocale, auth.id, usedCreateBook ? 1 : 0)

  const ins = await db.prepare(`SELECT last_insert_rowid() as id`).get() as { id: number }
  const projectId = Number(ins.id)

  const insertPart = db.prepare(`
    INSERT INTO odm_project_parts (project_id, sort_order, master_href, display_title, display_title_ru, display_title_zh, is_enabled, status)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'pending')
  `)

  for (const s of slots)
    await insertPart.run(projectId, s.sortOrder, s.masterHref, s.displayTitle, null, null)

  const parts = await db.prepare(`
    SELECT id, sort_order, master_href, display_title, display_title_ru, display_title_zh, is_enabled, status, odt_original_name, imported_article_ids
    FROM odm_project_parts WHERE project_id = ? ORDER BY sort_order
  `).all(projectId)

  return {
    projectId,
    slots: slots.length,
    parts,
    split_level: splitLevel,
    content_locale: contentLocale,
    book_id: bookId,
  }
})
