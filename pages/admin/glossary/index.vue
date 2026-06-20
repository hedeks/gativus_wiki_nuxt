<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-5 gap-0">
      
      <!-- Left Pane: List (2/5) -->
      <div class="workspace-list col-span-2 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
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
              ],
              [
                { label: 'Скачать шаблон импорта', icon: 'i-heroicons-document-arrow-down', click: runDownloadTemplate }
              ]
            ]">
              <GvButton type="button" color="gray" variant="soft" size="xs" icon="i-heroicons-cog-8-tooth">Инструменты</GvButton>
            </UDropdown>
            <UDropdown :items="[
              [
                { label: 'Создать', icon: 'i-heroicons-plus', click: startCreate },
                { label: 'Импорт из JSON', icon: 'i-heroicons-arrow-up-tray', click: () => { importJsonInputRef?.click() } }
              ]
            ]">
              <GvButton type="button" color="sky" size="xs" icon="i-heroicons-plus" trailing-icon="i-heroicons-chevron-down-20-solid">Новый</GvButton>
            </UDropdown>
          </div>
          
          <input
            ref="importJsonInputRef"
            type="file"
            accept=".json"
            class="sr-only"
            @change="onImportFileSelect"
          >
        </header>
        
        <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <BaseSearch
              v-model="searchQuery"
              placeholder="Поиск по терминам..."
              :is-pending="pendingList"
              :is-debouncing="isTyping"
              class="flex-1"
            />
            
            <ExpandableFilters
              label="Фильтры"
              :active-count="activeFilterCount"
              :has-active-filters="activeFilterCount > 0"
            >
              <div class="filter-group">
                <span class="filter-group-label">Сортировка</span>
                <select v-model="sortBy" class="filter-select gv-admin-filter-select">
                  <option value="title_asc">Название (А-Я)</option>
                  <option value="title_desc">Название (Я-А)</option>
                  <option value="mentions_desc">Упоминания (max)</option>
                  <option value="mentions_asc">Упоминания (min)</option>
                  <option value="category_asc">Категория (А-Я)</option>
                  <option value="category_desc">Категория (Я-А)</option>
                </select>
              </div>
              
              <div class="filter-group">
                <span class="filter-group-label">Категория</span>
                <select v-model="categoryFilter" class="filter-select gv-admin-filter-select">
                  <option value="">Все категории</option>
                  <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
                </select>
              </div>

              <div class="filter-group">
                <span class="filter-group-label">Переводы</span>
                <select v-model="translationFilter" class="filter-select gv-admin-filter-select">
                  <option value="">Все статусы</option>
                  <option value="complete">Все языки валидны</option>
                  <option value="incomplete">Не все языки валидны</option>
                  <option value="missing_ru">Нет RU</option>
                  <option value="missing_zh">Нет ZH</option>
                </select>
              </div>
            </ExpandableFilters>

            <GvButton 
              v-if="activeFilterCount > 0 || debouncedQuery"
              type="button" 
              color="sky" 
              variant="soft" 
              icon="i-heroicons-arrow-down-tray"
              title="Экспорт по фильтру"
              @click="openExportModal('filter')"
            />
          </div>
        </div>

        <!-- Select All / Bulk Action Bar -->
        <div class="px-4 py-2 bg-gray-50 dark:bg-zinc-800/20 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider shrink-0">
          <div class="flex items-center gap-3">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" class="gv-checkbox" />
            <span>Выбрать все</span>
          </div>
          <div v-if="selectedIds.size > 0" class="flex items-center gap-4">
            <button type="button" @click="openExportModal('selected')" class="text-sky-500 hover:text-sky-700 flex items-center gap-1 font-bold">
              <UIcon name="i-heroicons-arrow-down-tray" /> Экспорт ({{ selectedIds.size }})
            </button>
            <button type="button" @click="bulkDelete" class="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold">
              <UIcon name="i-heroicons-trash" /> Удалить ({{ selectedIds.size }})
            </button>
          </div>
        </div>

        <div class="terms-scroll-container flex-1 overflow-y-auto">
          <div v-if="pendingList && filteredTerms.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Загрузка списка...</p>
          </div>
          <div v-else-if="filteredTerms.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-magnifying-glass" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Ничего не найдено</p>
          </div>
          <div v-else class="terms-list flex-1 divide-y divide-gray-100 dark:divide-gray-850">
            <div 
              v-for="term in filteredTerms" 
              :key="term.id"
              class="term-item"
              :class="{ 'term-item--active': selectedTermId === term.id, 'term-item--selected': selectedIds.has(term.id) }"
              @click="selectedTermId = term.id"
            >
              <div class="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  :checked="selectedIds.has(term.id)" 
                  @change="toggleSelect(term.id)" 
                  @click.stop
                  class="gv-checkbox mt-1 shrink-0" 
                />
                
                <div class="flex-1 min-w-0">
                  <div class="term-item-main flex items-center justify-between gap-2">
                    <span class="term-title truncate">{{ term.title }}</span>
                    <div class="lang-badges shrink-0">
                      <span class="lang-badge" :class="term.translation_valid_en ? 'lang-badge--valid' : 'lang-badge--invalid'">EN</span>
                      <span class="lang-badge" :class="term.translation_valid_ru ? 'lang-badge--valid' : 'lang-badge--invalid'">RU</span>
                      <span class="lang-badge" :class="term.translation_valid_zh ? 'lang-badge--valid' : 'lang-badge--invalid'">ZH</span>
                    </div>
                  </div>
                  
                  <div class="term-item-meta flex items-center justify-between mt-1 text-[11px] text-gray-400">
                    <span class="term-slug truncate font-mono text-[10px]">{{ term.slug }}</span>
                    
                    <div class="flex items-center gap-2 shrink-0 font-bold">
                      <span v-if="term.category_title" class="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border border-gray-150 dark:border-zinc-800" :style="{ color: term.category_color, background: `${term.category_color}11` }">
                        {{ term.category_title.slice(0, 8) }}
                      </span>
                      
                      <span class="mention-count-badge flex items-center gap-0.5" title="Упоминаний в статьях">
                        <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="text-sky-500 text-xs" />
                        {{ term.mention_count || 0 }}
                      </span>
                      
                      <UIcon v-if="term.has_article" name="i-heroicons-document-text" class="text-sky-500 text-xs" title="Есть статья-раскрытие" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-3 border-t border-gray-100 dark:border-gray-805 bg-white dark:bg-[#161618] flex justify-center shrink-0">
            <GvPagination
              v-model="page"
              :total="data ? data.total : 0"
              :page-size="limit"
            />
          </div>
        </div>
      </div>

      <!-- Right Pane: Editor (3/5) -->
      <div class="workspace-editor-pane col-span-3 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        <div v-if="!selectedTermId" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите термин слева для редактирования</p>
        </div>
        
        <WorkspaceEditor 
          v-slot="{}"
          v-else 
          :term-id="selectedTermId" 
          @loading-change="isEditorLoading = $event"
          @term-created="onTermCreated"
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

    <!-- Relink / Repair Tools Progress Modal -->
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

    <!-- Export Modal -->
    <UModal v-model="isExportModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Экспорт терминов</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Вы выбрали выгрузку <strong>{{ exportMode === 'selected' ? selectedIds.size + ' терминов' : 'по фильтру' }}</strong>.
        </p>
        
        <label class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-sky-500 transition-colors">
          <input type="checkbox" v-model="exportIncludeArticles" class="gv-checkbox mt-0.5" />
          <div>
            <div class="text-sm font-bold text-gray-900 dark:text-white">Включить статьи-раскрытия</div>
            <div class="text-xs text-gray-500">Экспортирует HTML-содержимое связанных статей (тяжелее JSON, но даёт полный контекст).</div>
          </div>
        </label>
        
        <div class="mt-6 flex justify-end gap-3">
          <GvButton type="button" color="gray" variant="soft" @click="isExportModalOpen = false">Отмена</GvButton>
          <GvButton type="button" color="sky" icon="i-heroicons-arrow-down-tray" @click="runExport">Выгрузить JSON</GvButton>
        </div>
      </div>
    </UModal>

    <!-- Import Preview Modal -->
    <UModal v-model="isImportPreviewModalOpen" :ui="{ width: 'sm:max-w-4xl' }">
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800 flex flex-col h-[80vh]">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Предпросмотр импорта</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          В файле найдено узлов: <b>{{ importPreviewData.nodes.length }}</b> / связей: <b>{{ importPreviewData.links.length }}</b>.
        </p>
        
        <div class="flex-1 bg-gray-50 dark:bg-[#111113] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden relative min-h-0">
          <KnowledgeGraphVisualizer 
            v-if="isImportPreviewModalOpen"
            :graphData="importPreviewData" 
            :pending="false" 
            :enableNavigation="false"
            :disableLod="true"
          />
        </div>
        
        <div class="mt-6 flex justify-end gap-3 shrink-0">
          <GvButton type="button" color="gray" variant="soft" @click="isImportPreviewModalOpen = false">Отмена</GvButton>
          <GvButton type="button" color="sky" icon="i-heroicons-arrow-up-tray" @click="confirmImport">Импортировать</GvButton>
        </div>
      </div>
    </UModal>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import WorkspaceEditor from '~/components/admin/WorkspaceEditor.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'role'] })
useSeoMeta({ title: 'Workspace — Admin — Gativus' })

const route = useRoute()
const store = userStore()
const toast = useToast()

const selectedTermId = ref<number | string | null>(null)
const isEditorLoading = ref(false)
const isToolsModalOpen = ref(false)
const toolsModalTitle = ref('')
const toolsModalMessage = ref('')

// Export state
const isExportModalOpen = ref(false)
const exportMode = ref<'selected' | 'filter'>('selected')
const exportIncludeArticles = ref(false)

const importJsonInputRef = ref<HTMLInputElement | null>(null)
const isImportPreviewModalOpen = ref(false)
const importPreviewData = ref<any>({ nodes: [], links: [] })
const importFileToConfirm = ref<File | null>(null)

// Filters
const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const categoryFilter = ref('')
const translationFilter = ref('')
const sortBy = ref('title_asc')
const page = ref(1)
const limit = 20

const activeFilterCount = computed(() => {
  let count = 0
  if (categoryFilter.value) count++
  if (translationFilter.value) count++
  return count
})

// Multi-select state
const selectedIds = ref(new Set<number>())

// Categories filter options
const { data: categoriesData } = await useAsyncData('admin-cats-workspace', () =>
  $fetch<any>('/api/categories', { headers: store.getAuthHeader() })
)
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value
  return categoriesData.value?.items || []
})

// Reset page & select-all on filter change
watch([debouncedQuery, categoryFilter, translationFilter, sortBy], () => { 
  page.value = 1
  selectedIds.value = new Set()
})
watch(page, () => { selectedIds.value = new Set() })

// Fetch list of terms
const { data, pending: pendingList } = await useAsyncData(
  'admin-terms-workspace',
  () => $fetch<any>('/api/terms', {
    params: {
      search: debouncedQuery.value || undefined,
      category_id: categoryFilter.value || undefined,
      translation_filter: translationFilter.value || undefined,
      sort_by: sortBy.value,
      page: page.value,
      limit,
    },
    headers: store.getAuthHeader()
  }),
  { watch: [debouncedQuery, categoryFilter, translationFilter, sortBy, page] }
)

const filteredTerms = computed(() => data.value?.items || [])

// Select All logic
const allSelected = computed(() =>
  filteredTerms.value.length > 0 && filteredTerms.value.every((t: any) => selectedIds.value.has(t.id))
)

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredTerms.value.map((t: any) => t.id))
  }
}

// Bulk Actions
const isBulkDeleting = ref(false)
async function bulkDelete() {
  if (!selectedIds.value.size) return
  if (!confirm(`Удалить выбранные термины (${selectedIds.value.size} шт.)? Это также удалит все связанные статьи-раскрытия!`)) return
  
  isBulkDeleting.value = true
  const targets = filteredTerms.value.filter((t: any) => selectedIds.value.has(t.id))
  let ok = 0, fail = 0
  
  for (const t of targets) {
    try {
      await $fetch(`/api/terms/${t.slug}`, { method: 'DELETE', headers: store.getAuthHeader() })
      ok++
    } catch {
      fail++
    }
  }
  
  selectedIds.value = new Set()
  isBulkDeleting.value = false
  toast.add({ 
    title: fail ? `Удалено: ${ok}, ошибок: ${fail}` : `Удалено ${ok} терминов`, 
    color: fail ? 'orange' : 'green' 
  })
  
  // If the active term was deleted, clear selection
  if (selectedTermId.value && targets.some((t: any) => t.id === selectedTermId.value)) {
    selectedTermId.value = null
  }
  
  // Refresh useAsyncData list
  const workspaceData = useNuxtApp().payload.data['admin-terms-workspace']
  refreshNuxtData('admin-terms-workspace')
}

// Relink / Repair Tools
async function runRelink() {
  if (!confirm('Перезапустить автолинковку для ВСЕХ статей? Это может занять некоторое время.')) return
  toolsModalTitle.value = 'Перелинковка статей'
  toolsModalMessage.value = 'Связи в статьях перестраиваются заново. Пожалуйста, подождите, это может занять до минуты...'
  isToolsModalOpen.value = true
  try {
    const res = await $fetch<any>('/api/admin/relink', { method: 'POST', headers: store.getAuthHeader() })
    toast.add({ title: 'Успешно', description: res.message || 'Перелинковка завершена', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
  }
}

async function runRepairHtml() {
  if (!confirm('Восстановить HTML разметку во всех статьях?')) return
  toolsModalTitle.value = 'Восстановление HTML'
  toolsModalMessage.value = 'Исправление поврежденной HTML-разметки во всех статьях. Пожалуйста, подождите...'
  isToolsModalOpen.value = true
  try {
    const res = await $fetch<any>('/api/admin/repair-linker-html', { method: 'POST', headers: store.getAuthHeader() })
    toast.add({ title: 'Успешно', description: res.message || 'Восстановление завершено', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
  }
}

// Exports
function openExportModal(mode: 'selected' | 'filter') {
  if (mode === 'selected' && selectedIds.value.size === 0) return
  exportMode.value = mode
  exportIncludeArticles.value = false
  isExportModalOpen.value = true
}

async function runExport() {
  const query = new URLSearchParams()
  query.set('include_articles', String(exportIncludeArticles.value))
  
  if (exportMode.value === 'selected') {
    query.set('ids', Array.from(selectedIds.value).join(','))
  } else {
    if (debouncedQuery.value) query.set('search', debouncedQuery.value)
    if (categoryFilter.value) query.set('category_id', categoryFilter.value)
    if (translationFilter.value) query.set('translation_filter', translationFilter.value)
  }
  
  isExportModalOpen.value = false
  const url = `/api/admin/terms/export?${query.toString()}`
  
  try {
    toast.add({ title: 'Экспорт запущен, ожидайте...' })
    const response = await $fetch.raw<Blob>(url, { 
      headers: store.getAuthHeader(),
      responseType: 'blob'
    })
    
    if (!response.ok) throw new Error('Ошибка скачивания файла')

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'export.json'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/) || contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) filename = decodeURIComponent(match[1])
    }

    const blob = response._data
    if (!blob) throw new Error('Пустой ответ')
    
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (err: any) {
    toast.add({ title: 'Ошибка экспорта', description: err.message, color: 'red' })
  }
}

async function runDownloadTemplate() {
  const url = `/api/admin/terms/export-template`
  try {
    const response = await $fetch.raw<Blob>(url, {
      headers: store.getAuthHeader(),
      responseType: 'blob'
    })
    if (!response.ok) throw new Error('Ошибка скачивания шаблона')

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'gativus-import-template.json'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) filename = match[1]
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err.message, color: 'red' })
  }
}

function startCreate() {
  selectedTermId.value = 'new'
}

async function onImportFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    if (!file.name.endsWith('.json')) {
      toast.add({ title: 'Неверный формат', description: 'Загрузите JSON файл', color: 'red' })
      return
    }
    
    importFileToConfirm.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const dump = JSON.parse(e.target?.result as string)
        importPreviewData.value = generateImportGraphPreview(dump)
        isImportPreviewModalOpen.value = true
      } catch (err) {
        toast.add({ title: 'Ошибка', description: 'Неверный формат JSON', color: 'red' })
      }
      if (importJsonInputRef.value) importJsonInputRef.value.value = ''
    }
    reader.readAsText(file)
  }
}

async function confirmImport() {
  if (!importFileToConfirm.value) return
  isImportPreviewModalOpen.value = false
  
  toolsModalTitle.value = 'Импорт терминов'
  toolsModalMessage.value = 'Пожалуйста, подождите, идет загрузка и обработка файла...'
  isToolsModalOpen.value = true
  
  try {
    const formData = new FormData()
    formData.append('file', importFileToConfirm.value)

    const res = await $fetch<any>('/api/admin/sync/import', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
    })
    toast.add({ title: 'Импорт завершен', description: res.message, color: 'green' })
    
    refreshNuxtData('admin-terms-workspace')
  } catch (err: any) {
    toast.add({ title: 'Ошибка импорта', description: err?.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
    importFileToConfirm.value = null
  }
}

function onTermCreated(newId: number) {
  selectedTermId.value = newId
  refreshNuxtData('admin-terms-workspace')
}

// Sync selection to query parameters & vice-versa
onMounted(() => {
  if (route.query.term_id !== undefined && route.query.term_id !== null) {
    const val = String(route.query.term_id)
    selectedTermId.value = val === 'new' ? 'new' : Number(val)
  }
})

watch(() => route.query.term_id, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    const val = String(newVal)
    const targetVal = val === 'new' ? 'new' : Number(val)
    if (selectedTermId.value !== targetVal) {
      selectedTermId.value = targetVal
    }
  } else {
    selectedTermId.value = null
  }
})

watch(selectedTermId, (newId) => {
  if (newId !== null) {
    navigateTo({
      path: '/admin/glossary',
      query: { ...route.query, term_id: String(newId) }
    }, { replace: true })
  } else {
    const newQuery = { ...route.query }
    delete newQuery.term_id
    navigateTo({
      path: '/admin/glossary',
      query: newQuery
    }, { replace: true })
  }
})
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

.term-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
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
  padding-left: 13px;
}
.dark .term-item--active {
  background: rgba(14, 165, 233, 0.1) !important;
}

.term-item--selected {
  background: rgba(14, 165, 233, 0.02);
}

.term-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.field-input {
  padding: 6px 10px;
  border-radius: var(--gv-radius-control, 8px);
  border: 1px solid var(--gv-border-subtle, #e5e7eb);
  background: var(--gv-surface, #fff);
  color: var(--gv-text-primary, #1a1a1a);
  width: 100%;
  outline: none;
}
.field-input:focus { border-color: #0ea5e9; }
.dark .field-input { background: #1e1e21; border-color: #2a2a2e; color: #e5e5e5; }

.lang-badges { display: flex; gap: 4px; }
.lang-badge {
  padding: 1px 4px; border-radius: 4px; border: 1px solid;
  font-size: 8px; font-weight: 800; letter-spacing: 0.05em;
}
.lang-badge--valid {
  background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.2); color: #16a34a;
}
.lang-badge--invalid {
  background: rgba(148,163,184,0.1); border-color: rgba(148,163,184,0.2); color: #94a3b8;
}
.dark .lang-badge--valid { color: #4ade80; }
.dark .lang-badge--invalid { color: #64748b; }

.gv-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #0ea5e9;
}

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
