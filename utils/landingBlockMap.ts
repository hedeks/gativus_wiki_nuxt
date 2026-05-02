import type { Component } from 'vue'
import type { LandingBlockType } from '~/types/landing'
import LandingBlockHero from '~/components/landing/LandingBlockHero.vue'
import LandingBlockCardRow from '~/components/landing/LandingBlockCardRow.vue'
import LandingBlockRichtext from '~/components/landing/LandingBlockRichtext.vue'
import LandingBlockLinkGrid from '~/components/landing/LandingBlockLinkGrid.vue'
import LandingBlockCta from '~/components/landing/LandingBlockCta.vue'
import LandingBlockAbout from '~/components/landing/LandingBlockAbout.vue'

const MAP: Record<LandingBlockType, Component> = {
  hero: LandingBlockHero,
  card_row: LandingBlockCardRow,
  richtext: LandingBlockRichtext,
  link_grid: LandingBlockLinkGrid,
  cta: LandingBlockCta,
  about: LandingBlockAbout,
}

export function landingBlockComponent(type: string): Component {
  return MAP[type as LandingBlockType] ?? LandingBlockRichtext
}
