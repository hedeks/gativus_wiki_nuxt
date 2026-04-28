import { readdirSync, statSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { requireRole } from '~/server/utils/requireRole'

export default defineEventHandler(async (event) => {
  // Require editor role or higher
  requireRole(event, 'editor')

  const storageBaseDir = join(process.cwd(), 'server', 'storage', 'uploads')
  const categories = ['covers', 'terms', 'articles']
  const files: { url: string; filename: string; category: string; size: number; type: string; created_at: Date }[] = []

  if (!existsSync(storageBaseDir)) {
    return { items: [] }
  }

  for (const category of categories) {
    const categoryDir = join(storageBaseDir, category)
    if (existsSync(categoryDir)) {
      const dirFiles = readdirSync(categoryDir)
      for (const file of dirFiles) {
        const filePath = join(categoryDir, file)
        const stats = statSync(filePath)
        if (stats.isFile()) {
          const ext = extname(file).toLowerCase()
          let type = 'unknown'
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) type = 'image'
          else if (['.mp4', '.webm', '.ogg'].includes(ext)) type = 'video'
          else if (['.pdf'].includes(ext)) type = 'document'
          
          files.push({
            url: `/api/uploads/${category}/${file}`,
            filename: file,
            category,
            size: stats.size,
            type,
            created_at: stats.birthtime
          })
        }
      }
    }
  }

  // Sort by newest first
  files.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())

  return { items: files }
})
