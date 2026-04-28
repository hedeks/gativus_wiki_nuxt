<template>
  <div class="admin-gv-skin kg-root">
    <div class="admin-page-stack admin-page-stack--fluid kg-stack">
      <section class="section-card kg-card">
        <div class="card-body kg-card-body">
          <div class="kg-intro">
            <div class="hero-title-container kg-hero-row">
              <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo kg-hero-logo" />
              <div class="hero-text">
                <h1 class="hero-title gv-hero-gradient uppercase">{{ t.heroTitle }}</h1>
                <p class="hero-lead">{{ t.subtitle }}</p>
                <p class="kg-map-caption">{{ t.panelTitle }}</p>
              </div>
            </div>
          </div>
          <div class="graph-wrapper">
            <KnowledgeGraphVisualizer :graph-data="graphData" :pending="pending" :enable-navigation="true" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
const langStore = useLanguageStore()

const uiDict: Record<string, { heroTitle: string; subtitle: string; panelTitle: string }> = {
  en: {
    heroTitle: 'Knowledge graph',
    subtitle: 'Ontology visualization: categories, articles, and terms',
    panelTitle: 'Interactive ontology map',
  },
  ru: {
    heroTitle: 'Граф знаний',
    subtitle: 'Визуализация онтологии: категории, статьи и термины',
    panelTitle: 'Интерактивная карта онтологии',
  },
  zh: {
    heroTitle: '知识图谱',
    subtitle: '本体可视化：分类、文章与术语',
    panelTitle: '交互式本体地图',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

useHead({
  title: () => `${t.value.heroTitle} — Gativus`,
})

const graphData = ref<any>(null)
const pending = ref(true)

const refresh = async () => {
  pending.value = true
  try {
    const data = await $fetch('/api/knowledge-graph', { query: { lang: langStore.currentLang } })
    graphData.value = data
  } catch (e) {
    console.error(e)
  } finally {
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
</script>

<style scoped>
/* Высота ровно под окно ниже шапки (--header-height). Футер ниже блока, без подрезания. */
.kg-root {
  width: 100%;
  height: calc(100dvh - var(--header-height, 65px));
  max-height: calc(100dvh - var(--header-height, 65px));
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(12px, 2.5vw, 28px);
  box-sizing: border-box;
  overflow: hidden;
}

.kg-stack {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  align-items: stretch;
  overflow: hidden;
}

.kg-card {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.kg-card-body {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vw, 22px);
  padding: clamp(16px, 2.2vw, 24px);
  overflow: hidden;
}

.kg-intro {
  flex-shrink: 0;
}

.kg-hero-row {
  align-items: flex-start;
}

.kg-hero-logo {
  height: 52px;
}

.kg-map-caption {
  margin: 10px 0 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.dark .kg-map-caption {
  color: #94a3b8;
}

.graph-wrapper {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  width: 100%;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.graph-wrapper :deep(.knowledge-graph-visualizer) {
  flex: 1 1 0;
  min-height: 0 !important;
  max-height: 100%;
  height: 100%;
  overflow: hidden;
}

.graph-wrapper :deep(.graph-container) {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
}

@media (max-width: 640px) {
  .kg-hero-logo {
    height: 44px;
  }
}
</style>
