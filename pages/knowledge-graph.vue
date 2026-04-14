<template>
  <div class="knowledge-graph-page">
    <div class="graph-header">
      <div class="header-left">
        <h1 class="text-2xl font-bold">{{ t?.title }}</h1>
        <p class="text-gray-500 text-sm">{{ t?.subtitle }}</p>
      </div>
    </div>

    <div class="graph-wrapper">
      <KnowledgeGraphVisualizer :graphData="graphData" :pending="pending" :enableNavigation="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: { title: 'Gativus Knowledge Graph', subtitle: 'Ontology visualization: categories, articles, and terms' },
  ru: { title: 'Граф знаний Gativus', subtitle: 'Визуализация онтологии: категории, статьи и термины' }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

useHead({
  title: () => `${t.value.title} — Gativus Wiki`
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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px 20px;
  height: calc(100vh - var(--header-height, 65px) - 20px);
  display: flex;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .knowledge-graph-page {
    max-width: 1800px;
    padding: 0 40px 30px;
  }
}

.graph-header {
  margin-bottom: 24px;
  padding-top: 24px;
}

.header-left h1 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #333333;
  border-bottom: 1px solid #bababa;
  display: inline-block;
  margin-bottom: 8px;
}

.dark .header-left h1 {
  color: #e5e5e5;
  border-color: #3a3a3a;
}

.graph-wrapper {
  flex: 1;
  position: relative;
  min-height: 400px;
}
</style>
