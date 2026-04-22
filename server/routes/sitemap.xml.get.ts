/**
 * server/routes/sitemap.xml.ts
 * Dynamically generates a sitemap for Gativus.
 */

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const config = useRuntimeConfig()
  const host = event.headers.get('host') || 'gativus.com'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`

  // Fetch all articles
  const articles = await db.prepare(`SELECT slug, updated_at, locale FROM articles WHERE is_published = 1`).all() as any[]
  // Fetch all terms
  const terms = await db.prepare(`SELECT slug, updated_at FROM terms`).all() as any[]
  // Fetch all books
  const books = await db.prepare(`SELECT slug FROM books`).all() as any[]

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/books',
    '/articles',
    '/glossary',
    '/knowledge-graph'
  ]

  const locales = ['en', 'ru', 'zh']

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

  // 1. Add static pages for each locale
  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : `/${locale}`
    for (const page of staticPages) {
      xml += `
  <url>
    <loc>${baseUrl}${prefix}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }
  }

  // 2. Add Books
  for (const book of books) {
    for (const locale of locales) {
      const prefix = locale === 'en' ? '' : `/${locale}`
      xml += `
  <url>
    <loc>${baseUrl}${prefix}/books/${book.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    }
  }

  // 3. Add Articles
  for (const article of articles) {
    const localePrefix = article.locale === 'en' ? '' : `/${article.locale}`
    xml += `
  <url>
    <loc>${baseUrl}${localePrefix}/articles/${article.slug}</loc>
    <lastmod>${new Date(article.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
  }

  // 4. Add Glossary Terms
  for (const term of terms) {
    for (const locale of locales) {
      const prefix = locale === 'en' ? '' : `/${locale}`
      xml += `
  <url>
    <loc>${baseUrl}${prefix}/glossary/${term.slug}</loc>
    <lastmod>${new Date(term.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    }
  }

  xml += `
</urlset>`

  event.node.res.setHeader('Content-Type', 'text/xml')
  return xml
})
