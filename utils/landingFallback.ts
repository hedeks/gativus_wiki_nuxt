import type { LandingBlockPayload, LandingBlockResolved } from '~/types/landing'
import { landingUiForLang } from './landingUiDict'

/**
 * Client-side mirror of seed landing rows when API returns no blocks.
 */
export function buildFallbackLandingBlocks(lang: string): LandingBlockResolved[] {
  const t = landingUiForLang(lang)

  const heroPayload: LandingBlockPayload = {
    ctas: [
      {
        label_en: t.ctaAbout,
        href: '/#about-detail',
        icon: 'i-heroicons-sparkles',
        color: 'sky',
        variant: 'solid',
      },
      {
        label_en: t.ctaBooks,
        href: '/books',
        icon: 'i-heroicons-book-open',
        color: 'gray',
        variant: 'outline',
      },
    ],
  }

  const cardPayload: LandingBlockPayload = {
    cards: [
      {
        badge: 'GTOM',
        title_en: t.wtgGtomTitle,
        desc_en: t.wtgGtomDesc,
        image: '/images/logo.png',
        href: '/#about-gtom',
      },
      {
        badge: 'GNET',
        title_en: t.wtgGnetTitle,
        desc_en: t.wtgGnetDesc,
        image: '/images/gnet-second-view.png',
        href: '/#about-gnet',
      },
      {
        badge: 'GATE',
        title_en: t.wtgGateTitle,
        desc_en: t.wtgGateDesc,
        image: '/images/gate.png',
        href: '/#about-gate',
      },
    ],
  }

  const linkPayload: LandingBlockPayload = {
    links: [
      {
        label_en: t.wikiBooks,
        desc_en: t.wikiBooksDesc,
        icon: 'i-heroicons-book-open',
        href: '/books',
        accent: 'book',
      },
      {
        label_en: t.wikiArticles,
        desc_en: t.wikiArticlesDesc,
        icon: 'i-heroicons-document-text',
        href: '/articles',
        accent: 'article',
      },
      {
        label_en: t.wikiGlossary,
        desc_en: t.wikiGlossaryDesc,
        icon: 'i-heroicons-bookmark-square',
        href: '/glossary',
        accent: 'term',
      },
      {
        label_en: t.wikiGraph,
        desc_en: t.wikiGraphDesc,
        icon: 'i-heroicons-share',
        href: '/knowledge-graph',
        accent: 'graph',
      },
    ],
  }

  const ctaPayload: LandingBlockPayload = {
    buttons: [
      { label_en: t.ctaArticles, href: '/articles', icon: 'i-heroicons-document-text', color: 'sky', variant: 'solid' },
      { label_en: t.ctaGlossary, href: '/glossary', icon: 'i-heroicons-bookmark-square', color: 'gray', variant: 'outline' },
      { label_en: t.wikiGraph, href: '/knowledge-graph', icon: 'i-heroicons-share', color: 'gray', variant: 'outline' },
      { label_en: 'info@gativus.com', href: 'mailto:info@gativus.com', icon: 'i-heroicons-envelope', color: 'gray', variant: 'outline' },
    ],
  }

  const rows: LandingBlockResolved[] = [
    {
      id: -1,
      sortOrder: 0,
      blockType: 'hero',
      anchorId: 'home-hero',
      neuronLabel: t.neuronHero,
      kicker: t.heroEyebrow,
      title: t.heroBrand,
      subtitle: t.heroTagline,
      body: t.heroLede,
      footnote: null,
      imagePath: '/images/121px-Logo.jpg',
      payload: heroPayload,
    },
    {
      id: -2,
      sortOrder: 1,
      blockType: 'card_row',
      anchorId: 'home-pillars',
      neuronLabel: t.neuronPillars,
      kicker: t.kickerPillars,
      title: t.pillarsTitle,
      subtitle: null,
      body: null,
      footnote: null,
      imagePath: null,
      payload: cardPayload,
    },
    {
      id: -3,
      sortOrder: 2,
      blockType: 'richtext',
      anchorId: 'home-manifest',
      neuronLabel: t.neuronManifest,
      kicker: t.kickerProject,
      title: t.manifestTitle,
      subtitle: null,
      body: t.manifestBody,
      footnote: t.wikiHint,
      imagePath: null,
      payload: {},
    },
    {
      id: -4,
      sortOrder: 3,
      blockType: 'about',
      anchorId: 'home-about',
      neuronLabel: t.neuronAbout,
      kicker: null,
      title: null,
      subtitle: null,
      body: null,
      footnote: null,
      imagePath: null,
      payload: {},
    },
    {
      id: -5,
      sortOrder: 4,
      blockType: 'link_grid',
      anchorId: 'home-wiki',
      neuronLabel: t.neuronWiki,
      kicker: t.kickerWiki,
      title: t.wikiTitle,
      subtitle: null,
      body: t.wikiSub,
      footnote: null,
      imagePath: null,
      payload: linkPayload,
    },
    {
      id: -6,
      sortOrder: 5,
      blockType: 'cta',
      anchorId: 'home-cta',
      neuronLabel: t.neuronCta,
      kicker: null,
      title: t.ctaClosingTitle,
      subtitle: null,
      body: t.ctaClosingText,
      footnote: null,
      imagePath: null,
      payload: ctaPayload,
    },
  ]

  return rows
}
