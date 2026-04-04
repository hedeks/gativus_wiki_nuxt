/**
 * POST /api/articles
 * Create a new article. Role: editor+.
 * Automatically creates revision v1.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { title, html_content, book_id, category_id, locale, is_published, sort_order, excerpt } = body

  if (!title || !html_content) {
    throw createError({ statusCode: 400, statusMessage: 'title и html_content обязательны' })
  }

  const baseSlug = body.slug ? slugify(body.slug) : slugify(title)
  const slug = await ensureUniqueSlug(db, 'articles', baseSlug)

  const finalExcerpt = excerpt || generateExcerptFromHtml(html_content)

  await db.prepare(`
    INSERT INTO articles (slug, title, html_content, book_id, category_id, sort_order, excerpt, locale, created_by, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug,
    title,
    html_content,
    book_id || null,
    category_id || null,
    sort_order || 0,
    finalExcerpt,
    locale || 'en',
    auth.id,
    is_published !== false ? 1 : 0
  )

  const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
  const articleId = inserted?.id

  // Create revision v1
  await db.prepare(`
    INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
    VALUES (?, ?, 1, ?, ?)
  `).run(articleId, html_content, 'Initial version', auth.id)

  return {
    id: articleId,
    slug,
    title,
    message: 'Статья создана'
  }
})

function generateExcerptFromHtml(html: string, maxLength = 200): string {
  const text = html.replace(/<[^>]*>/g, '').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}
