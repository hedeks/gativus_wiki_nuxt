<template>
  <div ref="landingRef" class="home gv-page">
    <HomeScrollBackdrop v-if="!reducedMotion" :focus-index="activeFocusBlock" />

    <div class="home-stack">
      <!-- Hero -->
      <section
        id="home-block-0"
        data-home-block="0"
        class="home-section"
        :class="blockAnimClass(0)"
      >
        <div class="home-surface gv-surface-card home-surface--hero home-anim-target">
          <div class="home-hero-top">
            <img src="/images/121px-Logo.jpg" alt="" class="home-hero-logo" width="96" height="96">
            <div>
              <p class="home-eyebrow">{{ t.heroEyebrow }}</p>
              <h1 class="home-title gv-hero-gradient">{{ t.heroBrand }}</h1>
              <p class="home-tagline">{{ t.heroTagline }}</p>
            </div>
          </div>
          <p class="home-lede">{{ t.heroLede }}</p>
          <div class="home-actions">
            <GvButton to="/about" color="sky" variant="solid" size="md" icon="i-heroicons-sparkles">
              {{ t.ctaAbout }}
            </GvButton>
            <GvButton to="/books" variant="outline" color="gray" size="md" icon="i-heroicons-book-open">
              {{ t.ctaBooks }}
            </GvButton>
          </div>
        </div>
      </section>

      <!-- Pillars -->
      <section
        id="home-block-1"
        data-home-block="1"
        class="home-section"
        :class="blockAnimClass(1)"
      >
        <div class="home-anim-target">
          <p class="home-kicker">{{ t.kickerPillars }}</p>
          <h2 class="home-h2">{{ t.pillarsTitle }}</h2>
          <div class="home-pillar-row">
          <NuxtLink
            v-for="card in wtgCards"
            :key="card.badge"
            :to="card.to"
            class="home-pillar-card gv-surface-card gv-focusable"
            :class="{ 'is-hovered': hoveredWtg === card.badge }"
            @mouseenter="hoveredWtg = card.badge"
            @mouseleave="hoveredWtg = null"
          >
            <div class="home-pillar-media">
              <img
                :src="card.image"
                :alt="card.badge"
                class="home-pillar-img"
                width="160"
                height="88"
                loading="lazy"
                decoding="async"
              >
            </div>
            <span class="home-pillar-badge">{{ card.badge }}</span>
            <h3 class="home-pillar-title">{{ card.title }}</h3>
            <p class="home-pillar-desc">{{ card.desc }}</p>
          </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Manifest -->
      <section
        id="home-block-2"
        data-home-block="2"
        class="home-section"
        :class="blockAnimClass(2)"
      >
        <article class="home-manifest gv-surface-card home-anim-target">
          <header class="gv-card-header home-manifest-head">
            <span class="home-eyebrow">{{ t.kickerProject }}</span>
            <h2 class="home-manifest-title">{{ t.manifestTitle }}</h2>
          </header>
          <div class="home-manifest-body">
            <p class="home-manifest-text">{{ t.manifestBody }}</p>
            <p class="home-manifest-note">{{ t.wikiHint }}</p>
          </div>
        </article>
      </section>

      <!-- Knowledge system -->
      <section
        id="home-block-3"
        data-home-block="3"
        class="home-section"
        :class="blockAnimClass(3)"
      >
        <div class="home-anim-target">
          <p class="home-kicker">{{ t.kickerWiki }}</p>
          <h2 class="home-h2">{{ t.wikiTitle }}</h2>
          <p class="home-sub">{{ t.wikiSub }}</p>
          <div class="home-wiki-grid">
          <NuxtLink
            v-for="item in wikiLinks"
            :key="item.to"
            :to="item.to"
            class="home-wiki gv-surface-card gv-focusable"
            :data-accent="item.accent"
          >
            <UIcon :name="item.icon" class="home-wiki-ic size-6" />
            <div class="min-w-0">
              <span class="home-wiki-label">{{ item.label }}</span>
              <span class="home-wiki-desc">{{ item.desc }}</span>
            </div>
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="home-wiki-arr size-5 shrink-0" />
          </NuxtLink>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section
        id="home-block-4"
        data-home-block="4"
        class="home-section home-section--tail"
        :class="blockAnimClass(4)"
      >
        <div class="home-cta gv-surface-card home-anim-target">
          <h2 class="home-cta-title">{{ t.ctaClosingTitle }}</h2>
          <p class="home-cta-text">{{ t.ctaClosingText }}</p>
          <div class="home-cta-actions">
            <GvButton to="/articles" color="sky" variant="solid" size="md" icon="i-heroicons-document-text">
              {{ t.ctaArticles }}
            </GvButton>
            <GvButton to="/glossary" variant="outline" color="gray" size="md" icon="i-heroicons-bookmark-square">
              {{ t.ctaGlossary }}
            </GvButton>
            <GvButton to="/knowledge-graph" variant="outline" color="gray" size="md" icon="i-heroicons-share">
              {{ t.wikiGraph }}
            </GvButton>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const BLOCK_COUNT = 5

const langStore = useLanguageStore()
const landingRef = ref<HTMLElement | null>(null)
/** true = пересекает корневую зону наблюдения, false = вне зоны (после первого срабатывания IO) */
const seen = reactive<boolean[]>(Array.from({ length: BLOCK_COUNT }, () => false))
const inBand = reactive<boolean[]>(Array.from({ length: BLOCK_COUNT }, () => false))
const ratioSnap = reactive<number[]>(Array.from({ length: BLOCK_COUNT }, () => 0))
const activeFocusBlock = ref(0)
const reducedMotion = ref(false)
const hoveredWtg = ref<string | null>(null)
const ioInitialized = ref(false)

let io: IntersectionObserver | null = null

function blockAnimClass(i: number) {
  if (!ioInitialized.value) return 'home-section--idle'
  if (!seen[i]) return 'home-section--idle'
  return inBand[i] ? 'home-section--enter' : 'home-section--leave'
}

const uiDict: Record<string, Record<string, any>> = {
  en: {
    heroBrand: 'GATIVUS',
    heroEyebrow: 'The GATIVUS project',
    heroTagline: 'GTOM · GNET · GATE',
    heroLede:
      'The GATIVUS project consists of three fundamental and inextricably linked subsystems, realizing the transition from abstract theory to network protocol and physical hardware.',
    wikiHint:
      'Within GTOM, consciousness is modeled as a hyper-map consisting of 11 layers of elementary maps (ranging from sensory inputs to quality processing structures). Each map is a neural construct.',
    ctaAbout: 'About',
    ctaBooks: 'Books',
    kickerProject: 'The GATIVUS project',
    manifestTitle: 'From abstract theory to network protocol and physical hardware',
    manifestBody:
      'GTOM addresses the phenomenon of consciousness not as a monolithic structure, but as a dynamic superposition of three independent levels (components). Within GTOM, consciousness is modeled as a hyper-map consisting of 11 layers of elementary maps (ranging from sensory inputs to quality processing structures). Each map is a neural construct. The theory rigorously dictates that full consciousness has a technical, computable nature and can be fully realized through hardware. The principles defined in GTOM are utilized to design a physical, distributed network based on existing technologies and infrastructure, yet endowing them with a new logic of coherence. The foundation of GNET is the existing IPv6 infrastructure. It provides unique global addressing, over which protocol extensions are implemented without violating current RFC standards. GATE is the physical device engineered for the storage, execution, and protection of neural network nodes. It is built upon modern computer architectures and provides horizontal scaling capabilities to aggregate the massive number of artificial neurons required.',
    kickerPillars: 'Three fundamental and inextricably linked subsystems',
    pillarsTitle: 'GTOM · GNET · GATE',
    kickerWiki:
      'The principles defined in GTOM are utilized to design a physical, distributed network',
    wikiTitle:
      'The Gativus consciousness network is conceptualized as a dynamic set of:',
    wikiSub:
      'Nodes: Network digital entities hosted on specialized edge devices (GATE). Virtual Links (Synapses): Connections executed and maintained via global Internet routing.',
    wikiBooks: 'Books',
    wikiBooksDesc:
      'Each digital entity is a flexible container of functions that model individual artificial neurons, cortical columns, and more complex hierarchical groups.',
    wikiArticles: 'Articles',
    wikiArticlesDesc:
      'Each digital entity is a flexible container of functions that model individual artificial neurons, cortical columns, and more complex hierarchical groups.',
    wikiGlossary: 'Glossary',
    wikiGlossaryDesc:
      'Managing interactions within a multidimensional space of concepts regarding surrounding objects and actions upon them.',
    wikiGraph: 'Network topology specification',
    wikiGraphDesc:
      'The network topology specification, describing the physical network structure in strict accordance with GTOM principles.',
    wikiAboutLink: 'About',
    wikiAboutDesc:
      'The foundational theory that defines the architecture and mechanics of consciousness.',
    ctaClosingTitle: 'Unified, distributed consciousness',
    ctaClosingText:
      'Any entity created according to the GNET specification automatically becomes an active node in the Gativus network, participating in the unified, distributed consciousness.',
    ctaArticles: 'Articles',
    ctaGlossary: 'Glossary',
    metaTitle:
      'GATIVUS — GTOM · GNET · GATE: abstract theory, network protocol, physical hardware',
    metaDesc:
      'The GATIVUS project consists of three fundamental and inextricably linked subsystems, realizing the transition from abstract theory to network protocol and physical hardware.',
    wtgGtomTitle: 'GTOM (Gativus Theory of Mind)',
    wtgGtomDesc:
      'The foundational theory that defines the architecture and mechanics of consciousness.',
    wtgGnetTitle: 'GNET (Gativus Network)',
    wtgGnetDesc:
      'The network topology specification, describing the physical network structure in strict accordance with GTOM principles.',
    wtgGateTitle: 'GATE (Gativus Edge Device)',
    wtgGateDesc:
      'The physical hardware and runtime environment designed to host the nodes of the GNET network.',
  },
  ru: {
    heroBrand: 'GATIVUS',
    heroEyebrow: 'Проект GATIVUS',
    heroTagline: 'GTOM · GNET · GATE',
    heroLede:
      'Проект GATIVUS состоит из трёх фундаментальных и неразрывно связанных подсистем, осуществляющих переход от абстрактной теории к сетевому протоколу и физическому оборудованию.',
    wikiHint:
      'В рамках GTOM сознание моделируется как гипер-карта, состоящая из 11 слоёв элементарных карт (от сенсорных входов до структур качественной обработки). Каждая карта — нейральная конструкт.',
    ctaAbout: 'О проекте',
    ctaBooks: 'Книги',
    kickerProject: 'Проект GATIVUS',
    manifestTitle:
      'От абстрактной теории к сетевому протоколу и физическому оборудованию',
    manifestBody:
      'GTOM рассматривает феномен сознания не как монолитную структуру, а как динамическую суперпозицию трёх независимых уровней (компонентов). В рамках GTOM сознание моделируется как гипер-карта, состоящая из 11 слоёв элементарных карт (от сенсорных входов до структур качественной обработки). Каждая карта — нейральная конструкт. Теория строго постулирует, что полное сознание имеет техническую, вычислимую природу и может быть полностью реализовано аппаратно. Принципы, определённые в GTOM, используются для проектирования физической распределённой сети на базе существующих технологий и инфраструктуры, наделяя их при этом новой логикой связности. Основа GNET — существующая IPv6-инфраструктура. Она обеспечивает уникальную глобальную адресацию, поверх которой реализуются расширения протокола без нарушения действующих стандартов RFC. GATE — это физическое устройство, предназначенное для хранения, исполнения и защиты узлов нейронных сетей. Оно построено на современных компьютерных архитектурах и обеспечивает возможности горизонтального масштабирования для объединения огромного числа искусственных нейронов, необходимого для системы.',
    kickerPillars: 'Три фундаментальные и неразрывно связанные подсистемы',
    pillarsTitle: 'GTOM · GNET · GATE',
    kickerWiki:
      'Принципы, определённые в GTOM, используются для проектирования физической распределённой сети',
    wikiTitle:
      'Сеть сознания Gativus концептуализируется как динамическое множество:',
    wikiSub:
      'Узлы (Nodes): сетевые цифровые сущности, размещённые на специализированных граничных устройствах (GATE). Виртуальные связи (синапсы): соединения, выполняемые и поддерживаемые через глобальную интернет-маршрутизацию.',
    wikiBooks: 'Книги',
    wikiBooksDesc:
      'Каждая цифровая сущность — гибкий контейнер функций, моделирующий отдельные искусственные нейроны, корковые столбы и более сложные иерархические группы.',
    wikiArticles: 'Статьи',
    wikiArticlesDesc:
      'Каждая цифровая сущность — гибкий контейнер функций, моделирующий отдельные искусственные нейроны, корковые столбы и более сложные иерархические группы.',
    wikiGlossary: 'Глоссарий',
    wikiGlossaryDesc:
      'Управление взаимодействиями в многомерном пространстве концепций касательно окружающих объектов и действий над ними.',
    wikiGraph: 'Спецификация топологии сети',
    wikiGraphDesc:
      'Спецификация топологии сети, описывающая физическую структуру сети строго в соответствии с принципами GTOM.',
    wikiAboutLink: 'О проекте',
    wikiAboutDesc:
      'Базовая теория, определяющая архитектуру и механику сознания.',
    ctaClosingTitle: 'Единое распределённое сознание',
    ctaClosingText:
      'Любая сущность, созданная по спецификации GNET, автоматически становится активным узлом в сети Gativus, участвующим в едином распределённом сознании.',
    ctaArticles: 'Статьи',
    ctaGlossary: 'Глоссарий',
    metaTitle:
      'GATIVUS — GTOM · GNET · GATE: абстрактная теория, сетевой протокол, физическое оборудование',
    metaDesc:
      'Проект GATIVUS состоит из трёх фундаментальных и неразрывно связанных подсистем, осуществляющих переход от абстрактной теории к сетевому протоколу и физическому оборудованию.',
    wtgGtomTitle: 'GTOM (Gativus Theory of Mind)',
    wtgGtomDesc:
      'Базовая теория, определяющая архитектуру и механику сознания.',
    wtgGnetTitle: 'GNET (Gativus Network)',
    wtgGnetDesc:
      'Спецификация топологии сети, описывающая физическую структуру сети строго в соответствии с принципами GTOM.',
    wtgGateTitle: 'GATE (Gativus Edge Device)',
    wtgGateDesc:
      'Физическое оборудование и среда исполнения, предназначенные для узлов сети GNET.',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const wtgCards = computed(() => [
  {
    badge: 'GTOM',
    title: t.value.wtgGtomTitle,
    desc: t.value.wtgGtomDesc,
    to: '/about',
    image: '/images/logo.png',
  },
  {
    badge: 'GNET',
    title: t.value.wtgGnetTitle,
    desc: t.value.wtgGnetDesc,
    to: '/about',
    image: '/images/gnet-second-view.png',
  },
  {
    badge: 'GATE',
    title: t.value.wtgGateTitle,
    desc: t.value.wtgGateDesc,
    to: '/about',
    image: '/images/gate.png',
  },
])

const wikiLinks = computed(() => [
  { to: '/books', label: t.value.wikiBooks, desc: t.value.wikiBooksDesc, icon: 'i-heroicons-book-open', accent: 'book' },
  { to: '/articles', label: t.value.wikiArticles, desc: t.value.wikiArticlesDesc, icon: 'i-heroicons-document-text', accent: 'article' },
  { to: '/glossary', label: t.value.wikiGlossary, desc: t.value.wikiGlossaryDesc, icon: 'i-heroicons-bookmark-square', accent: 'term' },
  { to: '/knowledge-graph', label: t.value.wikiGraph, desc: t.value.wikiGraphDesc, icon: 'i-heroicons-share', accent: 'graph' },
  { to: '/about', label: t.value.wikiAboutLink, desc: t.value.wikiAboutDesc, icon: 'i-heroicons-information-circle', accent: 'about' },
])

function applyIoEntries(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const raw = (entry.target as HTMLElement).dataset.homeBlock
    const idx = raw != null ? Number(raw) : NaN
    if (Number.isNaN(idx) || idx < 0 || idx >= BLOCK_COUNT) continue

    seen[idx] = true
    const nextIn = entry.isIntersecting
    if (inBand[idx] !== nextIn) inBand[idx] = nextIn

    const r = entry.isIntersecting ? entry.intersectionRatio : 0
    ratioSnap[idx] = r
  }

  let bestIdx = activeFocusBlock.value
  let bestRatio = -1
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const r = ratioSnap[i] ?? 0
    if (r > bestRatio) {
      bestRatio = r
      bestIdx = i
    }
  }
  if (bestRatio >= 0.04) activeFocusBlock.value = bestIdx
}

function bindObserver() {
  const root = landingRef.value
  if (!root) return
  io?.disconnect()
  io = new IntersectionObserver(applyIoEntries, {
    threshold: [0, 0.04, 0.11, 0.22, 0.38, 0.55, 0.72, 0.9],
    rootMargin: '-8% 0px -10% 0px',
  })
  root.querySelectorAll<HTMLElement>('[data-home-block]').forEach(el => io!.observe(el))
  ioInitialized.value = true
}

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  nextTick(bindObserver)
})

onUnmounted(() => {
  io?.disconnect()
  io = null
})

useSeoMeta({
  ogImage: '/favicon.ico',
  description: () => t.value.metaDesc,
  ogDescription: () => t.value.metaDesc,
  title: () => t.value.metaTitle,
})

useHead({
  htmlAttrs: { lang: () => langStore.currentLang },
  link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
})

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.home {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.25rem 1rem 3.5rem;
}

.home-stack {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(2.5rem, 5vw, 4rem);
}

.home-section {
  scroll-margin-top: calc(var(--header-height, 65px) + 0.6rem);
}

.home-section--idle .home-anim-target {
  opacity: 0;
  transform: translate3d(0, 2.25rem, 0) scale(0.98);
  filter: blur(5px);
}

.home-section--leave .home-anim-target {
  opacity: 0.22;
  transform: translate3d(0, 2.75rem, 0) scale(0.97);
  filter: blur(6px);
  transition:
    opacity 0.95s cubic-bezier(0.55, 0.06, 0.2, 0.97),
    transform 0.95s cubic-bezier(0.55, 0.06, 0.2, 0.97),
    filter 0.85s ease;
}

.home-section--enter .home-anim-target {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0);
  transition:
    opacity 1.05s cubic-bezier(0.16, 1, 0.3, 1),
    transform 1.05s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  .home-section--idle .home-anim-target,
  .home-section--leave .home-anim-target,
  .home-section--enter .home-anim-target {
    opacity: 1;
    transform: none;
    filter: none;
    transition: none;
  }
}

.home-surface--hero {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: clamp(1.35rem, 3vw, 2rem);
}

.home-pillar-row {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

@media (min-width: 880px) {
  .home-pillar-row {
    flex-direction: row;
    align-items: stretch;
  }
}

.home-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gv-primary);
}

.home-title {
  margin: 0.2rem 0 0;
  font-size: clamp(2rem, 5.4vw, 2.85rem);
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1.05;
}

.home-tagline {
  margin: 0.35rem 0 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.home-lede {
  margin: 1.15rem 0 0;
  font-size: 16px;
  line-height: 1.72;
  color: var(--gv-text-primary);
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.35rem;
}

.home-hero-top {
  display: flex;
  flex-wrap: wrap;
  gap: 1.1rem;
  align-items: center;
}

.home-hero-logo {
  border-radius: var(--gv-radius-control);
  box-shadow: var(--gv-shadow-sm);
}

.home-kicker {
  margin: 0 0 0.4rem;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gv-primary);
}

.home-h2 {
  margin: 0 0 1rem;
  font-size: clamp(1.35rem, 2.8vw, 1.75rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--gv-text-primary);
}

.home-sub {
  margin: 0 0 1.1rem;
  font-size: 15px;
  line-height: 1.65;
  color: var(--gv-text-secondary);
  max-width: 44rem;
}

.home-pillar-card {
  flex: 1;
  min-width: 0;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  border-radius: var(--gv-radius-container);
  transition: box-shadow 0.35s ease, border-color 0.35s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-pillar-card:hover,
.home-pillar-card.is-hovered {
  transform: translateY(-3px);
  box-shadow: var(--gv-shadow-md);
  border-color: color-mix(in srgb, var(--gv-primary) 32%, var(--gv-border-principal));
}

.home-pillar-media {
  height: 88px;
  border-radius: var(--gv-radius-control);
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.65rem;
  overflow: hidden;
  padding: 0.4rem 0.5rem;
}

.home-pillar-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.dark .home-pillar-img {
  filter: invert(1);
}

.home-pillar-badge {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--gv-primary);
}

.home-pillar-title {
  margin: 0.35rem 0 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--gv-text-primary);
}

.home-pillar-desc {
  margin: 0.35rem 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--gv-text-secondary);
}

.home-manifest {
  overflow: hidden;
}

.home-manifest-head {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
}

.home-manifest-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--gv-text-primary);
}

.home-manifest-body {
  padding: 1.35rem 1.35rem 1.5rem;
  background: color-mix(in srgb, var(--gv-surface-card) 88%, var(--gv-surface-header));
}

.home-manifest-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.75;
  color: var(--gv-text-primary);
}

.home-manifest-note {
  margin: 1rem 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
  font-style: italic;
}

.home-wiki-grid {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .home-wiki-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.home-wiki {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1.05rem;
  text-decoration: none;
  color: inherit;
  border-radius: var(--gv-radius-container);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.3s ease;
}

.home-wiki:hover {
  transform: translateY(-2px);
  box-shadow: var(--gv-shadow-md);
  border-color: color-mix(in srgb, var(--wiki-accent, var(--gv-primary)) 42%, var(--gv-border-principal));
}

.home-wiki[data-accent='book'] { --wiki-accent: #0ea5e9; }
.home-wiki[data-accent='article'] { --wiki-accent: #6366f1; }
.home-wiki[data-accent='term'] { --wiki-accent: #10b981; }
.home-wiki[data-accent='graph'] { --wiki-accent: #8b5cf6; }
.home-wiki[data-accent='about'] { --wiki-accent: var(--gv-text-secondary); }

.home-wiki-ic {
  color: var(--wiki-accent, var(--gv-primary));
}

.home-wiki-label {
  display: block;
  font-weight: 700;
  font-size: 15px;
  color: var(--gv-text-primary);
}

.home-wiki-desc {
  display: block;
  font-size: 13px;
  color: var(--gv-text-secondary);
}

.home-wiki-arr {
  margin-left: auto;
  color: var(--gv-text-secondary);
  opacity: 0.65;
}

.home-wiki:hover .home-wiki-arr {
  opacity: 1;
  color: var(--wiki-accent, var(--gv-primary));
}

.home-cta {
  text-align: center;
  padding: clamp(1.5rem, 4vw, 2.35rem);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--gv-primary) 8%, var(--gv-surface-card)) 0%,
    var(--gv-surface-card) 55%
  );
}

.home-cta-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.home-cta-text {
  margin: 0.65rem auto 0;
  max-width: 34rem;
  font-size: 15px;
  line-height: 1.65;
  color: var(--gv-text-secondary);
}

.home-cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  justify-content: center;
  margin-top: 1.2rem;
}

.home-section--tail {
  padding-bottom: 0.5rem;
}
</style>
