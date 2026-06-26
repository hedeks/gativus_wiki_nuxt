<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import { useLanguageStore } from '~/stores/language'
import { pickPayloadLabel, pickPayloadText, pickPayloadDesc } from '~/utils/landingPick'

const props = withDefaults(
  defineProps<{
    block: LandingBlockResolved
    reducedMotion?: boolean
    cardRowBlock?: LandingBlockResolved
  }>(),
  { reducedMotion: false },
)

const langStore = useLanguageStore()
const tilt = ref({ x: 0, y: 0 })
const hoveredCard = ref<string | null>(null)

const logoStyle = computed(() => {
  if (props.reducedMotion)
    return {}
  const { x, y } = tilt.value
  return {
    transform: `perspective(1000px) rotateX(${x * 0.5}deg) rotateY(${y * 0.5}deg) translate3d(${y * 0.2}px, ${x * 0.2}px, 0)`,
  }
})

function onHeroMove(e: MouseEvent) {
  if (props.reducedMotion)
    return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width - 0.5
  const py = (e.clientY - r.top) / r.height - 0.5
  tilt.value = { x: py * -15, y: px * 15 }
}

function onHeroLeave() {
  tilt.value = { x: 0, y: 0 }
}

function isExternalHref(h: string) {
  return /^https?:\/\//i.test(h) || h.startsWith('mailto:')
}

function labelCta(i: { label_en: string; label_ru?: string; label_zh?: string }) {
  return pickPayloadLabel(langStore.currentLang, i)
}

function cardKey(badge: string | undefined, i: number) {
  return badge || `card-${i}`
}

function cleanCardTitle(badge: string | undefined, title: string) {
  if (!badge) return title
  const regex = new RegExp(`^${badge}\\s*\\(([^)]+)\\)`, 'i')
  const match = title.match(regex)
  if (match && match[1]) {
    return match[1]
  }
  if (title.toLowerCase().startsWith(badge.toLowerCase())) {
    const stripped = title.substring(badge.length).replace(/^[:\s-]+/, '')
    if (stripped) return stripped
  }
  return title
}

function formatHeroTitle(title: string | undefined) {
  if (!title) return ''
  if (title === 'GATIVUS') return 'Gativus'
  return title
}

const heroDescription = computed(() => {
  const b = props.block.body
  const isDefault = !b ||
    b.includes('consists of three fundamental') ||
    b.includes('состоит из трёх фундаментальных') ||
    b.includes('由三个紧密关联')

  if (isDefault) {
    const l = langStore.currentLang
    if (l === 'ru')
      return 'Среда для исследований в области технического разума'
    if (l === 'zh')
      return '技术心智领域的物理与理论研究环境'
    return 'Environment for research in a technical mind area'
  }
  return b
})
</script>

<template>
  <div class="home-surface--hero home-anim-target" @mousemove="onHeroMove" @mouseleave="onHeroLeave">
    <div class="home-hero-top">
      <div class="home-hero-header">
        <div class="home-hero-visual">
          <img v-if="block.imagePath" :src="block.imagePath" alt="" class="home-hero-logo" width="80" height="80"
            :style="logoStyle">
          <div class="home-hero-decoration" aria-hidden="true" />
        </div>
        <h1 v-if="block.title" class="home-title gv-hero-gradient">
          {{ formatHeroTitle(block.title) }}
        </h1>
      </div>

      <div class="home-hero-content">
        <p class="home-lede gv-hero-gradient">
          {{ heroDescription }}
        </p>

        <div v-if="block.payload.ctas?.length" class="home-actions">
          <GvButton v-for="(c, idx) in block.payload.ctas" :key="idx" :to="isExternalHref(c.href) ? undefined : c.href"
            :href="isExternalHref(c.href) ? c.href : undefined" :color="c.color === 'gray' ? 'gray' : 'sky'"
            :variant="c.variant === 'outline' ? 'outline' : 'solid'" size="lg" :icon="c.icon" class="gv-btn--premium">
            {{ labelCta(c) }}
          </GvButton>
        </div>
      </div>
    </div>

    <!-- Space/Divider before the pillars -->
    <div v-if="cardRowBlock" class="home-hero-divider" />

    <!-- Three Pillars grid inside the Hero block -->
    <div v-if="cardRowBlock" class="home-hero-pillars">
      <div class="home-pillar-row">
        <NuxtLink v-for="(card, idx) in cardRowBlock.payload.cards || []" :key="cardKey(card.badge, idx)"
          :to="card.href" class="home-pillar-card gv-focusable"
          :class="{ 'is-hovered': hoveredCard === cardKey(card.badge, idx) }"
          :style="{ transitionDelay: `${idx * 60}ms` }" @mouseenter="hoveredCard = cardKey(card.badge, idx)"
          @mouseleave="hoveredCard = null">
          <div v-if="card.image" class="home-pillar-media">
            <img :src="card.image" :alt="card.badge || ''" class="home-pillar-img" width="200" height="110"
              loading="lazy" decoding="async">
          </div>
          <div class="home-pillar-content">
            <span v-if="card.badge" class="home-pillar-badge">{{ card.badge }}</span>
            <h3 class="home-pillar-title">
              {{ cleanCardTitle(card.badge, pickPayloadText(langStore.currentLang, card)) }}
            </h3>
            <p class="home-pillar-desc">
              {{ pickPayloadDesc(langStore.currentLang, card) }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-hero-content {
  flex: 1;
  min-width: 280px;
}

.gv-btn--premium {
  font-weight: 700;
  letter-spacing: 0.02em;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.gv-btn--premium:hover {
  transform: translateY(-2px);
}

@keyframes heroGlowMotion {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.home-surface--hero {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: clamp(1.75rem, 4.5vh, 2.75rem) clamp(2rem, 5vw, 4rem);
  border: none !important;
  box-shadow: none !important;
  border-radius: var(--gv-radius-container);
  overflow: hidden;
  justify-content: center;
  user-select: none !important;
}

.home-hero-top {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
  text-align: left;
  width: 100%;
}

.home-hero-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  width: 100%;
}

.home-hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: left;
  justify-content: center;
  flex: 1;
  min-width: 0;
  z-index: 2;
  width: 100%;
}

.home-hero-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
}

.home-hero-logo {
  position: relative;
  width: clamp(64px, 10vh, 80px);
  height: clamp(64px, 10vh, 80px);
  border-radius: var(--gv-radius-control);
  background: var(--gv-surface);
  padding: 8px;
  border: 1px solid var(--gv-border-subtle);
  box-shadow:
    0 5px 15px color-mix(in srgb, var(--gv-primary) 5%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  z-index: 2;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-hero-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120%;
  height: 120%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, color-mix(in srgb, var(--gv-primary) 10%, transparent) 0%, transparent 70%);
  filter: blur(5px);
  z-index: 1;
  opacity: 0.4;
}

.home-eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--gv-primary);
  opacity: 0.8;
}

.home-title {
  margin: 0.5rem 0 0;
  font-size: clamp(1.9rem, 7vw, 4.25rem);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.05;
  /* gradient and animation come from global .gv-hero-gradient */
}

.home-tagline {
  margin: 0.75rem 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  opacity: 0.6;
}

.home-lede {
  margin: 0.75rem 0 0;
  font-size: clamp(15px, 2vh, 17.5px);
  line-height: 1.6;
  max-width: 44rem;
  text-align: left;
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-start;
}

@media (max-width: 640px) {
  .home-surface--hero {
    padding: clamp(1.25rem, 3.5vh, 2rem) 1.25rem;
  }

  .home-hero-header {
    flex-direction: column;
    gap: 0.75rem;
  }

  .home-title {
    text-align: center !important;
    justify-content: center !important;
  }

  .home-hero-top {
    align-items: center;
    text-align: center;
  }

  .home-lede {
    text-align: center;
  }

  .home-actions {
    justify-content: center;
  }
}
</style>
