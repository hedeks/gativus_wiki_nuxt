import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { requireRole } from '~/server/utils/requireRole'

function resolveUploadUrlToPath(url: string | null | undefined): string | null {
  if (!url) return null
  const prefix = '/api/uploads/'
  if (url.startsWith(prefix)) {
    const relative = url.substring(prefix.length)
    return join(process.cwd(), 'server', 'storage', 'uploads', relative)
  }
  if (url.includes('server/storage/') || url.includes('server\\storage\\')) {
    const parts = url.split(/server[/\\]storage[/\\]/)
    if (parts.length > 1) {
      return join(process.cwd(), 'server', 'storage', parts[1])
    }
  }
  return null
}

function safeUnlink(urlOrPath: string | null | undefined) {
  if (!urlOrPath) return
  let path = urlOrPath
  if (urlOrPath.startsWith('/api/uploads/') || urlOrPath.includes('server/storage/') || urlOrPath.includes('server\\storage\\')) {
    const resolved = resolveUploadUrlToPath(urlOrPath)
    if (resolved) path = resolved
  }
  try {
    if (existsSync(path)) {
      unlinkSync(path)
    }
  } catch { /* ignore */ }
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const db = useDatabase()

  // Находим блок перед удалением и очищаем связанные файлы
  const block = await db.prepare('SELECT image_path, payload_json FROM landing_blocks WHERE id = ?').get(id) as any
  if (block) {
    safeUnlink(block.image_path)
    if (block.payload_json) {
      try {
        const payload = JSON.parse(block.payload_json)
        // Если в payload_json есть другие картинки или пути, тоже удаляем их
        if (payload.image_path) safeUnlink(payload.image_path)
        if (payload.imageUrl) safeUnlink(payload.imageUrl)
      } catch { /* ignore */ }
    }
  }

  await db.prepare('DELETE FROM landing_blocks WHERE id = ?').run(id)
  return { ok: true }
})
