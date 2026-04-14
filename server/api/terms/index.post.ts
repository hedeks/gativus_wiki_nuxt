/**
 * POST /api/terms
 * Create a new glossary term. Role: editor+.
 * If html_content is provided, atomically creates a linked article (is_term_article = 1).
 */

import { slugify, ensureUniqueSlug } from '~/server/utils/slugify'
import { buildTermsMap, linkTermsInHtml } from '~/server/utils/termLinker'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody(event)

  const { title, title_ru, definition, definition_ru, slug_ru, aliases, html_content, category_id, presentation_path } = body

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

  const aliasesJson = aliases
    ? JSON.stringify(Array.isArray(aliases) ? aliases : [aliases])
    : null

  let termArticleId: number | null = null

  // If extended content provided — create a linked term-article first
  if (html_content || presentation_path) {
    const termsMap = await buildTermsMap(db)
    const result = html_content ? linkTermsInHtml(html_content, termsMap) : { html: '' }
    const finalHtml = result.html

    const articleSlug = await ensureUniqueSlug(db, 'articles', `term-${slug}`)
    const excerpt = generateExcerpt(finalHtml)

    await db.prepare(`
      INSERT INTO articles (slug, title, html_content, presentation_path, category_id, excerpt, locale, created_by, is_published, is_term_article)
      VALUES (?, ?, ?, ?, ?, ?, 'en', ?, 1, 1)
    `).run(articleSlug, title, finalHtml, presentation_path || null, category_id || null, excerpt, auth.id)

    const inserted = await db.prepare('SELECT last_insert_rowid() as id').get() as any
    termArticleId = inserted?.id

    // Create revision v1 for the article
    await db.prepare(`
      INSERT INTO article_revisions (article_id, html_content, revision_num, change_summary, created_by)
      VALUES (?, ?, 1, 'Initial version (term article)', ?)
    `).run(termArticleId, finalHtml, auth.id)
  }

  await db.prepare(`
    INSERT INTO terms (slug, slug_ru, title, title_ru, aliases, definition, definition_ru, term_article_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(slug, finalSlugRu, title, title_ru || null, aliasesJson, definition, definition_ru || null, termArticleId, auth.id)

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
