import type { LandingBlockRow } from '~/types/landing'

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id))
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDatabase()
  const body = await readBody<Record<string, unknown>>(event)

  const payloadStr = body.payload_json !== undefined
    ? (typeof body.payload_json === 'string' ? body.payload_json : JSON.stringify(body.payload_json ?? {}))
    : undefined

  const fields: string[] = []
  const vals: unknown[] = []

  const set = (col: string, v: unknown) => {
    if (v !== undefined) {
      fields.push(`${col} = ?`)
      vals.push(normalizeVal(v, col))
    }
  }

  set('sort_order', body.sort_order)
  set('is_published', body.is_published === undefined ? undefined : (body.is_published === false || body.is_published === 0 ? 0 : 1))
  set('block_type', body.block_type)
  set('anchor_id', body.anchor_id)
  set('neuron_label_en', body.neuron_label_en)
  set('neuron_label_ru', body.neuron_label_ru)
  set('neuron_label_zh', body.neuron_label_zh)
  set('kicker_en', body.kicker_en)
  set('kicker_ru', body.kicker_ru)
  set('kicker_zh', body.kicker_zh)
  set('title_en', body.title_en)
  set('title_ru', body.title_ru)
  set('title_zh', body.title_zh)
  set('subtitle_en', body.subtitle_en)
  set('subtitle_ru', body.subtitle_ru)
  set('subtitle_zh', body.subtitle_zh)
  set('body_en', body.body_en)
  set('body_ru', body.body_ru)
  set('body_zh', body.body_zh)
  set('footnote_en', body.footnote_en)
  set('footnote_ru', body.footnote_ru)
  set('footnote_zh', body.footnote_zh)
  set('image_path', body.image_path)
  if (payloadStr !== undefined) {
    fields.push('payload_json = ?')
    vals.push(payloadStr)
  }

  if (!fields.length)
    throw createError({ statusCode: 400, statusMessage: 'Нет полей для обновления' })

  fields.push(`updated_at = datetime('now')`)
  vals.push(id)

  await db.prepare(`
    UPDATE landing_blocks SET ${fields.join(', ')} WHERE id = ?
  `).run(...vals as (string | number | null)[])

  const row = await db.prepare('SELECT * FROM landing_blocks WHERE id = ?').get(id) as LandingBlockRow | undefined
  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Блок не найден' })
  return row
})

function normalizeVal(v: unknown, col: string): unknown {
  if (v === '') return null
  if (col === 'sort_order' || col === 'is_published')
    return Number(v)
  return v
}
