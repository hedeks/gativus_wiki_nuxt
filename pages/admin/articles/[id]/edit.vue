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
const categoryId = ref<number | null>(null)
const locale = ref('ru')
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
    categoryId.value = article.category_id || null
    locale.value = article.locale || 'ru'
    isPublished.value = Boolean(article.is_published)
    sortOrder.value = article.sort_order || 0
    presentationPath.value = article.presentation_path || null
  }
}, { immediate: true })

useHead({ title: computed(() => `${title.value || 'Редактирование'} — Gativus Admin`) })

// Books & categories
const { data: categoriesData } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})
const categories = computed(() => (Array.isArray(categoriesData.value) ? categoriesData.value : []) as any[])

// Save
const isSaving = ref(false)
const showPreview = ref(false)
const showTermModal = ref(false)

function insertTerm(term: any) {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  const selectedText = text.substring(start, end) || term.title
  
  const insertion = `<a class="wiki-term" data-term-slug="${term.slug}">${selectedText}</a>`

  el.value = text.substring(0, start) + insertion + text.substring(end)
  htmlContent.value = el.value
  
  nextTick(() => {
    el.focus()
    const newPos = start + insertion.length
    el.setSelectionRange(newPos, newPos)
  })
}

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

const syncSlug = ref(false)

// Transliteration map for slug generation
const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

function frontendSlugify(str: string): string {
  const transliterated = str.split('').map(char => {
    const lower = char.toLowerCase()
    return CYRILLIC_MAP[lower] !== undefined ? CYRILLIC_MAP[lower] : char
  }).join('')

  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Watch title to sync slug
watch(title, (newTitle) => {
  if (syncSlug.value) {
    articleSlug.value = frontendSlugify(newTitle)
  }
})

// Toolbar Logic
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function insertTag(tag: string, closingTag?: string) {
  const el = textareaRef.value
  if (!el) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  const selectedText = text.substring(start, end)
  
  let insertion = ''
  if (closingTag) {
    insertion = `<${tag}>${selectedText}</${closingTag}>`
  } else if (tag === 'img') {
    insertion = `<img src="/api/uploads/articles/placeholder.jpg" alt="" />`
  } else if (tag === 'table') {
    insertion = `\n<table>\n  <tr>\n    <td>Ячейка 1</td>\n    <td>Ячейка 2</td>\n  </tr>\n</table>\n`
  } else {
    insertion = `<${tag}>${selectedText}</${tag}>`
  }

  el.value = text.substring(0, start) + insertion + text.substring(end)
  htmlContent.value = el.value
  
  // Focus back and set cursor
  nextTick(() => {
    el.focus()
    const newPos = start + insertion.length
    el.setSelectionRange(newPos, newPos)
  })
}

// Image Upload
const isUploadingImage = ref(false)
const imageInput = ref<HTMLInputElement | null>(null)

async function uploadImage(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return

  isUploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', input.files[0])

    const result = await $fetch<any>(`/api/admin/uploads/article-image`, {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
    })

    const imgTag = `<img src="${result.url}" alt="" />`
    
    // Insert at cursor
    const el = textareaRef.value
    if (el) {
      const start = el.selectionStart
      const end = el.selectionEnd
      const text = el.value
      el.value = text.substring(0, start) + imgTag + text.substring(end)
      htmlContent.value = el.value
    } else {
      htmlContent.value += imgTag
    }

    toast.add({ title: 'Изображение загружено', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка загрузки', description: err?.data?.statusMessage || err.message, color: 'red' })
  }
  isUploadingImage.value = false
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
          <div class="flex items-center justify-between">
            <label class="meta-label">Slug</label>
            <button @click="syncSlug = !syncSlug" class="text-[10px] font-bold" :class="syncSlug ? 'text-indigo-500' : 'text-gray-400'">
              {{ syncSlug ? 'AUTO' : 'MANUAL' }}
            </button>
          </div>
          <input v-model="articleSlug" class="meta-input meta-input--mono" placeholder="url-slug" />
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
      <div class="editor-main-container">
        <!-- Toolbar -->
        <div v-if="!showPreview" class="editor-toolbar">
          <div class="toolbar-group">
            <button @click="insertTag('h2')" title="Заголовок 2">H2</button>
            <button @click="insertTag('h3')" title="Заголовок 3">H3</button>
            <button @click="insertTag('h4')" title="Заголовок 4">H4</button>
          </div>
          <div class="toolbar-sep"></div>
          <div class="toolbar-group">
            <button @click="insertTag('p')" title="Абзац"><UIcon name="i-heroicons-bars-3-bottom-left" /></button>
            <button @click="insertTag('blockquote')" title="Цитата"><UIcon name="i-heroicons-chat-bubble-bottom-center-text" /></button>
            <button @click="insertTag('pre')" title="Код"><UIcon name="i-heroicons-code-bracket" /></button>
          </div>
          <div class="toolbar-sep"></div>
          <div class="toolbar-group">
            <button @click="insertTag('strong')" title="Жирный"><UIcon name="i-heroicons-bold" /></button>
            <button @click="insertTag('em')" title="Курсив"><UIcon name="i-heroicons-italic" /></button>
            <button @click="insertTag('a')" title="Ссылка"><UIcon name="i-heroicons-link" /></button>
            <button @click="showTermModal = true" title="Связать с термином"><UIcon name="i-heroicons-book-open" class="text-sky-500" /></button>
          </div>
          <div class="toolbar-sep"></div>
          <div class="toolbar-group">
            <button @click="insertTag('table')" title="Таблица"><UIcon name="i-heroicons-table-cells" /></button>
            <button @click="imageInput?.click()" title="Загрузить изображение" :disabled="isUploadingImage">
              <UIcon v-if="!isUploadingImage" name="i-heroicons-photo" />
              <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
            </button>
            <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="uploadImage" />
          </div>
        </div>

        <div class="editor-main">
          <textarea
            v-if="!showPreview"
            ref="textareaRef"
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

    <!-- Modal for glossary terms -->
    <AdminTermSelectorModal v-model="showTermModal" @select="insertTerm" />
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
.editor-main-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ─── Toolbar ─── */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}
.dark .editor-toolbar {
  background: #1e1e21;
  border-bottom-color: #2a2a2e;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-group button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: none;
  color: #555;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s;
}
.toolbar-group button:hover {
  background: #eef2ff;
  color: #6366f1;
  border-color: #e0e7ff;
}
.dark .toolbar-group button { color: #aaa; }
.dark .toolbar-group button:hover {
  background: #252528;
  color: #818cf8;
  border-color: #333;
}

.toolbar-sep {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
}
.dark .toolbar-sep { background: #333; }

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
