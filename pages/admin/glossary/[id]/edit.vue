<template>
  <div class="glossary-form-page gv-admin-page" v-if="term">
    <div class="form-header">
      <NuxtLink to="/admin/glossary" class="back-link">
        <UIcon name="i-heroicons-arrow-left" /> Назад к глоссарию
      </NuxtLink>
      <div class="flex items-center gap-4">
        <h1 class="form-title">Редактировать термин</h1>
        <code class="term-slug-display">{{ term.slug }}</code>
      </div>
    </div>

    <form class="term-form" @submit.prevent="handleSubmit">
      
      <!-- ODT Upload Section -->
      <div class="odt-upload-section mb-6">
        <label class="field-label">Импорт из ODT</label>
        <div class="odt-dropzone">
          <input type="file" ref="odtFileInput" class="hidden" accept=".odt" @change="handleOdtUpload" />
          <UButton 
            color="gray" 
            variant="soft" 
            icon="i-heroicons-arrow-up-tray" 
            :loading="odtUploading"
            @click="(odtFileInput as HTMLInputElement).click()"
          >
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
              <input v-model="form.title" class="field-input" required placeholder="Term title" />
            </div>
            <div class="field">
              <label class="field-label">Определение (EN/Default) <span class="required">*</span></label>
              <UTextarea v-model="form.definition" :rows="4" class="field-textarea" required placeholder="Brief definition in English..." />
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
              <UTextarea v-model="form.definition_ru" :rows="4" class="field-textarea" placeholder="Краткое определение на русском..." />
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
              <UTextarea v-model="form.definition_zh" :rows="4" class="field-textarea" placeholder="简短定义..." />
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
        <div class="space-y-3">
          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">EN</label>
            <input v-model="form.presentation_path" class="field-input mt-1" placeholder="/presentations/..." />
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RU</label>
            <input v-model="form.presentation_path_ru" class="field-input mt-1" placeholder="/presentations/..." />
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ZH</label>
            <input v-model="form.presentation_path_zh" class="field-input mt-1" placeholder="/presentations/..." />
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
            <UButton 
              color="red" 
              variant="ghost" 
              size="xs" 
              icon="i-heroicons-trash" 
              @click="confirmDeleteArticle = true"
            >
              Удалить связь
            </UButton>
          </div>
        </div>

        <div v-else class="no-article-placeholder">
          <UIcon name="i-heroicons-document-plus" class="text-3xl text-gray-300 mb-2" />
          <p class="font-medium text-gray-500 mb-4">У данного термина пока нет расширенной статьи-раскрытия.</p>
          <UButton 
            color="black" 
            variant="solid" 
            icon="i-heroicons-plus"
            :loading="creatingArticle"
            class="rounded-xl px-6"
            @click="createDisclosureArticle"
          >
            Создать статью-раскрытие
          </UButton>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Описание изменения</label>
        <input v-model="form.change_summary" class="field-input" placeholder="Что изменено..." />
      </div>

      <div class="form-actions">
        <NuxtLink to="/admin/glossary">
          <UButton color="gray" variant="soft" size="lg">Отмена</UButton>
        </NuxtLink>
        <NuxtLink :to="`/glossary/${term.slug}`" target="_blank">
          <UButton color="gray" variant="ghost" size="lg" icon="i-heroicons-eye">Просмотр</UButton>
        </NuxtLink>
        <UButton type="submit" color="black" :loading="submitting" size="lg" icon="i-heroicons-check" class="rounded-xl px-8">
          Сохранить изменения
        </UButton>
      </div>

      <div v-if="success" class="success-banner">
        <UIcon name="i-heroicons-check-circle" /> Термин сохранён
      </div>
      <div v-if="error" class="error-banner">
        <UIcon name="i-heroicons-exclamation-circle" /> {{ error }}
      </div>
    </form>
  </div>

  <div v-else-if="!pending" class="not-found">
    <p>Термин не найден</p>
    <NuxtLink to="/admin/glossary">← Назад</NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

const odtFileInput = ref<HTMLInputElement>()

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
})

const aliasInput = ref('')
const submitting = ref(false)
const odtUploading = ref(false)
const error = ref('')
const success = ref(false)
const creatingArticle = ref(false)
const confirmDeleteArticle = ref(false)

// 2. Pure functions
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
}, { immediate: true })

useSeoMeta({ title: computed(() => `Редактировать: ${term.value?.title || '...'} — Admin`) })

// 5. Async actions and handlers
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

async function createDisclosureArticle() {
  if (!term.value) return
  creatingArticle.value = true
  try {
    await $fetch<any>(`/api/terms/${term.value.slug}`, {
      method: 'PUT',
      headers: store.getAuthHeader(),
      body: {
        html_content: `<h2>${term.value.title}</h2><p>${term.value.definition}</p>`,
        change_summary: 'Auto-created disclosure article'
      }
    })
    toast.add({ title: 'Статья создана', color: 'green' })
    refresh()
    setTimeout(() => {
      if (term.value?.term_article_id) {
        navigateTo(`/admin/articles/${term.value.term_article_id}/edit`)
      }
    }, 500)
  } catch (e: any) {
    toast.add({ title: 'Ошибка', description: e.data?.statusMessage || e.message, color: 'red' })
  } finally {
    creatingArticle.value = false
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
</style>
