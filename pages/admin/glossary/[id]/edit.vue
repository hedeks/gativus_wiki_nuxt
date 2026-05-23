<template>
  <div class="admin-page-stack glossary-form-page">
    <template v-if="term">
      <div class="cta-buttons admin-index-toolbar cta-buttons--left">
        <GvButton to="/admin/glossary" variant="outline" color="gray" size="sm" icon="i-heroicons-arrow-left">
          Назад к глоссарию
        </GvButton>
      </div>

      <section class="admin-dash-hero">
        <div class="hero-title-container">
          <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
          <div class="hero-text">
            <p class="gv-admin-eyebrow">ADMIN</p>
            <h1 class="hero-title gv-hero-gradient uppercase">Термин</h1>
            <p class="hero-lead mono text-sm">{{ term.slug }}</p>
          </div>
        </div>
      </section>

      <section class="section-card">
        <header class="card-header">
          <span class="card-badge">EDIT</span>
          <h2 class="card-header-title">Редактирование</h2>
          <div class="translation-flags">
            <button type="button" class="lang-flag-btn" :class="form.translation_valid_en ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="form.translation_valid_en = !form.translation_valid_en">EN</button>
            <button type="button" class="lang-flag-btn" :class="form.translation_valid_ru ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="form.translation_valid_ru = !form.translation_valid_ru">RU</button>
            <button type="button" class="lang-flag-btn" :class="form.translation_valid_zh ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="form.translation_valid_zh = !form.translation_valid_zh">ZH</button>
          </div>
        </header>
        <div class="card-body">
          <form class="term-form" @submit.prevent="handleSubmit">
      
      <!-- ODT Upload Section -->
      <div class="odt-upload-section mb-6">
        <label class="field-label">Импорт из ODT</label>
        <div class="odt-dropzone">
          <input type="file" ref="odtFileInput" class="hidden" accept=".odt" @change="handleOdtUpload" />
          <GvButton 
            color="gray" 
            variant="soft" 
            icon="i-heroicons-arrow-up-tray" 
            :loading="odtUploading"
            @click="(odtFileInput as HTMLInputElement).click()"
          >
            Выбрать .odt файл
          </GvButton>
          <p class="text-xs text-gray-500 mt-2">Текст из ODT можно вставить в определение или в статью-раскрытие</p>
        </div>
      </div>

      <UTabs :items="tabItems" class="mb-8" @change="activeTab = tabItems[$event].key">
        <template #item="{ item }">
          <div v-if="item.key === 'en'" class="tab-content space-y-5 pt-4">
            <div class="field">
              <label class="field-label">Название (EN/Default) <span class="required">*</span></label>
              <input v-model="form.title" class="field-input" required placeholder="Term title" />
            </div>
            <div class="field">
              <label class="field-label">Определение (EN/Default) <span class="required">*</span></label>
              <div class="def-field-wrap">
                <div class="def-toolbar">
                  <button type="button" class="def-toolbar-btn" title="Bold — выделите текст и нажмите" @click="applyBold(enDefRef, 'definition')"><strong>B</strong></button>
                </div>
                <textarea ref="enDefRef" v-model="form.definition" rows="4" class="field-textarea field-textarea--def" required placeholder="Brief definition in English..." />
              </div>
            </div>
          </div>

          <div v-else-if="item.key === 'ru'" class="tab-content space-y-5 pt-4">
            <div class="field">
              <label class="field-label">Название (RU)</label>
              <input v-model="form.title_ru" class="field-input" placeholder="Название на русском" />
            </div>
            <div class="field">
              <label class="field-label">Slug (RU)</label>
              <input v-model="form.slug_ru" class="field-input" placeholder="slug-na-russkom" />
            </div>
            <div class="field">
              <label class="field-label">Определение (RU)</label>
              <div class="def-field-wrap">
                <div class="def-toolbar">
                  <button type="button" class="def-toolbar-btn" title="Bold — выделите текст и нажмите" @click="applyBold(ruDefRef, 'definition_ru')"><strong>B</strong></button>
                </div>
                <textarea ref="ruDefRef" v-model="form.definition_ru" rows="4" class="field-textarea field-textarea--def" placeholder="Краткое определение на русском..." />
              </div>
            </div>
          </div>

          <div v-else-if="item.key === 'zh'" class="tab-content space-y-5 pt-4">
            <div class="field">
              <label class="field-label">Название (ZH)</label>
              <input v-model="form.title_zh" class="field-input" placeholder="中文标题" />
            </div>
            <div class="field">
              <label class="field-label">Slug (ZH)</label>
              <input v-model="form.slug_zh" class="field-input" placeholder="zhong-wen-slug" />
            </div>
            <div class="field">
              <label class="field-label">Определение (ZH)</label>
              <div class="def-field-wrap">
                <div class="def-toolbar">
                  <button type="button" class="def-toolbar-btn" title="Bold — выделите текст и нажмите" @click="applyBold(zhDefRef, 'definition_zh')"><strong>B</strong></button>
                </div>
                <textarea ref="zhDefRef" v-model="form.definition_zh" rows="4" class="field-textarea field-textarea--def" placeholder="简短定义..." />
              </div>
            </div>
          </div>
        </template>
      </UTabs>

      <!-- Common Fields -->
      <div class="field">
        <label class="field-label">Синонимы (aliases)</label>
        <div class="aliases-input">
          <div class="aliases-tags">
            <span v-for="(alias, i) in form.aliases" :key="i" class="alias-tag">
              {{ alias }}
              <button type="button" @click="removeAlias(i)" class="remove-alias">×</button>
            </span>
          </div>
          <input
            v-model="aliasInput"
            class="alias-field"
            placeholder="Добавить синоним, Enter"
            @keydown.enter.prevent="addAlias"
            @keydown.comma.prevent="addAlias"
          />
        </div>
      </div>

      <div class="field">
        <label class="field-label">Категория (Универсальная)</label>
        <select v-model="form.category_id" class="field-input">
          <option :value="null">Без категории</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.title_ru || cat.title }}
          </option>
        </select>
      </div>

      <!-- Media Section -->
      <div class="field">
        <label class="field-label">Медиа-материалы</label>
        <div class="media-inputs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="media-field">
             <label class="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Изображение (URL или загрузка)</label>
             <AdminMediaPicker
                v-model="form.image_url"
                upload-endpoint="/api/admin/uploads/term-media"
                accept="image/*"
             />
          </div>
          <div class="media-field">
             <label class="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Видео (URL или загрузка)</label>
             <AdminMediaPicker
                v-model="form.video_url"
                upload-endpoint="/api/admin/uploads/term-media"
                accept="video/*"
             />
          </div>
        </div>
      </div>

      <div class="field">
        <label class="field-label">
          Презентации
          <UBadge v-if="form.presentation_path || form.presentation_path_ru || form.presentation_path_zh" color="sky" variant="soft" size="xs" class="rounded-md">Файлы</UBadge>
        </label>
        <p v-if="!term.term_article_id" class="text-xs text-gray-400 italic">Для загрузки файла сначала создайте статью-раскрытие.</p>
        <div class="space-y-3">
          <div v-for="loc in (['en', 'ru', 'zh'] as const)" :key="loc" class="pres-locale-block">
            <span class="pres-locale-label">{{ loc.toUpperCase() }}</span>
            <input
              v-model="form[loc === 'en' ? 'presentation_path' : loc === 'ru' ? 'presentation_path_ru' : 'presentation_path_zh']"
              class="field-input pres-url-input"
              :placeholder="loc === 'en' ? '/presentations/...' : `URL (${loc.toUpperCase()})`"
            />
            <div v-if="form[loc === 'en' ? 'presentation_path' : loc === 'ru' ? 'presentation_path_ru' : 'presentation_path_zh']" class="pres-attached">
              <span class="pres-filename">{{ (form[loc === 'en' ? 'presentation_path' : loc === 'ru' ? 'presentation_path_ru' : 'presentation_path_zh'] || '').split('/').pop() }}</span>
            </div>
            <label
              v-if="term.term_article_id"
              class="pres-upload-btn"
              :class="{ 'pres-upload-btn--loading': presUploadLocale === loc }"
            >
              <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" :disabled="!!presUploadLocale" @change="uploadPresentation($event, loc)" />
              <UIcon v-if="presUploadLocale !== loc" name="i-heroicons-arrow-up-tray" />
              <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
              <span>{{ presUploadLocale === loc ? 'Загрузка...' : `Загрузить ${loc.toUpperCase()}` }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Article Management -->
      <div class="field">
        <label class="field-label">Статья-раскрытие</label>
        
        <div v-if="term.term_article_id" class="article-manager-card">
          <div class="article-info">
            <UIcon name="i-heroicons-document-text" class="article-icon" />
            <div class="article-details">
              <span class="article-status">Связана со статьёй (ID: {{ term.term_article_id }})</span>
              <span class="article-slug">/articles/{{ term.article_slug }}</span>
            </div>
          </div>
          <div class="article-actions">
            <NuxtLink :to="`/admin/articles/${term.term_article_id}/edit`" class="btn-manage">
              <UIcon name="i-heroicons-pencil-square" />
              Редактировать статью
            </NuxtLink>
            <GvButton 
              color="red" 
              variant="ghost" 
              size="xs" 
              icon="i-heroicons-trash" 
              @click="confirmDeleteArticle = true"
            >
              Удалить связь
            </GvButton>
          </div>
        </div>

        <div v-else class="no-article-placeholder">
          <UIcon name="i-heroicons-document-plus" class="text-3xl text-gray-300 mb-2" />
          <p class="font-medium text-gray-500 mb-4">У данного термина пока нет расширенной статьи-раскрытия.</p>
          <GvButton
            :to="`/admin/articles/create?term_id=${term.id}`"
            color="primary"
            variant="solid"
            icon="i-heroicons-document-plus"
          >
            Создать статью-раскрытие
          </GvButton>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Описание изменения</label>
        <input v-model="form.change_summary" class="field-input" placeholder="Что изменено..." />
      </div>

      <!-- Popup Preview -->
      <div class="field">
        <div class="field-label" style="justify-content: space-between;">
          <span>Preview попапа</span>
          <button type="button" class="preview-toggle-btn" @click="showPopupPreview = !showPopupPreview">
            {{ showPopupPreview ? 'Скрыть' : 'Показать' }}
          </button>
        </div>
        <Transition name="popup-preview-fade">
          <div v-if="showPopupPreview" class="popup-preview-wrap">
            <div class="popup-preview-label">Так выглядит попап при наведении на термин в статье:</div>
            <div class="popup-preview-card">
              <div v-if="form.category_id" class="pp-category">
                {{ categories?.find(c => c.id === form.category_id)?.title_ru || categories?.find(c => c.id === form.category_id)?.title || '' }}
              </div>
              <div class="pp-title">{{ form.title || '(нет названия)' }}</div>
              <div v-if="form.image_url" class="pp-media">
                <img :src="form.image_url" class="pp-media-img" alt="" />
              </div>
              <div v-if="form.aliases.length" class="pp-aliases">
                <span v-for="alias in form.aliases.slice(0, 3)" :key="alias" class="pp-alias-chip">{{ alias }}</span>
              </div>
              <p v-if="form.definition" class="pp-definition" v-html="renderBold(form.definition)" />
              <p v-else class="pp-definition pp-definition--empty">(нет определения)</p>
              <div class="pp-footer">
                <span class="pp-link">Открыть статью →</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div class="form-actions">
        <GvButton to="/admin/glossary" color="gray" variant="soft" size="lg">Отмена</GvButton>
        <GvButton :to="`/glossary/${term.slug}`" target="_blank" color="gray" variant="ghost" size="lg" icon="i-heroicons-eye">Просмотр</GvButton>
        <GvButton type="submit" color="primary" :loading="submitting" size="lg" icon="i-heroicons-check">
          Сохранить изменения
        </GvButton>
      </div>

      <div v-if="success" class="success-banner">
        <UIcon name="i-heroicons-check-circle" /> Термин сохранён
      </div>
      <div v-if="error" class="error-banner">
        <UIcon name="i-heroicons-exclamation-circle" /> {{ error }}
      </div>
    </form>
        </div>
      </section>
    </template>

    <section v-else-if="!pending" class="section-card">
      <div class="card-body not-found-inner">
        <p>Термин не найден</p>
        <GvButton to="/admin/glossary" variant="outline" color="gray" size="sm">← Назад</GvButton>
      </div>
    </section>

    <section v-else class="section-card">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-arrow-path" class="icon-spin" />
        <span>Загрузка…</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'

const odtFileInput = ref<HTMLInputElement>()
const enDefRef = ref<HTMLTextAreaElement>()
const ruDefRef = ref<HTMLTextAreaElement>()
const zhDefRef = ref<HTMLTextAreaElement>()

interface AdminTerm {
  id: number
  slug: string
  slug_ru: string | null
  title: string
  title_ru: string | null
  aliases: string[]
  definition: string
  definition_ru: string | null
  term_article_id: number | null
  article_html?: string
  article_slug?: string
  category_id: number | null
  presentation_path: string
  category_title?: string
  has_article: boolean
}

interface Category {
  id: number
  slug: string
  title: string
  title_ru: string | null
}

const tabItems = [
  { key: 'en', label: 'English (EN)', icon: 'i-heroicons-globe-alt' },
  { key: 'ru', label: 'Русский (RU)', icon: 'i-heroicons-language' },
  { key: 'zh', label: '中文 (ZH)', icon: 'i-heroicons-language' }
]

definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const store = userStore()
const toast = useToast()
const termId = route.params.id as string

const activeTab = ref('en')

// 1. Reactive state definitions
const form = reactive({
  title: '',
  title_ru: '',
  title_zh: '',
  slug_ru: '',
  slug_zh: '',
  aliases: [] as string[],
  definition: '',
  definition_ru: '',
  definition_zh: '',
  presentation_path: '',
  presentation_path_ru: '',
  presentation_path_zh: '',
  image_url: '',
  video_url: '',
  category_id: null as number | null,
  change_summary: '',
  translation_valid_en: true,
  translation_valid_ru: false,
  translation_valid_zh: false,
})

const aliasInput = ref('')
const submitting = ref(false)
const odtUploading = ref(false)
const presUploadLocale = ref<'en' | 'ru' | 'zh' | null>(null)
const error = ref('')
const success = ref(false)
const confirmDeleteArticle = ref(false)
const showPopupPreview = ref(false)

// 2. Pure functions
function renderBold(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
}

function applyBold(el: HTMLTextAreaElement | undefined, field: 'definition' | 'definition_ru' | 'definition_zh') {
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  if (start === end) return
  const text = form[field]
  form[field] = `${text.slice(0, start)}**${text.slice(start, end)}**${text.slice(end)}`
  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + 2, end + 2)
  })
}

function addAlias() {
  const val = aliasInput.value.trim().replace(/,$/, '')
  if (val && !form.aliases.includes(val)) form.aliases.push(val)
  aliasInput.value = ''
}
function removeAlias(i: number) { form.aliases.splice(i, 1) }

// 3. Data fetching
const { data: term, pending, refresh } = await useAsyncData<AdminTerm>(`admin-term-edit-${termId}`,
  () => $fetch<AdminTerm>(`/api/admin/terms/${termId}`, { 
    headers: store.getAuthHeader()
  })
)

const { data: categories } = await useAsyncData<Category[]>('admin-cats-edit', () => 
  $fetch<Category[]>('/api/categories', {
    headers: store.getAuthHeader()
  })
)

// 4. Watchers and SEO
watch(term, (t) => {
  if (!t) return
  form.title = t.title
  form.title_ru = t.title_ru || ''
  form.title_zh = (t as any).title_zh || ''
  form.slug_ru = t.slug_ru || ''
  form.slug_zh = (t as any).slug_zh || ''
  form.aliases = Array.isArray(t.aliases) ? [...t.aliases] : []
  form.definition = t.definition
  form.definition_ru = t.definition_ru || ''
  form.definition_zh = (t as any).definition_zh || ''
  form.presentation_path = t.presentation_path || ''
  form.presentation_path_ru = (t as any).presentation_path_ru || ''
  form.presentation_path_zh = (t as any).presentation_path_zh || ''
  form.image_url = (t as any).image_url || ''
  form.video_url = (t as any).video_url || ''
  form.category_id = t.category_id || null
  form.translation_valid_en = (t as any).translation_valid_en !== undefined ? Boolean((t as any).translation_valid_en) : true
  form.translation_valid_ru = Boolean((t as any).translation_valid_ru)
  form.translation_valid_zh = Boolean((t as any).translation_valid_zh)
}, { immediate: true })

useSeoMeta({ title: computed(() => `Редактировать: ${term.value?.title || '...'} — Admin`) })

// 5. Async actions and handlers
async function uploadPresentation(event: Event, locale: 'en' | 'ru' | 'zh') {
  if (!term.value?.article_slug) return
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  presUploadLocale.value = locale
  try {
    const formData = new FormData()
    formData.append('file', input.files[0])
    const result = await $fetch<{ presentation_path: string }>(`/api/articles/${term.value.article_slug}/presentation`, {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: formData,
      query: { locale },
    })
    if (locale === 'ru') form.presentation_path_ru = result.presentation_path
    else if (locale === 'zh') form.presentation_path_zh = result.presentation_path
    else form.presentation_path = result.presentation_path
    toast.add({ title: 'Презентация загружена', color: 'green' })
  } catch (e: any) {
    toast.add({ title: 'Ошибка загрузки', description: e.data?.statusMessage || e.message, color: 'red' })
  } finally {
    presUploadLocale.value = null
    input.value = ''
  }
}

async function handleOdtUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  const formData = new FormData()
  formData.append('file', file)

  odtUploading.value = true
  try {
    const { html } = await $fetch<{ html: string }>('/api/admin/uploads/odt-to-html', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: formData
    })

    // For now, simplicity: set the definition to the converted text (stripped of HTML tags for the definition field)
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    
    // Populate the current tab's definition
    if (activeTab.value === 'en' && !form.definition) form.definition = text
    else if (activeTab.value === 'ru' && !form.definition_ru) form.definition_ru = text
    else if (activeTab.value === 'zh' && !form.definition_zh) form.definition_zh = text
    
    toast.add({ title: 'ODT импортирован', description: 'Текст добавлен в поле определения', color: 'green' })
  } catch (e: any) {
    toast.add({ title: 'Ошибка импорта', description: e.data?.statusMessage || e.message, color: 'red' })
  } finally {
    odtUploading.value = false
    input.value = ''
  }
}

async function handleSubmit() {
  if (!term.value) return
  submitting.value = true
  error.value = ''
  success.value = false
  try {
    await $fetch(`/api/terms/${term.value.slug}`, {
      method: 'PUT' as any,
      headers: {
        ...store.getAuthHeader(),
      },
      body: {
        title: form.title,
        title_ru: form.title_ru || undefined,
        title_zh: form.title_zh || undefined,
        definition: form.definition,
        definition_ru: form.definition_ru || undefined,
        definition_zh: form.definition_zh || undefined,
        slug_ru: form.slug_ru || undefined,
        slug_zh: form.slug_zh || undefined,
        aliases: form.aliases,
        presentation_path: form.presentation_path || undefined,
        presentation_path_ru: form.presentation_path_ru || undefined,
        presentation_path_zh: form.presentation_path_zh || undefined,
        image_url: form.image_url || undefined,
        video_url: form.video_url || undefined,
        category_id: form.category_id,
        change_summary: form.change_summary || undefined,
        translation_valid_en: form.translation_valid_en,
        translation_valid_ru: form.translation_valid_ru,
        translation_valid_zh: form.translation_valid_zh,
      },
    })
    success.value = true
    setTimeout(() => { success.value = false }, 3000)
    refresh()
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Ошибка при сохранении'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.glossary-form-page { 
  max-width: 900px;
  background: white;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  padding: 40px;
  margin-bottom: 60px;
}
.dark .glossary-form-page {
  background: #1e1e21;
  border-color: #2a2a2e;
}
.form-header { margin-bottom: 28px; display: flex; flex-direction: column; gap: 6px; }
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: #64748b;
  text-decoration: none; transition: color 0.15s;
}
.back-link:hover { color: #0ea5e9; }
.form-title { font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
.term-slug-display {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8;
  background: #f1f5f9; padding: 4px 10px; border-radius: 8px;
  align-self: center; border: 1px solid #e9e9e9;
}
.dark .term-slug-display { background: #27272a; }

.term-form { display: flex; flex-direction: column; gap: 32px; }
.field { display: flex; flex-direction: column; gap: 10px; }
.field-label {
  font-size: 13px; font-weight: 700; color: #374151;
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; gap: 10px;
}
.dark .field-label { color: #d1d5db; }
.required { color: #ef4444; }

.field-input, .field-textarea {
  padding: 11px 14px; border-radius: 10px;
  border: 1.5px solid #e2e8f0; background: white;
  font-size: 14px; color: #1e293b; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit; resize: vertical;
}
.dark .field-input, .dark .field-textarea {
  background: #18181b; border-color: #3f3f46; color: #e2e8f0;
}
.field-input:focus, .field-textarea:focus {
  border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
}

.aliases-input {
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: white; padding: 8px 12px;
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  transition: border-color 0.2s;
}
.dark .aliases-input { background: #18181b; border-color: #3f3f46; }
.aliases-input:focus-within { border-color: #0ea5e9; }
.aliases-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.alias-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 8px;
  background: rgba(14,165,233,0.1); color: #0ea5e9;
  font-size: 13px; font-weight: 600;
}
.remove-alias {
  background: none; border: none; cursor: pointer;
  color: #0ea5e9; font-size: 16px; line-height: 1; padding: 0;
}
.remove-alias:hover { color: #ef4444; }
.alias-field {
  border: none; outline: none; background: transparent;
  font-size: 14px; color: #1e293b; min-width: 160px; flex: 1;
}
.dark .alias-field { color: #e2e8f0; }

.article-manager-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
}
.dark .article-manager-card { background: #18181b; border-color: #27272a; }
.article-info { display: flex; align-items: center; gap: 12px; }
.article-icon { width: 32px; height: 32px; color: #64748b; }
.article-details { display: flex; flex-direction: column; }
.article-status { font-size: 13px; font-weight: 700; color: #1e293b; }
.dark .article-status { color: #e2e8f0; }
.article-slug { font-size: 11px; color: #64748b; font-family: monospace; }
.article-actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.btn-manage {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px; background: #0ea5e9; color: white;
  font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s;
}
.btn-manage:hover { background: #0284c7; transform: translateY(-1px); }

.no-article-placeholder {
  padding: 32px; text-align: center; background: #fdfdfd; border: 2px dashed #e2e8f0; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.dark .no-article-placeholder { background: #111113; border-color: #27272a; }
.no-article-placeholder p { font-size: 14px; color: #64748b; margin: 0; }

.form-actions {
  display: flex; gap: 12px; padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}
.dark .form-actions { border-color: #27272a; }

.success-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px;
  background: #dcfce7; color: #16a34a; font-size: 14px; font-weight: 600;
}
.dark .success-banner { background: #14532d; color: #4ade80; }
.error-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px;
  background: #fee2e2; color: #dc2626; font-size: 14px; font-weight: 600;
}
.dark .error-banner { background: #450a0a; color: #f87171; }

.not-found { padding: 60px; text-align: center; color: #94a3b8; }

/* ─── Translation flags ─── */
.translation-flags { display: flex; gap: 6px; margin-left: auto; }
.lang-flag-btn {
  padding: 4px 10px; border-radius: 6px; border: 1.5px solid;
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  cursor: pointer; transition: all 0.15s; line-height: 1;
}
.lang-flag--valid {
  background: rgba(34,197,94,0.1); border-color: #22c55e; color: #16a34a;
}
.lang-flag--invalid {
  background: rgba(148,163,184,0.1); border-color: #cbd5e1; color: #94a3b8;
}
.dark .lang-flag--valid { background: rgba(34,197,94,0.15); color: #4ade80; }
.dark .lang-flag--invalid { background: rgba(100,116,139,0.15); border-color: #475569; color: #64748b; }

@media (max-width: 768px) {
  .glossary-form-page {
    padding: 18px 14px;
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .form-title {
    font-size: 20px;
    letter-spacing: 1px;
  }

  .article-manager-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .article-actions {
    width: 100%;
    align-items: stretch;
  }

  .btn-manage {
    width: 100%;
    justify-content: center;
  }
}

/* ─── Presentation upload ─── */
.pres-locale-block {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pres-locale-label {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.08em;
  min-width: 24px;
}

.pres-url-input {
  flex: 1;
  min-width: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  padding: 7px 10px !important;
}

.pres-attached {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #0ea5e9;
}

.pres-filename {
  font-family: monospace;
  font-size: 11px;
  color: #0ea5e9;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pres-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, color 0.18s;
  white-space: nowrap;
}

.pres-upload-btn:hover {
  border-color: #0ea5e9;
  background: #e0f2fe;
  color: #0284c7;
}

.pres-upload-btn--loading {
  opacity: 0.7;
  pointer-events: none;
}

.dark .pres-upload-btn {
  background: #27272a;
  border-color: #3f3f46;
  color: #d1d5db;
}

.dark .pres-upload-btn:hover {
  border-color: #0ea5e9;
  background: #082f49;
  color: #38bdf8;
}

/* ─── Definition field with toolbar ─── */
.def-field-wrap {
  display: flex;
  flex-direction: column;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dark .def-field-wrap { border-color: #3f3f46; }
.def-field-wrap:focus-within {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
}

.def-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.dark .def-toolbar { background: #27272a; border-bottom-color: #3f3f46; }

.def-toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.dark .def-toolbar-btn { background: #18181b; border-color: #3f3f46; color: #d1d5db; }
.def-toolbar-btn:hover { background: #e0f2fe; border-color: #0ea5e9; color: #0ea5e9; }
.dark .def-toolbar-btn:hover { background: #082f49; border-color: #0ea5e9; color: #38bdf8; }

.field-textarea--def {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

/* ─── Popup preview ─── */
.preview-toggle-btn {
  font-size: 11px;
  font-weight: 700;
  color: #0ea5e9;
  background: none;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.preview-toggle-btn:hover { background: #f0f9ff; }
.dark .preview-toggle-btn { border-color: #0c4a6e; color: #38bdf8; }
.dark .preview-toggle-btn:hover { background: #082f49; }

.popup-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popup-preview-label {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
}

.popup-preview-card {
  background: color-mix(in srgb, #fff 94%, transparent);
  backdrop-filter: blur(14px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 320px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.dark .popup-preview-card {
  background: color-mix(in srgb, #1e1e21 92%, transparent);
  border-color: #2a2a2e;
}

.pp-category {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
}
.dark .pp-category { color: #94a3b8; }

.pp-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.dark .pp-title { color: #e2e8f0; }

.pp-media {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}
.pp-media-img { width: 100%; height: 100%; object-fit: cover; }

.pp-aliases {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pp-alias-chip {
  padding: 3px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}
.dark .pp-alias-chip { background: #27272a; border-color: #3f3f46; color: #94a3b8; }

.pp-definition {
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dark .pp-definition { color: #94a3b8; }
.pp-definition--empty { color: #cbd5e1; font-style: italic; }

.pp-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}
.dark .pp-footer { border-top-color: #2a2a2e; }

.pp-link {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}

.popup-preview-fade-enter-active,
.popup-preview-fade-leave-active {
  transition: all 0.2s ease;
}
.popup-preview-fade-enter-from,
.popup-preview-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
