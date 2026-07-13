<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import AdminArticleWysiwyg from '~/components/admin/AdminArticleWysiwyg.vue'

const props = defineProps<{
  articleId?: number | string
  termId?: number | string
}>()

const emit = defineEmits<{
  (e: 'article-created', id: number): void
  (e: 'article-saved', id: number): void
}>()

const store = userStore()
const toast = useToast()

const isEditing = computed(() => props.articleId !== undefined)

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

const translationValidEn = ref(true)
const translationValidRu = ref(false)
const translationValidZh = ref(false)

const activeTab = ref<'en' | 'ru' | 'zh'>('en')
const editorRef = ref<InstanceType<typeof AdminArticleWysiwyg> | null>(null)
const isFullscreen = ref(false)

// If editing, load article data
const fullArticle = ref<any>(null)
const slug = computed(() => fullArticle.value?.slug || '')

// Categories list
const { data: categoriesData } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})
const categories = computed(() => (Array.isArray(categoriesData.value) ? categoriesData.value : []) as any[])

// Fetch term details for badge in create mode
const termTitle = ref('')

// Slug auto-sync refs
const syncSlug = ref(true)
const syncSlugRu = ref(true)
const syncSlugZh = ref(true)

async function loadArticle() {
  if (isEditing.value) {
    syncSlug.value = false
    syncSlugRu.value = false
    syncSlugZh.value = false

    const data = await $fetch<any>(`/api/admin/articles/${props.articleId}`, {
      headers: store.getAuthHeader(),
    })
    if (data) {
      fullArticle.value = data
      title.value = data.title || ''
      titleRu.value = data.title_ru || ''
      titleZh.value = data.title_zh || ''
      htmlContent.value = data.html_content || ''
      htmlContentRu.value = data.html_content_ru || ''
      htmlContentZh.value = data.html_content_zh || ''
      articleSlug.value = data.slug || ''
      articleSlugRu.value = data.slug_ru || ''
      articleSlugZh.value = data.slug_zh || ''
      categoryId.value = data.category_id || null
      isPublished.value = Boolean(data.is_published)
      sortOrder.value = data.sort_order || 0
      presentationPath.value = data.presentation_path || null
      presentationPathRu.value = data.presentation_path_ru || null
      presentationPathZh.value = data.presentation_path_zh || null
      excerptEn.value = data.excerpt ?? ''
      excerptRu.value = data.excerpt_ru ?? ''
      excerptZh.value = data.excerpt_zh ?? ''
      translationValidEn.value = data.translation_valid_en !== undefined ? Boolean(data.translation_valid_en) : true
      translationValidRu.value = Boolean(data.translation_valid_ru)
      translationValidZh.value = Boolean(data.translation_valid_zh)
      
      nextTick(() => {
        editorRef.value?.pushHistory?.('Загрузка статьи')
      })
    }
  } else {
    syncSlug.value = true
    syncSlugRu.value = true
    syncSlugZh.value = true

    fullArticle.value = null
    title.value = ''
    titleRu.value = ''
    titleZh.value = ''
    htmlContent.value = ''
    htmlContentRu.value = ''
    htmlContentZh.value = ''
    articleSlug.value = ''
    articleSlugRu.value = ''
    articleSlugZh.value = ''
    categoryId.value = null
    isPublished.value = true
    sortOrder.value = 0
    changeSummary.value = ''
    presentationPath.value = null
    presentationPathRu.value = null
    presentationPathZh.value = null
    excerptEn.value = ''
    excerptRu.value = ''
    excerptZh.value = ''
    translationValidEn.value = true
    translationValidRu.value = false
    translationValidZh.value = false
    termTitle.value = ''
    
    if (props.termId) {
      const term = await $fetch<any>(`/api/admin/terms/${props.termId}`, {
        headers: store.getAuthHeader()
      })
      if (term) {
        termTitle.value = term.title
        title.value = term.title
        titleRu.value = term.title_ru || ''
        titleZh.value = term.title_zh || ''
        htmlContent.value = `<h2>${term.title}</h2>\n<p>${term.definition}</p>\n`
        if (term.definition_ru) {
          htmlContentRu.value = `<h2>${term.title_ru || term.title}</h2>\n<p>${term.definition_ru}</p>\n`
        }
        if (term.definition_zh) {
          htmlContentZh.value = `<h2>${term.title_zh || term.title}</h2>\n<p>${term.definition_zh}</p>\n`
        }
        if (term.category_id) {
          categoryId.value = term.category_id
        }
      }
    }
  }
}

watch(() => props.articleId, () => {
  loadArticle()
}, { immediate: true })

watch(() => props.termId, () => {
  if (!isEditing.value) {
    loadArticle()
  }
})

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
}

function frontendSlugify(str: string): string {
  return str.split('').map(char => {
    const lower = char.toLowerCase()
    return CYRILLIC_MAP[lower] !== undefined ? CYRILLIC_MAP[lower] : char
  }).join('')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

watch(title, (newTitle) => { if (syncSlug.value) articleSlug.value = frontendSlugify(newTitle) })
watch(titleRu, (newTitle) => { if (syncSlugRu.value) articleSlugRu.value = frontendSlugify(newTitle) })
watch(titleZh, (newTitle) => { if (syncSlugZh.value) articleSlugZh.value = frontendSlugify(newTitle) })

// Head title computed
useHead({ title: computed(() => `${title.value || (isEditing.value ? 'Редактирование' : 'Новая статья')} — Gativus Admin`) })

const isSaving = ref(false)
const showTermModal = ref(false)
const showBookModal = ref(false)
const showArticleModal = ref(false)

function insertBook(book: any) {
  if (!editorRef.value) return
  editorRef.value.pushHistory?.(`Книга: ${book.title}`)
  const bookTag = `<a class="wiki-book" data-book-slug="${book.slug}">${book.title}</a>`

  if (editorRef.value.previewEditMode) {
    editorRef.value.insertHtmlAtCursor?.(bookTag)
    return
  }

  const el = editorRef.value.textareaRef
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  const selectedText = text.substring(start, end) || book.title
  const insertion = `<a class="wiki-book" data-book-slug="${book.slug}">${selectedText}</a>`

  el.value = text.substring(0, start) + insertion + text.substring(end)
  
  if (activeTab.value === 'en') htmlContent.value = el.value
  else if (activeTab.value === 'ru') htmlContentRu.value = el.value
  else if (activeTab.value === 'zh') htmlContentZh.value = el.value

  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + insertion.length, start + insertion.length)
  })
}

function insertArticle(article: any) {
  if (!editorRef.value) return
  editorRef.value.pushHistory?.(`Статья: ${article.title}`)
  const articleTag = `<a class="wiki-article" data-article-slug="${article.slug}">${article.title}</a>`

  if (editorRef.value.previewEditMode) {
    editorRef.value.insertHtmlAtCursor?.(articleTag)
    return
  }

  const el = editorRef.value.textareaRef
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  const selectedText = text.substring(start, end) || article.title
  const insertion = `<a class="wiki-article" data-article-slug="${article.slug}">${selectedText}</a>`

  el.value = text.substring(0, start) + insertion + text.substring(end)
  
  if (activeTab.value === 'en') htmlContent.value = el.value
  else if (activeTab.value === 'ru') htmlContentRu.value = el.value
  else if (activeTab.value === 'zh') htmlContentZh.value = el.value

  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + insertion.length, start + insertion.length)
  })
}

function insertTerm(term: any) {
  if (!editorRef.value) return
  editorRef.value.pushHistory?.(`Термин: ${term.title}`)
  const termTag = `<a class="wiki-term" data-term-slug="${term.slug}">${term.title}</a>`

  if (editorRef.value.previewEditMode) {
    editorRef.value.insertHtmlAtCursor?.(termTag)
    return
  }

  const el = editorRef.value.textareaRef
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
    el.setSelectionRange(start + insertion.length, start + insertion.length)
  })
}

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

async function save() {
  if (!title.value) {
    toast.add({ title: 'Заголовок обязателен', color: 'red' })
    return
  }
  isSaving.value = true

  try {
    const body: any = {
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
      excerpt: excerptEn.value.trim(),
      excerpt_ru: excerptRu.value.trim(),
      excerpt_zh: excerptZh.value.trim(),
    }

    if (isEditing.value) {
      body.change_summary = changeSummary.value || undefined
      body.presentation_path = presentationPath.value || null
      body.presentation_path_ru = presentationPathRu.value || null
      body.presentation_path_zh = presentationPathZh.value || null
      body.translation_valid_en = translationValidEn.value
      body.translation_valid_ru = translationValidRu.value
      body.translation_valid_zh = translationValidZh.value

      const res = await $fetch<any>(`/api/articles/${slug.value}`, {
        method: 'PUT',
        headers: {
          ...store.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body,
      })

      toast.add({ title: 'Статья сохранена', color: 'green' })
      changeSummary.value = ''
      
      // Reload updated slug and details
      const updatedData = await $fetch<any>(`/api/admin/articles/${props.articleId}`, {
        headers: store.getAuthHeader(),
      })
      if (updatedData) {
        fullArticle.value = updatedData
        articleSlug.value = updatedData.slug || ''
        articleSlugRu.value = updatedData.slug_ru || ''
        articleSlugZh.value = updatedData.slug_zh || ''
      }
      emit('article-saved', Number(props.articleId))
    } else {
      body.term_id = props.termId ? Number(props.termId) : undefined
      body.presentation_path = presentationPath.value || null
      body.presentation_path_ru = presentationPathRu.value || null
      body.presentation_path_zh = presentationPathZh.value || null

      const response = await $fetch<any>('/api/articles', {
        method: 'POST',
        headers: {
          ...store.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body,
      })

      toast.add({ title: 'Статья создана', color: 'green' })
      emit('article-created', response.id)
      navigateTo(`/admin/articles?article_id=${response.id}`)
    }
  } catch (err: any) {
    toast.add({
      title: isEditing.value ? 'Ошибка сохранения' : 'Ошибка создания',
      description: err?.data?.statusMessage || err.message,
      color: 'red'
    })
  }

  isSaving.value = false
}

function handleOdtParsed(metadata: any) {
  if (activeTab.value === 'en') {
    if (metadata.title) title.value = metadata.title
    if (metadata.description) excerptEn.value = metadata.description
  } else if (activeTab.value === 'ru') {
    if (metadata.title) {
      titleRu.value = metadata.title
      if (!title.value) title.value = `Untranslated: ${metadata.title}`
    }
    if (metadata.description) excerptRu.value = metadata.description
  } else if (activeTab.value === 'zh') {
    if (metadata.title) {
      titleZh.value = metadata.title
      if (!title.value) title.value = `Untranslated: ${metadata.title}`
    }
    if (metadata.description) excerptZh.value = metadata.description
  }
}
</script>

<template>
  <div 
    class="admin-page-stack admin-page-stack--fluid editor-page gv-admin-page" 
    :class="{ 'editor-page--fullscreen': isFullscreen }"
    tabindex="-1"
  >
    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <NuxtLink to="/admin/articles" class="back-btn">
          <UIcon name="i-heroicons-arrow-left" />
        </NuxtLink>
        <h1 class="editor-title">{{ title || (isEditing ? 'Без названия' : 'Новая статья') }}</h1>
        <div v-if="isEditing" class="translation-flags">
          <button type="button" class="lang-flag-btn" :class="translationValidEn ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="translationValidEn = !translationValidEn" title="Валидность EN перевода">EN</button>
          <button type="button" class="lang-flag-btn" :class="translationValidRu ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="translationValidRu = !translationValidRu" title="Валидность RU перевода">RU</button>
          <button type="button" class="lang-flag-btn" :class="translationValidZh ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="translationValidZh = !translationValidZh" title="Валидность ZH перевода">ZH</button>
        </div>
        <div v-if="isEditing && fullArticle?.is_term_article" class="term-ref-badge">
          <UIcon name="i-heroicons-book-open" />
          <span>Disclosure for: </span>
          <NuxtLink :to="`/admin/glossary/${fullArticle.term_id}/edit`" class="term-ref-link">{{ fullArticle.term_title }}</NuxtLink>
        </div>
        <div v-else-if="!isEditing && termId && termTitle" class="term-ref-badge">
          <UIcon name="i-heroicons-book-open" />
          <span>Disclosure for: </span>
          <span class="term-ref-link-static">{{ termTitle }}</span>
        </div>
      </div>
      <div class="editor-topbar-right">
        <NuxtLink v-if="isEditing && slug" :to="`/admin/articles/${articleId}/history`" class="history-btn">
          <UIcon name="i-heroicons-clock" />
          <span>История</span>
        </NuxtLink>
        <button 
          type="button" 
          class="history-btn" 
          @click="isFullscreen = !isFullscreen" 
          :title="isFullscreen ? 'Свернуть в окно' : 'Открыть на весь экран'"
        >
          <UIcon :name="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" />
          <span>{{ isFullscreen ? 'Свернуть' : 'Во весь экран' }}</span>
        </button>
        <button class="save-btn" @click="save" :disabled="isSaving">
          <UIcon v-if="!isSaving" name="i-heroicons-check" />
          <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
          <span>{{ isEditing ? 'Сохранить' : 'Создать' }}</span>
        </button>
      </div>
    </div>

    <div class="editor-body">
      <!-- Sidebar meta -->
      <aside class="editor-sidebar">
        <UTabs :items="[{ label: '🇬🇧 EN', slot: 'en' }, { label: '🇷🇺 RU', slot: 'ru' }, { label: '🇨🇳 ZH', slot: 'zh' }]" @change="activeTab = ['en', 'ru', 'zh'][$event] as 'en' | 'ru' | 'zh'" class="w-full mb-4">
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
                <textarea v-model="excerptEn" class="meta-input meta-textarea" rows="4" placeholder="Пустое — из английского HTML" />
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
                <textarea v-model="excerptRu" class="meta-input meta-textarea" rows="4" placeholder="Пустое — из русского HTML" />
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
                <textarea v-model="excerptZh" class="meta-input meta-textarea" rows="4" placeholder="空则根据正文自动生成" />
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

        <div v-if="isEditing" class="meta-group">
          <label class="meta-label">Описание изменений</label>
          <input v-model="changeSummary" class="meta-input" placeholder="Что изменилось?" />
        </div>

        <div class="meta-group">
          <label class="meta-label">Презентации</label>
          
          <div class="pres-locale-block">
            <span class="pres-locale-label">EN</span>
            <div class="flex items-center gap-1 w-full">
              <input v-model="presentationPath" class="meta-input meta-input--mono pres-url-input flex-1" placeholder="URL или загрузка ниже" />
              <button v-if="presentationPath" type="button" @click="presentationPath = ''" class="text-red-500 hover:text-red-700 p-1" title="Удалить путь к презентации EN"><UIcon name="i-heroicons-trash" /></button>
            </div>
            <label v-if="isEditing" class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'en' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'en')" />
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить EN</span>
            </label>
            <span v-else class="pres-upload-btn pres-upload-btn--disabled" title="Загрузка файлов доступна после создания статьи">
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить EN (недоступно)</span>
            </span>
          </div>

          <div class="pres-locale-block">
            <span class="pres-locale-label">RU</span>
            <div class="flex items-center gap-1 w-full">
              <input v-model="presentationPathRu" class="meta-input meta-input--mono pres-url-input flex-1" placeholder="URL или загрузка ниже" />
              <button v-if="presentationPathRu" type="button" @click="presentationPathRu = ''" class="text-red-500 hover:text-red-700 p-1" title="Удалить путь к презентации RU"><UIcon name="i-heroicons-trash" /></button>
            </div>
            <label v-if="isEditing" class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'ru' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'ru')" />
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить RU</span>
            </label>
            <span v-else class="pres-upload-btn pres-upload-btn--disabled" title="Загрузка файлов доступна после создания статьи">
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить RU (недоступно)</span>
            </span>
          </div>

          <div class="pres-locale-block">
            <span class="pres-locale-label">ZH</span>
            <div class="flex items-center gap-1 w-full">
              <input v-model="presentationPathZh" class="meta-input meta-input--mono pres-url-input flex-1" placeholder="URL или загрузка ниже" />
              <button v-if="presentationPathZh" type="button" @click="presentationPathZh = ''" class="text-red-500 hover:text-red-700 p-1" title="Удалить путь к презентации ZH"><UIcon name="i-heroicons-trash" /></button>
            </div>
            <label v-if="isEditing" class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'zh' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'zh')" />
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить ZH</span>
            </label>
            <span v-else class="pres-upload-btn pres-upload-btn--disabled" title="Загрузка файлов доступна после создания статьи">
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить ZH (недоступно)</span>
            </span>
          </div>
        </div>
      </aside>

      <!-- Editor area -->
      <div class="editor-main-container">
        <AdminArticleWysiwyg
          ref="editorRef"
          v-model:en="htmlContent"
          v-model:ru="htmlContentRu"
          v-model:zh="htmlContentZh"
          :active-lang="activeTab"
          :article-id="isEditing ? Number(articleId) : undefined"
          @show-term-modal="showTermModal = true"
          @show-book-modal="showBookModal = true"
          @show-article-modal="showArticleModal = true"
          @odt-parsed="handleOdtParsed"
        />
      </div>
    </div>

    <!-- Modal for glossary terms -->
    <TermSelectorModal v-model="showTermModal" @select="insertTerm" />

    <!-- Modal for books -->
    <BookSelectorModal v-model="showBookModal" @select="insertBook" />

    <!-- Modal for articles -->
    <ArticleSelectorModal v-model="showArticleModal" :exclude-id="isEditing ? Number(articleId) : undefined" @select="insertArticle" />
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  padding: 0 !important;
}
.editor-page--fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 40 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: #fff;
}
.dark .editor-page--fullscreen {
  background: #111113;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  flex-shrink: 0;
}
.dark .editor-topbar { background: #1a1a1d; border-bottom-color: #2a2a2e; }

.editor-topbar-left, .editor-topbar-right { display: flex; align-items: center; gap: 12px; }

.editor-title { font-size: 16px; font-weight: 600; }
.translation-flags { display: flex; gap: 4px; }
.lang-flag-btn {
  padding: 2px 7px; border-radius: 999px; border: 1.5px solid transparent; font-size: 10px; font-weight: 700;
  cursor: pointer;
}
.lang-flag--valid { border-color: #16a34a; background: #dcfce7; color: #15803d; }
.lang-flag--invalid { border-color: #d1d5db; color: #9ca3af; }
.dark .lang-flag--valid { border-color: #166534; background: #052e16; color: #4ade80; }
.dark .lang-flag--invalid { border-color: #3f3f46; color: #6b7280; }

.history-btn, .save-btn, .back-btn {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.back-btn {
  padding: 6px;
  border-radius: 8px;
  color: #888;
  transition: all 0.15s;
}
.back-btn:hover {
  background: #f3f4f6;
  color: #1a1a1a;
}
.dark .back-btn:hover {
  background: #252528;
  color: #e5e5e5;
}

.history-btn { border: 1px solid #e5e7eb; color: #555; }
.dark .history-btn { border-color: #333; color: #aaa; }
.save-btn { background: var(--gv-primary); color: #fff; border: none; }
.save-btn:hover { background: var(--gv-primary-hover); }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.editor-body { display: flex; flex: 1; overflow: hidden; }

.editor-sidebar {
  width: 280px; flex-shrink: 0; padding: 16px; border-right: 1px solid #e5e7eb; background: #fafafa; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
}
.dark .editor-sidebar { background: #161618; border-right-color: #2a2a2e; }

.meta-group { display: flex; flex-direction: column; gap: 4px; }
.meta-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; }
.meta-input { padding: 8px 10px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; width: 100%; outline: none; }
.dark .meta-input { background: #1e1e21; border-color: #2a2a2e; color: #e5e5e5; }
.meta-input:focus { border-color: var(--gv-primary); }
.meta-input--mono { font-family: monospace; font-size: 12px; }
.meta-textarea { min-height: 80px; resize: vertical; }

.meta-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; cursor: pointer; }
.dark .meta-toggle { color: #aaa; }

.editor-main-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.pres-locale-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.pres-upload-btn { display: flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 11px; background: #f3f4f6; border-radius: 6px; cursor: pointer; }
.dark .pres-upload-btn { background: #27272a; color: #d1d5db; }
.pres-upload-btn--loading { opacity: 0.7; cursor: wait; }
.pres-upload-btn--disabled { opacity: 0.5; cursor: not-allowed; background: #eaeaea; color: #999; }
.dark .pres-upload-btn--disabled { background: #222; color: #666; }

.term-ref-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--gv-primary) 32%, var(--gv-border-principal));
  background: color-mix(in srgb, var(--gv-primary) 12%, transparent);
  color: var(--gv-primary);
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.term-ref-link {
  color: inherit;
  text-decoration: underline;
}

.term-ref-link-static {
  color: inherit;
}

@media (max-width: 768px) {
  .editor-page {
    height: auto;
    min-height: calc(100vh - 72px);
    margin: 0;
    border: 1px solid var(--gv-border-principal);
    border-radius: 14px;
    overflow: hidden;
  }

  .editor-body {
    flex-direction: column;
  }

  .editor-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: 280px;
  }
}
</style>
