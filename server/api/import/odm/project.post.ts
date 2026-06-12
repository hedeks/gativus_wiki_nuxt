/**
 * POST /api/import/odm/project
 * Загрузка до 3 мастер-документов .odm (EN, RU, ZH) → создание черновика проекта и слотов глав.
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
    throw createError({ statusCode: 400, statusMessage: 'Файлы не предоставлены' })

  // Считываем до 3 ODM-файлов
  const fileEn = formData.find(f => f.name === 'file_en')
  const fileRu = formData.find(f => f.name === 'file_ru')
  const fileZh = formData.find(f => f.name === 'file_zh')

  const parsedLists = [
    { lang: 'en', file: fileEn, slots: fileEn?.data ? parseOdmOutline(Buffer.from(fileEn.data.buffer, fileEn.data.byteOffset, fileEn.data.byteLength), { contentLocale: 'en' }) : null },
    { lang: 'ru', file: fileRu, slots: fileRu?.data ? parseOdmOutline(Buffer.from(fileRu.data.buffer, fileRu.data.byteOffset, fileRu.data.byteLength), { contentLocale: 'ru' }) : null },
    { lang: 'zh', file: fileZh, slots: fileZh?.data ? parseOdmOutline(Buffer.from(fileZh.data.buffer, fileZh.data.byteOffset, fileZh.data.byteLength), { contentLocale: 'zh' }) : null },
  ].filter((x): x is { lang: string; file: NonNullable<typeof formData[0]>; slots: any[] } => x.slots !== null)

  if (parsedLists.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Необходимо загрузить хотя бы один файл .odm' })
  }

  // Проверяем совпадение количества глав во всех файлах
  const firstCount = parsedLists[0].slots.length
  for (const item of parsedLists) {
    if (item.slots.length !== firstCount) {
      throw createError({
        statusCode: 400,
        statusMessage: `Количество глав отличается: в ODM (${parsedLists[0].lang.toUpperCase()}) — ${firstCount}, а в ODM (${item.lang.toUpperCase()}) — ${item.slots.length}.`,
      })
    }
  }

  const optionsField = formData.find(f => f.name === 'options')
  const options = optionsField ? JSON.parse(optionsField.data.toString('utf-8')) : {} as Record<string, any>

  let bookId: number | null = options.book_id != null && options.book_id !== '' ? Number(options.book_id) : null
  let categoryId: number | null = options.category_id != null && options.category_id !== '' ? Number(options.category_id) : null
  const splitLevel = ['none', 'h1', 'h2'].includes(options.split_level) ? options.split_level : 'none'

  const rawLc = String(options.content_locale ?? options.locale ?? parsedLists[0].lang).toLowerCase()
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

  const dir = join(process.cwd(), 'server', 'storage', 'odm')
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })

  // Для master_storage_path используем файл, соответствующий контентной локали, или первый из загруженных
  const primaryItem = parsedLists.find(x => x.lang === contentLocale) || parsedLists[0]
  const primaryBuf = Buffer.from(primaryItem.file.data.buffer, primaryItem.file.data.byteOffset, primaryItem.file.data.byteLength)
  const originalName = primaryItem.file.filename || `master_${primaryItem.lang}.odm`
  const masterPath = join(dir, `${Date.now()}-${originalName}`)
  writeFileSync(masterPath, primaryBuf as any)

  // Записываем все остальные загруженные файлы ODM на диск
  for (const item of parsedLists) {
    if (item.lang !== primaryItem.lang) {
      const itemBuf = Buffer.from(item.file.data.buffer, item.file.data.byteOffset, item.file.data.byteLength)
      const fName = item.file.filename || `master_${item.lang}.odm`
      const fPath = join(dir, `${Date.now()}-${fName}`)
      writeFileSync(fPath, itemBuf as any)
    }
  }

  await db.prepare(`
    INSERT INTO odm_projects (book_id, category_id, master_storage_path, master_original_name, split_level, content_locale, created_by, book_created_with_project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bookId, categoryId, masterPath, originalName, splitLevel, contentLocale, auth.id, usedCreateBook ? 1 : 0)

  const ins = await db.prepare(`SELECT last_insert_rowid() as id`).get() as { id: number }
  const projectId = Number(ins.id)

  const insertPart = db.prepare(`
    INSERT INTO odm_project_parts (
      project_id, sort_order, master_href, display_title,
      display_title_ru, display_title_zh,
      master_href_en, master_href_ru, master_href_zh,
      is_enabled, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending')
  `)

  const slotsEn = parsedLists.find(x => x.lang === 'en')?.slots || null
  const slotsRu = parsedLists.find(x => x.lang === 'ru')?.slots || null
  const slotsZh = parsedLists.find(x => x.lang === 'zh')?.slots || null

  for (let i = 0; i < firstCount; i++) {
    const sEn = slotsEn?.[i] || null
    const sRu = slotsRu?.[i] || null
    const sZh = slotsZh?.[i] || null

    const displayTitle = sEn?.displayTitle || sRu?.displayTitle || sZh?.displayTitle || `Chapter ${i + 1}`
    const displayTitleRu = sRu?.displayTitle || null
    const displayTitleZh = sZh?.displayTitle || null

    const masterHref = sEn?.masterHref || sRu?.masterHref || sZh?.masterHref || ''
    const masterHrefEn = sEn?.masterHref || null
    const masterHrefRu = sRu?.masterHref || null
    const masterHrefZh = sZh?.masterHref || null

    await insertPart.run(
      projectId,
      i + 1,
      masterHref,
      displayTitle,
      displayTitleRu,
      displayTitleZh,
      masterHrefEn,
      masterHrefRu,
      masterHrefZh,
    )
  }

  const parts = await db.prepare(`
    SELECT id, sort_order, master_href, display_title, display_title_ru, display_title_zh,
           master_href_en, master_href_ru, master_href_zh, is_enabled, status, odt_original_name, imported_article_ids
    FROM odm_project_parts WHERE project_id = ? ORDER BY sort_order
  `).all(projectId)

  return {
    projectId,
    slots: firstCount,
    parts,
    split_level: splitLevel,
    content_locale: contentLocale,
    book_id: bookId,
  }
})
