import { readdirSync, statSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const db = useDatabase()

  const storageBase = join(process.cwd(), 'server', 'storage')

  function getFilesFromDir(dirPath: string): { name: string; absPath: string }[] {
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

  // Pre-load references from DB
  const books = await db.prepare('SELECT id, cover_image FROM books').all() as any[]
  const articles = await db.prepare('SELECT id, raw_odt_path, presentation_path, presentation_path_ru, presentation_path_zh, html_content, html_content_ru, html_content_zh FROM articles').all() as any[]
  const terms = await db.prepare('SELECT id, image_url, video_url, presentation_path, presentation_path_ru, presentation_path_zh, definition, definition_ru, definition_zh FROM terms').all() as any[]
  const odmParts = await db.prepare('SELECT id, odt_storage_path, odt_storage_path_ru, odt_storage_path_zh FROM odm_project_parts').all() as any[]
  const odmProjects = await db.prepare('SELECT id, master_storage_path FROM odm_projects').all() as any[]
  const landingBlocks = await db.prepare('SELECT id, image_path, payload_json FROM landing_blocks').all() as any[]

  // Combine HTML and Definition text for quick searching
  const allTexts = [
    ...articles.map(a => `${a.html_content || ''} ${a.html_content_ru || ''} ${a.html_content_zh || ''}`),
    ...terms.map(t => `${t.definition || ''} ${t.definition_ru || ''} ${t.definition_zh || ''}`)
  ].join(' ')

  const foldersToScan = [
    { dir: join(storageBase, 'uploads', 'covers'), group: 'covers' },
    { dir: join(storageBase, 'uploads', 'presentations'), group: 'presentations' },
    { dir: join(storageBase, 'uploads', 'articles'), group: 'articles' },
    { dir: join(storageBase, 'uploads', 'terms'), group: 'terms' },
    { dir: join(storageBase, 'odt'), group: 'odt' },
    { dir: join(storageBase, 'odm'), group: 'odm' },
    { dir: join(storageBase, 'uploads', 'landing'), group: 'landing' },
    { dir: join(storageBase, 'uploads', 'preview'), group: 'preview' }
  ]

  let deletedCount = 0
  let freedSize = 0

  for (const scan of foldersToScan) {
    const list = getFilesFromDir(scan.dir)
    for (const f of list) {
      const stats = statSync(f.absPath)
      const name = f.name
      let isUsed = false

      if (scan.group === 'covers') {
        isUsed = books.some(b => b.cover_image && b.cover_image.includes(name))
      } else if (scan.group === 'presentations') {
        isUsed = articles.some(a => 
          (a.presentation_path && a.presentation_path.includes(name)) ||
          (a.presentation_path_ru && a.presentation_path_ru.includes(name)) ||
          (a.presentation_path_zh && a.presentation_path_zh.includes(name))
        ) || terms.some(t => 
          (t.presentation_path && t.presentation_path.includes(name)) ||
          (t.presentation_path_ru && t.presentation_path_ru.includes(name)) ||
          (t.presentation_path_zh && t.presentation_path_zh.includes(name))
        )
      } else if (scan.group === 'articles') {
        isUsed = allTexts.includes(name)
        if (!isUsed) {
          const rev = await db.prepare('SELECT id FROM article_revisions WHERE html_content LIKE ? LIMIT 1').get(`%${name}%`)
          if (rev) isUsed = true
        }
      } else if (scan.group === 'terms') {
        isUsed = allTexts.includes(name) || terms.some(t => 
          (t.image_url && t.image_url.includes(name)) ||
          (t.video_url && t.video_url.includes(name))
        )
      } else if (scan.group === 'landing') {
        isUsed = landingBlocks.some(lb => 
          (lb.image_path && lb.image_path.includes(name)) ||
          (lb.payload_json && lb.payload_json.includes(name))
        )
      } else if (scan.group === 'odt') {
        isUsed = odmParts.some(p => 
          (p.odt_storage_path && p.odt_storage_path.includes(name)) ||
          (p.odt_storage_path_ru && p.odt_storage_path_ru.includes(name)) ||
          (p.odt_storage_path_zh && p.odt_storage_path_zh.includes(name))
        ) || articles.some(a => a.raw_odt_path && a.raw_odt_path.includes(name))
      } else if (scan.group === 'odm') {
        isUsed = odmProjects.some(pr => pr.master_storage_path && pr.master_storage_path.includes(name))
      }

      if (!isUsed) {
        try {
          unlinkSync(f.absPath)
          deletedCount++
          freedSize += stats.size
        } catch {
          // ignore
        }
      }
    }
  }

  return {
    ok: true,
    message: `Успешно удалено неиспользуемых файлов: ${deletedCount}`,
    deletedCount,
    freedSize
  }
})
