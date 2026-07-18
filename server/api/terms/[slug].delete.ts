/**
 * DELETE /api/terms/:slug
 * Delete a term and its linked article (if any). Role: admin.
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

  const term = await db.prepare(`
    SELECT id, term_article_id, image_url, video_url, 
           presentation_path, presentation_path_ru, presentation_path_zh
    FROM terms WHERE slug = ?
  `).get(slug) as any

  if (!term) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  // 1. Удаляем файлы термина
  safeUnlink(term.image_url)
  safeUnlink(term.video_url)
  safeUnlink(term.presentation_path)
  safeUnlink(term.presentation_path_ru)
  safeUnlink(term.presentation_path_zh)

  // 2. Если есть привязанная статья термина, удаляем её файлы
  if (term.term_article_id) {
    const article = await db.prepare(`
      SELECT raw_odt_path, 
             presentation_path, presentation_path_ru, presentation_path_zh,
             html_content, html_content_ru, html_content_zh
      FROM articles WHERE id = ?
    `).get(term.term_article_id) as any

    if (article) {
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
    }

    await db.prepare('DELETE FROM article_revisions WHERE article_id = ?').run(term.term_article_id)
    await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(term.term_article_id)
    await db.prepare('DELETE FROM articles WHERE id = ? AND is_term_article = 1').run(term.term_article_id)
  }

  // 3. Удаляем сам термин из БД
  await db.prepare('DELETE FROM terms WHERE id = ?').run(term.id)

  // Invalidate cache
  const storage = useStorage('cache')
  const langs = ['en', 'ru', 'zh']
  for (const l of langs) {
    await storage.removeItem(`nitro:handlers:terms:${slug}:role_editor:lang_${l}`)
    await storage.removeItem(`nitro:handlers:terms:${slug}:role_guest:lang_${l}`)
  }

  return { message: 'Термин удалён' }
})
