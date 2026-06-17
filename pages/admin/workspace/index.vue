<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-5 gap-0">
      
      <!-- Left Pane: List (2/5) -->
      <div class="workspace-list col-span-2 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-briefcase" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Workspace</h1>
              <p class="text-[10px] text-gray-500 font-medium">Глоссарий & Статьи</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UDropdown :items="[
              [
                { label: 'Перелинковать все статьи', icon: 'i-heroicons-link', click: runRelink },
                { label: 'Восстановить сломанный HTML', icon: 'i-heroicons-wrench', click: runRepairHtml }
              ]
            ]">
              <GvButton type="button" color="gray" variant="soft" size="xs" icon="i-heroicons-cog-8-tooth">Инструменты</GvButton>
            </UDropdown>
            <GvButton to="/admin/glossary/create" color="sky" size="xs" icon="i-heroicons-plus">Новый</GvButton>
          </div>
        </header>
        
        <div class="list-controls p-4 shrink-0 bg-white dark:bg-[#111113] border-b border-gray-200 dark:border-gray-800">
          <BaseSearch
            v-model="searchQuery"
            placeholder="Поиск по терминам..."
            :is-pending="pendingList"
            :is-debouncing="isTyping"
          />
          <div class="mt-3">
            <select v-model="categoryFilter" class="field-input w-full text-xs">
              <option value="">Все категории</option>
              <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
            </select>
          </div>
        </div>

        <div class="terms-scroll-container flex-1 bg-white dark:bg-[#111113]">
          <div v-if="pendingList" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Загрузка списка...</p>
          </div>
          <div v-else-if="filteredTerms.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-magnifying-glass" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Ничего не найдено</p>
          </div>
          <div v-else class="terms-list flex-1">
            <div 
              v-for="term in filteredTerms" 
              :key="term.id"
              class="term-item"
              :class="{ 'term-item--active': selectedTermId === term.id }"
              @click="selectedTermId = term.id"
            >
              <div class="term-item-main">
                <span class="term-title">{{ term.title }}</span>
                <div class="lang-badges">
                  <span class="lang-badge" :class="term.translation_valid_en ? 'lang-badge--valid' : 'lang-badge--invalid'">EN</span>
                  <span class="lang-badge" :class="term.translation_valid_ru ? 'lang-badge--valid' : 'lang-badge--invalid'">RU</span>
                  <span class="lang-badge" :class="term.translation_valid_zh ? 'lang-badge--valid' : 'lang-badge--invalid'">ZH</span>
                </div>
              </div>
              <div class="term-item-meta">
                <span class="term-slug">{{ term.slug }}</span>
                <UIcon v-if="term.has_article" name="i-heroicons-document-text" class="text-sky-500" title="Есть статья-раскрытие" />
              </div>
            </div>
          </div>
          
          <div class="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] flex justify-center shrink-0">
            <UPagination
              v-if="data?.total > 30"
              v-model="page"
              :page-count="30"
              :total="data.total"
              size="sm"
            />
          </div>
        </div>
      </div>

      <!-- Right Pane: Editor (3/5) -->
      <div class="workspace-editor-pane col-span-3 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0">
        <div v-if="!selectedTermId" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите термин слева для редактирования</p>
        </div>
        
        <WorkspaceEditor 
          v-else 
          :term-id="selectedTermId" 
          @loading-change="isEditorLoading = $event"
        />

        <!-- Global Loader Overlay over the right pane -->
        <Transition name="fade-loader">
          <div v-if="isEditorLoading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-sm">
            <div class="loader-modal bg-white dark:bg-[#1e1e21] shadow-2xl rounded-2xl p-8 flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-800">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-sky-500" />
              <div class="text-center">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-1">Загрузка</h3>
                <p class="text-[10px] text-gray-500 font-medium">Подготовка workspace...</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WorkspaceEditor from '~/components/admin/WorkspaceEditor.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'role'] })
useSeoMeta({ title: 'Workspace — Admin — Gativus' })

const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const categoryFilter = ref('')
const store = userStore()

const selectedTermId = ref<number | null>(null)
const isEditorLoading = ref(false)
const toast = useToast()

async function runRelink() {
  if (!confirm('Перезапустить автолинковку для ВСЕХ статей? Это может занять некоторое время.')) return
  try {
    const res = await $fetch<any>('/api/admin/relink', { method: 'POST', headers: store.getAuthHeader() })
    toast.add({ title: 'Успешно', description: res.message || 'Перелинковка завершена', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.data?.statusMessage || err.message, color: 'red' })
  }
}

async function runRepairHtml() {
  if (!confirm('Восстановить HTML разметку во всех статьях?')) return
  try {
    const res = await $fetch<any>('/api/admin/repair-linker-html', { method: 'POST', headers: store.getAuthHeader() })
    toast.add({ title: 'Успешно', description: res.message || 'Восстановление завершено', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.data?.statusMessage || err.message, color: 'red' })
  }
}

// Categories
const { data: categoriesData } = await useAsyncData('admin-cats-workspace', () =>
  $fetch<any>('/api/categories', { headers: store.getAuthHeader() })
)
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value
  return categoriesData.value?.items || []
})

// Fetch terms
const page = ref(1)

watch([debouncedQuery, categoryFilter], () => { page.value = 1 })

const { data, pending: pendingList } = await useAsyncData(
  'admin-terms-workspace',
  () => $fetch<any>('/api/terms', {
    params: {
      search: debouncedQuery.value || undefined,
      category_id: categoryFilter.value || undefined,
      page: page.value,
      limit: 30,
    },
    headers: store.getAuthHeader()
  }),
  { watch: [debouncedQuery, categoryFilter, page] }
)

const filteredTerms = computed(() => data.value?.items || [])
</script>

<style scoped>
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px); /* 65px is the topbar height */
  margin: -20px -20px -28px -20px; /* Counteract admin-content layout paddings */
  overflow: hidden;
  background: var(--gv-surface);
}

.workspace-grid {
  height: 100%;
  flex: 1;
}

.terms-scroll-container {
  overflow-y: auto;
}

.term-item {
  padding: 14px 20px;
  border-bottom: 1px solid var(--gv-border-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: transparent;
}

.term-item:hover {
  background: rgba(0, 0, 0, 0.02);
}
.dark .term-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.term-item--active {
  background: rgba(14, 165, 233, 0.05) !important;
  border-left: 3px solid #0ea5e9;
  padding-left: 17px;
}
.dark .term-item--active {
  background: rgba(14, 165, 233, 0.1) !important;
}

.term-item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.term-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.term-item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.term-slug {
  font-size: 11px;
  font-family: monospace;
  color: var(--gv-text-secondary);
}

.field-input {
  padding: 8px 12px;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-subtle);
  background: var(--gv-surface);
  color: var(--gv-text-primary);
  width: 100%;
  outline: none;
}
.field-input:focus { border-color: #0ea5e9; }

.lang-badges { display: flex; gap: 4px; }
.lang-badge {
  padding: 2px 5px; border-radius: 4px; border: 1px solid;
  font-size: 9px; font-weight: 800; letter-spacing: 0.05em;
}
.lang-badge--valid {
  background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.2); color: #16a34a;
}
.lang-badge--invalid {
  background: rgba(148,163,184,0.1); border-color: rgba(148,163,184,0.2); color: #94a3b8;
}
.dark .lang-badge--valid { color: #4ade80; }
.dark .lang-badge--invalid { color: #64748b; }

/* 0.2s Fade Loader Animation */
.fade-loader-enter-active,
.fade-loader-leave-active {
  transition: opacity 0.2s ease;
}
.fade-loader-enter-from,
.fade-loader-leave-to {
  opacity: 0;
}
</style>
