/**
 * GET /api/books/:slug
 * Get a book with its articles. Public.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const query = getQuery(event)
  const locale = (query.locale as string) || (query.lang as string) || null
  const isRu = locale === 'ru'
  const isZh = locale === 'zh'

  function resolveLocalized(
    en: string | null | undefined,
    ru: string | null | undefined,
    zh: string | null | undefined,
  ): string {
    if (isRu && ru) return ru
    if (isZh && zh) return zh
    return (en || '').trim()
  }

  const isId = /^\d+$/.test(slug)
  const book = await db.prepare(isId ? 'SELECT * FROM books WHERE id = ?' : 'SELECT * FROM books WHERE slug = ?').get(slug) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Книга не найдена' })
  }

  if (locale) {
    book.title = book[`title_${locale}`] || book.title;
    book.description = book[`description_${locale}`] || book.description;
  }

  // ─── 1. Fetch categories ───
  const categoryRows = await db.prepare('SELECT category_id FROM book_categories WHERE book_id = ?').all(book.id) as any[]
  book.category_ids = categoryRows.map(r => r.category_id)

  const articles = await db.prepare(`
    SELECT id, slug, slug_ru, slug_zh,
           title, title_ru, title_zh,
           excerpt, excerpt_ru, excerpt_zh,
           sort_order, is_published, created_at, updated_at
    FROM articles
    WHERE book_id = ?
    ORDER BY sort_order ASC
  `).all(book.id) as any[]

  return {
    ...book,
    articles: (articles || []).map((a: any) => {
      const title = resolveLocalized(a.title, a.title_ru, a.title_zh)
      const excerpt = resolveLocalized(a.excerpt, a.excerpt_ru, a.excerpt_zh)
      const slugOut =
        isZh && a.slug_zh
          ? a.slug_zh
          : isRu && a.slug_ru
            ? a.slug_ru
            : a.slug
      return {
        ...a,
        slug: slugOut,
        title,
        excerpt,
        locale: 'global',
      }
    }),
  }
})
