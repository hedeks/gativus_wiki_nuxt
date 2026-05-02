<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import { useLanguageStore } from '~/stores/language'
import { pickPayloadDesc, pickPayloadText } from '~/utils/landingPick'

defineProps<{ block: LandingBlockResolved }>()

const langStore = useLanguageStore()
const hovered = ref<string | null>(null)

function cardKey(badge: string | undefined, i: number) {
  return badge || `card-${i}`
}
</script>

<template>
  <div class="home-anim-target">
    <div class="home-header-group">
      <p v-if="block.kicker" class="home-kicker">
        {{ block.kicker }}
      </p>
      <h2 v-if="block.title" class="home-h2">
        {{ block.title }}
      </h2>
    </div>
    
    <div class="home-pillar-row">
      <NuxtLink
        v-for="(card, idx) in block.payload.cards || []"
        :key="cardKey(card.badge, idx)"
        :to="card.href"
        class="home-pillar-card gv-focusable"
        :class="{ 'is-hovered': hovered === cardKey(card.badge, idx) }"
        :style="{ transitionDelay: `${idx * 60}ms` }"
        @mouseenter="hovered = cardKey(card.badge, idx)"
        @mouseleave="hovered = null"
      >
        <div v-if="card.image" class="home-pillar-media">
          <img
            :src="card.image"
            :alt="card.badge || ''"
            class="home-pillar-img"
            width="200"
            height="110"
            loading="lazy"
            decoding="async"
          >
        </div>
        <div class="home-pillar-content">
          <span v-if="card.badge" class="home-pillar-badge">{{ card.badge }}</span>
          <h3 class="home-pillar-title">
            {{ pickPayloadText(langStore.currentLang, card) }}
          </h3>
          <p class="home-pillar-desc">
            {{ pickPayloadDesc(langStore.currentLang, card) }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.home-header-group {
  margin-bottom: 2.5rem;
}

.home-pillar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.home-pillar-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .home-pillar-row {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

.home-pillar-card {
  position: relative;
  padding: 1.75rem;
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 5%, transparent) 0%, transparent 50%),
    linear-gradient(165deg, var(--gv-surface-card) 0%, color-mix(in srgb, var(--gv-surface-card) 98%, var(--gv-primary)) 100%);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-container);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.home-pillar-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 6%, transparent) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.home-pillar-card:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--gv-primary) 30%, transparent);
  box-shadow: 
    0 20px 40px color-mix(in srgb, var(--gv-primary) 8%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.home-pillar-card:hover::after {
  opacity: 1;
}

.home-pillar-media {
  height: 120px;
  background: var(--gv-surface-header);
  border-radius: var(--gv-radius-control);
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--gv-border-subtle);
}

.home-pillar-img {
  width: 65%;
  height: 65%;
  object-fit: contain;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .home-pillar-img {
  filter: invert(1) brightness(1.2);
}

.home-pillar-card:hover .home-pillar-img {
  transform: scale(1.08);
}

.home-pillar-badge {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gv-primary);
  margin-bottom: 0.5rem;
  display: block;
}

.home-pillar-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gv-text-primary);
  letter-spacing: -0.01em;
}

.home-pillar-desc {
  margin: 0.75rem 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
}
</style>
