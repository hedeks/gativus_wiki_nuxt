import { requireRole } from '../../utils/requireRole'

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, ['user', 'editor', 'admin'])
  const body = await readBody(event)
  const db = useDatabase()

  const { bookSlug, bookTitle, articleSlug, articleTitle, sortOrder, progressPercent, anchor } = body

  if (!bookSlug || !articleSlug) {
    throw createError({ statusCode: 400, message: 'bookSlug and articleSlug are required' })
  }

  await db.sql`
    INSERT INTO user_reading_progress (
      user_id, book_slug, book_title, article_slug, article_title, sort_order, progress_percent, anchor, updated_at
    ) VALUES (
      ${auth.id}, ${bookSlug}, ${bookTitle || ''}, ${articleSlug}, ${articleTitle || ''}, ${sortOrder || 0}, ${progressPercent || 0}, ${anchor || null}, datetime('now')
    )
    ON CONFLICT(user_id, book_slug) DO UPDATE SET
      article_slug = excluded.article_slug,
      article_title = excluded.article_title,
      sort_order = excluded.sort_order,
      progress_percent = excluded.progress_percent,
      anchor = excluded.anchor,
      updated_at = excluded.updated_at
  `

  return { success: true }
})
