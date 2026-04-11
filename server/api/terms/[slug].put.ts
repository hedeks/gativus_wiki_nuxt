/**
 * PUT /api/terms/:slug
 * Update a glossary term. Role: editor+.
 * If html_content is provided and no article exists yet — creates one atomically.
 * If article already exists — updates its html_content and creates a revision.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { buildTermsMap, linkTermsInHtml } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')
  const body = await readBody(event)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const existing = await db.prepare('SELECT id, slug, term_article_id FROM terms WHERE slug = ?').get(slug) as any
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Термин не найден' })
  }

  const { title, definition, aliases, html_content, category_id, change_summary, presentation_path } = body

  const updates: string[] = []
  const params: any[] = []

  if (title !== undefined) { updates.push('title = ?'); params.push(title) }
  if (definition !== undefined) { updates.push('definition = ?'); params.push(definition) }
  if (aliases !== undefined) {
    const json = Array.isArray(aliases) ? JSON.stringify(aliases) : JSON.stringify([aliases])
    updates.push('aliases = ?')
    params.push(json)
  }

  // Handle slug change
  let newSlug = existing.slug
  if (body.slug && body.slug !== existing.slug) {
    newSlug = await ensureUniqueSlug(db, 'terms', slugify(body.slug || title || existing.title), existing.id)
    updates.push('slug = ?')
    params.push(newSlug)
  }

  // Handle html_content and presentation_path — create or update linked article
  if (html_content !== undefined || presentation_path !== undefined) {
    const termsMap = await buildTermsMap(db)
    
    // Fetch current article state if it exists
    let currentArticle: any = null
    if (existing.term_article_id) {
      currentArticle = await db.prepare('SELECT html_content, presentation_path FROM articles WHERE id = ?').get(existing.term_article_id)
    }

    const finalHtml = html_content !== undefined 
      ? linkTermsInHtml(html_content, termsMap)
      : (currentArticle?.html_content || '')
    
    const finalPresPath = presentation_path !== undefined
      ? presentation_path
      : (currentArticle?.presentation_path || null)

    if (existing.term_article_id) {
      // Update existing article
      await db.prepare(`
        UPDATE articles SET 
          html_content = ?, 
          presentation_path = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(finalHtml, finalPresPath, existing.term_article_id)

      // Create new revision if HTML changed
      if (html_content !== undefined) {
        const lastRev = await db.prepare(
          'SELECT MAX(revision_num) as max_num FROM article_revisions WHERE article_id = ?'
        ).get(existing.term_article_id) as any
        const nextNum = (lastRev?.max_num || 0) + 1
        await db.prepare(`
          INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(existing.term_article_id, finalHtml, nextNum, change_summary || null, auth.id)
      }
    } else {
      // Create new linked article
      const termTitle = title || (await db.prepare('SELECT title FROM terms WHERE id = ?').get(existing.id) as any)?.title
      const articleSlug = await ensureUniqueSlug(db, 'articles', `term-${newSlug}`)
      const excerpt = generateExcerpt(finalHtml)

      await db.prepare(`
        INSERT INTO articles (slug, title, html_content, presentation_path, category_id, excerpt, locale, created_by, is_published, is_term_article)
        VALUES (?, ?, ?, ?, ?, ?, 'en', ?, 1, 1)
      `).run(articleSlug, termTitle, finalHtml, finalPresPath, category_id || null, excerpt, auth.id)

      const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
      const newArticleId = inserted?.id

      await db.prepare(`
        INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
        VALUES (?, ?, 1, 'Initial version (term article)', ?)
      `).run(newArticleId, finalHtml, auth.id)

      updates.push('term_article_id = ?')
      params.push(newArticleId)
    }
  }

  // Update category_id on the linked article if provided
  if (category_id !== undefined && existing.term_article_id) {
    await db.prepare(`UPDATE articles SET category_id = ? WHERE id = ?`).run(category_id || null, existing.term_article_id)
  }

  updates.push("updated_at = datetime('now')")

  if (updates.length > 0) {
    await db.prepare(
      `UPDATE terms SET ${updates.join(', ')} WHERE id = ?`
    ).run(...params, existing.id)
  }

  return { slug: newSlug, message: 'Термин обновлён' }
})

function generateExcerpt(html: string, maxLength = 200): string {
  const text = html.replace(/<[^>]*>/g, '').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}
