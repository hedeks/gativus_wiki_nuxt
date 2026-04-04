<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const route = useRoute()
const store = userStore()
const toast = useToast()

const articleId = route.params.id as string

// Fetch article data
const { data: articleData, refresh } = await useFetch(`/api/articles/${articleId}`, {
  headers: store.getAuthHeader(),
  // Article endpoints use slug, but admin uses id — we need to resolve
  // Actually, we receive ID from URL, need to fetch by ID. Let's query the list.
})

// We need a way to get article by ID. For now, let's fetch the articles list and find by ID.
// Better approach: fetch all articles with admin flag and find the one
const { data: allArticlesData } = await useFetch('/api/articles', {
  query: { limit: 1000, published_only: 'false' },
  headers: store.getAuthHeader(),
})

const currentArticle = computed(() => {
  const items = (allArticlesData.value as any)?.items || []
  return items.find((a: any) => a.id === parseInt(articleId))
})

const slug = computed(() => currentArticle.value?.slug || '')

// If we found the slug, fetch full article
const { data: fullArticle } = await useFetch(() => `/api/articles/${slug.value}`, {
  headers: store.getAuthHeader(),
  immediate: !!slug.value,
})

// Form state
const title = ref('')
const htmlContent = ref('')
const articleSlug = ref('')
const bookId = ref<number | null>(null)
const categoryId = ref<number | null>(null)
const locale = ref('en')
const isPublished = ref(true)
const sortOrder = ref(0)
const changeSummary = ref('')
const presentationPath = ref<string | null>(null)
const isUploadingPresentation = ref(false)

// Populate form when data loads
watch(fullArticle, (article: any) => {
  if (article) {
    title.value = article.title || ''
    htmlContent.value = article.html_content || ''
    articleSlug.value = article.slug || ''
    bookId.value = article.book_id || null
    categoryId.value = article.category_id || null
    locale.value = article.locale || 'en'
    isPublished.value = Boolean(article.is_published)
    sortOrder.value = article.sort_order || 0
    presentationPath.value = article.presentation_path || null
  }
}, { immediate: true })

useHead({ title: computed(() => `${title.value || 'Редактирование'} — Gativus Admin`) })

// Books & categories
const { data: booksData } = await useFetch('/api/books')
const { data: categoriesData } = await useFetch('/api/categories')
const books = computed(() => (booksData.value || []) as any[])
const categories = computed(() => (Array.isArray(categoriesData.value) ? categoriesData.value : []) as any[])

// Save
const isSaving = ref(false)
const showPreview = ref(false)

async function save() {
  if (!slug.value) return
  isSaving.value = true

  try {
    await $fetch(`/api/articles/${slug.value}`, {
      method: 'PUT',
      headers: {
        ...store.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: {
        title: title.value,
        html_content: htmlContent.value,
        slug: articleSlug.value,
        book_id: bookId.value,
        category_id: categoryId.value,
        locale: locale.value,
        is_published: isPublished.value,
        sort_order: sortOrder.value,
        change_summary: changeSummary.value || undefined,
      },
    })

    toast.add({ title: 'Статья сохранена', color: 'green' })
    changeSummary.value = ''
  } catch (err: any) {
    toast.add({
      title: 'Ошибка сохранения',
      description: err?.data?.statusMessage || err.message,
      color: 'red'
    })
  }

  isSaving.value = false
}

// Presentation upload
async function uploadPresentation(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length || !slug.value) return

  isUploadingPresentation.value = true
  try {
    const formData = new FormData()
    formData.append('file', input.files[0])

    const result = await $fetch<any>(`/api/articles/${slug.value}/presentation`, {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
    })

    presentationPath.value = result.presentation_path
    toast.add({ title: 'Презентация загружена', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка загрузки', description: err?.data?.statusMessage || err.message, color: 'red' })
  }
  isUploadingPresentation.value = false
  input.value = ''
}

const localeOptions = [
  { label: '🇬🇧 EN', value: 'en' },
  { label: '🇷🇺 RU', value: 'ru' },
  { label: '🇨🇳 ZH', value: 'zh' },
]
</script>

<template>
  <div class="editor-page">
    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <NuxtLink to="/admin/articles" class="back-btn">
          <UIcon name="i-heroicons-arrow-left" />
        </NuxtLink>
        <h1 class="editor-title">{{ title || 'Без названия' }}</h1>
      </div>
      <div class="editor-topbar-right">
        <button class="toggle-preview" @click="showPreview = !showPreview">
          <UIcon :name="showPreview ? 'i-heroicons-code-bracket' : 'i-heroicons-eye'" />
          <span>{{ showPreview ? 'Код' : 'Preview' }}</span>
        </button>
        <NuxtLink v-if="slug" :to="`/admin/articles/${articleId}/history`" class="history-btn">
          <UIcon name="i-heroicons-clock" />
          <span>История</span>
        </NuxtLink>
        <button class="save-btn" @click="save" :disabled="isSaving">
          <UIcon v-if="!isSaving" name="i-heroicons-check" />
          <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
          <span>Сохранить</span>
        </button>
      </div>
    </div>

    <div class="editor-body">
      <!-- Sidebar meta -->
      <aside class="editor-sidebar">
        <div class="meta-group">
          <label class="meta-label">Название</label>
          <input v-model="title" class="meta-input" placeholder="Заголовок статьи" />
        </div>

        <div class="meta-group">
          <label class="meta-label">Slug</label>
          <input v-model="articleSlug" class="meta-input meta-input--mono" placeholder="url-slug" />
        </div>

        <div class="meta-group">
          <label class="meta-label">Книга</label>
          <select v-model="bookId" class="meta-input">
            <option :value="null">— Нет —</option>
            <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
          </select>
        </div>

        <div class="meta-group">
          <label class="meta-label">Категория</label>
          <select v-model="categoryId" class="meta-input">
            <option :value="null">— Нет —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.title }}</option>
          </select>
        </div>

        <div class="meta-row">
          <div class="meta-group meta-group--half">
            <label class="meta-label">Язык</label>
            <select v-model="locale" class="meta-input">
              <option v-for="opt in localeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="meta-group meta-group--half">
            <label class="meta-label">Порядок</label>
            <input v-model.number="sortOrder" type="number" class="meta-input" min="0" />
          </div>
        </div>

        <div class="meta-group">
          <label class="meta-toggle">
            <input type="checkbox" v-model="isPublished" />
            <span>Опубликовано</span>
          </label>
        </div>

        <div class="meta-group">
          <label class="meta-label">Описание изменений</label>
          <input v-model="changeSummary" class="meta-input" placeholder="Что изменилось?" />
        </div>

        <!-- Presentation Upload -->
        <div class="meta-group">
          <label class="meta-label">Презентация</label>
          <div v-if="presentationPath" class="pres-attached">
            <UIcon name="i-heroicons-presentation-chart-bar" class="pres-icon" />
            <span class="pres-filename">{{ presentationPath.split('/').pop() }}</span>
          </div>
          <label class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation }">
            <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation" :disabled="isUploadingPresentation" />
            <UIcon v-if="!isUploadingPresentation" name="i-heroicons-arrow-up-tray" />
            <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
            <span>{{ presentationPath ? 'Заменить' : 'Загрузить' }}</span>
          </label>
        </div>
      </aside>

      <!-- Editor area -->
      <div class="editor-main">
        <textarea
          v-if="!showPreview"
          v-model="htmlContent"
          class="html-editor"
          placeholder="HTML-контент статьи..."
          spellcheck="false"
        />
        <div
          v-else
          class="preview-pane article-prose"
          v-html="htmlContent"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 57px);
  margin: -24px;
}

/* ─── Top Bar ─── */
.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  flex-shrink: 0;
}
.dark .editor-topbar {
  background: #1a1a1d;
  border-bottom-color: #2a2a2e;
}

.editor-topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.back-btn {
  padding: 6px;
  border-radius: 8px;
  color: #888;
  transition: all 0.2s;
}
.back-btn:hover { background: #f3f4f6; color: #1a1a1a; }
.dark .back-btn:hover { background: #252528; color: #e5e5e5; }

.editor-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dark .editor-title { color: #e5e5e5; }

.editor-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toggle-preview, .history-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  text-decoration: none;
  transition: all 0.2s;
}
.toggle-preview:hover, .history-btn:hover {
  background: #f3f4f6;
}
.dark .toggle-preview, .dark .history-btn {
  border-color: #333;
  color: #aaa;
}
.dark .toggle-preview:hover, .dark .history-btn:hover {
  background: #252528;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  border: none;
  background: #6366f1;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}
.save-btn:hover { background: #4f46e5; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── Body ─── */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ─── Sidebar ─── */
.editor-sidebar {
  width: 280px;
  flex-shrink: 0;
  padding: 16px;
  border-right: 1px solid #e5e7eb;
  background: #fafafa;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dark .editor-sidebar {
  background: #161618;
  border-right-color: #2a2a2e;
}

.meta-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 13px;
  color: #1a1a1a;
  outline: none;
  transition: border-color 0.2s;
}
.meta-input:focus { border-color: #6366f1; }
.dark .meta-input {
  background: #1e1e21;
  border-color: #2a2a2e;
  color: #e5e5e5;
}
.meta-input--mono { font-family: monospace; font-size: 12px; }

.meta-row {
  display: flex;
  gap: 10px;
}
.meta-group--half { flex: 1; }

.meta-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
}
.dark .meta-toggle { color: #aaa; }
.meta-toggle input { cursor: pointer; }

/* ─── Editor Main ─── */
.editor-main {
  flex: 1;
  overflow: hidden;
  display: flex;
}

.html-editor {
  width: 100%;
  height: 100%;
  padding: 20px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #1a1a1a;
  background: #fff;
  tab-size: 2;
}
.dark .html-editor {
  background: #111113;
  color: #e5e5e5;
}

.preview-pane {
  width: 100%;
  height: 100%;
  padding: 24px 32px;
  overflow-y: auto;
  background: #fff;
}
.dark .preview-pane {
  background: #111113;
}

/* ─── Presentation Upload ─── */
.pres-attached {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #ecfdf5;
  margin-bottom: 6px;
}
.dark .pres-attached { background: #064e3b; }

.pres-icon { width: 16px; height: 16px; color: #059669; }
.dark .pres-icon { color: #34d399; }

.pres-filename {
  font-size: 11px;
  font-weight: 600;
  color: #059669;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dark .pres-filename { color: #34d399; }

.pres-upload-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  background: #f3f4f6;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  transition: all 0.2s;
}
.pres-upload-btn:hover { background: #e5e7eb; }
.dark .pres-upload-btn { background: #252528; color: #aaa; }
.dark .pres-upload-btn:hover { background: #333; }
.pres-upload-btn--loading { opacity: 0.6; cursor: wait; }

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .editor-body { flex-direction: column; }
  .editor-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: 200px;
  }
  .dark .editor-sidebar { border-bottom-color: #2a2a2e; }
  .editor-topbar-right span { display: none; }
}
</style>
