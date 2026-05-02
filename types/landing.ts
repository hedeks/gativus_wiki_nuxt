export type LandingBlockType =
  | 'hero'
  | 'card_row'
  | 'richtext'
  | 'link_grid'
  | 'cta'
  | 'about'

export interface LandingCtaPayload {
  label_en: string
  label_ru?: string
  label_zh?: string
  href: string
  icon?: string
  color?: 'sky' | 'gray'
  variant?: 'solid' | 'outline'
}

export interface LandingCardPayload {
  badge?: string
  title_en: string
  title_ru?: string
  title_zh?: string
  desc_en: string
  desc_ru?: string
  desc_zh?: string
  image?: string
  href: string
}

export interface LandingLinkPayload {
  label_en: string
  label_ru?: string
  label_zh?: string
  desc_en: string
  desc_ru?: string
  desc_zh?: string
  icon: string
  href: string
  accent: string
}

export interface LandingButtonPayload {
  label_en: string
  label_ru?: string
  label_zh?: string
  href: string
  icon?: string
  color?: 'sky' | 'gray'
  variant?: 'solid' | 'outline'
}

export interface LandingBlockPayload {
  ctas?: LandingCtaPayload[]
  cards?: LandingCardPayload[]
  links?: LandingLinkPayload[]
  buttons?: LandingButtonPayload[]
  // Architecture preset fields
  gtom?: any
  gnet?: any
  gate?: any
  nddi?: any
}

/** Публичная форма после разрешения локали */
export interface LandingBlockResolved {
  id: number
  sortOrder: number
  blockType: LandingBlockType
  anchorId: string | null
  neuronLabel: string | null
  kicker: string | null
  title: string | null
  subtitle: string | null
  body: string | null
  footnote: string | null
  imagePath: string | null
  payload: LandingBlockPayload
}

export interface LandingBlockRow {
  id: number
  sort_order: number
  is_published: number
  block_type: string
  anchor_id: string | null
  neuron_label_en: string | null
  neuron_label_ru: string | null
  neuron_label_zh: string | null
  kicker_en: string | null
  kicker_ru: string | null
  kicker_zh: string | null
  title_en: string | null
  title_ru: string | null
  title_zh: string | null
  subtitle_en: string | null
  subtitle_ru: string | null
  subtitle_zh: string | null
  body_en: string | null
  body_ru: string | null
  body_zh: string | null
  footnote_en: string | null
  footnote_ru: string | null
  footnote_zh: string | null
  image_path: string | null
  payload_json: string | null
}
