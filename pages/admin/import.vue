<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

useHead({ title: 'Импорт ODT — Gativus Admin' })

const store = userStore()
const toast = useToast()

// State
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const isPreviewLoading = ref(false)
const isImportLoading = ref(false)
const previewArticles = ref<any[]>([])
const importResult = ref<any>(null)
const previewHtmlIndex = ref<number | null>(null)

// Options
const splitLevel = ref<'none' | 'h1' | 'h2'>('none')
const locale = ref('en')

// Books and categories for selectors
const { data: booksData } = await useFetch('/api/books')
const { data: categoriesData } = await useFetch('/api/categories')

const books = computed(() => (booksData.value || []) as any[])
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value as any[]
  return [] as any[]
})

const selectedBookId = ref<number | null>(null)
const selectedCategoryId = ref<number | null>(null)

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Русский', value: 'ru' },
  { label: '中文', value: 'zh' },
]

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
  if (!file.name.endsWith('.odt') && !file.name.endsWith('.odm')) {
    toast.add({ title: 'Неверный формат', description: 'Загрузите файл .odt или .odm', color: 'red' })
    return
  }
  selectedFile.value = file
  previewArticles.value = []
  importResult.value = null
}

function removeFile() {
  selectedFile.value = null
  previewArticles.value = []
  importResult.value = null
  previewHtmlIndex.value = null
}

// Preview
async function runPreview() {
  if (!selectedFile.value) return
  isPreviewLoading.value = true
  previewArticles.value = []

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('options', JSON.stringify({
      split_level: splitLevel.value,
      locale: locale.value,
    }))

    const result = await $fetch<any>('/api/import/preview', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
    })

    previewArticles.value = result.articles || []
    toast.add({ title: `Найдено ${result.total} статей`, color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка preview', description: err?.data?.statusMessage || err.message, color: 'red' })
  }

  isPreviewLoading.value = false
}

// Import
async function runImport() {
  if (!selectedFile.value) return
  isImportLoading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('options', JSON.stringify({
      split_level: splitLevel.value,
      locale: locale.value,
      book_id: selectedBookId.value,
      category_id: selectedCategoryId.value,
    }))

    const result = await $fetch<any>('/api/import/odt', {
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="admin-page-stack import-page">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Импорт ODT</h1>
          <p class="hero-lead">OpenDocument → статьи в базе</p>
        </div>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">ODT</span>
        <h2 class="card-header-title">Файл и параметры</h2>
      </header>
      <div class="card-body">
        <!-- Drop Zone -->
        <div
          v-if="!selectedFile"
          class="drop-zone"
          :class="{ 'drop-zone--active': isDragging }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <div class="drop-zone-inner">
            <UIcon name="i-heroicons-arrow-up-tray" class="drop-zone-icon" />
            <p class="drop-zone-text">Перетащите файл .odt сюда</p>
            <p class="drop-zone-hint">или</p>
            <label class="drop-zone-btn">
              <input type="file" accept=".odt,.odm" class="sr-only" @change="onFileSelect" />
              <UIcon name="i-heroicons-folder-open" />
              <span>Выбрать файл</span>
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

      <!-- Options -->
      <div class="import-options">
        <div class="option-group">
          <label class="option-label">Разбивка на статьи по</label>
          <div class="option-row">
            <button class="option-btn" :class="{ 'option-btn--active': splitLevel === 'none' }"
              @click="splitLevel = 'none'">Без разбивки</button>
            <button class="option-btn" :class="{ 'option-btn--active': splitLevel === 'h1' }"
              @click="splitLevel = 'h1'">Главам (H1)</button>
            <button class="option-btn" :class="{ 'option-btn--active': splitLevel === 'h2' }"
              @click="splitLevel = 'h2'">Разделам (H2)</button>
          </div>
        </div>

        <div class="option-group">
          <label class="option-label">Язык контента</label>
          <div class="option-row">
            <button v-for="opt in localeOptions" :key="opt.value" class="option-btn"
              :class="{ 'option-btn--active': locale === opt.value }" @click="locale = opt.value">{{ opt.label
              }}</button>
          </div>
        </div>

        <div class="option-group">
          <label class="option-label">Книга (опционально)</label>
          <select v-model="selectedBookId" class="option-select">
            <option :value="null">— Без книги —</option>
            <option v-for="book in books" :key="book.id" :value="book.id">
              {{ book.title }}
            </option>
          </select>
        </div>

        <div class="option-group">
          <label class="option-label">Категория (опционально)</label>
          <select v-model="selectedCategoryId" class="option-select">
            <option :value="null">— Без категории —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.title }}
            </option>
          </select>
        </div>
      </div>

      <!-- Actions -->
      <div class="import-actions">
        <button class="action-btn action-btn--preview" @click="runPreview" :disabled="isPreviewLoading">
          <UIcon v-if="!isPreviewLoading" name="i-heroicons-eye" />
          <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
          <span>Preview</span>
        </button>
        <button class="action-btn action-btn--import" @click="runImport"
          :disabled="isImportLoading || previewArticles.length === 0">
          <UIcon v-if="!isImportLoading" name="i-heroicons-arrow-down-tray" />
          <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
          <span>Импортировать</span>
        </button>
      </div>
    </div>
      </div>
    </section>

    <!-- Preview Results -->
    <section v-if="previewArticles.length > 0 && !importResult" class="section-card">
      <header class="card-header">
        <span class="card-badge">PRE</span>
        <h2 class="card-header-title">Preview: {{ previewArticles.length }} статей</h2>
      </header>
      <div class="card-body">
      <div class="preview-list">
        <div v-for="(article, idx) in previewArticles" :key="idx" class="preview-card"
          @click="previewHtmlIndex = previewHtmlIndex === idx ? null : idx">
          <div class="preview-card-header">
            <span class="preview-num">{{ idx + 1 }}</span>
            <div class="preview-card-info">
              <span class="preview-card-title">{{ article.title }}</span>
              <span class="preview-card-excerpt">{{ article.excerpt }}</span>
            </div>
            <UIcon :name="previewHtmlIndex === idx ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="preview-chevron" />
          </div>
          <div v-if="previewHtmlIndex === idx" class="preview-html-wrap">
            <div class="article-prose preview-html" v-html="article.html" />
          </div>
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
        <div class="result-articles">
          <NuxtLink v-for="art in importResult.articles" :key="art.slug" :to="`/admin/articles/${art.id}/edit`"
            class="result-article-link">
            <UIcon name="i-heroicons-document-text" />
            <span>{{ art.title }}</span>
          </NuxtLink>
        </div>
        <div class="result-actions">
          <button class="action-btn action-btn--preview" @click="removeFile">
            <UIcon name="i-heroicons-arrow-up-tray" />
            <span>Импортировать ещё</span>
          </button>
          <NuxtLink to="/admin/articles" class="action-btn action-btn--import">
            <UIcon name="i-heroicons-list-bullet" />
            <span>К списку статей</span>
          </NuxtLink>
        </div>
      </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.import-page {
  max-width: 900px;
}

.import-header {
  margin-bottom: 24px;
}

.import-title {
  font-size: 26px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.dark .import-title {
  color: #e5e5e5;
}

.import-subtitle {
  color: #888;
  font-size: 14px;
  margin: 4px 0 0;
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
  background: color-mix(in srgb, var(--gv-primary) 12%, transparent);
}

.dark .drop-zone {
  border-color: #333;
  background: #1a1a1d;
}

.dark .drop-zone--active {
  border-color: #818cf8;
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
  color: #6366f1;
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
  background: var(--gv-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.drop-zone-btn:hover {
  background: var(--gv-primary-hover);
  transform: translateY(-1px);
}

/* ─── File Card ─── */
.file-card {
  background: #fff;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  padding: 24px;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.05);
}

.dark .file-card {
  background: #1e1e21;
  border-color: #2a2a2e;
}

.file-card-info {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
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
  color: #6366f1;
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

/* ─── Options ─── */
.import-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.option-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  transition: all 0.2s;
}

.option-btn:hover {
  border-color: #c5c7cb;
}

.option-btn--active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.dark .option-btn {
  border-color: #333;
  color: #aaa;
}

.dark .option-btn--active {
  background: #6366f1;
  border-color: #6366f1;
  color: #fff;
}

.option-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  color: #1a1a1a;
  cursor: pointer;
  appearance: auto;
}

.dark .option-select {
  border-color: #333;
  background: #252528;
  color: #e5e5e5;
}

/* ─── Actions ─── */
.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 640px) {
  .import-actions button {
    width: 100%;
  }
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

.action-btn--preview {
  background: #f3f4f6;
  color: #555;
}

.action-btn--preview:hover:not(:disabled) {
  background: #e5e7eb;
}

.dark .action-btn--preview {
  background: #252528;
  color: #aaa;
}

.dark .action-btn--preview:hover:not(:disabled) {
  background: #333;
}

.action-btn--import {
  background: var(--gv-primary);
  color: #fff;
}

.action-btn--import:hover:not(:disabled) {
  background: var(--gv-primary-hover);
  transform: translateY(-1px);
}

/* ─── Preview ─── */
.preview-section {
  margin-top: 24px;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 14px;
}

.dark .preview-title {
  color: #e5e5e5;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-card:hover {
  border-color: #c5c7cb;
}

.dark .preview-card {
  background: #1e1e21;
  border-color: #2a2a2e;
}

.dark .preview-card:hover {
  border-color: #444;
}

.preview-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.preview-num {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eef2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
  flex-shrink: 0;
}

.dark .preview-num {
  background: #1e1b4b;
  color: #818cf8;
}

.preview-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.preview-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.dark .preview-card-title {
  color: #e5e5e5;
}

.preview-card-excerpt {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-chevron {
  width: 18px;
  height: 18px;
  color: #999;
  flex-shrink: 0;
}

.preview-html-wrap {
  border-top: 1px solid #f0f0f2;
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.dark .preview-html-wrap {
  border-top-color: #2a2a2e;
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

.result-articles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 400px;
}

.result-article-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f8fafc;
  text-decoration: none;
  color: #555;
  font-size: 13px;
  transition: all 0.2s;
}

.result-article-link:hover {
  background: color-mix(in srgb, var(--gv-primary) 10%, transparent);
  color: var(--gv-primary);
}

.dark .result-article-link {
  background: #1a1a1d;
  color: #aaa;
}

.dark .result-article-link:hover {
  background: #1e1b4b;
  color: #818cf8;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

/* ─── Responsive ─── */
@media (max-width: 640px) {
  .import-options {
    grid-template-columns: 1fr;
  }

  .import-actions {
    flex-direction: column;
  }

  .action-btn {
    justify-content: center;
  }
}
</style>
