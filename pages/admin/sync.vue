<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
const langStore = useLanguageStore()
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

useHead({ title: 'Синхронизация Графа — Gativus Admin' })

const store = userStore()
const toast = useToast()

// State
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const isImportLoading = ref(false)
const importResult = ref<any>(null)
const lastDump = ref<any>(null)

// Preview State
const previewGraphData = ref<any>({ nodes: [], links: [] })

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

function handleFile(file: File) {
  if (!file.name.endsWith('.json')) {
    toast.add({ title: 'Неверный формат', description: 'Загрузите JSON файл дампа графа', color: 'red' })
    return
  }
  selectedFile.value = file
  importResult.value = null
  previewGraphData.value = { nodes: [], links: [] }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const dump = JSON.parse(e.target?.result as string)
      lastDump.value = dump
      buildGraphPreview(dump)
    } catch (err) {
      toast.add({ title: 'Ошибка парсинга JSON', description: 'Файл поврежден', color: 'red' })
    }
  }
  reader.readAsText(file)
}

function buildGraphPreview(dump: any) {
  const nodes: any[] = []
  const links: any[] = []
  const linksSet = new Set<string>()
  
  function addLink(source: string, target: string, type: string) {
    const key = `${source}|${target}|${type}`
    if (!linksSet.has(key)) {
      linksSet.add(key)
      links.push({ source, target, type })
    }
  }
  const isRu = langStore.currentLang === 'ru'
  
  dump.categories?.forEach((c: any) => {
    const title = isRu ? (c.title_ru || c.title) : c.title
    const description = isRu ? (c.description_ru || c.description) : c.description
    nodes.push({ id: `cat-${c.slug}`, title, description, icon: c.icon, type: 'category', slug: c.slug })
    if (c.parent_slug) addLink(`cat-${c.slug}`, `cat-${c.parent_slug}`, 'parent')
  })
  
  dump.books?.forEach((b: any) => {
    const title = isRu ? (b.title_ru || b.title) : b.title
    const description = isRu ? (b.description_ru || b.description) : b.description
    nodes.push({ id: `book-${b.slug}`, title, description, type: 'book', slug: b.slug })
    b.category_slugs?.forEach((cs: string) => addLink(`book-${b.slug}`, `cat-${cs}`, 'category'))
  })
  
  // 3. Articles (unified entities)
  const termArticleToTermSlug = new Map<string, string>()
  
  dump.articles?.forEach((a: any) => {
    // Only standard articles become actual nodes in the visual graph
    if (a.is_term_article !== 1) {
      const title = isRu ? (a.title_ru || a.title) : (a.title || '')
      const description = a.excerpt
      nodes.push({ id: `art-${a.slug}`, title, description, type: 'article', slug: a.slug })
      
      if (a.category_slug) addLink(`art-${a.slug}`, `cat-${a.category_slug}`, 'category')
      if (a.book_slug) addLink(`art-${a.slug}`, `book-${a.book_slug}`, 'book')
    }

    if (a.is_term_article === 1 && a.slug) {
      termArticleToTermSlug.set(a.slug, '')
    }
  })
  
  // 4. Terms
  dump.terms?.forEach((t: any) => {
    const title = isRu ? (t.title_ru || t.title) : t.title
    const description = isRu ? (t.definition_ru || t.definition) : t.definition
    nodes.push({ id: `term-${t.slug}`, title, description, type: 'term', slug: t.slug })
    if (t.term_article_slug) {
      termArticleToTermSlug.set(t.term_article_slug, t.slug)
      const hasPublicArticleNode = nodes.some(n => n.id === `art-${t.term_article_slug}`)
      if (hasPublicArticleNode) {
        addLink(`term-${t.slug}`, `art-${t.term_article_slug}`, 'article')
      }
    }
  })
  
  // 5. Mentions
  dump.article_mentions?.forEach((m: any) => {
    // If the mention originates from a hidden "term article", we treat it as Term -> Term reference
    const sourceTermSlug = termArticleToTermSlug.get(m.article_slug)
    if (sourceTermSlug) {
      addLink(`term-${sourceTermSlug}`, `term-${m.term_slug}`, 'reference')
    } else {
      addLink(`art-${m.article_slug}`, `term-${m.term_slug}`, 'mention')
    }
  })
  
  // Final verification to purge ghost links
  const nodeIds = new Set(nodes.map(n => n.id))
  previewGraphData.value = {
    nodes: nodes,
    links: links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
  }
}



function removeFile() {
  selectedFile.value = null
  lastDump.value = null
  importResult.value = null
}

watch(() => langStore.currentLang, () => {
  if (lastDump.value) buildGraphPreview(lastDump.value)
})

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Download JSON Dump
async function exportGraph() {
  try {
    // Initiate normal browser download using a temporary link
    // so we get the attachment name properly from Content-Disposition
    const url = '/api/admin/sync/export'
    const headers = new Headers(store.getAuthHeader() as HeadersInit)
    
    toast.add({ title: 'Экспорт запущен, ожидайте загрузки файла...' })
    
    const response = await fetch(url, { headers })
    if (!response.ok) throw new Error('Ошибка скачивания файла')

    // Get filename from header if possible
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
  <div class="sync-page gv-admin-page">
    <div class="gv-admin-head">
      <p class="gv-admin-eyebrow">ADMIN</p>
      <h1 class="gv-admin-title">Синхронизация графа знаний</h1>
      <p class="gv-admin-subtitle">Экспортируйте или загружайте дампы всей базы в формате JSON</p>
    </div>

    <!-- Export Section -->
    <div class="export-section">
      <div class="export-card">
        <UIcon name="i-heroicons-cloud-arrow-down" class="export-icon" />
        <div class="export-info">
          <h3>Экспорт Базы</h3>
          <p>Скачать полную копию графа знаний и контента статей в виде файла.</p>
        </div>
        <button class="action-btn action-btn--export" @click="exportGraph">
          <UIcon name="i-heroicons-arrow-down-tray" />
          Сгенерировать Дамп
        </button>
      </div>
    </div>

    <div class="divider">
      <span>ИЛИ</span>
    </div>

    <!-- Import Section Drop Zone -->
    <div v-if="!selectedFile" class="drop-zone" :class="{ 'drop-zone--active': isDragging }" @dragover="onDragOver"
      @dragleave="onDragLeave" @drop="onDrop">
      <div class="drop-zone-inner">
        <UIcon name="i-heroicons-cloud-arrow-up" class="drop-zone-icon" />
        <p class="drop-zone-text">Перетащите резервную копию базы (.json) сюда</p>
        <p class="drop-zone-hint">для импорта</p>
        <label class="drop-zone-btn">
          <input type="file" accept=".json" class="sr-only" @change="onFileSelect" />
          <UIcon name="i-heroicons-folder-open" />
          <span>Выбрать файл JSON</span>
        </label>
      </div>
    </div>

    <!-- Selected File -->
    <div v-if="selectedFile && !importResult" class="file-card">
      <div class="file-card-info">
        <div class="file-icon-wrap">
          <UIcon name="i-heroicons-document-text" class="file-icon" />
        </div>
        <div class="file-details">
          <span class="file-name">{{ selectedFile.name }}</span>
          <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
        </div>
        <button class="file-remove" @click="removeFile">
          <UIcon name="i-heroicons-x-mark" />
        </button>
      </div>

      <div class="import-warning">
        Внимание: Загрузка перезапишет существующие статьи с совпадающими ключами.
      </div>

      <!-- Live Preview Render -->
      <div class="preview-graph-card" v-if="previewGraphData.nodes.length > 0">
        <h4 class="preview-graph-title">Предпросмотр Графа Связей</h4>
        <div class="preview-graph-stats">
          Узлов: <b>{{ previewGraphData.nodes.length }}</b> / Связей: <b>{{ previewGraphData.links.length }}</b>
        </div>
        <div class="preview-graph-container">
          <KnowledgeGraphVisualizer :graphData="previewGraphData" :pending="false" :enableNavigation="false" />
        </div>
      </div>

      <!-- Actions -->
      <div class="import-actions">
        <button class="action-btn action-btn--import" @click="runImport" :disabled="isImportLoading">
          <UIcon v-if="!isImportLoading" name="i-heroicons-arrow-up-tray" />
          <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
          <span>Загрузить Дамп</span>
        </button>
      </div>
    </div>

    <!-- Import Result -->
    <div v-if="importResult" class="result-section">
      <div class="result-card">
        <div class="result-icon-wrap">
          <UIcon name="i-heroicons-check-circle" class="result-icon" />
        </div>
        <h2 class="result-title">{{ importResult.message }}</h2>
        <div class="result-actions">
          <button class="action-btn action-btn--secondary" @click="removeFile">
            <UIcon name="i-heroicons-arrow-path" />
            <span>Готово</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sync-page {
  max-width: 800px;
}

.sync-header {
  margin-bottom: 24px;
}

.sync-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.dark .sync-title {
  color: #e5e5e5;
}

.sync-subtitle {
  color: #888;
  font-size: 14px;
  margin: 4px 0 0;
}

.export-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.dark .export-card {
  background: #1e1e21;
  border-color: #2a2a2e;
}

.export-icon {
  width: 48px;
  height: 48px;
  color: #10b981;
  flex-shrink: 0;
}

.export-info {
  flex: 1;
}

.export-info h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #1a1a1a;
}

.dark .export-info h3 {
  color: #e5e5e5;
}

.export-info p {
  margin: 0;
  font-size: 14px;
  color: #888;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #9ca3af;
  margin: 32px 0;
  font-size: 12px;
  font-weight: 600;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e5e7eb;
}

.dark .divider::before,
.dark .divider::after {
  border-bottom-color: #2a2a2e;
}

.divider span {
  padding: 0 16px;
  text-transform: uppercase;
}

/* ─── Drop Zone ─── */
.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  background: #fafafa;
}

.drop-zone--active {
  border-color: var(--gv-primary);
  background: #eef2ff;
}

.dark .drop-zone {
  border-color: #333;
  background: #1a1a1d;
}

.dark .drop-zone--active {
  border-color: var(--gv-primary);
  background: #1e1b4b;
}

.drop-zone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drop-zone-icon {
  width: 48px;
  height: 48px;
  color: #9ca3af;
}

.dark .drop-zone-icon {
  color: #555;
}

.drop-zone--active .drop-zone-icon {
  color: var(--gv-primary);
}

.drop-zone-text {
  font-size: 16px;
  font-weight: 600;
  color: #555;
  margin: 0;
}

.dark .drop-zone-text {
  color: #aaa;
}

.drop-zone-hint {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.drop-zone-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.dark .drop-zone-btn {
  background: #252528;
  color: #ddd;
}

.drop-zone-btn:hover {
  background: #e5e7eb;
}

.dark .drop-zone-btn:hover {
  background: #333;
}

/* ─── File Card ─── */
.file-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
}

.dark .file-card {
  background: #1e1e21;
  border-color: #2a2a2e;
}

/* ─── Preview Graph ─── */
.preview-graph-card {
  margin-top: 16px;
  margin-bottom: 24px;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  padding: 0;
}

.dark .preview-graph-card {
  background: #18181b;
  border-color: #2a2a2e;
}

.preview-graph-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  padding: 12px 16px 4px;
  margin: 0;
}

.dark .preview-graph-title {
  color: #eee;
}

.preview-graph-stats {
  font-size: 12px;
  color: #888;
  padding: 0 16px 12px;
}

.preview-graph-container {
  height: 400px;
  width: 100%;
  border-top: 1px solid #e5e7eb;
  background: #fdfdfd;
}

.dark .preview-graph-container {
  border-top-color: #2a2a2e;
  background: #111113;
}



.file-card-info {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f2;
}

.dark .file-card-info {
  border-bottom-color: #2a2a2e;
}

.file-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dark .file-icon-wrap {
  background: #1e1b4b;
}

.file-icon {
  width: 22px;
  height: 22px;
  color: var(--gv-primary);
}

.file-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .file-name {
  color: #e5e5e5;
}

.file-size {
  font-size: 12px;
  color: #888;
}

.file-remove {
  padding: 6px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
}

.file-remove:hover {
  background: #fef2f2;
  color: #ef4444;
}

.dark .file-remove:hover {
  background: #2a1a1a;
  color: #f87171;
}

.import-warning {
  font-size: 13px;
  color: #dc2626;
  background: #fef2f2;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #fecaca;
}

.dark .import-warning {
  background: #3f1515;
  color: #f87171;
  border-color: #5c1e1e;
}

/* ─── Actions ─── */
.import-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  text-decoration: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--export {
  background: var(--gv-primary);
  color: #fff;
}

.action-btn--export:hover {
  background: var(--gv-primary-hover);
  transform: translateY(-1px);
}

.action-btn--import {
  background: var(--gv-primary);
  color: #fff;
}

.action-btn--import:hover:not(:disabled) {
  background: var(--gv-primary-hover);
  transform: translateY(-1px);
}

.action-btn--secondary {
  background: #f3f4f6;
  color: #555;
}

.action-btn--secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.dark .action-btn--secondary {
  background: #252528;
  color: #aaa;
}

.dark .action-btn--secondary:hover:not(:disabled) {
  background: #333;
}

/* ─── Result ─── */
.result-section {
  margin-top: 24px;
}

.result-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.dark .result-card {
  background: #1e1e21;
  border-color: #2a2a2e;
}

.result-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #ecfdf5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .result-icon-wrap {
  background: #064e3b;
}

.result-icon {
  width: 28px;
  height: 28px;
  color: #10b981;
}

.result-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.dark .result-title {
  color: #e5e5e5;
}

@media (max-width: 768px) {
  .sync-page {
    max-width: 100%;
  }

  .export-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }

  .preview-graph-container {
    height: 320px;
  }

  .import-actions .action-btn,
  .result-actions .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
