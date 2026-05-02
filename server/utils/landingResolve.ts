import type { LandingBlockPayload, LandingBlockResolved, LandingBlockRow } from '~/types/landing'

function pick<T extends string | null | undefined>(
  en: T,
  ru: T,
  zh: T,
  lang: string,
): string | null {
  if (lang === 'ru') return (ru ?? en ?? null) as string | null
  if (lang === 'zh') return (zh ?? en ?? null) as string | null
  return (en ?? null) as string | null
}

export function parseLandingPayload(raw: string | null | undefined): LandingBlockPayload {
  if (!raw || !raw.trim()) return {}
  try {
    return JSON.parse(raw) as LandingBlockPayload
  } catch {
    return {}
  }
}

export function resolveLandingRow(row: LandingBlockRow, lang: string): LandingBlockResolved {
  let blockType = row.block_type as LandingBlockResolved['blockType']
  // Backward compatibility
  if (blockType === 'preset_about_detail' as any) {
    blockType = 'about'
  }

  return {
    id: row.id,
    sortOrder: row.sort_order,
    blockType,
    anchorId: row.anchor_id,
    neuronLabel: pick(row.neuron_label_en, row.neuron_label_ru, row.neuron_label_zh, lang),
    kicker: pick(row.kicker_en, row.kicker_ru, row.kicker_zh, lang),
    title: pick(row.title_en, row.title_ru, row.title_zh, lang),
    subtitle: pick(row.subtitle_en, row.subtitle_ru, row.subtitle_zh, lang),
    body: pick(row.body_en, row.body_ru, row.body_zh, lang),
    footnote: pick(row.footnote_en, row.footnote_ru, row.footnote_zh, lang),
    imagePath: row.image_path,
    payload: parseLandingPayload(row.payload_json),
  }
}

export function resolveLandingPayloadStrings<T extends Record<string, unknown>>(
  obj: T | undefined,
  lang: string,
  enKey: string,
): string {
  if (!obj) return ''
  const b = obj as Record<string, string | undefined>
  if (lang === 'ru') return b[`${enKey}_ru`] ?? b[enKey] ?? ''
  if (lang === 'zh') return b[`${enKey}_zh`] ?? b[enKey] ?? ''
  return b[enKey] ?? ''
}
