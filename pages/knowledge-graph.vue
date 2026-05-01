<template>
  <div class="kg-shell">
    <div class="kg-viewport">
      <div class="kg-graph-stage">
        <KnowledgeGraphVisualizer
          :graph-data="graphData"
          :pending="pending"
          :graph-initializing="graphInitializing"
          :enable-navigation="true"
          frameless
          @layout-ready="onGraphLayoutReady"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

definePageMeta({
  layout: 'graph',
})

const langStore = useLanguageStore()

const uiDict: Record<string, { pageTitle: string }> = {
  en: { pageTitle: 'Knowledge graph' },
  ru: { pageTitle: 'Граф знаний' },
  zh: { pageTitle: '知识图谱' },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

useHead({
  title: () => `${t.value.pageTitle} — Gativus`,
})

/** Плавное «нахождение» на экране: не короче таймаута и не короче окончания force simulation в визуализаторе */
const INIT_DWELL_MS = 760

const graphData = ref<any>(null)
const pending = ref(true)
const graphInitializing = ref(true)
let initializingHideTimer: ReturnType<typeof setTimeout> | null = null
let initializingSpanStart = 0

function clearInitializingTimer() {
  if (!initializingHideTimer) return
  clearTimeout(initializingHideTimer)
  initializingHideTimer = null
}

function beginInitializingSpan() {
  clearInitializingTimer()
  graphInitializing.value = true
  initializingSpanStart = Date.now()
}

function scheduleGraphInitializingRelease() {
  clearInitializingTimer()
  if (!graphInitializing.value || pending.value) return
  const elapsed = Date.now() - initializingSpanStart
  const waitMs = Math.max(0, INIT_DWELL_MS - elapsed)
  initializingHideTimer = setTimeout(() => {
    graphInitializing.value = false
    initializingHideTimer = null
  }, waitMs)
}

function onGraphLayoutReady() {
  scheduleGraphInitializingRelease()
}

const refresh = async () => {
  pending.value = true
  try {
    const data = await $fetch('/api/knowledge-graph', { query: { lang: langStore.currentLang } })
    graphData.value = data
  }
  catch (e) {
    console.error(e)
  }
  finally {
    pending.value = false
  }
}

const initialData = await $fetch('/api/knowledge-graph', { query: { lang: langStore.currentLang } }).catch((e) => {
  console.error(e)
  return null
})
graphData.value = initialData
pending.value = false

watch(() => langStore.currentLang, () => {
  refresh()
})

watch(pending, (isPending) => {
  if (isPending) beginInitializingSpan()
})

onBeforeMount(() => {
  beginInitializingSpan()
})
</script>

<style scoped>
.kg-shell {
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.kg-viewport {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.kg-graph-stage {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kg-graph-stage :deep(.knowledge-graph-visualizer) {
  flex: 1 1 0;
  min-height: 0 !important;
  max-height: 100%;
  height: 100%;
  overflow: hidden;
}

.kg-graph-stage :deep(.kg-graph-canvas-stack) {
  flex: 1 1 0;
  min-height: 0;
}

.kg-graph-stage :deep(.graph-container) {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}
</style>
