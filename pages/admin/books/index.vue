<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  fluid: true
})

const store = userStore()
const route = useRoute()
const toast = useToast()

const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const categoryFilter = ref('')

const importJsonInputRef = ref<HTMLInputElement | null>(null)
const isToolsModalOpen = ref(false)
const toolsModalTitle = ref('')
const toolsModalMessage = ref('')

const isImportPreviewModalOpen = ref(false)
const importPreviewData = ref<any>({ nodes: [], links: [] })
const importFileToConfirm = ref<File | null>(null)

const isExportModalOpen = ref(false)
const exportMode = ref<'selected' | 'filter'>('selected')
const exportIncludeArticles = ref(false)

const selectedBookId = ref<number | string | null>(null)

// --- Load books list ---
const { data: books, pending, error, refresh } = await useFetch<any[]>('/api/books', {
  headers: store.getAuthHeader()
})

const { data: categories } = await useFetch<any[]>('/api/categories', {
  headers: store.getAuthHeader()
})

const categoriesList = computed(() => {
  if (Array.isArray(categories.value)) return categories.value as any[]
  return []
})

const activeFilterCount = computed(() => (categoryFilter.value ? 1 : 0))
const bookTotal = computed(() => (Array.isArray(books.value) ? books.value.length : 0))

const filteredBooks = computed(() => {
  const list = (Array.isArray(books.value) ? books.value : []) as any[]
  const query = debouncedQuery.value.trim().toLowerCase()
  return list.filter((book: any) => {
    const matchesSearch = !query || [book.title, book.slug, book.title_ru, book.title_zh].some((v) =>
      String(v || '').toLowerCase().includes(query)
    )
    const matchesCategory = !categoryFilter.value || (Array.isArray(book.category_ids) && book.category_ids.includes(Number(categoryFilter.value)))
    return matchesSearch && matchesCategory
  })
})

// --- URL Query Parameter Sync ---
watch(() => route.query.book_id, (newVal) => {
  if (newVal) {
    selectedBookId.value = newVal === 'new' ? 'new' : Number(newVal)
  } else {
    selectedBookId.value = null
  }
}, { immediate: true })

function selectBook(id: number | string) {
  selectedBookId.value = id
  navigateTo({ query: { ...route.query, book_id: String(id) } })
}

function startCreate() {
  selectedBookId.value = 'new'
  navigateTo({ query: { ...route.query, book_id: 'new' } })
}

async function onBookSaved(id: number) {
  await refresh()
  selectBook(id)
}

// --- Multi-select for list ---
const selectedIds = ref(new Set<number>())

const allSelected = computed(() =>
  filteredBooks.value.length > 0 && filteredBooks.value.every((b: any) => selectedIds.value.has(b.id))
)

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function toggleAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(filteredBooks.value.map((b: any) => b.id))
}

const isBulkDeleting = ref(false)

async function bulkDelete() {
  if (!selectedIds.value.size) return
  const ok = confirm(`Удалить выбранные книги (${selectedIds.value.size} шт.)?`)
  if (!ok) return

  isBulkDeleting.value = true
  const targets = filteredBooks.value.filter((b: any) => selectedIds.value.has(b.id))
  let okCount = 0, failCount = 0
  for (const b of targets) {
    try {
      await $fetch(`/api/books/${b.slug}`, { method: 'DELETE' as any, headers: store.getAuthHeader() })
      okCount++
    } catch { failCount++ }
  }
  selectedIds.value = new Set()
  isBulkDeleting.value = false
  toast.add({ title: failCount ? `Удалено: ${okCount}, ошибок: ${failCount}` : `Удалено ${okCount} книг`, color: failCount ? 'orange' : 'green' })
  
  if (selectedBookId.value && typeof selectedBookId.value === 'number' && selectedIds.value.has(selectedBookId.value)) {
    selectedBookId.value = null
    navigateTo({ query: { ...route.query, book_id: undefined } })
  }
  
  await refresh()
}

// --- Export & Import ---
function openExportModal(mode: 'selected' | 'filter') {
  if (mode === 'selected' && selectedIds.value.size === 0) return
  exportMode.value = mode
  exportIncludeArticles.value = false
  isExportModalOpen.value = true
}

const isBulkCategoryModalOpen = ref(false)
const selectedBulkCategoryId = ref('')
const isApplyingBulkCategory = ref(false)

async function applyBulkCategory() {
  if (selectedIds.value.size === 0) return
  isApplyingBulkCategory.value = true
  try {
    const res = await $fetch<any>('/api/admin/books/bulk-category', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        ids: Array.from(selectedIds.value),
        category_id: selectedBulkCategoryId.value ? parseInt(selectedBulkCategoryId.value) : null
      }
    })
    toast.add({ title: 'Успех', description: `Обновлено книг: ${res.count}`, color: 'green' })
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
  query.set('include_articles', String(exportIncludeArticles.value))
  
  if (exportMode.value === 'selected') {
    query.set('ids', Array.from(selectedIds.value).join(','))
  } else {
    if (debouncedQuery.value) query.set('search', debouncedQuery.value)
    if (categoryFilter.value) query.set('category_id', categoryFilter.value)
  }
  
  isExportModalOpen.value = false
  const url = `/api/admin/books/export?${query.toString()}`
  
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
  const url = `/api/admin/books/export-template`
  try {
    const response = await $fetch.raw<Blob>(url, { 
      headers: store.getAuthHeader(),
      responseType: 'blob'
    })
    if (!response.ok) throw new Error('Ошибка скачивания шаблона')

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'gativus-book-import-template.json'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) filename = match[1]
    }

    const blob = response._data
    if (!blob) throw new Error('Пустой файл шаблона')
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
  
  toolsModalTitle.value = 'Импорт книг'
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
    
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Ошибка импорта', description: err?.data?.statusMessage || err.message, color: 'red' })
  } finally {
    isToolsModalOpen.value = false
    importFileToConfirm.value = null
  }
}

function getCategoryTitle(id: number) {
  const source = categoriesList.value
  if (!source.length) return `ID: ${id}`
  const cat = source.find((c: any) => c.id === id)
  return cat ? cat.title : `ID: ${id}`
}
</script>

<template>
  <div class="gv-workspace-page bg-white dark:bg-[#111113]">
    <div class="workspace-grid grid grid-cols-12 gap-0 h-full">
      
      <!-- Left Pane: Books List (3/12) -->
      <div class="workspace-list col-span-3 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-book-open" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Книги</h1>
              <p class="text-[10px] text-gray-500 font-medium">Каталог & Скелеты глав</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UDropdown :items="[
              [
                { label: 'Шаблон импорта JSON', icon: 'i-heroicons-document-arrow-down', click: runDownloadTemplate }
              ]
            ]">
              <GvButton type="button" color="gray" variant="soft" size="xs" icon="i-heroicons-cog-8-tooth">Инструменты</GvButton>
            </UDropdown>
            <UDropdown :items="[
              [
                { label: 'Создать книгу', icon: 'i-heroicons-plus', click: startCreate },
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

        <!-- Filters -->
        <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111113]">
          <div class="flex items-center gap-2">
            <BaseSearch
              v-model="searchQuery"
              placeholder="Поиск по книгам..."
              :is-pending="pending"
              :is-debouncing="isTyping"
              class="flex-1"
            />
            
            <ExpandableFilters
              label="Фильтры"
              :active-count="activeFilterCount"
              :has-active-filters="activeFilterCount > 0"
            >
              <div class="filter-group">
                <span class="filter-group-label">Категории</span>
                <select v-model="categoryFilter" class="filter-select gv-admin-filter-select">
                  <option value="">Все категории</option>
                  <option v-for="cat in categoriesList" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
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

        <!-- Select All / Bulk Actions -->
        <div class="px-4 py-2 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider shrink-0">
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

        <!-- Scrollable Book List -->
        <div class="books-scroll-container flex-1 overflow-y-auto">
          <div v-if="pending && filteredBooks.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Загрузка списка...</p>
          </div>
          <div v-else-if="filteredBooks.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-magnifying-glass" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Ничего не найдено</p>
          </div>
          <div v-else class="books-list divide-y divide-gray-105 dark:divide-gray-850">
            <div 
              v-for="book in filteredBooks" 
              :key="book.id"
              class="book-item flex items-start gap-3 p-4 cursor-pointer transition-all border-l-3"
              :class="{ 
                'book-item--active': selectedBookId === book.id,
                'book-item--selected': selectedIds.has(book.id),
                'border-transparent': selectedBookId !== book.id
              }"
              @click="selectBook(book.id)"
            >
              <input 
                type="checkbox" 
                :checked="selectedIds.has(book.id)" 
                @change="toggleSelect(book.id)" 
                @click.stop
                class="gv-checkbox mt-1 shrink-0" 
              />
              
              <!-- Cover image small -->
              <div class="book-cover-preview shrink-0">
                <img v-if="book.cover_image" :src="book.cover_image" :alt="book.title" />
                <div v-else class="book-cover-placeholder">
                  <UIcon name="i-heroicons-book-open" />
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="book-title truncate">{{ book.title }}</span>
                  <span class="text-[10px] text-sky-500 font-extrabold uppercase shrink-0">
                    Гл: {{ book.article_count ?? 0 }}
                  </span>
                </div>
                
                <p class="book-slug truncate font-mono text-[10px] text-gray-400 mt-0.5">/books/{{ book.slug }}</p>
                
                <div class="flex items-center gap-1.5 mt-1 shrink-0">
                  <span 
                    class="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" 
                    :class="book.all_translated_en 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                      : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'"
                    :title="book.all_translated_en ? 'English: Все главы переведены' : 'English: Не все главы переведены'"
                  >
                    EN
                  </span>
                  <span 
                    class="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" 
                    :class="book.all_translated_ru 
                      ? 'bg-sky-500/10 text-sky-600 border border-sky-500/30' 
                      : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'"
                    :title="book.all_translated_ru ? 'Русский: Все главы переведены' : 'Русский: Не все главы переведены'"
                  >
                    RU
                  </span>
                  <span 
                    class="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" 
                    :class="book.all_translated_zh 
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' 
                      : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'"
                    :title="book.all_translated_zh ? '中文: Все главы переведены' : '中文: Не все главы переведены'"
                  >
                    ZH
                  </span>
                </div>
                
                <div class="category-tags mt-1.5">
                  <span v-for="catId in (book.category_ids || []).slice(0, 2)" :key="catId" class="cat-tag">
                    {{ getCategoryTitle(catId).slice(0, 15) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Pane: Book Editor (9/12) -->
      <div class="workspace-editor-pane col-span-9 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        <div v-if="!selectedBookId" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <h3 class="text-base font-bold text-gray-900 dark:text-white">Выберите книгу для редактирования</h3>
          <p class="text-xs text-gray-500 mt-1">Или нажмите «Новый», чтобы добавить новую книгу в базу.</p>
        </div>

        <AdminBookForm
          v-else
          :key="String(selectedBookId)"
          :book-id="selectedBookId"
          @saved="onBookSaved"
          @refresh-list="refresh"
        />
      </div>

    </div>

    <!-- Tools Progress Modal -->
    <UModal v-model="isToolsModalOpen" prevent-close>
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800 flex items-center gap-4">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-sky-500 shrink-0" />
        <div>
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">
            {{ toolsModalTitle }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ toolsModalMessage }}
          </p>
        </div>
      </div>
    </UModal>

    <!-- Export Modal -->
    <UModal v-model="isExportModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Экспорт книг</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Вы выбрали выгрузку <strong>{{ exportMode === 'selected' ? selectedIds.size + ' книг' : 'по фильтру' }}</strong>.
        </p>
        
        <label class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-sky-500 transition-colors">
          <input type="checkbox" v-model="exportIncludeArticles" class="gv-checkbox mt-0.5" />
          <div>
            <div class="text-sm font-bold text-gray-900 dark:text-white">Включить статьи книги</div>
            <div class="text-xs text-gray-500">Экспортирует HTML-содержимое всех статей, привязанных к этим книгам.</div>
          </div>
        </label>
        
        <div class="mt-6 flex justify-end gap-3">
          <GvButton type="button" color="gray" variant="soft" @click="isExportModalOpen = false">Отмена</GvButton>
          <GvButton type="button" color="sky" icon="i-heroicons-arrow-down-tray" @click="runExport">Выгрузить JSON</GvButton>
        </div>
      </div>
    </UModal>

    <!-- Bulk Category Modal -->
    <UModal v-model="isBulkCategoryModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <div class="p-6 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl border border-gray-150 dark:border-zinc-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Назначить категорию</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Выбрано книг: <strong>{{ selectedIds.size }}</strong>. Будет обновлена их категория.
        </p>
        
        <select v-model="selectedBulkCategoryId" class="filter-select gv-admin-filter-select w-full mt-2">
          <option value="">Без категории (Очистить)</option>
          <option v-for="cat in categoriesList" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
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
        
        <div class="mt-6 flex justify-end gap-3 shrink-0">
          <GvButton type="button" color="gray" variant="soft" @click="isImportPreviewModalOpen = false">Отмена</GvButton>
          <GvButton type="button" color="sky" icon="i-heroicons-arrow-up-tray" @click="confirmImport">Импортировать</GvButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<style scoped>
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px);
  overflow: hidden;
}

.workspace-grid {
  height: 100%;
  flex: 1;
}

.book-item {
  border-left: 3px solid transparent;
}

.book-item:hover {
  background: rgba(0, 0, 0, 0.02);
}
.dark .book-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.book-item--active {
  background: rgba(14, 165, 233, 0.05) !important;
  border-left-color: #0ea5e9 !important;
}
.dark .book-item--active {
  background: rgba(14, 165, 233, 0.1) !important;
}

.book-item--selected {
  background: rgba(14, 165, 233, 0.02);
}

.book-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.book-slug {
  font-size: 10px;
  font-family: monospace;
}

.book-cover-preview {
  width: 44px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
}

.dark .book-cover-preview {
  background: #27272a;
  border-color: #3f3f46;
}

.book-cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-cover-placeholder {
  color: #9ca3af;
  font-size: 20px;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cat-tag {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f0f9ff;
  color: #0284c7;
  border: 1px solid #bae6fd;
  font-weight: 600;
}
.dark .cat-tag {
  background: #0c4a6e/30;
  color: #38bdf8;
  border-color: #0c4a6e;
}

.gv-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: #0ea5e9;
}

.filter-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  color: #1a1a1a;
  cursor: pointer;
}
.dark .filter-select {
  background: #1e1e21;
  border-color: #2a2a2e;
  color: #e5e5e5;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
