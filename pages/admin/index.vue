<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AdminDashboardStats } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  fluid: true
})

useHead({ title: 'Панель управления — Workspace — Gativus Admin' })

const store = userStore()
const toast = useToast()

const { data: stats, error, pending, refresh } = await useFetch<AdminDashboardStats>(
  '/api/admin/stats',
  { headers: store.getAuthHeader() },
)

const summaryCards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { value: s.categories, label: 'Категории', icon: 'i-heroicons-folder', color: 'text-red-500', bg: 'bg-red-500/10' },
    { value: s.books, label: 'Книги', icon: 'i-heroicons-book-open', color: 'text-sky-500', bg: 'bg-sky-500/10' },
    { value: s.articles, label: 'Статьи', icon: 'i-heroicons-document-text', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { value: s.terms, label: 'Термины', icon: 'i-heroicons-bookmark', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { value: s.users, label: 'Администраторы', icon: 'i-heroicons-users', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ]
})

// Graph KPIs
const graphKpis = computed(() => {
  const g = stats.value?.graph
  if (!g) return []
  return [
    { value: g.nodeCount, label: 'Всего узлов графа' },
    { value: g.edgesStructuralSum, label: 'Структурные связи' },
    { value: g.edgesArticleTermRows, label: 'Ассоциации (статья ↔ термин)' },
    { value: g.edgesStructuralSum + g.edgesArticleTermRows, label: 'Всего связей в БД' },
  ]
})

// Graph Swatches
const ONTO = {
  category: '#ef4444',
  book: '#0ea5e9',
  article: '#6366f1',
  term: '#10b981',
} as const

type GraphEdgeRow = {
  label: string
  value: number
  accent: string
  dashed: boolean
  kind: 'virtual' | 'structural'
}

const graphRows = computed<GraphEdgeRow[]>(() => {
  const g = stats.value?.graph
  if (!g) return []
  return [
    { label: 'Категория → родитель', value: g.edgesCategoryHierarchy, accent: ONTO.category, dashed: true, kind: 'virtual' },
    { label: 'Статья → категория', value: g.edgesArticleToCategory, accent: ONTO.article, dashed: true, kind: 'virtual' },
    { label: 'Статья → книга', value: g.edgesArticleToBook, accent: ONTO.article, dashed: false, kind: 'structural' },
    { label: 'Книга ↔ категория', value: g.edgesBookToCategory, accent: ONTO.book, dashed: true, kind: 'virtual' },
    { label: 'Термин → статья', value: g.edgesTermToArticle, accent: ONTO.term, dashed: false, kind: 'structural' },
    { label: 'Статья ↔ термин (упоминания)', value: g.edgesArticleTermRows, accent: ONTO.term, dashed: false, kind: 'structural' },
  ]
})

function edgeMarkStyle(row: Pick<GraphEdgeRow, 'accent' | 'dashed'>) {
  if (row.dashed) {
    return {
      backgroundImage: `repeating-linear-gradient(90deg, ${row.accent} 0 4px, transparent 4px 7px)`,
      backgroundColor: 'transparent',
    }
  }
  return { backgroundColor: row.accent }
}

// Tool Operations
const isToolsModalOpen = ref(false)
const toolsModalTitle = ref('')
const toolsModalMessage = ref('')

async function runRelink() {
  if (!confirm('Перезапустить автоматическую перелинковку всех статей? Это может занять некоторое время.')) return
  toolsModalTitle.value = 'Перелинковка статей'
  toolsModalMessage.value = 'Сканирование контента и связывание терминов глоссария...'
  isToolsModalOpen.value = true
  try {
    const res = await $fetch<any>('/api/admin/relink', { method: 'POST', headers: store.getAuthHeader() })
    toast.add({ title: 'Успешно', description: res.message || 'Перелинковка завершена', color: 'green' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
  }
}

async function runRepairHtml() {
  if (!confirm('Запустить восстановление поврежденной HTML разметки в статьях?')) return
  toolsModalTitle.value = 'Восстановление HTML'
  toolsModalMessage.value = 'Исправление сломанных тегов ссылок и очистка поврежденного кода...'
  isToolsModalOpen.value = true
  try {
    const res = await $fetch<any>('/api/admin/repair-linker-html', { method: 'POST', headers: store.getAuthHeader() })
    toast.add({ title: 'Успешно', description: res.message || 'Восстановление завершено', color: 'green' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Audit interactive details modal
const isAuditModalOpen = ref(false)
const auditModalTitle = ref('')
const auditModalType = ref<'article' | 'term'>('article')
const auditModalItems = ref<any[]>([])
const auditSearch = ref('')

function openAuditDetails(title: string, type: 'article' | 'term', items: any[]) {
  auditModalTitle.value = title
  auditModalType.value = type
  auditModalItems.value = items || []
  auditSearch.value = ''
  isAuditModalOpen.value = true
}

const filteredAuditItems = computed(() => {
  const q = auditSearch.value.trim().toLowerCase()
  if (!q) return auditModalItems.value
  return auditModalItems.value.filter(item => 
    (item.title && item.title.toLowerCase().includes(q)) ||
    (item.slug && item.slug.toLowerCase().includes(q))
  )
})
</script>

<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-12 gap-0">
      
      <!-- Left Pane: Audit & Operations (4/12) -->
      <div class="workspace-list col-span-4 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-shield-check" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Аудит контента</h1>
              <p class="text-[10px] text-gray-500 font-medium">Здоровье & Целостность</p>
            </div>
          </div>
          <GvButton 
            type="button" 
            color="gray" 
            variant="soft" 
            size="xs" 
            icon="i-heroicons-arrow-path"
            :loading="pending"
            @click="refresh()"
          />
        </header>

        <div class="audit-scroll-container flex-1 overflow-y-auto p-4 space-y-6">
          <div v-if="pending && !stats" class="text-center py-8 text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Сбор данных аудита...</p>
          </div>
          
          <template v-else-if="stats">
            <!-- Localization Health Card -->
            <div class="audit-card bg-gray-50 dark:bg-zinc-800/10 p-4 rounded-xl border border-gray-150 dark:border-zinc-800/50 space-y-4">
              <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <UIcon name="i-heroicons-language" class="text-sky-500 text-sm" /> Локализация
              </h3>
              <div class="divide-y divide-gray-150 dark:divide-zinc-800 text-xs">
                
                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Не переведено статей (RU)', 'article', stats.untranslatedArticlesRu)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Не переведено статей (RU)
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.untranslatedArticlesRu.length ? 'orange' : 'gray'" size="xs" variant="soft">
                    {{ stats.untranslatedArticlesRu.length }}
                  </UBadge>
                </div>

                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Не переведено статей (ZH)', 'article', stats.untranslatedArticlesZh)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Не переведено статей (ZH)
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.untranslatedArticlesZh.length ? 'orange' : 'gray'" size="xs" variant="soft">
                    {{ stats.untranslatedArticlesZh.length }}
                  </UBadge>
                </div>

                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Не переведено терминов (RU)', 'term', stats.untranslatedTermsRu)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Не переведено терминов (RU)
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.untranslatedTermsRu.length ? 'orange' : 'gray'" size="xs" variant="soft">
                    {{ stats.untranslatedTermsRu.length }}
                  </UBadge>
                </div>

                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Не переведено терминов (ZH)', 'term', stats.untranslatedTermsZh)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Не переведено терминов (ZH)
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.untranslatedTermsZh.length ? 'orange' : 'gray'" size="xs" variant="soft">
                    {{ stats.untranslatedTermsZh.length }}
                  </UBadge>
                </div>

              </div>
            </div>

            <!-- Content Structure Health Card -->
            <div class="audit-card bg-gray-50 dark:bg-zinc-800/10 p-4 rounded-xl border border-gray-150 dark:border-zinc-800/50 space-y-4">
              <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <UIcon name="i-heroicons-puzzle-piece" class="text-emerald-500 text-sm" /> Связи и структура
              </h3>
              <div class="divide-y divide-gray-150 dark:divide-zinc-800 text-xs">
                
                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Сиротские термины (без упоминаний)', 'term', stats.orphanTerms)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Сиротские термины (0 упоминаний)
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.orphanTerms.length ? 'red' : 'gray'" size="xs" variant="soft">
                    {{ stats.orphanTerms.length }}
                  </UBadge>
                </div>

                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Статьи без категорий и книг', 'article', stats.orphanArticles)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Статьи без категорий и книг
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.orphanArticles.length ? 'orange' : 'gray'" size="xs" variant="soft">
                    {{ stats.orphanArticles.length }}
                  </UBadge>
                </div>

                <div 
                  class="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/40 px-2 rounded-lg transition-colors group"
                  @click="openAuditDetails('Статьи-черновики', 'article', stats.draftArticles)"
                >
                  <span class="text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white flex items-center gap-1.5">
                    Статьи-черновики (не в сети)
                    <UIcon name="i-heroicons-eye" class="opacity-0 group-hover:opacity-60 text-[10px]" />
                  </span>
                  <UBadge :color="stats.draftArticles.length ? 'amber' : 'gray'" size="xs" variant="soft">
                    {{ stats.draftArticles.length }}
                  </UBadge>
                </div>

              </div>
            </div>

            <!-- Quick operations -->
            <div class="space-y-3 pt-2">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Действия обслуживания</h3>
              <GvButton
                type="button"
                color="sky"
                variant="soft"
                size="sm"
                icon="i-heroicons-link"
                class="w-full justify-start text-xs font-bold"
                @click="runRelink"
              >
                Перелинковать статьи
              </GvButton>
              <GvButton
                type="button"
                color="gray"
                variant="soft"
                size="sm"
                icon="i-heroicons-wrench"
                class="w-full justify-start text-xs font-bold"
                @click="runRepairHtml"
              >
                Исправить HTML разметку
              </GvButton>
            </div>
          </template>
        </div>
      </div>

      <!-- Right Pane: Stats, Activity & Graph Swatches (8/12) -->
      <div class="workspace-editor-pane col-span-8 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        
        <div v-if="error" class="p-6 text-red-500 flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-xl" />
          <span>{{ error.message }}</span>
          <GvButton type="button" variant="outline" color="gray" size="sm" @click="refresh()">Повторить</GvButton>
        </div>

        <div v-else-if="pending && !stats" class="flex-1 flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-sky-500" />
        </div>

        <div v-else-if="stats" class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="space-y-6">
            
            <!-- Summary Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div 
                v-for="card in summaryCards" 
                :key="card.label"
                class="p-4 rounded-xl border border-gray-150 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/10 flex items-center gap-3"
              >
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :class="[card.bg, card.color]">
                  <UIcon :name="card.icon" class="text-xl" />
                </div>
                <div>
                  <span class="block text-xl font-black text-gray-900 dark:text-white tabular-nums leading-none">{{ card.value }}</span>
                  <span class="block text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{{ card.label }}</span>
                </div>
              </div>
            </div>

            <!-- Two Column Activity and Graph Swatches -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <!-- Left Column: Activity Logs -->
              <div class="space-y-6">
                <!-- Recent Articles -->
                <div class="p-4 rounded-xl border border-gray-150 dark:border-zinc-800/50 space-y-4">
                  <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <UIcon name="i-heroicons-document-text" class="text-indigo-500 text-sm" /> Недавние изменения статей
                  </h3>
                  <div v-if="!stats.recentArticles || stats.recentArticles.length === 0" class="text-xs text-gray-500 py-4 text-center">
                    Нет изменений
                  </div>
                  <div v-else class="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                    <NuxtLink
                      v-for="art in stats.recentArticles"
                      :key="art.id"
                      :to="`/admin/articles?article_id=${art.id}`"
                      class="py-3 block hover:opacity-85 transition-opacity"
                    >
                      <div class="flex justify-between items-start gap-2">
                        <span class="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{{ art.title }}</span>
                        <span class="text-[10px] text-gray-400 shrink-0 font-mono">{{ formatDate(art.updated_at) }}</span>
                      </div>
                      <div class="text-[10px] text-gray-500 truncate mt-1">/{{ art.slug }}</div>
                    </NuxtLink>
                  </div>
                </div>

                <!-- Recent Glossary Terms -->
                <div class="p-4 rounded-xl border border-gray-150 dark:border-zinc-800/50 space-y-4">
                  <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <UIcon name="i-heroicons-bookmark" class="text-emerald-500 text-sm" /> Новые термины глоссария
                  </h3>
                  <div v-if="!stats.recentTerms || stats.recentTerms.length === 0" class="text-xs text-gray-500 py-4 text-center">
                    Нет терминов
                  </div>
                  <div v-else class="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                    <NuxtLink
                      v-for="term in stats.recentTerms"
                      :key="term.id"
                      :to="`/admin/glossary?term_id=${term.id}`"
                      class="py-3 block hover:opacity-85 transition-opacity"
                    >
                      <div class="flex justify-between items-start gap-2">
                        <span class="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{{ term.title }}</span>
                        <span class="text-[10px] text-gray-400 shrink-0 font-mono">{{ formatDate(term.updated_at) }}</span>
                      </div>
                      <div class="text-[10px] text-gray-500 truncate mt-1">/{{ term.slug }}</div>
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <!-- Right Column: Graph Swatches and Edge count -->
              <div class="space-y-6">
                <div class="p-4 rounded-xl border border-gray-150 dark:border-zinc-800/50 space-y-4">
                  <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <UIcon name="i-heroicons-share" class="text-sky-500 text-sm" /> Метрики Графа Знаний
                  </h3>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div 
                      v-for="k in graphKpis" 
                      :key="k.label"
                      class="p-3 bg-gray-50 dark:bg-zinc-800/5 rounded-lg border border-gray-150/50 dark:border-zinc-800/30"
                    >
                      <span class="block text-sm font-bold text-gray-500 dark:text-gray-400 leading-none">{{ k.label }}</span>
                      <span class="block text-lg font-black text-gray-900 dark:text-white tabular-nums mt-1.5">{{ k.value }}</span>
                    </div>
                  </div>

                  <p class="text-[10px] text-gray-400 leading-relaxed pt-2">
                    * Цвет отрезка в связях графа обозначает дочерний узел (согласно онтологии). Пунктирные линии отображают виртуальные и логические связи, сплошные — жесткие структурные ссылки.
                  </p>

                  <div class="flex flex-wrap gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider" aria-hidden="true">
                    <span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-full" style="background: #ef4444" />Категория</span>
                    <span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-full" style="background: #0ea5e9" />Книга</span>
                    <span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-full" style="background: #6366f1" />Статья</span>
                    <span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded-full" style="background: #10b981" />Термин</span>
                  </div>

                  <ul class="divide-y divide-gray-100 dark:divide-zinc-800 pt-2">
                    <li v-for="r in graphRows" :key="r.label" class="py-2.5 flex items-center justify-between text-xs">
                      <div class="flex items-center gap-3">
                        <span
                          class="w-8 h-1 rounded shrink-0"
                          :style="edgeMarkStyle(r)"
                        />
                        <div>
                          <span class="text-gray-700 dark:text-gray-300 font-medium">{{ r.label }}</span>
                          <span 
                            class="text-[9px] font-black uppercase px-1 py-0.5 rounded ml-2"
                            :class="r.kind === 'virtual' ? 'bg-sky-500/10 text-sky-500' : 'bg-indigo-500/10 text-indigo-500'"
                          >
                            {{ r.kind === 'virtual' ? 'вирт' : 'структ' }}
                          </span>
                        </div>
                      </div>
                      <span class="font-bold text-gray-900 dark:text-white tabular-nums">{{ r.value }}</span>
                    </li>
                  </ul>
                </div>

                <!-- Revision audit and Meta -->
                <div class="p-4 rounded-xl border border-gray-150 dark:border-zinc-800/50 text-xs space-y-3">
                  <h3 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <UIcon name="i-heroicons-clock" class="text-indigo-500 text-sm" /> Системная информация
                  </h3>
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-500">Всего ревизий в истории</span>
                    <span class="font-bold text-gray-900 dark:text-white tabular-nums">{{ stats.articleRevisions }}</span>
                  </div>
                  <div class="flex justify-between items-center py-1">
                    <span class="text-gray-500">Последнее изменение статей</span>
                    <span class="font-bold text-gray-900 dark:text-white">{{ formatDate(stats.meta.lastArticleUpdatedAt) }}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>

    <!-- Audit Details Modal -->
    <UModal v-model="isAuditModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl border border-gray-150 dark:border-zinc-800 flex flex-col max-h-[80vh]">
        <div class="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
            {{ auditModalTitle }} ({{ auditModalItems.length }})
          </h3>
          <GvButton 
            type="button" 
            color="gray" 
            variant="ghost" 
            size="xs" 
            icon="i-heroicons-x-mark" 
            @click="isAuditModalOpen = false" 
          />
        </div>

        <!-- Local Search inside Audit List -->
        <div class="py-3 shrink-0" v-if="auditModalItems.length > 5">
          <UInput 
            v-model="auditSearch" 
            placeholder="Поиск по названию..." 
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-full"
          />
        </div>

        <!-- Items list container -->
        <div class="flex-1 overflow-y-auto min-h-0 space-y-1.5 pt-2">
          <div v-if="filteredAuditItems.length === 0" class="text-center py-6 text-gray-400 text-xs font-medium">
            Нет элементов
          </div>
          <div v-else class="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
            <div 
              v-for="item in filteredAuditItems" 
              :key="item.id" 
              class="py-2.5 flex items-center justify-between gap-3 group"
            >
              <div class="min-w-0 flex-1">
                <span class="font-bold text-gray-900 dark:text-white block truncate text-xs">{{ item.title }}</span>
                <span class="text-[10px] text-gray-400 font-mono block mt-0.5 truncate">/{{ item.slug }}</span>
              </div>
              <GvButton
                type="button"
                :to="auditModalType === 'article' ? `/admin/articles?article_id=${item.id}` : `/admin/glossary?term_id=${item.id}`"
                color="sky"
                variant="soft"
                size="xs"
                icon="i-heroicons-pencil-square"
                @click="isAuditModalOpen = false"
              >
                Править
              </GvButton>
            </div>
          </div>
        </div>
      </div>
    </UModal>

    <!-- Tools Modal for Relink/Repair -->
    <UModal v-model="isToolsModalOpen" prevent-close :ui="{ width: 'sm:max-w-md' }">
      <div class="p-6 flex flex-col items-center gap-4 text-center bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-sky-500" />
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {{ toolsModalTitle }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ toolsModalMessage }}
          </p>
        </div>
      </div>
    </UModal>
  </div>
</template>

<style scoped>
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px); /* 65px is the topbar height */
  overflow: hidden;
  background: var(--gv-surface);
}

.workspace-grid {
  height: 100%;
  flex: 1;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.audit-scroll-container {
  overflow-y: auto;
  flex: 1;
}

.workspace-editor-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workspace-editor-scroll {
  overflow-y: auto;
  flex: 1;
}
</style>
