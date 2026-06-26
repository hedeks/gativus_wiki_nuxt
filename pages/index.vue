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



    <div class="home-stack">
      <section
        v-for="(block, idx) in filteredBlocks"
        :key="`${block.id}-${idx}`"
        :id="sectionDomId(block, idx)"
        :data-home-block="String(idx)"
        class="home-section"
        :class="[
          blockAnimClass(idx),
          { 'home-section--tail': idx === filteredBlocks.length - 1 },
        ]"
      >
        <component
          :is="landingBlockComponent(block.blockType)"
          :block="block"
          :reduced-motion="reducedMotion"
          :card-row-block="block.blockType === 'hero' ? cardRowBlock : undefined"
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

const cardRowBlock = computed(() => {
  return displayBlocks.value.find(b => b.blockType === 'card_row')
})

const filteredBlocks = computed(() => {
  return displayBlocks.value.filter(b => b.blockType !== 'card_row')
})

const blockCount = computed(() => filteredBlocks.value.length)

const { landingRef, activeFocusBlock, blockAnimClass } = useLandingSectionObserver(blockCount)

const reducedMotion = ref(false)

const neuronLabels = computed(() => filteredBlocks.value.map(b => b.neuronLabel ?? null))

function sectionDomId(block: LandingBlockResolved, idx: number) {
  return block.anchorId?.trim() || `home-block-${idx}`
}

function scrollToBlock(i: number) {
  const block = filteredBlocks.value[i]
  if (!block)
    return
  const id = sectionDomId(block, i)
  const element = document.getElementById(id)
  if (!element)
    return

  if (reducedMotion.value) {
    element.scrollIntoView({ behavior: 'auto', block: 'start' })
    return
  }

  const headerOffset = 97
  const rect = element.getBoundingClientRect()
  const startY = window.pageYOffset || window.scrollY
  const targetY = startY + rect.top - headerOffset
  const difference = targetY - startY
  const duration = 300 // fast 300ms scroll transition
  let startTime: number | null = null

  function scrollStep(timestamp: number) {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Snappy cubic ease-out curve
    const ease = 1 - Math.pow(1 - progress, 3)
    
    window.scrollTo(0, startY + difference * ease)
    
    if (progress < 1) {
      window.requestAnimationFrame(scrollStep)
    }
  }

  window.requestAnimationFrame(scrollStep)
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
