<template>
  <div class="glossary-form-page gv-admin-page">
    <div class="form-header">
      <NuxtLink to="/admin/glossary" class="back-link">
        <UIcon name="i-heroicons-arrow-left" /> Назад к глоссарию
      </NuxtLink>
      <h1 class="form-title">Создать термин</h1>
    </div>

    <form class="term-form" @submit.prevent="handleSubmit">

      <!-- ODT Upload Section -->
      <div class="odt-upload-section mb-6">
        <label class="field-label">Импорт из ODT</label>
        <div class="odt-dropzone">
          <input type="file" ref="odtFileInput" class="hidden" accept=".odt" @change="handleOdtUpload" />
          <UButton color="gray" variant="soft" icon="i-heroicons-arrow-up-tray" :loading="odtUploading"
            @click="(odtFileInput as HTMLInputElement).click()">
            Выбрать .odt файл
          </UButton>
          <p class="text-xs text-gray-500 mt-2">Текст из ODT можно вставить в определение или в статью-раскрытие</p>
        </div>
      </div>

      <UTabs :items="tabItems" class="mb-8" @change="activeTab = tabItems[$event].key">
        <template #item="{ item }">
          <div v-if="item.key === 'en'" class="tab-content space-y-5 pt-4">
            <div class="field">
              <label class="field-label">Название (EN/Default) <span class="required">*</span></label>
              <input v-model="form.title" class="field-input" placeholder="Term title" />
            </div>
            <div class="field">
              <label class="field-label">Slug (EN/Default)</label>
              <input v-model="form.slug" class="field-input mono" :placeholder="autoSlug" />
            </div>
            <div class="field">
              <label class="field-label">Определение (EN/Default) <span class="required">*</span></label>
              <UTextarea v-model="form.definition" :rows="4" class="field-textarea"
                placeholder="Brief definition in English..." />
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
              <UTextarea v-model="form.definition_ru" :rows="4" class="field-textarea"
                placeholder="Краткое определение на русском..." />
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
              <UTextarea v-model="form.definition_zh" :rows="4" class="field-textarea"
                placeholder="简短定义..." />
            </div>
          </div>
        </template>
      </UTabs>

      <!-- Aliases -->
      <div class="field">
        <label class="field-label">Синонимы (aliases)</label>
        <div class="aliases-input">
          <div class="aliases-tags">
            <span v-for="(alias, i) in form.aliases" :key="i" class="alias-tag">
              {{ alias }}
              <button type="button" @click="removeAlias(i)" class="remove-alias">×</button>
            </span>
          </div>
          <input v-model="aliasInput" class="alias-field" placeholder="Добавить синоним, Enter"
            @keydown.enter.prevent="addAlias" @keydown.comma.prevent="addAlias" />
        </div>
      </div>

      <!-- Category -->
      <div class="field">
        <label class="field-label">Категория (Универсальная)</label>
        <select v-model="form.category_id" class="field-input">
          <option :value="null">Без категории</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.title_ru || cat.title }}
          </option>
        </select>
      </div>

      <!-- Presentation (per locale) -->
      <div class="field">
        <label class="field-label">Презентация (EN)</label>
        <input v-model="form.presentation_path" class="field-input" placeholder="/presentations/..." />
      </div>
      <div class="field">
        <label class="field-label">Презентация (RU)</label>
        <input v-model="form.presentation_path_ru" class="field-input" placeholder="/presentations/..." />
      </div>
      <div class="field">
        <label class="field-label">Презентация (ZH)</label>
        <input v-model="form.presentation_path_zh" class="field-input" placeholder="/presentations/..." />
      </div>

      <!-- Full article -->
      <div class="field">
        <label class="field-label">Статья-раскрытие (HTML)</label>
        <div class="editor-wrap">
          <div class="editor-toolbar">
            <button type="button" class="toolbar-btn" @click="wrapSelection('strong')">
              <strong>B</strong>
            </button>
            <button type="button" class="toolbar-btn" @click="wrapSelection('em')">
              <em>I</em>
            </button>
            <button type="button" class="toolbar-btn" @click="wrapSelection('code')">
              &lt;/&gt;
            </button>
            <button type="button" class="toolbar-btn" @click="insertTag('h2')">H2</button>
            <button type="button" class="toolbar-btn" @click="insertTag('h3')">H3</button>
            <button type="button" class="toolbar-btn" @click="showTermModal = true" title="Wiki Link">
              <UIcon name="i-heroicons-book-open" class="text-sky-500" />
            </button>
            <button type="button" class="toolbar-btn" @click="insertTag('p')">¶</button>
          </div>
          <textarea
            v-if="activeTab === 'en'"
            ref="editorRef"
            v-model="form.html_content"
            class="field-textarea editor-textarea"
            rows="12"
            placeholder="Опционально. Расширенное раскрытие термина в HTML-формате (EN). Будет отображаться на странице /glossary/:slug."
          />
          <textarea
            v-else-if="activeTab === 'ru'"
            ref="editorRef"
            v-model="form.html_content_ru"
            class="field-textarea editor-textarea"
            rows="12"
            placeholder="Опционально. Расширенное раскрытие термина в HTML-формате (RU). Будет отображаться на странице /glossary/:slug."
          />
          <textarea
            v-else-if="activeTab === 'zh'"
            ref="editorRef"
            v-model="form.html_content_zh"
            class="field-textarea editor-textarea"
            rows="12"
            placeholder="Опционально. Расширенное раскрытие термина в HTML-формате (ZH). Будет отображаться на странице /glossary/:slug."
          />
        </div>
      </div>

      <!-- Media Section -->
      <div class="field">
        <label class="field-label">Медиа-материалы</label>
        <div class="media-inputs grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="media-field">
            <label class="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Изображение (URL или
              загрузка)</label>
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

      <!-- Actions -->
      <div class="form-actions">
        <NuxtLink to="/admin/glossary">
          <UButton color="gray" variant="soft" size="lg">Отмена</UButton>
        </NuxtLink>
        <UButton type="submit" color="black" :loading="submitting" size="lg" icon="i-heroicons-check"
          class="rounded-xl">
          Создать термин
        </UButton>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-banner">
        <UIcon name="i-heroicons-exclamation-circle" />
        {{ error }}
      </div>
    </form>

    <!-- Modal for glossary terms -->
    <AdminTermSelectorModal v-model="showTermModal" @select="insertTerm" />
  </div>
</template>

<script setup lang="ts">
import { slugify } from '~/server/utils/slugify'
definePageMeta({ layout: 'admin', middleware: ['auth', 'role'] })
useSeoMeta({ title: 'Создать термин — Admin' })

const router = useRouter()
const store = userStore()
const toast = useToast()

const odtFileInput = ref<HTMLInputElement>()

const activeTab = ref('en')

const tabItems = [
  { key: 'en', label: 'English (EN)', icon: 'i-heroicons-globe-alt' },
  { key: 'ru', label: 'Русский (RU)', icon: 'i-heroicons-language' },
  { key: 'zh', label: '中文 (ZH)', icon: 'i-heroicons-language' }
]

const form = reactive({
  title: '',
  title_ru: '',
  title_zh: '',
  slug: '',
  slug_ru: '',
  slug_zh: '',
  aliases: [] as string[],
  definition: '',
  definition_ru: '',
  definition_zh: '',
  html_content: '',
  html_content_ru: '',
  html_content_zh: '',
  presentation_path: '',
  presentation_path_ru: '',
  presentation_path_zh: '',
  image_url: '',
  video_url: '',
  category_id: null as number | null,
})

const aliasInput = ref('')
const submitting = ref(false)
const odtUploading = ref(false)
const error = ref('')
const editorRef = ref<HTMLTextAreaElement>()
const showTermModal = ref(false)

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

    // Populate both full article and definitions as defaults
    if (activeTab.value === 'en') form.html_content = html
    else if (activeTab.value === 'ru') form.html_content_ru = html
    else if (activeTab.value === 'zh') form.html_content_zh = html
    
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (activeTab.value === 'en') {
      if (!form.definition) form.definition = text
    } else if (activeTab.value === 'ru') {
      if (!form.definition_ru) form.definition_ru = text
    } else if (activeTab.value === 'zh') {
      if (!form.definition_zh) form.definition_zh = text
    }

    toast.add({ title: 'ODT импортирован', description: 'Контент добавлен в форму', color: 'green' })
  } catch (e: any) {
    toast.add({ title: 'Ошибка импорта', description: e.data?.statusMessage || e.message, color: 'red' })
  } finally {
    odtUploading.value = false
    input.value = ''
  }
}

function insertTerm(term: any) {
  const ta = editorRef.value
  if (!ta) return
  const { selectionStart: s, selectionEnd: e } = ta
  const text = ta.value
  const selectedText = text.substring(s, e) || term.title

  const insertion = `<a class="wiki-term" data-term-slug="${term.slug}">${selectedText}</a>`

  if (activeTab.value === 'en') form.html_content = text.substring(0, s) + insertion + text.substring(e)
  else if (activeTab.value === 'ru') form.html_content_ru = text.substring(0, s) + insertion + text.substring(e)
  else if (activeTab.value === 'zh') form.html_content_zh = text.substring(0, s) + insertion + text.substring(e)

  nextTick(() => {
    ta.focus()
    const newPos = s + insertion.length
    ta.setSelectionRange(newPos, newPos)
  })
}

const autoSlug = computed(() => form.title ? slugify(form.title) : 'auto')

// Categories
const { data: categoriesData } = await useAsyncData('admin-cats', () =>
  $fetch<any>('/api/categories', {
    headers: store.getAuthHeader(),
  })
)
// categoriesData.value is { items: [...] } based on previous view
const categories = computed(() => categoriesData.value?.items || (Array.isArray(categoriesData.value) ? categoriesData.value : []))

function addAlias() {
  const val = aliasInput.value.trim().replace(/,$/, '')
  if (val && !form.aliases.includes(val)) form.aliases.push(val)
  aliasInput.value = ''
}
function removeAlias(i: number) { form.aliases.splice(i, 1) }

// Simple HTML toolbar helpers
function wrapSelection(tag: string) {
  const ta = editorRef.value
  if (!ta) return
  const { selectionStart: s, selectionEnd: e } = ta
  const sel = ta.value.slice(s, e)
  const wrapped = `<${tag}>${sel}</${tag}>`
  
  if (activeTab.value === 'en') form.html_content = ta.value.slice(0, s) + wrapped + ta.value.slice(e)
  else if (activeTab.value === 'ru') form.html_content_ru = ta.value.slice(0, s) + wrapped + ta.value.slice(e)
  else if (activeTab.value === 'zh') form.html_content_zh = ta.value.slice(0, s) + wrapped + ta.value.slice(e)
  
  nextTick(() => { ta.setSelectionRange(s, s + wrapped.length) })
}
function insertTag(tag: string) {
  const ta = editorRef.value
  if (!ta) return
  const insert = `<${tag}></${tag}>`
  const pos = ta.selectionStart
  
  if (activeTab.value === 'en') form.html_content = ta.value.slice(0, pos) + insert + ta.value.slice(pos)
  else if (activeTab.value === 'ru') form.html_content_ru = ta.value.slice(0, pos) + insert + ta.value.slice(pos)
  else if (activeTab.value === 'zh') form.html_content_zh = ta.value.slice(0, pos) + insert + ta.value.slice(pos)
}

async function handleSubmit() {
  if (!form.title || !form.definition) {
    error.value = 'Заполните обязательные поля EN: название и определение'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/terms', {
      method: 'POST',
      headers: {
        ...store.getAuthHeader(),
      },
      body: {
        title: form.title,
        title_ru: form.title_ru || undefined,
        title_zh: form.title_zh || undefined,
        slug: form.slug || undefined,
        slug_ru: form.slug_ru || undefined,
        slug_zh: form.slug_zh || undefined,
        aliases: form.aliases,
        definition: form.definition,
        definition_ru: form.definition_ru || undefined,
        definition_zh: form.definition_zh || undefined,
        html_content: form.html_content || undefined,
        html_content_ru: form.html_content_ru || undefined,
        html_content_zh: form.html_content_zh || undefined,
        presentation_path: form.presentation_path || undefined,
        presentation_path_ru: form.presentation_path_ru || undefined,
        presentation_path_zh: form.presentation_path_zh || undefined,
        image_url: form.image_url || undefined,
        video_url: form.video_url || undefined,
        category_id: form.category_id,
      },
    })
    router.push('/admin/glossary')
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Ошибка при создании термина'
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

.form-header {
  margin-bottom: 28px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  margin-bottom: 12px;
  transition: color 0.15s;
}

.back-link:hover {
  color: #0ea5e9;
}

.back-link svg {
  width: 15px;
  height: 15px;
}

.form-title {
  font-size: 26px;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.term-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dark .field-label {
  color: #d1d5db;
}

.required {
  color: #ef4444;
}

.field-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.field-input,
.field-textarea {
  padding: 11px 14px;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: white;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  resize: vertical;
}

.dark .field-input,
.dark .field-textarea {
  background: #18181b;
  border-color: #3f3f46;
  color: #e2e8f0;
}

.field-input:focus,
.field-textarea:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.mono {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
}

.aliases-input {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  transition: border-color 0.2s;
}

.dark .aliases-input {
  background: #18181b;
  border-color: #3f3f46;
}

.aliases-input:focus-within {
  border-color: #0ea5e9;
}

.aliases-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.alias-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
  font-size: 13px;
  font-weight: 600;
}

.remove-alias {
  background: none;
  border: none;
  cursor: pointer;
  color: #0ea5e9;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  transition: color 0.15s;
}

.remove-alias:hover {
  color: #ef4444;
}

.alias-field {
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #1e293b;
  min-width: 160px;
  flex: 1;
}

.dark .alias-field {
  color: #e2e8f0;
}

.editor-wrap {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.dark .editor-wrap {
  border-color: #3f3f46;
}

.editor-wrap:focus-within {
  border-color: #0ea5e9;
}

.editor-toolbar {
  display: flex;
  gap: 2px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dark .editor-toolbar {
  background: #1c1c1f;
  border-color: #3f3f46;
}

.toolbar-btn {
  padding: 5px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #64748b;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.toolbar-btn:hover {
  background: #e0f2fe;
  color: #0284c7;
}

.dark .toolbar-btn:hover {
  background: #1e3a5f;
  color: #38bdf8;
}

.editor-textarea {
  border: none;
  border-radius: 0;
  resize: vertical;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 13px;
}

.editor-textarea:focus {
  box-shadow: none;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}

.dark .form-actions {
  border-color: #27272a;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
}

.dark .error-banner {
  background: #450a0a;
  color: #f87171;
}

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

  .editor-toolbar {
    flex-wrap: wrap;
  }

  .toolbar-btn {
    min-width: 34px;
  }
}

@media (max-width: 480px) {
  .form-actions :deep(button),
  .form-actions a {
    width: 100%;
  }
}
</style>
