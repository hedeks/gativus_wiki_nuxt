<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import { useLanguageStore } from '~/stores/language'
import { pickPayloadLabel } from '~/utils/landingPick'

defineProps<{ block: LandingBlockResolved }>()

const langStore = useLanguageStore()

function isExternalHref(h: string) {
  return /^https?:\/\//i.test(h) || h.startsWith('mailto:')
}
</script>

<template>
  <div class="home-cta home-anim-target">
    <h2 v-if="block.title" class="home-cta-title">
      {{ block.title }}
    </h2>
    <p v-if="block.body" class="home-cta-text">
      {{ block.body }}
    </p>
    <div v-if="block.payload.buttons?.length" class="home-cta-actions">
      <GvButton
        v-for="(b, idx) in block.payload.buttons"
        :key="idx"
        :to="isExternalHref(b.href) ? undefined : b.href"
        :href="isExternalHref(b.href) ? b.href : undefined"
        :color="b.color === 'sky' ? 'sky' : 'gray'"
        :variant="b.variant === 'solid' ? 'solid' : 'outline'"
        size="lg"
        :icon="b.icon"
        class="gv-btn--premium"
      >
        {{ pickPayloadLabel(langStore.currentLang, b) }}
      </GvButton>
    </div>
  </div>
</template>

<style scoped>
.gv-btn--premium {
  font-weight: 700;
  letter-spacing: 0.02em;
  padding-left: 1.75rem;
  padding-right: 1.75rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.gv-btn--premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px color-mix(in srgb, var(--gv-primary) 15%, transparent);
}

.home-cta {
  padding: clamp(3rem, 10vw, 6rem) 2rem;
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 6%, transparent) 0%, transparent 50%),
    linear-gradient(165deg, var(--gv-surface-card) 0%, color-mix(in srgb, var(--gv-surface-card) 98%, var(--gv-primary)) 100%);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-container);
  text-align: center;
  box-shadow: 0 20px 40px color-mix(in srgb, var(--gv-primary) 5%, transparent);
  backdrop-filter: blur(20px);
  overflow: hidden;
  position: relative;
}

.home-cta::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--gv-primary) 8%, transparent) 0%, transparent 70%);
  pointer-events: none;
}

.home-cta-title {
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  font-weight: 800;
  margin-bottom: 1.25rem;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--gv-text-primary);
}

.home-cta-text {
  font-size: 16px;
  color: var(--gv-text-secondary);
  max-width: 36rem;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
}

.home-cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
