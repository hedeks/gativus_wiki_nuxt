<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import { useLanguageStore } from '~/stores/language'
import { pickPayloadLabel } from '~/utils/landingPick'

const props = withDefaults(
  defineProps<{
    block: LandingBlockResolved
    reducedMotion?: boolean
  }>(),
  { reducedMotion: false },
)

const langStore = useLanguageStore()
const tilt = ref({ x: 0, y: 0 })

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
</script>

<template>
  <div
    class="home-surface--hero home-anim-target"
    @mousemove="onHeroMove"
    @mouseleave="onHeroLeave"
  >
    <div class="home-hero-top">
      <div class="home-hero-content">
        <p v-if="block.kicker" class="home-eyebrow">
          {{ block.kicker }}
        </p>
        <h1 v-if="block.title" class="home-title">
          {{ block.title }}
        </h1>
        <p v-if="block.subtitle" class="home-tagline">
          {{ block.subtitle }}
        </p>
        
        <p v-if="block.body" class="home-lede">
          {{ block.body }}
        </p>
        
        <div v-if="block.payload.ctas?.length" class="home-actions">
          <GvButton
            v-for="(c, idx) in block.payload.ctas"
            :key="idx"
            :to="isExternalHref(c.href) ? undefined : c.href"
            :href="isExternalHref(c.href) ? c.href : undefined"
            :color="c.color === 'gray' ? 'gray' : 'sky'"
            :variant="c.variant === 'outline' ? 'outline' : 'solid'"
            size="lg"
            :icon="c.icon"
            class="gv-btn--premium"
          >
            {{ labelCta(c) }}
          </GvButton>
        </div>
      </div>

      <div class="home-hero-visual">
        <img
          v-if="block.imagePath"
          :src="block.imagePath"
          alt=""
          class="home-hero-logo"
          width="180"
          height="180"
          :style="logoStyle"
        >
        <div class="home-hero-decoration" aria-hidden="true" />
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
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.gv-btn--premium:hover {
  transform: translateY(-2px);
}

@keyframes heroGlowMotion {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.home-surface--hero {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: clamp(2.5rem, 8vw, 5.5rem);
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 8%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 10% 90%, color-mix(in srgb, var(--gv-primary) 4%, transparent) 0%, transparent 40%),
    linear-gradient(165deg, var(--gv-surface-card) 0%, color-mix(in srgb, var(--gv-surface-card) 96%, var(--gv-primary)) 100%);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid var(--gv-border-subtle);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border-radius: var(--gv-radius-container);
  overflow: hidden;
  min-height: clamp(400px, 70vh, 850px);
  justify-content: center;
}

.home-hero-top {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  align-items: center;
  text-align: center;
}

@media (min-width: 1024px) {
  .home-hero-top {
    display: grid;
    /* Золотое сечение: Текст (Large) - 1.618fr, Визуал (Small) - 1fr */
    grid-template-columns: 1.618fr 1fr;
    align-items: center;
    text-align: left;
    gap: 4rem;
  }
}

.home-hero-content {
  flex: 1;
  min-width: 0;
  z-index: 2;
}

.home-hero-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.home-hero-logo {
  position: relative;
  width: clamp(120px, 20vw, 200px);
  height: auto;
  border-radius: var(--gv-radius-container);
  background: var(--gv-surface);
  padding: 24px;
  border: 1px solid var(--gv-border-subtle);
  box-shadow: 
    0 20px 50px color-mix(in srgb, var(--gv-primary) 10%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  z-index: 2;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-hero-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 140%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, color-mix(in srgb, var(--gv-primary) 15%, transparent) 0%, transparent 70%);
  filter: blur(40px);
  z-index: 1;
  opacity: 0.6;
}

@media (min-width: 1024px) {
  .home-hero-visual {
    justify-content: flex-end; /* Logo on the right edge of its golden column */
  }
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
  margin: 0.75rem 0 0;
  font-size: clamp(1.9rem, 7vw, 4.25rem);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.05;
  background: linear-gradient(135deg, var(--gv-text-primary) 0%, color-mix(in srgb, var(--gv-primary) 40%, var(--gv-text-primary)) 50%, var(--gv-text-primary) 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 10s linear infinite;
}

@keyframes shine {
  to { background-position: 200% center; }
}

.home-tagline {
  margin: 1.5rem 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  opacity: 0.6;
}

.home-lede {
  margin: 2.5rem 0 0;
  font-size: clamp(17px, 2.2vw, 20px);
  line-height: 1.75;
  color: var(--gv-text-primary);
  max-width: 44rem;
  opacity: 0.85;
}

@media (max-width: 1023px) {
  .home-lede {
    margin-left: auto;
    margin-right: auto;
  }
}

.home-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 3.5rem;
}

@media (max-width: 1023px) {
  .home-actions {
    justify-content: center;
  }
}
</style>
