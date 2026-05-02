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
const { data: fullArticle, refresh, pending } = await useFetch(`/api/admin/articles/${articleId}`, {
  headers: store.getAuthHeader(),
})
const currentArticle = fullArticle // For backward compatibility in computes if any
const slug = computed(() => fullArticle.value?.slug || '')

// Form state
const title = ref('')
const titleRu = ref('')
const titleZh = ref('')
const htmlContent = ref('')
const htmlContentRu = ref('')
const htmlContentZh = ref('')
const articleSlug = ref('')
const articleSlugRu = ref('')
const articleSlugZh = ref('')
const categoryId = ref<number | null>(null)
const isPublished = ref(true)
const sortOrder = ref(0)
const changeSummary = ref('')
const presentationPath = ref<string | null>(null)
const presentationPathRu = ref<string | null>(null)
const presentationPathZh = ref<string | null>(null)
const isUploadingPresentation = ref(false)
const presUploadLocale = ref<'en' | 'ru' | 'zh' | null>(null)

const excerptEn = ref('')
const excerptRu = ref('')
const excerptZh = ref('')

// Active Tab
const activeTab = ref('en')

// Populate form when data loads
watch(fullArticle, (article: any) => {
  if (article) {
    title.value = article.title || ''
    titleRu.value = article.title_ru || ''
    titleZh.value = article.title_zh || ''
    htmlContent.value = article.html_content || ''
    htmlContentRu.value = article.html_content_ru || ''
    htmlContentZh.value = article.html_content_zh || ''
    articleSlug.value = article.slug || ''
    articleSlugRu.value = article.slug_ru || ''
    articleSlugZh.value = article.slug_zh || ''
    categoryId.value = article.category_id || null
    isPublished.value = Boolean(article.is_published)
    sortOrder.value = article.sort_order || 0
    presentationPath.value = article.presentation_path || null
    presentationPathRu.value = article.presentation_path_ru || null
    presentationPathZh.value = article.presentation_path_zh || null
    excerptEn.value = article.excerpt ?? ''
    excerptRu.value = article.excerpt_ru ?? ''
    excerptZh.value = article.excerpt_zh ?? ''
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
  
  if (activeTab.value === 'en') htmlContent.value = el.value
  else if (activeTab.value === 'ru') htmlContentRu.value = el.value
  else if (activeTab.value === 'zh') htmlContentZh.value = el.value
  
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
        title_ru: titleRu.value || undefined,
        title_zh: titleZh.value || undefined,
        html_content: htmlContent.value,
        html_content_ru: htmlContentRu.value || undefined,
        html_content_zh: htmlContentZh.value || undefined,
        slug: articleSlug.value,
        slug_ru: articleSlugRu.value || undefined,
        slug_zh: articleSlugZh.value || undefined,
        category_id: categoryId.value,
        is_published: isPublished.value,
        sort_order: sortOrder.value,
        change_summary: changeSummary.value || undefined,
        presentation_path: presentationPath.value || undefined,
        presentation_path_ru: presentationPathRu.value || undefined,
        presentation_path_zh: presentationPathZh.value || undefined,
        excerpt: excerptEn.value.trim(),
        excerpt_ru: excerptRu.value.trim(),
        excerpt_zh: excerptZh.value.trim(),
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
async function uploadPresentation(e: Event, locale: 'en' | 'ru' | 'zh' = 'en') {
  const input = e.target as HTMLInputElement
  if (!input.files?.length || !slug.value) return

  presUploadLocale.value = locale
  isUploadingPresentation.value = true
  try {
    const formData = new FormData()
    formData.append('file', input.files[0])

    const result = await $fetch<any>(`/api/articles/${slug.value}/presentation`, {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
      query: { locale },
    })

    if (locale === 'ru') presentationPathRu.value = result.presentation_path
    else if (locale === 'zh') presentationPathZh.value = result.presentation_path
    else presentationPath.value = result.presentation_path
    toast.add({ title: 'Презентация загружена', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка загрузки', description: err?.data?.statusMessage || err.message, color: 'red' })
  }
  isUploadingPresentation.value = false
  presUploadLocale.value = null
  input.value = ''
}

const syncSlug = ref(false)
const syncSlugRu = ref(false)
const syncSlugZh = ref(false)

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
watch(titleRu, (newTitle) => {
  if (syncSlugRu.value) {
    articleSlugRu.value = frontendSlugify(newTitle)
  }
})
watch(titleZh, (newTitle) => {
  if (syncSlugZh.value) {
    articleSlugZh.value = frontendSlugify(newTitle)
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
  
  if (activeTab.value === 'en') htmlContent.value = el.value
  else if (activeTab.value === 'ru') htmlContentRu.value = el.value
  else if (activeTab.value === 'zh') htmlContentZh.value = el.value
  
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
      
      if (activeTab.value === 'en') htmlContent.value = el.value
      else if (activeTab.value === 'ru') htmlContentRu.value = el.value
      else if (activeTab.value === 'zh') htmlContentZh.value = el.value
    } else {
      if (activeTab.value === 'en') htmlContent.value += imgTag
      else if (activeTab.value === 'ru') htmlContentRu.value += imgTag
      else if (activeTab.value === 'zh') htmlContentZh.value += imgTag
    }

    toast.add({ title: 'Изображение загружено', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка загрузки', description: err?.data?.statusMessage || err.message, color: 'red' })
  }
  isUploadingImage.value = false
  input.value = ''
}

</script>

<template>
  <div class="admin-page-stack admin-page-stack--fluid editor-page gv-admin-page">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Статья</h1>
          <p class="hero-lead">{{ title || 'Редактирование' }}</p>
        </div>
      </div>
    </section>

    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <h1 class="editor-title">{{ title || 'Без названия' }}</h1>
        <span class="entity-badge">UNIVERSAL ENTITY</span>
        <div v-if="fullArticle?.is_term_article" class="term-ref-badge">
          <UIcon name="i-heroicons-book-open" />
          <span>Disclosure for: </span>
          <NuxtLink :to="`/admin/glossary/${fullArticle.term_id}/edit`" class="term-ref-link">
            {{ fullArticle.term_title }}
          </NuxtLink>
        </div>
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
        <UTabs :items="[
          { label: '🇬🇧 EN', slot: 'en' },
          { label: '🇷🇺 RU', slot: 'ru' },
          { label: '🇨🇳 ZH', slot: 'zh' }
        ]" @change="activeTab = ['en', 'ru', 'zh'][$event]" class="w-full mb-4">
          <template #en>
            <div class="space-y-4 pt-2">
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
                <label class="meta-label">Краткое описание (EN)</label>
                <textarea v-model="excerptEn" class="meta-input meta-textarea" rows="4" placeholder="Анонс для списков, графа, SEO… пустое — автогенерация из текста статьи" />
              </div>
            </div>
          </template>
          
          <template #ru>
            <div class="space-y-4 pt-2">
              <div class="meta-group">
                <label class="meta-label">Название (RU)</label>
                <input v-model="titleRu" class="meta-input" placeholder="Русский заголовок" />
              </div>
              <div class="meta-group">
                <div class="flex items-center justify-between">
                  <label class="meta-label">Slug (RU)</label>
                  <button @click="syncSlugRu = !syncSlugRu" class="text-[10px] font-bold" :class="syncSlugRu ? 'text-indigo-500' : 'text-gray-400'">
                    {{ syncSlugRu ? 'AUTO' : 'MANUAL' }}
                  </button>
                </div>
                <input v-model="articleSlugRu" class="meta-input meta-input--mono" placeholder="url-slug-ru" />
              </div>
              <div class="meta-group">
                <label class="meta-label">Краткое описание (RU)</label>
                <textarea v-model="excerptRu" class="meta-input meta-textarea" rows="4" placeholder="Пустое — автогенерация из русского HTML" />
              </div>
            </div>
          </template>
          
          <template #zh>
            <div class="space-y-4 pt-2">
              <div class="meta-group">
                <label class="meta-label">Название (ZH)</label>
                <input v-model="titleZh" class="meta-input" placeholder="中文标题" />
              </div>
              <div class="meta-group">
                <div class="flex items-center justify-between">
                  <label class="meta-label">Slug (ZH)</label>
                  <button @click="syncSlugZh = !syncSlugZh" class="text-[10px] font-bold" :class="syncSlugZh ? 'text-indigo-500' : 'text-gray-400'">
                    {{ syncSlugZh ? 'AUTO' : 'MANUAL' }}
                  </button>
                </div>
                <input v-model="articleSlugZh" class="meta-input meta-input--mono" placeholder="url-slug-zh" />
              </div>
              <div class="meta-group">
                <label class="meta-label">Краткое описание (ZH)</label>
                <textarea v-model="excerptZh" class="meta-input meta-textarea" rows="4" placeholder="空则根据中文正文自动生成" />
              </div>
            </div>
          </template>
        </UTabs>

        <hr class="my-2 border-gray-200 dark:border-gray-800" />

        <div class="meta-group">
          <label class="meta-label">Категория</label>
          <select v-model="categoryId" class="meta-input">
            <option :value="null">— Нет —</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.title }}</option>
          </select>
          <NuxtLink
            v-if="categoryId"
            :to="`/admin/categories`"
            class="meta-link"
          >
            Открыть категории
          </NuxtLink>
        </div>

        <div v-if="fullArticle?.book_id" class="meta-group">
          <label class="meta-label">Книга</label>
          <NuxtLink :to="`/admin/books/${fullArticle.book_id}/edit`" class="meta-link">
            Редактировать книгу #{{ fullArticle.book_id }}
          </NuxtLink>
        </div>

        <div class="meta-group">
          <label class="meta-label">Порядок</label>
          <input v-model.number="sortOrder" type="number" class="meta-input" min="0" />
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

        <!-- Presentation (per locale) -->
        <div class="meta-group">
          <label class="meta-label">Презентации</label>
          <div class="pres-locale-block">
            <span class="pres-locale-label">EN</span>
            <input v-model="presentationPath" class="meta-input meta-input--mono pres-url-input" placeholder="URL или загрузка ниже" />
            <div v-if="presentationPath" class="pres-attached pres-attached--compact">
              <span class="pres-filename">{{ presentationPath.split('/').pop() }}</span>
            </div>
            <label class="pres-upload-btn pres-upload-btn--compact" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'en' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'en')" :disabled="isUploadingPresentation" />
              <UIcon v-if="!(isUploadingPresentation && presUploadLocale === 'en')" name="i-heroicons-arrow-up-tray" />
              <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
              <span>Загрузить EN</span>
            </label>
          </div>
          <div class="pres-locale-block">
            <span class="pres-locale-label">RU</span>
            <input v-model="presentationPathRu" class="meta-input meta-input--mono pres-url-input" placeholder="URL (RU)" />
            <div v-if="presentationPathRu" class="pres-attached pres-attached--compact">
              <span class="pres-filename">{{ presentationPathRu.split('/').pop() }}</span>
            </div>
            <label class="pres-upload-btn pres-upload-btn--compact" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'ru' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'ru')" :disabled="isUploadingPresentation" />
              <UIcon v-if="!(isUploadingPresentation && presUploadLocale === 'ru')" name="i-heroicons-arrow-up-tray" />
              <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
              <span>Загрузить RU</span>
            </label>
          </div>
          <div class="pres-locale-block">
            <span class="pres-locale-label">ZH</span>
            <input v-model="presentationPathZh" class="meta-input meta-input--mono pres-url-input" placeholder="URL (ZH)" />
            <div v-if="presentationPathZh" class="pres-attached pres-attached--compact">
              <span class="pres-filename">{{ presentationPathZh.split('/').pop() }}</span>
            </div>
            <label class="pres-upload-btn pres-upload-btn--compact" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'zh' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'zh')" :disabled="isUploadingPresentation" />
              <UIcon v-if="!(isUploadingPresentation && presUploadLocale === 'zh')" name="i-heroicons-arrow-up-tray" />
              <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
              <span>Загрузить ZH</span>
            </label>
          </div>
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
            v-if="!showPreview && activeTab === 'en'"
            ref="textareaRef"
            v-model="htmlContent"
            class="html-editor"
            placeholder="HTML-контент статьи (EN)..."
            spellcheck="false"
          />
          <textarea
            v-else-if="!showPreview && activeTab === 'ru'"
            ref="textareaRef"
            v-model="htmlContentRu"
            class="html-editor"
            placeholder="HTML-контент статьи (RU)..."
            spellcheck="false"
          />
          <textarea
            v-else-if="!showPreview && activeTab === 'zh'"
            ref="textareaRef"
            v-model="htmlContentZh"
            class="html-editor"
            placeholder="HTML-контент статьи (ZH)..."
            spellcheck="false"
          />
          
          <div
            v-else-if="showPreview && activeTab === 'en'"
            class="preview-pane article-prose"
            v-html="htmlContent"
          />
          <div
            v-else-if="showPreview && activeTab === 'ru'"
            class="preview-pane article-prose"
            v-html="htmlContentRu"
          />
          <div
            v-else-if="showPreview && activeTab === 'zh'"
            class="preview-pane article-prose"
            v-html="htmlContentZh"
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

.term-ref-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #0369a1;
  font-weight: 500;
}

.entity-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--gv-primary) 32%, var(--gv-border-principal));
  background: color-mix(in srgb, var(--gv-primary) 12%, transparent);
  color: var(--gv-primary);
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 700;
}
.dark .term-ref-badge {
  background: #082f49;
  border-color: #0c4a6e;
  color: #7dd3fc;
}
.term-ref-link {
  font-weight: 700;
  color: #0284c7;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.dark .term-ref-link { color: #38bdf8; }

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
  background: var(--gv-primary);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}
.save-btn:hover { background: var(--gv-primary-hover); }
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
.meta-input:focus { border-color: var(--gv-primary); }
.dark .meta-input {
  background: #1e1e21;
  border-color: #2a2a2e;
  color: #e5e5e5;
}
.meta-input--mono { font-family: monospace; font-size: 12px; }
.meta-textarea {
  min-height: 5rem;
  resize: vertical;
  line-height: 1.45;
}

.meta-link {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gv-primary);
  text-decoration: none;
}

.meta-link:hover {
  text-decoration: underline;
}

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
  color: var(--gv-primary);
  border-color: #e0e7ff;
}
.dark .toolbar-group button { color: #aaa; }
.dark .toolbar-group button:hover {
  background: #252528;
  color: var(--gv-primary);
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

.pres-locale-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}
.dark .pres-locale-block { border-bottom-color: #2a2a2e; }
.pres-locale-block:last-child { border-bottom: none; padding-bottom: 0; }
.pres-locale-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
}
.pres-url-input { font-size: 11px; }
.pres-upload-btn--compact {
  padding: 6px 10px;
  font-size: 11px;
}
.pres-attached--compact {
  padding: 4px 8px;
  margin-bottom: 0;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .editor-page {
    height: auto;
    min-height: calc(100vh - 72px);
    margin: 0;
    border: 1px solid var(--gv-border-principal);
    border-radius: 14px;
    overflow: hidden;
  }

  .editor-body { flex-direction: column; }
  .editor-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: 240px;
  }
  .dark .editor-sidebar { border-bottom-color: #2a2a2e; }
  .editor-topbar-right span { display: none; }
}
</style>
