import AdmZip from 'adm-zip'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * GET /api/admin/articles/export
 * Экспорт выбранных статей в ZIP архив (с JSON внутри).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')
  const db = useDatabase()
  const query = getQuery(event)

  const idsParam = query.ids as string

  let whereClause = ''
  const params: any[] = []

  if (idsParam) {
    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    if (ids.length > 0) {
      whereClause = `WHERE a.id IN (${ids.map(() => '?').join(',')})`
      params.push(...ids)
    } else {
      whereClause = `WHERE 1=0` // invalid ids
    }
  } else {
    const search = (query.search as string) || null
    const bookId = query.book_id ? parseInt(query.book_id as string) : null
    const translationFilter = (query.translation_filter as string) || null

    const conditions: string[] = []

    if (search) {
      conditions.push('(a.title LIKE ? COLLATE NOCASE OR a.excerpt LIKE ? COLLATE NOCASE)')
      params.push(`%${search}%`, `%${search}%`)
    }
    if (bookId) {
      conditions.push('a.book_id = ?')
      params.push(bookId)
    }
    
    if (translationFilter === 'complete') {
      conditions.push('(COALESCE(a.translation_valid_en, 1) = 1 AND COALESCE(a.translation_valid_ru, 0) = 1 AND COALESCE(a.translation_valid_zh, 0) = 1)')
    } else if (translationFilter === 'incomplete') {
      conditions.push('NOT (COALESCE(a.translation_valid_en, 1) = 1 AND COALESCE(a.translation_valid_ru, 0) = 1 AND COALESCE(a.translation_valid_zh, 0) = 1)')
    } else if (translationFilter === 'missing_ru') {
      conditions.push('(COALESCE(a.translation_valid_ru, 0) = 0)')
    } else if (translationFilter === 'missing_zh') {
      conditions.push('(COALESCE(a.translation_valid_zh, 0) = 0)')
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }
  }

  // 1. Articles
  const articlesRaw = await db.prepare(`
    SELECT a.*, c.slug as category_slug, b.slug as book_slug
    FROM articles a
    LEFT JOIN categories c ON a.category_id = c.id
    LEFT JOIN books b ON a.book_id = b.id
    ${whereClause}
  `).all(...params) as any[]

  if (articlesRaw.length === 0) {
    return {
      version: '1.3',
      timestamp: new Date().toISOString(),
      articles: []
    }
  }

  const articles = articlesRaw.map(a => ({
    slug: a.slug,
    slug_ru: a.slug_ru || null,
    slug_zh: a.slug_zh || null,
    title: a.title,
    title_ru: a.title_ru || null,
    title_zh: a.title_zh || null,
    excerpt: a.excerpt || null,
    excerpt_ru: a.excerpt_ru || null,
    excerpt_zh: a.excerpt_zh || null,
    html_content: a.html_content,
    html_content_ru: a.html_content_ru || null,
    html_content_zh: a.html_content_zh || null,
    raw_odt_path: a.raw_odt_path || null,
    presentation_path: a.presentation_path || null,
    presentation_path_ru: a.presentation_path_ru || null,
    presentation_path_zh: a.presentation_path_zh || null,
    category_slug: a.category_slug || null,
    book_slug: a.book_slug || null,
    is_published: a.is_published,
    is_term_article: a.is_term_article,
    sort_order: a.sort_order,
    locale: a.locale || null,
    translation_valid_en: a.translation_valid_en !== undefined ? a.translation_valid_en : 1,
    translation_valid_ru: a.translation_valid_ru !== undefined ? a.translation_valid_ru : 0,
    translation_valid_zh: a.translation_valid_zh !== undefined ? a.translation_valid_zh : 0,
    created_at: a.created_at || null,
    updated_at: a.updated_at || null,
  }))

  const dump: any = {
    version: '1.3',
    timestamp: new Date().toISOString(),
    articles: articles
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16)
  let filename = `gativus-articles-export-${ts}.zip`
  if (articlesRaw.length === 1) {
    filename = `article-${articles[0].slug}-${ts}.zip`
  } else if (idsParam) {
    filename = `articles-selected-${articlesRaw.length}-${ts}.zip`
  } else if (query.search) {
    const safeSearch = (query.search as string).replace(/[^a-z0-9а-яё]/gi, '_').substring(0, 20)
    filename = `articles-search-${safeSearch}-${ts}.zip`
  } else {
    filename = `articles-filtered-${articlesRaw.length}-${ts}.zip`
  }

  const zip = new AdmZip()
  zip.addFile('data.json', Buffer.from(JSON.stringify(dump, null, 2), 'utf-8'))

  const addedPaths = new Set<string>()

  const addAssetToZip = (assetPath: string | null | undefined) => {
    if (!assetPath) return
    if (addedPaths.has(assetPath)) return
    
    if (assetPath.startsWith('/api/uploads/')) {
      const relative = assetPath.substring('/api/uploads/'.length)
      const physical = join(process.cwd(), 'server', 'storage', 'uploads', relative)
      
      if (existsSync(physical)) {
        addedPaths.add(assetPath)
        const folderParts = relative.split('/')
        folderParts.pop() // remove filename
        const folderInArchive = folderParts.length > 0 ? `assets/${folderParts.join('/')}` : 'assets'
        zip.addLocalFile(physical, folderInArchive)
      }
    }
  }

  for (const a of articles) {
    addAssetToZip(a.presentation_path)
    addAssetToZip(a.presentation_path_ru)
    addAssetToZip(a.presentation_path_zh)
    addAssetToZip(a.raw_odt_path)
    
    const contents = [a.html_content, a.html_content_ru, a.html_content_zh]
    for (const c of contents) {
      if (!c) continue
      const matches = c.matchAll(/src="(\/api\/uploads\/[^"]+)"/g)
      for (const m of matches) {
        addAssetToZip(m[1])
      }
    }
  }

  const zipBuffer = zip.toBuffer()

  const encodedFilename = encodeURIComponent(filename)
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${encodedFilename}"`)
  setResponseHeader(event, 'Content-Type', 'application/zip')
  setResponseHeader(event, 'Content-Length', zipBuffer.length.toString())
  
  return zipBuffer
})
