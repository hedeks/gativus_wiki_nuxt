<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import { useLanguageStore } from '~/stores/language'
import { pickPayloadDesc, pickPayloadLabel } from '~/utils/landingPick'

defineProps<{ block: LandingBlockResolved }>()

const langStore = useLanguageStore()
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
      <p v-if="block.body" class="home-sub">
        {{ block.body }}
      </p>
    </div>

    <div class="home-wiki-grid">
      <NuxtLink
        v-for="(item, idx) in block.payload.links || []"
        :key="item.href + idx"
        :to="item.href"
        class="home-wiki gv-focusable"
        :data-accent="item.accent"
        :style="{ transitionDelay: `${idx * 50}ms` }"
      >
        <div class="home-wiki-ic">
          <UIcon :name="item.icon" class="size-7" />
        </div>
        <div class="home-wiki-content">
          <span class="home-wiki-label">{{ pickPayloadLabel(langStore.currentLang, item) }}</span>
          <span class="home-wiki-desc">{{ pickPayloadDesc(langStore.currentLang, item) }}</span>
        </div>
        <UIcon name="i-heroicons-chevron-right-20-solid" class="home-wiki-arr size-5 shrink-0 opacity-40" />
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.home-header-group {
  margin-bottom: 3rem;
}

.home-wiki-arr {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.home-wiki:hover .home-wiki-arr {
  transform: translateX(4px);
  opacity: 1;
}

.home-wiki-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.home-wiki {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--wiki-accent) 4%, transparent) 0%, transparent 50%),
    linear-gradient(165deg, var(--gv-surface-card) 0%, color-mix(in srgb, var(--gv-surface-card) 98%, var(--wiki-accent)) 100%);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-container);
  backdrop-filter: blur(12px);
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  --wiki-accent: var(--gv-primary);
  z-index: 1;
}

.home-wiki[data-accent="book"] { --wiki-accent: #0ea5e9; }
.home-wiki[data-accent="article"] { --wiki-accent: #6366f1; }
.home-wiki[data-accent="term"] { --wiki-accent: #10b981; }
.home-wiki[data-accent="graph"] { --wiki-accent: #ef4444; }

.home-wiki::before {
  content: '';
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--wiki-accent) 6%, transparent);
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: -1;
}

.home-wiki:hover {
  transform: translateY(-6px);
  border-color: color-mix(in srgb, var(--wiki-accent) 30%, transparent);
  box-shadow: 0 15px 30px color-mix(in srgb, var(--wiki-accent) 8%, transparent);
}

.home-wiki:hover::before {
  opacity: 1;
}

.home-wiki-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: color-mix(in srgb, var(--wiki-accent, var(--gv-primary)) 10%, transparent);
  color: var(--wiki-accent, var(--gv-primary));
  border-radius: 10px;
  font-size: 20px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-wiki:hover .home-wiki-ic {
  background: var(--wiki-accent);
  color: #fff;
}

.home-wiki-content {
  flex: 1;
}

.home-wiki-label {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.home-wiki-desc {
  display: block;
  font-size: 13px;
  color: var(--gv-text-secondary);
  margin-top: 1px;
}
</style>
