import type { LandingBlockRow, LandingBlockType } from '~/types/landing'
import { runLandingBlockInsert } from '../../../utils/landingInsertRow'

const ALLOWED: LandingBlockType[] = [
  'hero', 'card_row', 'richtext', 'link_grid', 'cta', 'about',
]

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()
  const body = await readBody<Record<string, unknown>>(event)

  const blockType = String(body.block_type || 'richtext') as LandingBlockType
  if (!ALLOWED.includes(blockType))
    throw createError({ statusCode: 400, statusMessage: 'Недопустимый block_type' })

  const maxRow = await db.prepare('SELECT MAX(sort_order) as m FROM landing_blocks').get() as { m: number | null }
  const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : Number(maxRow?.m ?? -1) + 1

  const payloadStr = typeof body.payload_json === 'string'
    ? body.payload_json
    : JSON.stringify(body.payload_json ?? {})

  await runLandingBlockInsert(db, [
    sortOrder,
    body.is_published === false || body.is_published === 0 ? 0 : 1,
    blockType,
    body.anchor_id != null ? String(body.anchor_id) : null,
    body.neuron_label_en, body.neuron_label_ru, body.neuron_label_zh,
    body.kicker_en, body.kicker_ru, body.kicker_zh,
    body.title_en, body.title_ru, body.title_zh,
    body.subtitle_en, body.subtitle_ru, body.subtitle_zh,
    body.body_en, body.body_ru, body.body_zh,
    body.footnote_en, body.footnote_ru, body.footnote_zh,
    body.image_path,
    payloadStr,
  ])

  const ins = await db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }
  const row = await db.prepare('SELECT * FROM landing_blocks WHERE id = ?').get(ins.id) as LandingBlockRow
  return row
})
