/**
 * POST /api/articles
 * Create a new article. Role: editor+.
 * Automatically creates revision v1.
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { buildTermsMap, linkTermsInHtml, mergeMentionCountMaps, replaceArticleTermMentions } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { title, title_ru, title_zh, slug_ru, slug_zh, html_content, html_content_ru, html_content_zh, book_id, category_id, is_published, sort_order, excerpt, excerpt_ru, excerpt_zh, presentation_path, presentation_path_ru, presentation_path_zh, term_id } = body

  if (!title || !html_content) {
    throw createError({ statusCode: 400, statusMessage: 'title и html_content обязательны' })
  }

  const baseSlug = body.slug ? slugify(body.slug) : slugify(title)
  const slug = await ensureUniqueSlug(db, 'articles', baseSlug)

  // ─── Phase 3: Auto-linking terms ───
  const termsMap = await buildTermsMap(db)
  const rEn = linkTermsInHtml(html_content, termsMap)
  const processedHtml = rEn.html
  const rRu = html_content_ru ? linkTermsInHtml(html_content_ru, termsMap) : null
  const rZh = html_content_zh ? linkTermsInHtml(html_content_zh, termsMap) : null
  const processedHtmlRu = rRu?.html ?? null
  const processedHtmlZh = rZh?.html ?? null
  const mergedMentions = mergeMentionCountMaps([rEn.mentionCountByTermId, rRu?.mentionCountByTermId, rZh?.mentionCountByTermId])

  const finalExcerpt = excerpt || generateExcerptFromHtml(processedHtml)
  const finalExcerptRu = excerpt_ru || (processedHtmlRu ? generateExcerptFromHtml(processedHtmlRu) : null)
  const finalExcerptZh = excerpt_zh || (processedHtmlZh ? generateExcerptFromHtml(processedHtmlZh) : null)

  await db.prepare(`
    INSERT INTO articles (slug, slug_ru, slug_zh, title, title_ru, title_zh, html_content, html_content_ru, html_content_zh, book_id, category_id, sort_order, excerpt, excerpt_ru, excerpt_zh, created_by, is_published, presentation_path, presentation_path_ru, presentation_path_zh, is_term_article)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug,
    slug_ru || null,
    slug_zh || null,
    title,
    title_ru || null,
    title_zh || null,
    processedHtml,
    processedHtmlRu,
    processedHtmlZh,
    book_id || null,
    category_id || null,
    sort_order || 0,
    finalExcerpt,
    finalExcerptRu,
    finalExcerptZh,
    auth.id,
    is_published !== false ? 1 : 0,
    presentation_path || null,
    presentation_path_ru || null,
    presentation_path_zh || null,
    term_id ? 1 : 0
  )

  const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
  const articleId = inserted?.id

  // If term_id is provided, link the term to this article
  if (term_id) {
    await db.prepare('UPDATE terms SET term_article_id = ? WHERE id = ?').run(articleId, term_id)
  }

  // Create revision v1
  await db.prepare(`
    INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
    VALUES (?, ?, 1, ?, ?)
  `).run(articleId, processedHtml, 'Initial version', auth.id)

  // ─── Phase 4: Sync Knowledge Graph ───
  if (mergedMentions.size > 0) {
    replaceArticleTermMentions(db, articleId, mergedMentions)
  }

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
