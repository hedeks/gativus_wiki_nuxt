/**
 * Одна точка INSERT для landing_blocks — те же 24 поля и те же правила, что в POST /api/admin/landing.
 * better-sqlite3: без undefined в bind; опциональные строки через opt().
 */
import type { Database } from 'db0'

export const LANDING_BLOCK_INSERT = `
INSERT INTO landing_blocks (
  sort_order, is_published, block_type, anchor_id,
  neuron_label_en, neuron_label_ru, neuron_label_zh,
  kicker_en, kicker_ru, kicker_zh,
  title_en, title_ru, title_zh,
  subtitle_en, subtitle_ru, subtitle_zh,
  body_en, body_ru, body_zh,
  footnote_en, footnote_ru, footnote_zh,
  image_path, payload_json
) VALUES (
  ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
)
`

export function optLandingField(v: unknown): string | null {
  if (v == null || v === '')
    return null
  return String(v)
}

/** Кортеж из 24 элементов в порядке колонок; 4–22 пройдут через opt, 23 — payload_json строкой. */
export function bindLandingBlockInsertParams(tuple: readonly unknown[]): (string | number | null)[] {
  if (tuple.length !== 24)
    throw new Error(`landing_blocks INSERT: ожидается 24 значения, передано ${tuple.length}`)

  const sort = Number(tuple[0])
  const isPublished = Number(tuple[1])
  const blockType = String(tuple[2])
  const anchorRaw = tuple[3]
  const anchorId = anchorRaw != null && anchorRaw !== '' ? String(anchorRaw) : null
  const textCols = tuple.slice(4, 23).map(optLandingField)
  const payload = tuple[23]
  const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {})

  return [sort, isPublished, blockType, anchorId, ...textCols, payloadJson]
}

export async function runLandingBlockInsert(db: Database, tuple: readonly unknown[]) {
  const params = bindLandingBlockInsertParams(tuple)
  await db.prepare(LANDING_BLOCK_INSERT).run(...params)
}
