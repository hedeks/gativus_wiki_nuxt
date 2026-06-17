<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import AdminArticleWysiwyg from '~/components/admin/AdminArticleWysiwyg.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const route = useRoute()
const store = userStore()
const toast = useToast()

const articleId = route.params.id as string

const { data: fullArticle, refresh, pending } = await useFetch(`/api/admin/articles/${articleId}`, {
  headers: store.getAuthHeader(),
})
const slug = computed(() => fullArticle.value?.slug || '')

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
    translationValidEn.value = article.translation_valid_en !== undefined ? Boolean(article.translation_valid_en) : true
    translationValidRu.value = Boolean(article.translation_valid_ru)
    translationValidZh.value = Boolean(article.translation_valid_zh)
    
    nextTick(() => {
      editorRef.value?.pushHistory?.('Загрузка статьи')
    })
  }
}, { immediate: true })

useHead({ title: computed(() => `${title.value || 'Редактирование'} — Gativus Admin`) })

const { data: categoriesData } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})
const categories = computed(() => (Array.isArray(categoriesData.value) ? categoriesData.value : []) as any[])

const isSaving = ref(false)
const showTermModal = ref(false)

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
        translation_valid_en: translationValidEn.value,
        translation_valid_ru: translationValidRu.value,
        translation_valid_zh: translationValidZh.value,
      },
    })

    toast.add({ title: 'Статья сохранена', color: 'green' })
    changeSummary.value = ''
  } catch (err: any) {
    toast.add({ title: 'Ошибка сохранения', description: err?.data?.statusMessage || err.message, color: 'red' })
  }

  isSaving.value = false
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

const syncSlug = ref(false)
const syncSlugRu = ref(false)
const syncSlugZh = ref(false)

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

</script>

<template>
  <div class="admin-page-stack admin-page-stack--fluid editor-page gv-admin-page" tabindex="-1">
    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <h1 class="editor-title">{{ title || 'Без названия' }}</h1>
        <div class="translation-flags">
          <button type="button" class="lang-flag-btn" :class="translationValidEn ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="translationValidEn = !translationValidEn">EN</button>
          <button type="button" class="lang-flag-btn" :class="translationValidRu ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="translationValidRu = !translationValidRu">RU</button>
          <button type="button" class="lang-flag-btn" :class="translationValidZh ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="translationValidZh = !translationValidZh">ZH</button>
        </div>
        <div v-if="fullArticle?.is_term_article" class="term-ref-badge">
          <UIcon name="i-heroicons-book-open" />
          <span>Disclosure for: </span>
          <NuxtLink :to="`/admin/glossary/${fullArticle.term_id}/edit`" class="term-ref-link">{{ fullArticle.term_title }}</NuxtLink>
        </div>
      </div>
      <div class="editor-topbar-right">
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
        <UTabs :items="[{ label: '🇬🇧 EN', slot: 'en' }, { label: '🇷🇺 RU', slot: 'ru' }, { label: '🇨🇳 ZH', slot: 'zh' }]" @change="activeTab = ['en', 'ru', 'zh'][$event]" class="w-full mb-4">
          <template #en>
            <div class="space-y-4 pt-2">
              <div class="meta-group"><label class="meta-label">Название</label><input v-model="title" class="meta-input" placeholder="Заголовок статьи" /></div>
              <div class="meta-group">
                <div class="flex items-center justify-between">
                  <label class="meta-label">Slug</label>
                  <button @click="syncSlug = !syncSlug" class="text-[10px] font-bold" :class="syncSlug ? 'text-indigo-500' : 'text-gray-400'">{{ syncSlug ? 'AUTO' : 'MANUAL' }}</button>
                </div>
                <input v-model="articleSlug" class="meta-input meta-input--mono" placeholder="url-slug" />
              </div>
              <div class="meta-group"><label class="meta-label">Краткое описание (EN)</label><textarea v-model="excerptEn" class="meta-input meta-textarea" rows="4" /></div>
            </div>
          </template>
          <template #ru>
            <div class="space-y-4 pt-2">
              <div class="meta-group"><label class="meta-label">Название (RU)</label><input v-model="titleRu" class="meta-input" /></div>
              <div class="meta-group">
                <div class="flex items-center justify-between">
                  <label class="meta-label">Slug (RU)</label>
                  <button @click="syncSlugRu = !syncSlugRu" class="text-[10px] font-bold" :class="syncSlugRu ? 'text-indigo-500' : 'text-gray-400'">{{ syncSlugRu ? 'AUTO' : 'MANUAL' }}</button>
                </div>
                <input v-model="articleSlugRu" class="meta-input meta-input--mono" />
              </div>
              <div class="meta-group"><label class="meta-label">Краткое описание (RU)</label><textarea v-model="excerptRu" class="meta-input meta-textarea" rows="4" /></div>
            </div>
          </template>
          <template #zh>
            <div class="space-y-4 pt-2">
              <div class="meta-group"><label class="meta-label">Название (ZH)</label><input v-model="titleZh" class="meta-input" /></div>
              <div class="meta-group">
                <div class="flex items-center justify-between">
                  <label class="meta-label">Slug (ZH)</label>
                  <button @click="syncSlugZh = !syncSlugZh" class="text-[10px] font-bold" :class="syncSlugZh ? 'text-indigo-500' : 'text-gray-400'">{{ syncSlugZh ? 'AUTO' : 'MANUAL' }}</button>
                </div>
                <input v-model="articleSlugZh" class="meta-input meta-input--mono" />
              </div>
              <div class="meta-group"><label class="meta-label">Краткое описание (ZH)</label><textarea v-model="excerptZh" class="meta-input meta-textarea" rows="4" /></div>
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
          <label class="meta-toggle"><input type="checkbox" v-model="isPublished" /><span>Опубликовано</span></label>
        </div>
        <div class="meta-group">
          <label class="meta-label">Описание изменений</label>
          <input v-model="changeSummary" class="meta-input" placeholder="Что изменилось?" />
        </div>

        <div class="meta-group">
          <label class="meta-label">Презентации</label>
          <div class="pres-locale-block">
            <span class="pres-locale-label">EN</span>
            <div class="flex items-center gap-1 w-full">
              <input v-model="presentationPath" class="meta-input meta-input--mono pres-url-input flex-1" placeholder="URL или загрузка ниже" />
              <button v-if="presentationPath" type="button" @click="presentationPath = ''" class="text-red-500 hover:text-red-700 p-1"><UIcon name="i-heroicons-trash" /></button>
            </div>
            <label class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'en' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'en')" />
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить EN</span>
            </label>
          </div>
          <div class="pres-locale-block">
            <span class="pres-locale-label">RU</span>
            <div class="flex items-center gap-1 w-full">
              <input v-model="presentationPathRu" class="meta-input meta-input--mono pres-url-input flex-1" />
              <button v-if="presentationPathRu" type="button" @click="presentationPathRu = ''" class="text-red-500 hover:text-red-700 p-1"><UIcon name="i-heroicons-trash" /></button>
            </div>
            <label class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'ru' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'ru')" />
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить RU</span>
            </label>
          </div>
          <div class="pres-locale-block">
            <span class="pres-locale-label">ZH</span>
            <div class="flex items-center gap-1 w-full">
              <input v-model="presentationPathZh" class="meta-input meta-input--mono pres-url-input flex-1" />
              <button v-if="presentationPathZh" type="button" @click="presentationPathZh = ''" class="text-red-500 hover:text-red-700 p-1"><UIcon name="i-heroicons-trash" /></button>
            </div>
            <label class="pres-upload-btn" :class="{ 'pres-upload-btn--loading': isUploadingPresentation && presUploadLocale === 'zh' }">
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" @change="uploadPresentation($event, 'zh')" />
              <UIcon name="i-heroicons-arrow-up-tray" /><span>Загрузить ZH</span>
            </label>
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
          :article-id="Number(articleId)"
          @show-term-modal="showTermModal = true"
        />
      </div>
    </div>

    <AdminTermSelectorModal v-model="showTermModal" @select="insertTerm" />
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px);
  margin: -20px;
  overflow: hidden;
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
}
.lang-flag--valid { border-color: #16a34a; background: #dcfce7; color: #15803d; }
.lang-flag--invalid { border-color: #d1d5db; color: #9ca3af; }
.dark .lang-flag--valid { border-color: #166534; background: #052e16; color: #4ade80; }
.dark .lang-flag--invalid { border-color: #3f3f46; color: #6b7280; }

.history-btn, .save-btn {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;
}
.history-btn { border: 1px solid #e5e7eb; }
.save-btn { background: var(--gv-primary); color: #fff; border: none; }

.editor-body { display: flex; flex: 1; overflow: hidden; }

.editor-sidebar {
  width: 280px; flex-shrink: 0; padding: 16px; border-right: 1px solid #e5e7eb; background: #fafafa; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
}
.dark .editor-sidebar { background: #161618; border-right-color: #2a2a2e; }

.meta-group { display: flex; flex-direction: column; gap: 4px; }
.meta-label { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; }
.meta-input { padding: 8px 10px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; width: 100%; }
.meta-input--mono { font-family: monospace; font-size: 12px; }
.meta-textarea { min-height: 80px; resize: vertical; }

.editor-main-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

.pres-locale-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.pres-upload-btn { display: flex; align-items: center; gap: 6px; padding: 6px 10px; font-size: 11px; background: #f3f4f6; border-radius: 6px; cursor: pointer; }
</style>
