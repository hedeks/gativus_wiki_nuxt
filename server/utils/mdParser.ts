import AdmZip from 'adm-zip'
import MarkdownIt from 'markdown-it'
// @ts-ignore
import mk from 'markdown-it-katex'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, basename } from 'path'

export interface ParsedMarkdownResult {
  html: string
  title?: string
  excerpt?: string
  images: { originalPath: string; savedPath: string }[]
  missingImages: string[]
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function parseMarkdownBuffer(
  buffer: Buffer,
  filename: string,
  subDir: string = 'articles'
): ParsedMarkdownResult {
  let mdContent = ''
  let images: { originalPath: string; savedPath: string }[] = []

  const isZip = filename.toLowerCase().endsWith('.zip')

  if (isZip) {
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()
    
    // Find md file
    const mdEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.md'))
    if (!mdEntry) {
      throw new Error('ZIP-архив не содержит файла .md')
    }
    mdContent = mdEntry.getData().toString('utf-8')

    // Extract images
    const uploadDir = join(process.cwd(), 'server', 'storage', 'uploads', subDir)
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const lowerName = entry.entryName.toLowerCase()
      if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif') || lowerName.endsWith('.webp') || lowerName.endsWith('.svg')) {
        const savedName = `${Date.now()}-${basename(entry.entryName)}`
        const savePath = join(uploadDir, savedName)
        const data = entry.getData()
        writeFileSync(savePath, new Uint8Array(data.buffer, data.byteOffset, data.byteLength))
        
        const webPath = `/api/uploads/${subDir}/${savedName}`
        images.push({ originalPath: entry.entryName, savedPath: webPath })
        images.push({ originalPath: `./${entry.entryName}`, savedPath: webPath })
        images.push({ originalPath: basename(entry.entryName), savedPath: webPath })
      }
    }
  } else {
    // Simply MD file
    mdContent = buffer.toString('utf-8')
  }

  // Replace image paths in MD if we extracted them
  if (images.length > 0) {
    for (const img of images) {
      const regexMd = new RegExp(`\\]\\(${escapeRegExp(img.originalPath)}\\)`, 'g')
      mdContent = mdContent.replace(regexMd, `](${img.savedPath})`)
      
      const regexHtml = new RegExp(`src=["']${escapeRegExp(img.originalPath)}["']`, 'g')
      mdContent = mdContent.replace(regexHtml, `src="${img.savedPath}"`)
    }
  }

  const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true
  })
  
  md.use(mk)

  let title = ''
  let excerpt = ''
  
  const tokens = md.parse(mdContent, {})
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'heading_open' && t.tag === 'h1' && !title) {
      title = tokens[i+1]?.content || ''
    }

    // Сдвиг заголовков: h1 -> h2, h2 -> h3 и т.д.
    if (t.type === 'heading_open' || t.type === 'heading_close') {
      const level = parseInt(t.tag.substring(1), 10)
      if (!isNaN(level)) {
        const newLevel = Math.min(Math.max(level + 1, 2), 6)
        t.tag = `h${newLevel}`
      }
    }

    if (t.type === 'paragraph_open' && !excerpt && tokens[i+1]?.content) {
      const pText = tokens[i+1].content
      if (pText.length > 10) {
        excerpt = pText.substring(0, 150) + (pText.length > 150 ? '...' : '')
      }
    }
  }

  // Рендерим AST обратно в HTML
  let html = md.renderer.render(tokens, md.options, {})

  // Find missing images
  const missingImages: string[] = []
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1]
    if (src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/api/uploads/')) {
      if (!missingImages.includes(src)) {
        missingImages.push(src)
      }
    }
  }

  return {
    html,
    title,
    excerpt,
    images,
    missingImages
  }
}
