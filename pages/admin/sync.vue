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
const syncJsonInputRef = ref<HTMLInputElement | null>(null)

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

  const lang = langStore.currentLang
  function loc(en?: string | null, ru?: string | null, zh?: string | null): string {
    const e = en?.trim() || ''
    if (lang === 'zh') return (zh && zh.trim()) || (ru && ru.trim()) || e
    if (lang === 'ru') return (ru && ru.trim()) || e
    return e
  }

  dump.categories?.forEach((c: any) => {
    const title = loc(c.title, c.title_ru, c.title_zh)
    const description = loc(c.description, c.description_ru, c.description_zh)
    nodes.push({ id: `cat-${c.slug}`, title, description, icon: c.icon, type: 'category', slug: c.slug })
    if (c.parent_slug) addLink(`cat-${c.slug}`, `cat-${c.parent_slug}`, 'parent')
  })
  
  dump.books?.forEach((b: any) => {
    const title = loc(b.title, b.title_ru, b.title_zh)
    const description = loc(b.description, b.description_ru, b.description_zh)
    nodes.push({ id: `book-${b.slug}`, title, description, type: 'book', slug: b.slug })
    b.category_slugs?.forEach((cs: string) => addLink(`book-${b.slug}`, `cat-${cs}`, 'category'))
  })
  
  // 3. Articles (unified entities)
  const termArticleToTermSlug = new Map<string, string>()
  
  dump.articles?.forEach((a: any) => {
    // Only standard articles become actual nodes in the visual graph
    if (a.is_term_article !== 1) {
      const title = loc(a.title, a.title_ru, a.title_zh)
      const description = loc(a.excerpt, a.excerpt_ru, a.excerpt_zh)
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
    const title = loc(t.title, t.title_ru, t.title_zh)
    const description = loc(t.definition, t.definition_ru, t.definition_zh)
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
  <div class="admin-page-stack sync-page">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Синхронизация</h1>
          <p class="hero-lead">Экспорт и импорт дампа графа (JSON)</p>
        </div>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">OUT</span>
        <h2 class="card-header-title">Экспорт базы</h2>
      </header>
      <div class="card-body">
        <div class="export-card">
          <UIcon name="i-heroicons-cloud-arrow-down" class="export-icon" />
          <div class="export-info">
            <h3>Экспорт Базы</h3>
            <p>Скачать полную копию графа знаний и контента статей в виде файла.</p>
          </div>
          <GvButton
            type="button"
            color="sky"
            size="lg"
            icon="i-heroicons-arrow-down-tray"
            @click="exportGraph"
          >
            Сгенерировать дамп
          </GvButton>
        </div>
      </div>
    </section>

    <div class="divider">
      <span>ИЛИ</span>
    </div>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">IN</span>
        <h2 class="card-header-title">Импорт JSON</h2>
      </header>
      <div class="card-body">
        <!-- Import Section Drop Zone -->
        <div
          v-if="!selectedFile"
          class="drop-zone"
          :class="{ 'drop-zone--active': isDragging }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <div class="drop-zone-inner">
            <UIcon name="i-heroicons-cloud-arrow-up" class="drop-zone-icon" />
            <p class="drop-zone-text">Перетащите резервную копию базы (.json) сюда</p>
            <p class="drop-zone-hint">для импорта</p>
            <input
              ref="syncJsonInputRef"
              type="file"
              accept=".json"
              class="sr-only"
              @change="onFileSelect"
            >
            <GvButton
              type="button"
              variant="outline"
              color="gray"
              size="md"
              icon="i-heroicons-folder-open"
              @click="syncJsonInputRef?.click()"
            >
              Выбрать файл JSON
            </GvButton>
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
        <GvButton
          type="button"
          unstyled
          chromeless
          square
          class="file-remove"
          icon="i-heroicons-x-mark"
          aria-label="Удалить файл"
          @click="removeFile"
        />
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
        <GvButton
          type="button"
          color="sky"
          size="lg"
          icon="i-heroicons-arrow-up-tray"
          :loading="isImportLoading"
          :disabled="!selectedFile"
          @click="runImport"
        >
          Загрузить дамп
        </GvButton>
      </div>
    </div>
      </div>
    </section>

    <!-- Import Result -->
    <section v-if="importResult" class="section-card">
      <div class="card-body">
      <div class="result-card">
        <div class="result-icon-wrap">
          <UIcon name="i-heroicons-check-circle" class="result-icon" />
        </div>
        <h2 class="result-title">{{ importResult.message }}</h2>
        <div class="result-actions">
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
    </section>
  </div>
</template>

<style scoped>
.sync-page {
  max-width: 900px;
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

:deep(.file-remove) {
  padding: 6px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
}

:deep(.file-remove:hover) {
  background: #fef2f2;
  color: #ef4444;
}

.dark :deep(.file-remove:hover) {
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
  flex-wrap: wrap;
  gap: 10px;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
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

  .import-actions :deep(.gv-btn),
  .result-actions :deep(.gv-btn) {
    width: 100%;
    justify-content: center;
  }
}
</style>
