<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
  fluid: true
})

useHead({ title: 'Синхронизация Графа — Workspace — Gativus Admin' })

const store = userStore()
const toast = useToast()

// Workspace Tab State
const activeTab = ref<'export' | 'import'>('export')

// Sync States
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const isImportLoading = ref(false)
const importResult = ref<any>(null)
const lastDump = ref<any>(null)
const syncJsonInputRef = ref<HTMLInputElement | null>(null)

// Preview State
const previewGraphData = ref<any>({ nodes: [], links: [] })
const previewAssetsData = ref<string[]>([])

// File handling
function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFile(input.files[0])
  }
}

async function handleFile(file: File) {
  if (!file.name.endsWith('.json') && !file.name.endsWith('.zip')) {
    toast.add({ title: 'Неверный формат', description: 'Загрузите ZIP или JSON файл', color: 'red' })
    return
  }
  selectedFile.value = file
  previewGraphData.value = { nodes: [], links: [] }
  previewAssetsData.value = []
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await $fetch<any>('/api/admin/sync/preview', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader()
    })
    
    if (result.success && result.dump) {
      lastDump.value = result.dump
      previewGraphData.value = generateImportGraphPreview(result.dump, langStore.currentLang)
      previewAssetsData.value = result.assets || []
    }
  } catch (err: any) {
    toast.add({ title: 'Ошибка предпросмотра', description: err?.data?.message || err.message, color: 'red' })
  }
}

function removeFile() {
  selectedFile.value = null
  lastDump.value = null
  importResult.value = null
}

watch(() => langStore.currentLang, () => {
  if (lastDump.value) {
    previewGraphData.value = generateImportGraphPreview(lastDump.value, langStore.currentLang)
  }
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Download JSON Dump
async function exportGraph() {
  try {
    const url = '/api/admin/sync/export'
    const headers = new Headers(store.getAuthHeader() as HeadersInit)
    
    toast.add({ title: 'Экспорт запущен, ожидайте загрузки файла...' })
    
    const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('Ошибка скачивания файла')

    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'gativus-backup.json'
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
    toast.add({ title: 'Ошибка экспорта', description: err.message, color: 'red' })
  }
}

// Import JSON Dump
async function runImport() {
  if (!selectedFile.value) return
  isImportLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const result = await $fetch<any>('/api/admin/sync/import', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
    })

    importResult.value = result
    toast.add({ title: result.message, color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка импорта', description: err?.data?.statusMessage || err.message, color: 'red' })
  }

  isImportLoading.value = false
}
</script>

<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-12 gap-0">
      
      <!-- Left Pane: Operations (3/12) -->
      <div class="workspace-list col-span-3 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-arrow-path" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Workspace</h1>
              <p class="text-[10px] text-gray-500 font-medium">Синхронизация</p>
            </div>
          </div>
        </header>

        <div class="operations-menu flex-1 overflow-y-auto p-2 space-y-1">
          <button 
            type="button"
            class="operation-item"
            :class="{ 'operation-item--active': activeTab === 'export' }"
            @click="activeTab = 'export'"
          >
            <UIcon name="i-heroicons-cloud-arrow-down" class="text-lg" />
            <span>Экспорт базы</span>
          </button>
          
          <button 
            type="button"
            class="operation-item"
            :class="{ 'operation-item--active': activeTab === 'import' }"
            @click="activeTab = 'import'"
          >
            <UIcon name="i-heroicons-cloud-arrow-up" class="text-lg" />
            <span>Импорт (ZIP/JSON)</span>
          </button>
        </div>
      </div>

      <!-- Right Pane: Actions & Preview (9/12) -->
      <div class="workspace-editor-pane col-span-9 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        
        <!-- EXPORT CONTENT -->
        <div v-if="activeTab === 'export'" class="workspace-editor-scroll flex-1 overflow-y-auto p-8 bg-white dark:bg-[#111113]">
          <div class="max-w-xl mx-auto py-12 flex flex-col items-center text-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <UIcon name="i-heroicons-cloud-arrow-down" class="text-4xl" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Экспорт базы</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                Сгенерировать и скачать полную копию графа знаний, категорий и контента статей в виде единого ZIP или JSON файла резервной копии.
              </p>
            </div>
            <GvButton
              type="button"
              color="sky"
              size="lg"
              icon="i-heroicons-arrow-down-tray"
              class="px-8 py-3 rounded-xl mt-4"
              @click="exportGraph"
            >
              Сгенерировать дамп
            </GvButton>
          </div>
        </div>

        <!-- IMPORT CONTENT -->
        <div v-if="activeTab === 'import'" class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-4xl mx-auto space-y-6">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Импорт (ZIP/JSON)</h3>
            
            <div v-if="!selectedFile">
              <!-- Drop Zone -->
              <div
                class="drop-zone"
                :class="{ 'drop-zone--active': isDragging }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="syncJsonInputRef?.click()"
              >
                <div class="drop-zone-inner py-12">
                  <UIcon name="i-heroicons-cloud-arrow-up" class="drop-zone-icon text-5xl text-gray-400" />
                  <p class="drop-zone-text text-base font-bold text-gray-700 dark:text-gray-300 mt-3">Перетащите резервную копию базы (.zip или .json) сюда</p>
                  <p class="drop-zone-hint text-xs text-gray-400">или кликните для выбора на компьютере</p>
                  <input
                    ref="syncJsonInputRef"
                    type="file"
                    accept=".zip,.json"
                    class="sr-only"
                    @change="onFileSelect"
                  >
                  <GvButton
                    type="button"
                    variant="outline"
                    color="gray"
                    size="sm"
                    icon="i-heroicons-folder-open"
                    class="mt-4"
                    @click.stop="syncJsonInputRef?.click()"
                  >
                    Выбрать файл
                  </GvButton>
                </div>
              </div>
            </div>

            <!-- Selected File Content -->
            <div v-else-if="selectedFile && !importResult" class="space-y-6">
              <div class="file-card p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#fafafa] dark:bg-[#161618] flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
                    <UIcon name="i-heroicons-document-text" class="text-xl" />
                  </div>
                  <div>
                    <span class="file-name block font-bold text-sm text-gray-900 dark:text-white">{{ selectedFile.name }}</span>
                    <span class="file-size text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</span>
                  </div>
                </div>
                <GvButton
                  type="button"
                  color="red"
                  variant="ghost"
                  square
                  icon="i-heroicons-trash"
                  title="Удалить файл"
                  @click="removeFile"
                />
              </div>

              <div class="import-warning p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/20 text-xs text-red-700 dark:text-red-300">
                Внимание: Загрузка перезапишет существующие статьи с совпадающими ключами.
              </div>

              <!-- Live Preview Render -->
              <div class="preview-graph-card rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-[#fafafa] dark:bg-[#161618]" v-if="previewGraphData.nodes.length > 0">
                <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <h4 class="preview-graph-title text-sm font-bold text-gray-900 dark:text-white">Предпросмотр Графа Связей</h4>
                  <div class="preview-graph-stats text-xs text-gray-500">
                    Узлов: <b>{{ previewGraphData.nodes.length }}</b> / Связей: <b>{{ previewGraphData.links.length }}</b>
                  </div>
                </div>
                <div class="preview-graph-container h-[400px] overflow-hidden w-full bg-[#fdfdfd] dark:bg-[#111113]">
                  <KnowledgeGraphVisualizer :graphData="previewGraphData" :pending="false" :enableNavigation="false" />
                </div>
                <div class="relative z-10 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111113]" v-if="previewAssetsData.length > 0">
                  <h4 class="text-xs font-bold text-gray-900 dark:text-white mb-2">Ассеты в архиве ({{ previewAssetsData.length }}):</h4>
                  <div class="max-h-[150px] overflow-y-auto text-xs font-mono text-gray-500 dark:text-gray-400">
                    <div v-for="asset in previewAssetsData" :key="asset" class="truncate">{{ asset }}</div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="import-actions flex justify-end gap-3">
                <GvButton
                  type="button"
                  color="gray"
                  variant="ghost"
                  @click="removeFile"
                >
                  Отмена
                </GvButton>
                <GvButton
                  type="button"
                  color="sky"
                  icon="i-heroicons-arrow-up-tray"
                  :loading="isImportLoading"
                  @click="runImport"
                >
                  Загрузить дамп
                </GvButton>
              </div>
            </div>

            <!-- Import Result -->
            <div v-else-if="importResult" class="max-w-xl mx-auto py-12 flex flex-col items-center text-center gap-6">
              <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <UIcon name="i-heroicons-check-circle" class="text-4xl" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Импорт завершен</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ importResult.message }}</p>
              </div>
              <GvButton
                type="button"
                variant="outline"
                color="gray"
                size="md"
                icon="i-heroicons-arrow-path"
                @click="removeFile"
              >
                Готово
              </GvButton>
            </div>

          </div>
        </div>

      </div>
    </div>
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

.operations-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.operation-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gv-text-secondary);
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.operation-item:hover {
  background: rgba(0, 0, 0, 0.02);
}
.dark .operation-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.operation-item--active {
  background: rgba(14, 165, 233, 0.05) !important;
  color: #0ea5e9 !important;
}
.dark .operation-item--active {
  background: rgba(14, 165, 233, 0.1) !important;
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

/* ─── Drop Zone ─── */
.drop-zone {
  border: 2px dashed var(--gv-border-subtle);
  border-radius: 16px;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
  background: #fafafa;
}
.dark .drop-zone {
  background: #1a1a1d;
}

.drop-zone--active {
  border-color: #0ea5e9;
  background: rgba(14, 165, 233, 0.05);
}

.drop-zone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>
