import { existsSync, unlinkSync } from 'fs'
import { join, basename } from 'path'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  const body = await readBody(event) as { path?: string }
  if (!body.path) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан путь к файлу' })
  }

  // Prevent Path Traversal
  const normalizedPath = body.path.replace(/\.\./g, '')
  const absPath = join(process.cwd(), 'server', 'storage', normalizedPath)

  if (!existsSync(absPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Файл не найден на сервере' })
  }

  const name = basename(absPath)

  // 1. Проверяем связи с базой данных
  // Обложки книг
  const book = await db.prepare('SELECT id, title FROM books WHERE cover_image LIKE ?').get(`%${name}%`) as any
  if (book) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в обложке книги: "${book.title}"` })
  }

  // Статьи: презентации, ODT, HTML
  const article = await db.prepare(`
    SELECT id, title FROM articles 
    WHERE raw_odt_path LIKE ? 
       OR presentation_path LIKE ? 
       OR presentation_path_ru LIKE ? 
       OR presentation_path_zh LIKE ?
       OR html_content LIKE ?
       OR html_content_ru LIKE ?
       OR html_content_zh LIKE ?
  `).get(`%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`) as any
  if (article) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в статье: "${article.title}"` })
  }

  // Глоссарий: картинки, видео, презентации, определения
  const term = await db.prepare(`
    SELECT id, title FROM terms 
    WHERE image_url LIKE ? 
       OR video_url LIKE ? 
       OR presentation_path LIKE ? 
       OR presentation_path_ru LIKE ? 
       OR presentation_path_zh LIKE ?
       OR definition LIKE ?
       OR definition_ru LIKE ?
       OR definition_zh LIKE ?
  `).get(`%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`) as any
  if (term) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в термине глоссария: "${term.title}"` })
  }

  // ODM проекты
  const proj = await db.prepare('SELECT id FROM odm_projects WHERE master_storage_path LIKE ?').get(`%${name}%`) as any
  if (proj) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в структуре проекта ODM #${proj.id}` })
  }

  // Слоты глав ODM
  const part = await db.prepare(`
    SELECT id, sort_order FROM odm_project_parts 
    WHERE odt_storage_path LIKE ? 
       OR odt_storage_path_ru LIKE ? 
       OR odt_storage_path_zh LIKE ?
  `).get(`%${name}%`, `%${name}%`, `%${name}%`) as any
  if (part) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в главе #${part.sort_order} структуры проекта` })
  }

  // Ревизии статей
  const rev = await db.prepare('SELECT article_id FROM article_revisions WHERE html_content LIKE ? LIMIT 1').get(`%${name}%`) as any
  if (rev) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в ревизиях (истории изменений) статьи #${rev.article_id}` })
  }

  // Блоки лендинга
  const block = await db.prepare(`
    SELECT id, title_en FROM landing_blocks 
    WHERE image_path LIKE ? 
       OR payload_json LIKE ?
  `).get(`%${name}%`, `%${name}%`) as any
  if (block) {
    throw createError({ statusCode: 409, statusMessage: `Файл используется в блоке лендинга: "${block.title_en || 'Без названия'}"` })
  }

  // Если связей нет, удаляем
  try {
    unlinkSync(absPath)
    return { ok: true, message: 'Файл успешно удален' }
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: `Не удалось удалить файл: ${e.message}` })
  }
})
