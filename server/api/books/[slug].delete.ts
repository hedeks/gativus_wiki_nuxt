/**
 * DELETE /api/books/:slug
 * Delete a book. Role: admin.
 * Query param: delete_articles=true — also delete all articles belonging to the book.
 * Without the param, returns 409 if the book has articles.
 */

import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { requireRole } from '~/server/utils/requireRole'

function resolveUploadUrlToPath(url: string | null | undefined): string | null {
  if (!url) return null
  const prefix = '/api/uploads/'
  if (url.startsWith(prefix)) {
    const relative = url.substring(prefix.length)
    return join(process.cwd(), 'server', 'storage', 'uploads', relative)
  }
  if (url.includes('server/storage/') || url.includes('server\\storage\\')) {
    const parts = url.split(/server[/\\]storage[/\\]/)
    if (parts.length > 1) {
      return join(process.cwd(), 'server', 'storage', parts[1])
    }
  }
  return null
}

function safeUnlink(urlOrPath: string | null | undefined) {
  if (!urlOrPath) return
  let path = urlOrPath
  if (urlOrPath.startsWith('/api/uploads/') || urlOrPath.includes('server/storage/') || urlOrPath.includes('server\\storage\\')) {
    const resolved = resolveUploadUrlToPath(urlOrPath)
    if (resolved) path = resolved
  }
  try {
    if (existsSync(path)) {
      unlinkSync(path)
    }
  } catch { /* ignore */ }
}

function extractUploadUrlsFromHtml(html: string | null | undefined): string[] {
  if (!html) return []
  const urls: string[] = []
  const regex = /\/api\/uploads\/[^\s"'>]+/g
  let match
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[0])
  }
  return urls
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const query = getQuery(event)
  const deleteArticles = query.delete_articles === 'true' || query.delete_articles === '1'

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const book = await db.prepare('SELECT id, cover_image FROM books WHERE slug = ?').get(slug) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })
  }

  const articleCount = await db.prepare(
    'SELECT COUNT(*) as count FROM articles WHERE book_id = ?'
  ).get(book.id) as any

  if (articleCount?.count > 0 && !deleteArticles) {
    throw createError({
      statusCode: 409,
      statusMessage: `Невозможно удалить: книга содержит ${articleCount.count} статей. Сначала удалите или переместите статьи.`
    })
  }

  let articlesToInvalidate: any[] = []
  if (deleteArticles && articleCount?.count > 0) {
    const articles = await db.prepare(`
      SELECT id, slug, raw_odt_path, 
             presentation_path, presentation_path_ru, presentation_path_zh,
             html_content, html_content_ru, html_content_zh
      FROM articles WHERE book_id = ?
    `).all(book.id) as any[]

    articlesToInvalidate = articles
    for (const article of articles) {
      // Очистка физических файлов статей книги
      safeUnlink(article.raw_odt_path)
      safeUnlink(article.presentation_path)
      safeUnlink(article.presentation_path_ru)
      safeUnlink(article.presentation_path_zh)

      const imageUrls = [
        ...extractUploadUrlsFromHtml(article.html_content),
        ...extractUploadUrlsFromHtml(article.html_content_ru),
        ...extractUploadUrlsFromHtml(article.html_content_zh)
      ]
      for (const url of imageUrls) {
        safeUnlink(url)
      }

      await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(article.id)
      await db.prepare('DELETE FROM article_revisions WHERE article_id = ?').run(article.id)
    }
    await db.prepare('DELETE FROM articles WHERE book_id = ?').run(book.id)
  }

  // Удаляем обложку книги с диска
  safeUnlink(book.cover_image)

  await db.prepare('DELETE FROM book_categories WHERE book_id = ?').run(book.id)
  await db.prepare('DELETE FROM books WHERE id = ?').run(book.id)

  const storage = useStorage('cache')
  const langs = ['en', 'ru', 'zh']
  for (const l of langs) {
    await storage.removeItem(`nitro:handlers:books:${slug}:role_editor:lang_${l}`)
    await storage.removeItem(`nitro:handlers:books:${slug}:role_guest:lang_${l}`)
  }

  for (const article of articlesToInvalidate) {
    for (const l of langs) {
      await storage.removeItem(`nitro:handlers:articles:${article.slug}:role_editor:lang_${l}`)
      await storage.removeItem(`nitro:handlers:articles:${article.slug}:role_guest:lang_${l}`)
    }
  }

  return {
    message: 'Книга удалена',
    deleted_articles: deleteArticles ? (articleCount?.count ?? 0) : 0,
  }
})
