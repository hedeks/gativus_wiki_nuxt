<template>
  <div ref="landingRef" class="home gv-page">
    <HomeScrollBackdrop
      v-if="!reducedMotion"
      :focus-index="activeFocusBlock"
      :section-count="blockCount"
    />
    <HomeNeuronProgress
      v-if="blockCount > 0"
      :section-count="blockCount"
      :active-index="activeFocusBlock"
      :labels="neuronLabels"
      :reduced-motion="reducedMotion"
      @scroll-to="scrollToBlock"
    />

    <!-- Decorative Premium Glows -->
    <div class="home-glows" aria-hidden="true">
      <div class="home-glow home-glow--1"></div>
      <div class="home-glow home-glow--2"></div>
      <div class="home-glow home-glow--3"></div>
    </div>

    <div class="home-stack">
      <section
        v-for="(block, idx) in displayBlocks"
        :key="`${block.id}-${idx}`"
        :id="sectionDomId(block, idx)"
        :data-home-block="String(idx)"
        class="home-section"
        :class="[
          blockAnimClass(idx),
          { 'home-section--tail': idx === displayBlocks.length - 1 },
        ]"
      >
        <component
          :is="landingBlockComponent(block.blockType)"
          :block="block"
          :reduced-motion="reducedMotion"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import { useLanguageStore } from '~/stores/language'
import '~/assets/css/landing-home.css'
import { buildFallbackLandingBlocks } from '~/utils/landingFallback'
import { landingBlockComponent } from '~/utils/landingBlockMap'
import { landingUiForLang } from '~/utils/landingUiDict'

const langStore = useLanguageStore()

const { data: landingPayload } = await useAsyncData(
  'landing-blocks',
  async () => {
    try {
      return await $fetch<{ blocks: LandingBlockResolved[] }>('/api/landing', {
        params: { locale: langStore.currentLang },
      })
    } catch {
      return { blocks: [] }
    }
  },
  { watch: [() => langStore.currentLang] },
)

const displayBlocks = computed<LandingBlockResolved[]>(() => {
  const raw = landingPayload.value?.blocks
  if (raw && raw.length > 0)
    return raw
  return buildFallbackLandingBlocks(langStore.currentLang)
})

const blockCount = computed(() => displayBlocks.value.length)

const { landingRef, activeFocusBlock, blockAnimClass } = useLandingSectionObserver(blockCount)

const reducedMotion = ref(false)

const neuronLabels = computed(() => displayBlocks.value.map(b => b.neuronLabel ?? null))

function sectionDomId(block: LandingBlockResolved, idx: number) {
  return block.anchorId?.trim() || `home-block-${idx}`
}

function scrollToBlock(i: number) {
  const block = displayBlocks.value[i]
  if (!block)
    return
  const id = sectionDomId(block, i)
  document.getElementById(id)?.scrollIntoView({
    behavior: reducedMotion.value ? 'auto' : 'smooth',
    block: 'start',
  })
}

const t = computed(() => landingUiForLang(langStore.currentLang))

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

useMainNavSeo('home')

const documentHtmlLang = computed(() => langStore.currentLang)

useHead({
  htmlAttrs: { lang: documentHtmlLang },
  link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
})

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.home {
  position: relative;
  z-index: 1;
  /* gv-page already handles width, max-width, and margin */
  padding-top: clamp(2rem, 5vh, 4rem);
  padding-bottom: 8rem;
  overflow: hidden; /* Contain glows */
}

.home-glows {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.home-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(220px);
  opacity: 0.04;
  will-change: transform;
}

.dark .home-glow {
  opacity: 0.02;
}

.home-glow--1 {
  top: 5%;
  right: -10%;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, var(--gv-primary), transparent 70%);
  animation: glow-float-1 25s ease-in-out infinite alternate;
}

.home-glow--2 {
  top: 40%;
  left: -15%;
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, color-mix(in srgb, var(--gv-primary) 60%, #818cf8), transparent 70%);
  animation: glow-float-2 30s ease-in-out infinite alternate-reverse;
}

.home-glow--3 {
  bottom: 10%;
  right: -5%;
  width: 45vw;
  height: 45vw;
  background: radial-gradient(circle, #0ea5e9, transparent 70%);
  animation: glow-float-1 20s ease-in-out infinite alternate-reverse;
}

@keyframes glow-float-1 {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(-5%, 10%) scale(1.1); }
}

@keyframes glow-float-2 {
  from { transform: translate(0, 0) scale(1.1); }
  to { transform: translate(10%, -5%) scale(1); }
}

@media (max-width: 1240px) {
  .home {
    padding-left: 5rem; /* Room for neurons on the left */
  }
}

@media (max-width: 860px) {
  .home {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    padding-bottom: 6rem;
  }
}

@media (max-width: 480px) {
  .home {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 5rem;
  }
}
</style>
