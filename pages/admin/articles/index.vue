<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-12 gap-0">
      
      <!-- Left Pane: List (3/12) -->
      <div class="workspace-list col-span-3 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <UIcon name="i-heroicons-briefcase" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Workspace</h1>
              <p class="text-[10px] text-gray-500 font-medium">Статьи & Книги</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UDropdown :items="[
              [
                { label: 'Скачать шаблон импорта JSON', icon: 'i-heroicons-document-arrow-down', click: runDownloadTemplate }
              ]
            ]">
              <GvButton type="button" color="gray" variant="soft" size="xs" icon="i-heroicons-cog-8-tooth">Инструменты</GvButton>
            </UDropdown>
            <UDropdown :items="[
              [
                { label: 'Создать статью', icon: 'i-heroicons-plus', click: startCreate },
                { label: 'Импорт из ODT', icon: 'i-heroicons-document-text', to: '/admin/import' },
                { label: 'Импорт из ZIP/JSON', icon: 'i-heroicons-arrow-up-tray', click: () => { importJsonInputRef?.click() } }
              ]
            ]">
              <GvButton type="button" color="sky" size="xs" icon="i-heroicons-plus" trailing-icon="i-heroicons-chevron-down-20-solid">Новый</GvButton>
            </UDropdown>
          </div>
          
          <input
            ref="importJsonInputRef"
            type="file"
            accept=".zip,.json"
            class="sr-only"
            @change="onImportFileSelect"
          >
        </header>
        
        <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <BaseSearch
              v-model="searchQuery"
              placeholder="Поиск по статьям..."
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
                <span class="filter-group-label">Книги</span>
                <select v-model="filterBookId" class="filter-select gv-admin-filter-select">
                  <option value="">Все книги</option>
                  <option v-for="book in books" :key="book.id" :value="String(book.id)">{{ book.title }}</option>
                </select>
              </div>

              <div class="filter-group">
                <span class="filter-group-label">Категории</span>
                <select v-model="filterCategoryId" class="filter-select gv-admin-filter-select">
                  <option value="">Все категории</option>
                  <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
                </select>
              </div>
              
              <div class="filter-group">
                <span class="filter-group-label">Переводы</span>
                <select v-model="filterTranslation" class="filter-select gv-admin-filter-select">
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
            <button type="button" @click="isBulkCategoryModalOpen = true; selectedBulkCategoryId = ''" class="text-indigo-500 hover:text-indigo-700 flex items-center gap-1 font-bold">
              <UIcon name="i-heroicons-tag" /> Категория ({{ selectedIds.size }})
            </button>
            <button type="button" @click="bulkDelete" class="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold">
              <UIcon name="i-heroicons-trash" /> Удалить ({{ selectedIds.size }})
            </button>
          </div>
        </div>

        <div class="articles-scroll-container flex-1 overflow-y-auto">
          <div v-if="pendingList && filteredArticles.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Загрузка списка...</p>
          </div>
          <div v-else-if="filteredArticles.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-magnifying-glass" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Ничего не найдено</p>
          </div>
          <div v-else class="articles-list flex-1 divide-y divide-gray-100 dark:divide-gray-850">
            <div 
              v-for="article in filteredArticles" 
              :key="article.id"
              class="article-item"
              :class="{ 'article-item--active': selectedArticleId === article.id, 'article-item--selected': selectedIds.has(article.id) }"
              @click="selectedArticleId = article.id"
            >
              <div class="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  :checked="selectedIds.has(article.id)" 
                  @change="toggleSelect(article.id)" 
                  @click.stop
                  class="gv-checkbox mt-1 shrink-0" 
                />
                
                <div class="flex-1 min-w-0">
                  <div class="article-item-main flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="article-title truncate">{{ article.title }}</span>
                      <UIcon 
                        v-if="article.is_published" 
                        name="i-heroicons-check-circle" 
                        class="text-green-500 text-sm shrink-0" 
                        title="Опубликовано" 
                      />
                      <UIcon 
                        v-else 
                        name="i-heroicons-pencil-square" 
                        class="text-amber-500 text-sm shrink-0" 
                        title="Черновик" 
                      />
                    </div>
                    <div class="lang-badges shrink-0">
                      <span class="lang-badge" :class="article.translation_valid_en ? 'lang-badge--valid' : 'lang-badge--invalid'">EN</span>
                      <span class="lang-badge" :class="article.translation_valid_ru ? 'lang-badge--valid' : 'lang-badge--invalid'">RU</span>
                      <span class="lang-badge" :class="article.translation_valid_zh ? 'lang-badge--valid' : 'lang-badge--invalid'">ZH</span>
                    </div>
                  </div>
                  
                  <div class="article-item-meta flex items-center justify-between mt-1 text-[11px] text-gray-400">
                    <span class="article-slug truncate font-mono text-[10px]">{{ article.slug }}</span>
                    
                    <div class="flex items-center gap-2 shrink-0 font-bold">
                      <span v-if="article.book_title" class="book-badge truncate max-w-[100px]" :title="article.book_title">
                        {{ article.book_title }}
                      </span>
                      <span v-if="article.category_title" class="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border border-gray-150 dark:border-zinc-800" style="color: #ef4444; background: rgba(239, 68, 68, 0.1);">
                        {{ article.category_title.slice(0, 8) }}
                      </span>
                      
                      <span v-if="article.is_term_article" class="term-badge-mini" title="Раскрытие термина">ТЕРМИН</span>
                      
                      <UIcon v-if="article.presentation_path || article.presentation_path_ru || article.presentation_path_zh" name="i-heroicons-presentation-chart-bar" class="text-indigo-500 text-xs shrink-0" title="Есть презентация" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="p-3 border-t border-gray-100 dark:border-gray-805 bg-white dark:bg-[#161618] flex justify-center shrink-0">
            <GvPagination
              v-model="page"
              :total="totalCount"
              :page-size="limit"
            />
          </div>
        </div>
      </div>

      <!-- Right Pane: Editor (9/12) -->
      <div class="workspace-editor-pane col-span-9 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        <div v-if="!selectedArticleId" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите статью слева для редактирования</p>
        </div>
        
        <AdminArticleForm
          v-else 
          :article-id="selectedArticleId === 'new' ? undefined : selectedArticleId" 
          :term-id="termId"
          @article-created="onArticleCreated"
          @article-saved="onArticleSaved"
        />
      </div>

    </div>

    <!-- Tools / Progress Modal -->
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
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Экспорт статей</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Вы выбрали выгрузку <strong>{{ exportMode === 'selected' ? selectedIds.size + ' статей' : 'по фильтру' }}</strong>.
        </p>
        
        <div class="mt-6 flex justify-end gap-3">
          <GvButton type="button" color="gray" variant="soft" @click="isExportModalOpen = false">Отмена</GvButton>
          <GvButton type="button" color="sky" icon="i-heroicons-arrow-down-tray" @click="runExport">Выгрузить архив</GvButton>
        </div>
      </div>
    </UModal>

    <!-- Bulk Category Modal -->
    <UModal v-model="isBulkCategoryModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Назначить категорию</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Выбрано статей: <strong>{{ selectedIds.size }}</strong>. Будет обновлена их категория.
        </p>
        
        <select v-model="selectedBulkCategoryId" class="filter-select gv-admin-filter-select w-full mt-2">
          <option value="">Без категории (Очистить)</option>
          <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
        </select>
        
        <div class="mt-6 flex justify-end gap-3">
          <GvButton type="button" color="gray" variant="soft" @click="isBulkCategoryModalOpen = false">Отмена</GvButton>
          <GvButton type="button" color="sky" icon="i-heroicons-check" @click="applyBulkCategory" :loading="isApplyingBulkCategory">Применить</GvButton>
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
        
        <div class="relative z-10 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-gray-800 mt-4 shrink-0" v-if="importPreviewAssets.length > 0">
          <h4 class="text-xs font-bold text-gray-900 dark:text-white mb-2">Ассеты в архиве ({{ importPreviewAssets.length }}):</h4>
          <div class="max-h-[100px] overflow-y-auto text-xs font-mono text-gray-500 dark:text-gray-400">
            <div v-for="asset in importPreviewAssets" :key="asset" class="truncate">{{ asset }}</div>
          </div>
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
import AdminArticleForm from '~/components/admin/AdminArticleForm.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'role'], fluid: true })
useSeoMeta({ title: 'Workspace — Articles — Gativus Admin' })

const route = useRoute()
const store = userStore()
const toast = useToast()

const selectedArticleId = ref<number | string | null>(null)
const isToolsModalOpen = ref(false)
const toolsModalTitle = ref('')
const toolsModalMessage = ref('')

// Export state
const isExportModalOpen = ref(false)
const exportMode = ref<'selected' | 'filter'>('selected')

const importJsonInputRef = ref<HTMLInputElement | null>(null)
const isImportPreviewModalOpen = ref(false)
const importPreviewData = ref<any>({ nodes: [], links: [] })
const importPreviewAssets = ref<string[]>([])
const importFileToConfirm = ref<File | null>(null)

// Filters
const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const filterBookId = ref('')
const filterCategoryId = ref('')
const filterTranslation = ref('')
const page = ref(1)
const limit = 20

const activeFilterCount = computed(() => {
  let count = 0
  if (filterBookId.value) count++
  if (filterCategoryId.value) count++
  if (filterTranslation.value) count++
  return count
})

// Multi-select state
const selectedIds = ref(new Set<number>())

// Books list for filter
const { data: booksData } = await useAsyncData('admin-books-workspace', () =>
  $fetch<any>('/api/books', { headers: store.getAuthHeader() })
)
const books = computed(() => (booksData.value || []) as any[])

// Categories list for filter
const { data: categoriesData } = await useAsyncData('admin-categories-workspace', () =>
  $fetch<any>('/api/categories', { headers: store.getAuthHeader() })
)
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value
  return categoriesData.value?.items || []
})

// Reset page & select-all on filter change
watch([debouncedQuery, filterBookId, filterCategoryId, filterTranslation], () => { 
  page.value = 1
  selectedIds.value = new Set()
})
watch(page, () => { selectedIds.value = new Set() })

// Fetch list of articles
const { data, pending: pendingList, refresh } = await useAsyncData(
  'admin-articles-workspace',
  () => $fetch<any>('/api/articles', {
    params: {
      search: debouncedQuery.value || undefined,
      book_id: filterBookId.value || undefined,
      category_id: filterCategoryId.value || undefined,
      translation_filter: filterTranslation.value || undefined,
      published_only: 'false',
      include_term_articles: 'true',
      page: page.value,
      limit,
    },
    headers: store.getAuthHeader()
  }),
  { watch: [debouncedQuery, filterBookId, filterCategoryId, filterTranslation, page] }
)

const filteredArticles = computed(() => data.value?.items || [])
const totalCount = computed(() => data.value?.total || 0)

// Select All logic
const allSelected = computed(() =>
  filteredArticles.value.length > 0 && filteredArticles.value.every((a: any) => selectedIds.value.has(a.id))
)

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(filteredArticles.value.map((a: any) => a.id))
  }
}

// Bulk Actions
const isBulkDeleting = ref(false)
async function bulkDelete() {
  if (!selectedIds.value.size) return
  if (!confirm(`Удалить выбранные статьи (${selectedIds.value.size} шт.)? Это действие нельзя отменить!`)) return
  
  isBulkDeleting.value = true
  const targets = filteredArticles.value.filter((a: any) => selectedIds.value.has(a.id))
  let ok = 0, fail = 0
  
  for (const a of targets) {
    try {
      await $fetch(`/api/articles/${a.slug}`, { method: 'DELETE' as any, headers: store.getAuthHeader() })
      ok++
    } catch {
      fail++
    }
  }
  
  selectedIds.value = new Set()
  isBulkDeleting.value = false
  toast.add({ 
    title: fail ? `Удалено: ${ok}, ошибок: ${fail}` : `Удалено ${ok} статей`, 
    color: fail ? 'orange' : 'green' 
  })
  
  // If the active article was deleted, clear selection
  if (selectedArticleId.value && targets.some((a: any) => a.id === selectedArticleId.value)) {
    selectedArticleId.value = null
  }
  
  refresh()
}

// Exports
function openExportModal(mode: 'selected' | 'filter') {
  if (mode === 'selected' && selectedIds.value.size === 0) return
  exportMode.value = mode
  isExportModalOpen.value = true
}

const isBulkCategoryModalOpen = ref(false)
const selectedBulkCategoryId = ref('')
const isApplyingBulkCategory = ref(false)

async function applyBulkCategory() {
  if (selectedIds.value.size === 0) return
  isApplyingBulkCategory.value = true
  try {
    const res = await $fetch<any>('/api/admin/articles/bulk-category', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        ids: Array.from(selectedIds.value),
        category_id: selectedBulkCategoryId.value ? parseInt(selectedBulkCategoryId.value) : null
      }
    })
    toast.add({ title: 'Успех', description: `Обновлено статей: ${res.count}`, color: 'green' })
    isBulkCategoryModalOpen.value = false
    selectedIds.value.clear()
    refresh()
  } catch (e: any) {
    toast.add({ title: 'Ошибка', description: e.data?.message || e.message, color: 'red' })
  } finally {
    isApplyingBulkCategory.value = false
  }
}

async function runExport() {
  const query = new URLSearchParams()
  
  if (exportMode.value === 'selected') {
    query.set('ids', Array.from(selectedIds.value).join(','))
  } else {
    if (debouncedQuery.value) query.set('search', debouncedQuery.value)
    if (filterBookId.value) query.set('book_id', filterBookId.value)
    if (filterCategoryId.value) query.set('category_id', filterCategoryId.value)
    if (filterTranslation.value) query.set('translation_filter', filterTranslation.value)
  }
  
  isExportModalOpen.value = false
  const url = `/api/admin/articles/export?${query.toString()}`
  
  try {
    toast.add({ title: 'Экспорт запущен, ожидайте...' })
    const response = await $fetch.raw<Blob>(url, { 
      headers: store.getAuthHeader(),
      responseType: 'blob'
    })
    
    if (!response.ok) throw new Error('Ошибка скачивания файла')

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'export.zip'
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
  const url = `/api/admin/articles/export-template`
  try {
    const response = await $fetch.raw<Blob>(url, {
      headers: store.getAuthHeader(),
      responseType: 'blob'
    })
    if (!response.ok) throw new Error('Ошибка скачивания шаблона')

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'gativus-article-import-template.json'
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
  selectedArticleId.value = 'new'
}

async function onImportFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]
    if (!file.name.endsWith('.json') && !file.name.endsWith('.zip')) {
      toast.add({ title: 'Неверный формат', description: 'Загрузите ZIP или JSON файл', color: 'red' })
      return
    }
    
    importFileToConfirm.value = file
    importPreviewAssets.value = []

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await $fetch<any>('/api/admin/sync/preview', {
        method: 'POST',
        body: formData,
        headers: store.getAuthHeader()
      })
      if (res.success && res.dump) {
        importPreviewData.value = generateImportGraphPreview(res.dump)
        importPreviewAssets.value = res.assets || []
        isImportPreviewModalOpen.value = true
      }
    } catch (err: any) {
      toast.add({ title: 'Ошибка предпросмотра', description: err?.data?.message || err.message, color: 'red' })
    }
    if (importJsonInputRef.value) importJsonInputRef.value.value = ''
  }
}

async function confirmImport() {
  if (!importFileToConfirm.value) return
  isImportPreviewModalOpen.value = false
  
  toolsModalTitle.value = 'Импорт статей'
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
    
    refresh()
  } catch (err: any) {
    toast.add({ title: 'Ошибка импорта', description: err?.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
    importFileToConfirm.value = null
  }
}

function onArticleCreated(newId: number) {
  selectedArticleId.value = newId
  refresh()
}

function onArticleSaved() {
  refresh()
}

// Redirect helpers for term creation mapping
const termId = computed(() => route.query.term_id ? String(route.query.term_id) : undefined)

// Sync selection to query parameters & vice-versa
onMounted(() => {
  if (route.query.article_id !== undefined && route.query.article_id !== null) {
    const val = String(route.query.article_id)
    selectedArticleId.value = val === 'new' ? 'new' : Number(val)
  }
})

watch(() => route.query.article_id, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    const val = String(newVal)
    const targetVal = val === 'new' ? 'new' : Number(val)
    if (selectedArticleId.value !== targetVal) {
      selectedArticleId.value = targetVal
    }
  } else {
    selectedArticleId.value = null
  }
})

watch(selectedArticleId, (newId) => {
  if (newId !== null) {
    navigateTo({
      path: '/admin/articles',
      query: { ...route.query, article_id: String(newId) }
    }, { replace: true })
  } else {
    const newQuery = { ...route.query }
    delete newQuery.article_id
    navigateTo({
      path: '/admin/articles',
      query: newQuery
    }, { replace: true })
  }
})
</script>

<style scoped>
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px);
  overflow: hidden;
  background: var(--gv-surface);
}

.workspace-grid {
  height: 100%;
  flex: 1;
}

.article-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
}

.article-item:hover {
  background: rgba(0, 0, 0, 0.02);
}
.dark .article-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.article-item--active {
  background: rgba(99, 102, 241, 0.05) !important;
  border-left: 3px solid #6366f1;
  padding-left: 13px;
}
.dark .article-item--active {
  background: rgba(99, 102, 241, 0.1) !important;
}

.article-item--selected {
  background: rgba(99, 102, 241, 0.02);
}

.article-title {
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
.field-input:focus { border-color: #6366f1; }
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

.book-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #6366f1;
  font-weight: 700;
}
.dark .book-badge {
  background: #1e1b4b;
  color: #818cf8;
}

.term-badge-mini {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 4px;
  background: #f0f9ff;
  color: #0ea5e9;
  border: 1px solid #bae6fd;
}
.dark .term-badge-mini {
  background: #082f49;
  color: #7dd3fc;
  border-color: #0c4a6e;
}

.gv-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #6366f1;
}

.filter-select {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  min-width: 160px;
}
.dark .filter-select {
  background: #1e1e21;
  border-color: #2a2a2e;
  color: #e5e5e5;
}
</style>
