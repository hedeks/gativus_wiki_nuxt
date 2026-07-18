/**
 * DELETE /api/articles/:slug
 * Delete an article. Role: admin only.
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

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const article = await db.prepare(`
    SELECT id, raw_odt_path, 
           presentation_path, presentation_path_ru, presentation_path_zh,
           html_content, html_content_ru, html_content_zh
    FROM articles WHERE slug = ?
  `).get(slug) as any

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })
  }

  // 1. Очистка физических файлов
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

  // 2. Удаление из БД (каскадные ревизии через FK)
  await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(article.id)
  await db.prepare('DELETE FROM article_revisions WHERE article_id = ?').run(article.id)
  await db.prepare('DELETE FROM articles WHERE id = ?').run(article.id)

  // Invalidate cache
  const storage = useStorage('cache')
  const langs = ['en', 'ru', 'zh']
  for (const l of langs) {
    await storage.removeItem(`nitro:handlers:articles:${slug}:role_editor:lang_${l}`)
    await storage.removeItem(`nitro:handlers:articles:${slug}:role_guest:lang_${l}`)
  }

  return { message: 'Статья удалена' }
})
