import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { join, dirname, extname } from 'path'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Данные не предоставлены' })
  }

  const pathField = formData.find(f => f.name === 'path')
  if (!pathField) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан заменяемый файл (поле path)' })
  }
  const oldRelPath = pathField.data.toString('utf-8').replace(/\.\./g, '')

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Новый файл не передан' })
  }

  const storageBase = join(process.cwd(), 'server', 'storage')
  const oldAbsPath = join(storageBase, oldRelPath)

  if (!existsSync(oldAbsPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Заменяемый файл не найден на сервере' })
  }

  const dir = dirname(oldAbsPath)
  const originalFileName = fileField.filename || 'replaced'
  const newFileName = `${Date.now()}-${originalFileName}`
  const newAbsPath = join(dir, newFileName)

  // 1. Записываем новый файл на диск
  try {
    const buf = Buffer.from(fileField.data.buffer, fileField.data.byteOffset, fileField.data.byteLength)
    writeFileSync(newAbsPath, buf as any)
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Не удалось записать новый файл: ${e.message}` })
  }

  // 2. Удаляем старый файл с диска
  try {
    unlinkSync(oldAbsPath)
  } catch (e) {
    // игнорируем ошибку удаления старого файла, если он уже отсутствовал физически
  }

  // 3. Высчитываем пути для замены в БД
  const newRelPath = newAbsPath.substring(storageBase.length + 1).replace(/\\/g, '/')
  const normalizedOldRelPath = oldRelPath.replace(/\\/g, '/')

  const oldUrl = normalizedOldRelPath.startsWith('uploads/')
    ? `/api/uploads/${normalizedOldRelPath.substring('uploads/'.length)}`
    : null
  const newUrl = newRelPath.startsWith('uploads/')
    ? `/api/uploads/${newRelPath.substring('uploads/'.length)}`
    : null

  // 4. Обновляем все вхождения в БД
  // Прямая замена путей ODT/ODM на диске
  await db.prepare(`
    UPDATE articles 
    SET raw_odt_path = replace(raw_odt_path, ?, ?)
    WHERE raw_odt_path LIKE ?
  `).run(normalizedOldRelPath, newRelPath, `%${normalizedOldRelPath}%`)

  await db.prepare(`
    UPDATE odm_projects 
    SET master_storage_path = replace(master_storage_path, ?, ?)
    WHERE master_storage_path LIKE ?
  `).run(normalizedOldRelPath, newRelPath, `%${normalizedOldRelPath}%`)

  await db.prepare(`
    UPDATE odm_project_parts 
    SET odt_storage_path = replace(odt_storage_path, ?, ?),
        odt_storage_path_ru = replace(odt_storage_path_ru, ?, ?),
        odt_storage_path_zh = replace(odt_storage_path_zh, ?, ?)
    WHERE odt_storage_path LIKE ? 
       OR odt_storage_path_ru LIKE ? 
       OR odt_storage_path_zh LIKE ?
  `).run(
    normalizedOldRelPath, newRelPath,
    normalizedOldRelPath, newRelPath,
    normalizedOldRelPath, newRelPath,
    `%${normalizedOldRelPath}%`,
    `%${normalizedOldRelPath}%`,
    `%${normalizedOldRelPath}%`
  )

  // Замена URL адресов медиа/презентаций/обложек в статьях и терминах
  if (oldUrl && newUrl) {
    // Обложки книг
    await db.prepare(`
      UPDATE books 
      SET cover_image = replace(cover_image, ?, ?)
      WHERE cover_image LIKE ?
    `).run(oldUrl, newUrl, `%${oldUrl}%`)

    // Презентации и HTML-контент статей
    await db.prepare(`
      UPDATE articles 
      SET presentation_path = replace(presentation_path, ?, ?),
          presentation_path_ru = replace(presentation_path_ru, ?, ?),
          presentation_path_zh = replace(presentation_path_zh, ?, ?),
          html_content = replace(html_content, ?, ?),
          html_content_ru = replace(html_content_ru, ?, ?),
          html_content_zh = replace(html_content_zh, ?, ?)
      WHERE presentation_path LIKE ? 
         OR presentation_path_ru LIKE ? 
         OR presentation_path_zh LIKE ?
         OR html_content LIKE ? 
         OR html_content_ru LIKE ? 
         OR html_content_zh LIKE ?
    `).run(
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      `%${oldUrl}%`, `%${oldUrl}%`, `%${oldUrl}%`,
      `%${oldUrl}%`, `%${oldUrl}%`, `%${oldUrl}%`
    )

    // Термины глоссария: картинки, видео, презентации и определения
    await db.prepare(`
      UPDATE terms 
      SET image_url = replace(image_url, ?, ?),
          video_url = replace(video_url, ?, ?),
          presentation_path = replace(presentation_path, ?, ?),
          presentation_path_ru = replace(presentation_path_ru, ?, ?),
          presentation_path_zh = replace(presentation_path_zh, ?, ?),
          definition = replace(definition, ?, ?),
          definition_ru = replace(definition_ru, ?, ?),
          definition_zh = replace(definition_zh, ?, ?)
      WHERE image_url LIKE ? 
         OR video_url LIKE ? 
         OR presentation_path LIKE ? 
         OR presentation_path_ru LIKE ? 
         OR presentation_path_zh LIKE ?
         OR definition LIKE ? 
         OR definition_ru LIKE ? 
         OR definition_zh LIKE ?
    `).run(
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      oldUrl, newUrl,
      `%${oldUrl}%`, `%${oldUrl}%`,
      `%${oldUrl}%`, `%${oldUrl}%`, `%${oldUrl}%`,
      `%${oldUrl}%`, `%${oldUrl}%`, `%${oldUrl}%`
    )

    // Блоки лендинга
    await db.prepare(`
      UPDATE landing_blocks 
      SET image_path = replace(image_path, ?, ?),
          payload_json = replace(payload_json, ?, ?)
      WHERE image_path LIKE ? 
         OR payload_json LIKE ?
    `).run(oldUrl, newUrl, oldUrl, newUrl, `%${oldUrl}%`, `%${oldUrl}%`)

    // Ревизии статей
    await db.prepare(`
      UPDATE article_revisions 
      SET html_content = replace(html_content, ?, ?)
      WHERE html_content LIKE ?
    `).run(oldUrl, newUrl, `%${oldUrl}%`)
  }

  return {
    ok: true,
    message: 'Файл успешно заменен',
    newPath: newRelPath,
    newUrl
  }
})
