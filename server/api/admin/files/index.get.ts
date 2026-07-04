import { readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { requireRole } from '~/server/utils/requireRole'

interface FileItem {
  name: string
  path: string // relative to server/storage/
  url: string | null
  size: number
  mtime: string
  group: 'covers' | 'presentations' | 'articles' | 'terms' | 'odt' | 'odm' | 'preview' | 'landing' | 'other'
  isOrphaned: boolean
  referencedEntity: {
    type: 'book' | 'article' | 'term' | 'odm_project' | 'odm_part' | 'landing_block'
    name: string
    id: number | string
  } | null
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  const storageBase = join(process.cwd(), 'server', 'storage')

  // Helper to list files recursively or single-level
  function getFilesFromDir(dirPath: string, group: FileItem['group']): { name: string; absPath: string }[] {
    if (!existsSync(dirPath)) return []
    try {
      const files = readdirSync(dirPath)
      return files
        .map(f => ({ name: f, absPath: join(dirPath, f) }))
        .filter(x => statSync(x.absPath).isFile())
    } catch {
      return []
    }
  }

  // Pre-load reference maps from DB
  const books = await db.prepare('SELECT id, slug, title, cover_image FROM books').all() as any[]
  const articles = await db.prepare('SELECT id, slug, title, raw_odt_path, presentation_path, presentation_path_ru, presentation_path_zh, html_content, html_content_ru, html_content_zh, book_id FROM articles').all() as any[]
  const terms = await db.prepare('SELECT id, slug, title, image_url, video_url, presentation_path, presentation_path_ru, presentation_path_zh, definition, definition_ru, definition_zh FROM terms').all() as any[]
  const odmParts = await db.prepare('SELECT id, project_id, sort_order, display_title, odt_storage_path, odt_storage_path_ru, odt_storage_path_zh FROM odm_project_parts').all() as any[]
  const odmProjects = await db.prepare('SELECT id, book_id, master_storage_path FROM odm_projects').all() as any[]
  const landingBlocks = await db.prepare('SELECT id, title_en, image_path, payload_json FROM landing_blocks').all() as any[]

  // Build lookup helpers
  const booksMap = new Map<number, any>(books.map(b => [Number(b.id), b]))
  const articleHtmlMap = articles.map(a => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    html: `${a.html_content || ''} ${a.html_content_ru || ''} ${a.html_content_zh || ''}`
  }))
  const termDefMap = terms.map(t => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    def: `${t.definition || ''} ${t.definition_ru || ''} ${t.definition_zh || ''}`,
    image_url: t.image_url,
    video_url: t.video_url
  }))

  const groupsToScan: { dir: string; group: FileItem['group'] }[] = [
    { dir: join(storageBase, 'uploads', 'covers'), group: 'covers' },
    { dir: join(storageBase, 'uploads', 'presentations'), group: 'presentations' },
    { dir: join(storageBase, 'uploads', 'articles'), group: 'articles' },
    { dir: join(storageBase, 'uploads', 'terms'), group: 'terms' },
    { dir: join(storageBase, 'odt'), group: 'odt' },
    { dir: join(storageBase, 'odm'), group: 'odm' },
    { dir: join(storageBase, 'uploads', 'landing'), group: 'landing' },
    { dir: join(storageBase, 'uploads', 'preview'), group: 'preview' }
  ]

  const items: FileItem[] = []

  for (const scan of groupsToScan) {
    const list = getFilesFromDir(scan.dir, scan.group)
    for (const f of list) {
      const stats = statSync(f.absPath)
      const relPath = f.absPath.substring(storageBase.length + 1).replace(/\\/g, '/')
      let url: string | null = null

      if (scan.group === 'covers' || scan.group === 'presentations' || scan.group === 'articles' || scan.group === 'terms' || scan.group === 'landing' || scan.group === 'preview') {
        url = `/api/uploads/${relPath.substring('uploads/'.length)}`
      }

      let referencedEntity: FileItem['referencedEntity'] = null

      // Check references by group
      if (scan.group === 'covers') {
        const matchingBook = books.find(b => b.cover_image && b.cover_image.includes(f.name))
        if (matchingBook) {
          referencedEntity = { type: 'book', name: matchingBook.title, id: matchingBook.slug }
        }
      } else if (scan.group === 'presentations') {
        const matchingArticle = articles.find(a => 
          (a.presentation_path && a.presentation_path.includes(f.name)) ||
          (a.presentation_path_ru && a.presentation_path_ru.includes(f.name)) ||
          (a.presentation_path_zh && a.presentation_path_zh.includes(f.name))
        )
        if (matchingArticle) {
          referencedEntity = { type: 'article', name: matchingArticle.title, id: matchingArticle.slug }
        } else {
          const matchingTerm = terms.find(t => 
            (t.presentation_path && t.presentation_path.includes(f.name)) ||
            (t.presentation_path_ru && t.presentation_path_ru.includes(f.name)) ||
            (t.presentation_path_zh && t.presentation_path_zh.includes(f.name))
          )
          if (matchingTerm) {
            referencedEntity = { type: 'term', name: matchingTerm.title, id: matchingTerm.slug }
          }
        }
      } else if (scan.group === 'articles') {
        const matchingArticle = articleHtmlMap.find(a => a.html.includes(f.name))
        if (matchingArticle) {
          referencedEntity = { type: 'article', name: matchingArticle.title, id: matchingArticle.slug }
        } else {
          // Проверяем старые ревизии статьи
          const rev = await db.prepare('SELECT article_id FROM article_revisions WHERE html_content LIKE ? LIMIT 1').get(`%${f.name}%`) as { article_id: number } | undefined
          if (rev) {
            const art = articles.find(a => Number(a.id) === Number(rev.article_id))
            const title = art ? art.title : `Статья #${rev.article_id}`
            const slugVal = art ? art.slug : rev.article_id
            referencedEntity = { type: 'article', name: `Ревизия статьи: ${title}`, id: slugVal }
          }
        }
      } else if (scan.group === 'terms') {
        const matchingTerm = termDefMap.find(t => 
          t.def.includes(f.name) || 
          (t.image_url && t.image_url.includes(f.name)) ||
          (t.video_url && t.video_url.includes(f.name))
        )
        if (matchingTerm) {
          referencedEntity = { type: 'term', name: matchingTerm.title, id: matchingTerm.slug }
        }
      } else if (scan.group === 'landing') {
        const matchingBlock = landingBlocks.find(lb => 
          (lb.image_path && lb.image_path.includes(f.name)) ||
          (lb.payload_json && lb.payload_json.includes(f.name))
        )
        if (matchingBlock) {
          referencedEntity = { 
            type: 'landing_block' as any, 
            name: `Блок лендинга: ${matchingBlock.title_en || 'Без названия'}`, 
            id: matchingBlock.id 
          }
        }
      } else if (scan.group === 'odt') {
        // ODT files can be linked to odm_project_parts or articles
        const matchingPart = odmParts.find(p => 
          (p.odt_storage_path && p.odt_storage_path.includes(f.name)) ||
          (p.odt_storage_path_ru && p.odt_storage_path_ru.includes(f.name)) ||
          (p.odt_storage_path_zh && p.odt_storage_path_zh.includes(f.name))
        )
        if (matchingPart) {
          const project = odmProjects.find(pr => pr.id === matchingPart.project_id)
          const book = project ? booksMap.get(project.book_id) : null
          const bookTitle = book ? book.title : `Проект ${matchingPart.project_id}`
          referencedEntity = { 
            type: 'odm_part', 
            name: `${bookTitle} — Глава ${matchingPart.sort_order} (${matchingPart.display_title || 'Без названия'})`, 
            id: matchingPart.id 
          }
        } else {
          const matchingArticle = articles.find(a => a.raw_odt_path && a.raw_odt_path.includes(f.name))
          if (matchingArticle) {
            referencedEntity = { type: 'article', name: matchingArticle.title, id: matchingArticle.slug }
          }
        }
      } else if (scan.group === 'odm') {
        const matchingProj = odmProjects.find(pr => pr.master_storage_path && pr.master_storage_path.includes(f.name))
        if (matchingProj) {
          const book = booksMap.get(matchingProj.book_id)
          const bookTitle = book ? book.title : `Проект ${matchingProj.id}`
          referencedEntity = { type: 'odm_project', name: `Скелет книги: ${bookTitle}`, id: matchingProj.id }
        }
      }

      items.push({
        name: f.name,
        path: relPath,
        url,
        size: stats.size,
        mtime: stats.mtime.toISOString(),
        group: scan.group,
        isOrphaned: referencedEntity === null,
        referencedEntity
      })
    }
  }

  // Sort items: newest first
  items.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())

  return {
    files: items,
    stats: {
      totalCount: items.length,
      totalSize: items.reduce((acc, x) => acc + x.size, 0),
      orphanedCount: items.filter(x => x.isOrphaned).length,
      orphanedSize: items.filter(x => x.isOrphaned).reduce((acc, x) => acc + x.size, 0)
    }
  }
})
