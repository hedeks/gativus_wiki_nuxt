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

  const { title, title_ru, title_zh, definition, definition_ru, definition_zh, slug_ru, slug_zh, aliases, html_content, html_content_ru, html_content_zh, category_id, change_summary, presentation_path, presentation_path_ru, presentation_path_zh, image_url, video_url } = body

  const updates: string[] = []
  const params: any[] = []

  if (title !== undefined) { updates.push('title = ?'); params.push(title) }
  if (title_ru !== undefined) { updates.push('title_ru = ?'); params.push(title_ru) }
  if (title_zh !== undefined) { updates.push('title_zh = ?'); params.push(title_zh) }
  if (definition !== undefined) { updates.push('definition = ?'); params.push(definition) }
  if (definition_ru !== undefined) { updates.push('definition_ru = ?'); params.push(definition_ru) }
  if (definition_zh !== undefined) { updates.push('definition_zh = ?'); params.push(definition_zh) }
  if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url || null) }
  if (video_url !== undefined) { updates.push('video_url = ?'); params.push(video_url || null) }

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

  // Handle slug_ru change
  let finalSlugRu = null
  if (slug_ru !== undefined) {
    finalSlugRu = slug_ru ? slugify(slug_ru) : null
    if (finalSlugRu) {
       updates.push('slug_ru = ?')
       params.push(finalSlugRu)
    } else {
       updates.push('slug_ru = NULL')
    }
  }
  
  // Handle slug_zh change
  let finalSlugZh = null
  if (slug_zh !== undefined) {
    finalSlugZh = slug_zh ? slugify(slug_zh) : null
    if (finalSlugZh) {
       updates.push('slug_zh = ?')
       params.push(finalSlugZh)
    } else {
       updates.push('slug_zh = NULL')
    }
  }

  // Handle html_content and presentation_path — create or update linked article
  if (html_content !== undefined || html_content_ru !== undefined || html_content_zh !== undefined
    || presentation_path !== undefined || presentation_path_ru !== undefined || presentation_path_zh !== undefined) {
    const termsMap = await buildTermsMap(db)

    // Fetch current article state if it exists
    let currentArticle: any = null
    if (existing.term_article_id) {
      currentArticle = await db.prepare(
        'SELECT html_content, html_content_ru, html_content_zh, presentation_path, presentation_path_ru, presentation_path_zh FROM articles WHERE id = ?'
      ).get(existing.term_article_id)
    }

    let finalHtml = ''
    let finalHtmlRu = null
    let finalHtmlZh = null
    let linkedTermIds: number[] = []

    if (html_content !== undefined) {
      const result = linkTermsInHtml(html_content, termsMap)
      finalHtml = result.html
      linkedTermIds = result.linkedTermIds
    } else {
      finalHtml = currentArticle?.html_content || ''
    }
    
    if (html_content_ru !== undefined) {
      finalHtmlRu = html_content_ru ? linkTermsInHtml(html_content_ru, termsMap).html : null
    } else {
      finalHtmlRu = currentArticle?.html_content_ru || null
    }
    
    if (html_content_zh !== undefined) {
      finalHtmlZh = html_content_zh ? linkTermsInHtml(html_content_zh, termsMap).html : null
    } else {
      finalHtmlZh = currentArticle?.html_content_zh || null
    }
    
    const finalPresPath = presentation_path !== undefined
      ? presentation_path
      : (currentArticle?.presentation_path || null)
    const finalPresPathRu = presentation_path_ru !== undefined
      ? presentation_path_ru
      : (currentArticle?.presentation_path_ru || null)
    const finalPresPathZh = presentation_path_zh !== undefined
      ? presentation_path_zh
      : (currentArticle?.presentation_path_zh || null)

    if (existing.term_article_id) {
      // Update existing article
      await db.prepare(`
        UPDATE articles SET 
          html_content = ?, 
          html_content_ru = ?,
          html_content_zh = ?,
          presentation_path = ?,
          presentation_path_ru = ?,
          presentation_path_zh = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(finalHtml, finalHtmlRu, finalHtmlZh, finalPresPath, finalPresPathRu, finalPresPathZh, existing.term_article_id)

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

      // Sync article_terms for the disclosure article
      if (html_content !== undefined) {
        await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(existing.term_article_id)
        if (linkedTermIds.length > 0) {
          const insertStmt = db.prepare('INSERT INTO article_terms (article_id, term_id) VALUES (?, ?)')
          for (const tId of linkedTermIds) {
            insertStmt.run(existing.term_article_id, tId)
          }
        }
      }
    } else {
      // Create new linked article
      const termTitle = title || (await db.prepare('SELECT title FROM terms WHERE id = ?').get(existing.id) as any)?.title
      const termTitleRu = title_ru || (await db.prepare('SELECT title_ru FROM terms WHERE id = ?').get(existing.id) as any)?.title_ru
      const termTitleZh = title_zh || (await db.prepare('SELECT title_zh FROM terms WHERE id = ?').get(existing.id) as any)?.title_zh
      const articleSlug = await ensureUniqueSlug(db, 'articles', `term-${newSlug}`)
      const excerpt = generateExcerpt(finalHtml)

      await db.prepare(`
        INSERT INTO articles (slug, slug_ru, slug_zh, title, title_ru, title_zh, html_content, html_content_ru, html_content_zh, presentation_path, presentation_path_ru, presentation_path_zh, category_id, excerpt, created_by, is_published, is_term_article)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
      `).run(articleSlug, finalSlugRu ? `term-${finalSlugRu}` : null, finalSlugZh ? `term-${finalSlugZh}` : null, termTitle, termTitleRu || null, termTitleZh || null, finalHtml, finalHtmlRu, finalHtmlZh, finalPresPath, finalPresPathRu, finalPresPathZh, category_id || null, excerpt, auth.id)

      const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
      const newArticleId = inserted?.id

      await db.prepare(`
        INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
        VALUES (?, ?, 1, 'Initial version (term article)', ?)
      `).run(newArticleId, finalHtml, auth.id)

      // Sync article_terms for the NEW disclosure article
      if (linkedTermIds.length > 0) {
        const insertStmt = db.prepare('INSERT INTO article_terms (article_id, term_id) VALUES (?, ?)')
        for (const tId of linkedTermIds) {
          insertStmt.run(newArticleId, tId)
        }
      }

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
