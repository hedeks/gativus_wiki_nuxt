/**
 * POST /api/import/odm/project
 * Загрузка до 3 мастер-документов .odm (EN, RU, ZH) → создание черновика проекта и слотов глав,
 * либо ручная инициализация скелета книги (is_manual: true).
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parseOdmOutline, type OdmContentLocale } from '~/server/utils/odmParser'
import { requireRole } from '~/server/utils/requireRole'
import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()

  let options: Record<string, any> = {}
  let isManual = false
  let isFromExisting = false
  let parsedLists: { lang: string; file: any; slots: any[] }[] = []

  const contentType = event.node.req.headers['content-type'] || ''
  if (contentType.includes('application/json')) {
    const body = await readBody(event)
    options = body || {}
    isManual = !!options.is_manual
    isFromExisting = !!options.is_from_existing
  } else {
    const formData = await readMultipartFormData(event)
    if (!formData?.length)
      throw createError({ statusCode: 400, statusMessage: 'Данные не предоставлены' })

    const optionsField = formData.find(f => f.name === 'options')
    options = optionsField ? JSON.parse(optionsField.data.toString('utf-8')) : {}

    isManual = !!options.is_manual
    isFromExisting = !!options.is_from_existing

    if (!isManual && !isFromExisting) {
      // Считываем до 3 ODM-файлов
      const fileEn = formData.find(f => f.name === 'file_en')
      const fileRu = formData.find(f => f.name === 'file_ru')
      const fileZh = formData.find(f => f.name === 'file_zh')

      parsedLists = [
        { lang: 'en', file: fileEn, slots: fileEn?.data ? parseOdmOutline(Buffer.from(fileEn.data.buffer, fileEn.data.byteOffset, fileEn.data.byteLength), { contentLocale: 'en' }) : null },
        { lang: 'ru', file: fileRu, slots: fileRu?.data ? parseOdmOutline(Buffer.from(fileRu.data.buffer, fileRu.data.byteOffset, fileRu.data.byteLength), { contentLocale: 'ru' }) : null },
        { lang: 'zh', file: fileZh, slots: fileZh?.data ? parseOdmOutline(Buffer.from(fileZh.data.buffer, fileZh.data.byteOffset, fileZh.data.byteLength), { contentLocale: 'zh' }) : null },
      ].filter((x): x is { lang: string; file: any; slots: any[] } => x.slots !== null)
    }
  }

  let bookId: number | null = options.book_id != null && options.book_id !== '' ? Number(options.book_id) : null
  let categoryId: number | null = options.category_id != null && options.category_id !== '' ? Number(options.category_id) : null
  const splitLevel = ['none', 'h1', 'h2'].includes(options.split_level) ? options.split_level : 'none'

  const rawLc = String(options.content_locale ?? options.locale ?? (parsedLists.length > 0 ? parsedLists[0].lang : 'en')).toLowerCase()
  const contentLocale: OdmContentLocale = rawLc === 'en' || rawLc === 'zh' ? rawLc : 'ru'

  const usedCreateBook = Boolean(
    options.create_book
    && typeof options.create_book === 'object'
    && String((options.create_book as { title?: string }).title || '').trim(),
  )

  const createBook = options.create_book as any

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
    const row = await db.prepare(`SELECT id FROM books WHERE slug = ?`).get(slug) as { id: number }
    bookId = row ? Number(row.id) : null

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

  // Если это ручной режим, проверяем наличие существующего проекта, чтобы не плодить дубликаты
  if (isManual) {
    const existing = await db.prepare('SELECT * FROM odm_projects WHERE book_id = ? ORDER BY id DESC LIMIT 1').get(bookId) as any
    if (existing) {
      const parts = await db.prepare(`
        SELECT id, sort_order, master_href, display_title, display_title_ru, display_title_zh,
               master_href_en, master_href_ru, master_href_zh, is_enabled, status, odt_original_name, imported_article_ids
        FROM odm_project_parts WHERE project_id = ? ORDER BY sort_order
      `).all(existing.id)
      return {
        projectId: existing.id,
        slots: parts.length,
        parts,
        split_level: existing.split_level,
        content_locale: existing.content_locale,
        book_id: bookId,
        message: 'Найден существующий скелет книги'
      }
    }
  }

  let masterPath = 'manual'
  let originalName = 'manual.odm'

  if (!isManual && !isFromExisting) {
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

    const dir = join(process.cwd(), 'server', 'storage', 'odm')
    if (!existsSync(dir))
      mkdirSync(dir, { recursive: true })

    // Для master_storage_path используем файл, соответствующий контентной локали, или первый из загруженных
    const primaryItem = parsedLists.find(x => x.lang === contentLocale) || parsedLists[0]
    const primaryBuf = Buffer.from(primaryItem.file.data.buffer, primaryItem.file.data.byteOffset, primaryItem.file.data.byteLength)
    originalName = primaryItem.file.filename || `master_${primaryItem.lang}.odm`
    masterPath = join(dir, `${Date.now()}-${originalName}`)
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
  }

  await db.prepare(`
    INSERT INTO odm_projects (book_id, category_id, master_storage_path, master_original_name, split_level, content_locale, created_by, book_created_with_project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(bookId, categoryId, masterPath, originalName, splitLevel, contentLocale, auth.id, usedCreateBook ? 1 : 0)

  const ins = await db.prepare(`SELECT id FROM odm_projects WHERE book_id = ? ORDER BY id DESC LIMIT 1`).get(bookId) as { id: number }
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

  let firstCount = 0

  if (isFromExisting) {
    // 1. Находим все статьи книги
    const articles = await db.prepare(`
      SELECT id, slug, title, title_ru, title_zh FROM articles WHERE book_id = ? ORDER BY sort_order ASC, id ASC
    `).all(bookId) as any[]

    firstCount = articles.length

    const insertPartWithExisting = db.prepare(`
      INSERT INTO odm_project_parts (
        project_id, sort_order, master_href, display_title,
        display_title_ru, display_title_zh,
        master_href_en, master_href_ru, master_href_zh,
        is_enabled, status, imported_article_ids, odt_original_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'imported', ?, ?)
    `)

    for (let i = 0; i < articles.length; i++) {
      const art = articles[i]
      const nextOrder = i + 1
      const dummyHref = `manual_article_${art.id}.odt`
      const importedIds = JSON.stringify([art.id])
      const origName = `${art.slug}.odt`

      await insertPartWithExisting.run(
        projectId,
        nextOrder,
        dummyHref,
        art.title,
        art.title_ru || null,
        art.title_zh || null,
        dummyHref,
        dummyHref,
        null,
        importedIds,
        origName
      )

      // Связываем саму статью со слотом
      await db.prepare(`
        UPDATE articles
        SET master_href_en = ?, master_href_ru = ?
        WHERE id = ?
      `).run(dummyHref, dummyHref, art.id)
    }
  } else if (isManual) {
    // В ручном режиме создаем 1 пустую стартовую главу по умолчанию
    firstCount = 1
    await insertPart.run(
      projectId,
      1,
      'manual_chapter_1.odt',
      'Chapter 1',
      'Глава 1',
      null,
      'manual_chapter_1.odt',
      'manual_chapter_1.odt',
      null,
    )
  } else {
    firstCount = parsedLists[0].slots.length
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
