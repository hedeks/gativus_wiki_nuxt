<template>
  <div class="knowledge-graph-page gv-page">
    <section class="section-card page-head-card">
      <div class="card-header">
        <span class="card-badge">GATIVUS</span>
        <h2 class="card-header-title">{{ t?.title }}</h2>
      </div>
      <div class="graph-hero">
        <p class="hero-subtitle">{{ t?.subtitle }}</p>
      </div>
    </section>

    <section class="section-card graph-section">
      <div class="card-header">
        <span class="card-badge">GNET</span>
        <h2 class="card-header-title">{{ t?.panelTitle }}</h2>
      </div>
      <div class="graph-wrapper">
        <KnowledgeGraphVisualizer :graphData="graphData" :pending="pending" :enableNavigation="true" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    title: 'Gativus Knowledge Graph',
    subtitle: 'Ontology visualization: categories, articles, and terms',
    panelTitle: 'Interactive Ontology Map'
  },
  ru: {
    title: 'Граф знаний Gativus',
    subtitle: 'Визуализация онтологии: категории, статьи и термины',
    panelTitle: 'Интерактивная карта онтологии'
  },
  zh: {
    title: 'Gativus 知识图谱',
    subtitle: '本体可视化：分类、文章与术语',
    panelTitle: '交互式本体地图'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

useHead({
  title: () => `${t.value.title} — Gativus`
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

const initialData = await $fetch('/api/knowledge-graph', { query: { lang: langStore.currentLang } }).catch(e => {
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
.knowledge-graph-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 10px 36px;
}

.page-head-card {
  overflow: hidden;
}

.graph-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  text-align: center;
  padding: 14px 16px 16px;
}

.hero-subtitle {
  margin: 0;
  font-size: 14px;
  color: #777;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.dark .hero-subtitle {
  color: #999;
}

.section-card {
  width: 100%;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.section-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
}

.dark .section-card {
  background: #1a1a1a;
  border-color: #333;
}

.dark .section-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.card-header {
  padding: 14px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #c8c8c8;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dark .card-header {
  background-color: #222;
  border-bottom-color: #333;
}

.card-badge {
  background: linear-gradient(90deg, #e0f2fe, #bae6fd);
  color: #0c4a6e;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
}

.dark .card-badge {
  background: linear-gradient(90deg, #0c4a6e, #082f49);
  color: #e0f2fe;
}

.card-header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #333;
  letter-spacing: 0.3px;
}

.dark .card-header-title {
  color: #ddd;
}

.graph-wrapper {
  width: 100%;
  position: relative;
  min-height: min(760px, calc(100dvh - var(--header-height, 65px) - 200px));
  height: clamp(420px, 70dvh, 760px);
  isolation: isolate;
}

@media (max-width: 900px) {
}

@media (max-width: 640px) {
  .knowledge-graph-page {
    gap: 10px;
    padding: 16px 8px 24px;
  }

  .hero-subtitle {
    letter-spacing: 0.8px;
    font-size: 12px;
  }

  .card-header {
    padding: 12px 14px;
  }

  .card-header-title {
    font-size: 15px;
  }

  .graph-wrapper {
    min-height: 360px;
    height: clamp(360px, 64dvh, 600px);
  }
}
</style>
