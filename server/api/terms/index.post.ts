/**
 * POST /api/terms
 * Create a new glossary term. Role: editor+.
 * If html_content is provided, atomically creates a linked article (is_term_article = 1).
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { buildTermsMap, linkTermsInHtml, syncArticleTermsFromArticleRow } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { title, title_ru, title_zh, definition, definition_ru, definition_zh, slug_ru, slug_zh, aliases, html_content, html_content_ru, html_content_zh, category_id, presentation_path, presentation_path_ru, presentation_path_zh, image_url, video_url } = body

  if (!title || !definition) {
    throw createError({ statusCode: 400, statusMessage: 'title и definition обязательны' })
  }

  const baseSlug = body.slug ? slugify(body.slug) : slugify(title)
  const slug = await ensureUniqueSlug(db, 'terms', baseSlug)

  let finalSlugRu = null
  if (slug_ru) {
    const baseSlugRu = slugify(slug_ru)
    finalSlugRu = await ensureUniqueSlug(db, 'terms', baseSlugRu)
  }
  
  let finalSlugZh = null
  if (slug_zh) {
    const baseSlugZh = slugify(slug_zh)
    finalSlugZh = await ensureUniqueSlug(db, 'terms', baseSlugZh)
  }

  const aliasesJson = aliases
    ? JSON.stringify(Array.isArray(aliases) ? aliases : [aliases])
    : null

  let termArticleId: number | null = null

  // If extended content provided — create a linked term-article first
  if (html_content || html_content_ru || html_content_zh || presentation_path || presentation_path_ru || presentation_path_zh) {
    const termsMap = await buildTermsMap(db)
    const rMain = html_content ? linkTermsInHtml(html_content, termsMap) : null
    const rRu = html_content_ru ? linkTermsInHtml(html_content_ru, termsMap) : null
    const rZh = html_content_zh ? linkTermsInHtml(html_content_zh, termsMap) : null
    const finalHtml = rMain?.html ?? ''
    const finalHtmlRu = rRu?.html ?? null
    const finalHtmlZh = rZh?.html ?? null

    const articleSlug = await ensureUniqueSlug(db, 'articles', `term-${slug}`)
    const excerpt = generateExcerpt(finalHtml)
    const excerptRu = finalHtmlRu ? generateExcerpt(finalHtmlRu) : null
    const excerptZh = finalHtmlZh ? generateExcerpt(finalHtmlZh) : null

    await db.prepare(`
      INSERT INTO articles (slug, slug_ru, slug_zh, title, title_ru, title_zh, html_content, html_content_ru, html_content_zh, presentation_path, presentation_path_ru, presentation_path_zh, category_id, excerpt, excerpt_ru, excerpt_zh, created_by, is_published, is_term_article)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(articleSlug, finalSlugRu ? `term-${finalSlugRu}` : null, finalSlugZh ? `term-${finalSlugZh}` : null, title, title_ru || null, title_zh || null, finalHtml, finalHtmlRu, finalHtmlZh, presentation_path || null, presentation_path_ru || null, presentation_path_zh || null, category_id || null, excerpt, excerptRu, excerptZh, auth.id)

    const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
    termArticleId = inserted?.id

    // Create revision v1 for the article
    await db.prepare(`
      INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
      VALUES (?, ?, 1, 'Initial version (term article)', ?)
    `).run(termArticleId, finalHtml, auth.id)

    syncArticleTermsFromArticleRow(db, termArticleId, termsMap)
  }

  await db.prepare(`
    INSERT INTO terms (slug, slug_ru, slug_zh, title, title_ru, title_zh, aliases, definition, definition_ru, definition_zh, term_article_id, image_url, video_url, presentation_path, presentation_path_ru, presentation_path_zh, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug, finalSlugRu, finalSlugZh, title, title_ru || null, title_zh || null, aliasesJson,
    definition, definition_ru || null, definition_zh || null, termArticleId,
    image_url || null, video_url || null,
    termArticleId ? null : (presentation_path || null),
    termArticleId ? null : (presentation_path_ru || null),
    termArticleId ? null : (presentation_path_zh || null),
    auth.id)

  const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any

  return {
    id: inserted?.id,
    slug,
    title,
    message: 'Термин создан',
  }
})

function generateExcerpt(html: string, maxLength = 200): string {
  const text = html.replace(/<[^>]*>/g, '').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}
