<template>
  <div class="workspace-editor flex flex-col h-full overflow-hidden relative">
    
    <div v-if="pending" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm transition-opacity duration-200">
      <div class="flex flex-col items-center gap-3 bg-white dark:bg-[#1e1e21] p-6 rounded-xl shadow-xl">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-sky-500" />
        <span class="text-sm font-bold text-gray-500 uppercase tracking-wider">Загрузка термина...</span>
      </div>
    </div>

    <template v-if="term">
      <!-- Editor Header -->
      <header class="editor-header shrink-0 p-4 bg-white dark:bg-[#1a1a1d] border-b border-gray-200 dark:border-[#2a2a2e] flex justify-between items-center z-10">
        <div>
          <span class="editor-badge">ТЕРМИН</span>
          <h2 class="editor-title">{{ form.title || 'Безымянный термин' }}</h2>
          <p class="editor-slug">{{ term.slug }}</p>
        </div>
        <div class="editor-actions flex items-center gap-2">
          <div class="translation-flags mr-2">
            <button type="button" class="lang-flag-btn" :class="form.translation_valid_en ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="form.translation_valid_en = !form.translation_valid_en">EN</button>
            <button type="button" class="lang-flag-btn" :class="form.translation_valid_ru ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="form.translation_valid_ru = !form.translation_valid_ru">RU</button>
            <button type="button" class="lang-flag-btn" :class="form.translation_valid_zh ? 'lang-flag--valid' : 'lang-flag--invalid'" @click="form.translation_valid_zh = !form.translation_valid_zh">ZH</button>
          </div>
          
          <GvButton :to="`/glossary/${term.slug}`" target="_blank" color="gray" variant="ghost" size="sm" icon="i-heroicons-eye">Просмотр</GvButton>
          <GvButton @click="save" color="sky" :loading="isSaving" size="sm" icon="i-heroicons-check">Сохранить</GvButton>
        </div>
      </header>

      <!-- Main Scrollable Area for Properties + Fixed Editor -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        <!-- Properties Header -->
        <div class="shrink-0 bg-[#fafafa] dark:bg-[#161618] border-b border-gray-200 dark:border-[#2a2a2e]">
          <div class="flex items-center px-4 py-2 justify-between">
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold text-gray-700 dark:text-gray-300">
                Свойства термина
              </span>
              
              <!-- Language Tabs -->
              <div class="flex gap-1 bg-gray-200/50 dark:bg-black/20 p-1 rounded-md">
                <button v-for="l in ['en','ru','zh']" :key="l" @click="activeLang = l as any"
                  class="px-3 py-1 text-xs font-bold rounded uppercase transition-colors"
                  :class="activeLang === l ? 'bg-white dark:bg-[#2a2a2e] shadow-sm text-sky-600 dark:text-sky-400' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/5'">
                  {{ l }}
                </button>
              </div>
            </div>
          </div>
        </div>
          
        <!-- Properties Content -->
        <div class="flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          
          <!-- LANGUAGE DEPENDENT PROPERTIES -->
          <div class="mb-2">
            <h3 class="text-[10px] font-bold text-sky-500 mb-4 uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-heroicons-language" class="text-sm" />
              Языковые свойства ({{ activeLang.toUpperCase() }})
            </h3>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              <!-- Left Col -->
              <div class="space-y-4">
                <template v-if="activeLang === 'en'">
                  <div class="field"><label class="field-label">Название (EN)</label><input v-model="form.title" class="field-input text-sm" required /></div>
                  <div class="field">
                    <label class="field-label">Синонимы (EN)</label>
                    <div class="aliases-input">
                      <div class="aliases-tags">
                        <span v-for="(alias, i) in form.aliases" :key="i" class="alias-tag">
                          {{ alias }} <button type="button" @click="form.aliases.splice(i, 1)" class="remove-alias">×</button>
                        </span>
                      </div>
                      <input v-model="aliasInput_en" class="alias-field" placeholder="Добавить, Enter" @keydown.enter.prevent="addAlias('en')" @keydown.comma.prevent="addAlias('en')" />
                    </div>
                  </div>
                  <div class="field"><label class="field-label">Определение (EN)</label><textarea v-model="form.definition" rows="4" class="field-textarea text-sm" required /></div>
                </template>
                <template v-else-if="activeLang === 'ru'">
                  <div class="field"><label class="field-label">Название (RU)</label><input v-model="form.title_ru" class="field-input text-sm" /></div>
                  <div class="field"><label class="field-label">Slug (RU)</label><input v-model="form.slug_ru" class="field-input text-sm" /></div>
                  <div class="field">
                    <label class="field-label">Синонимы (RU)</label>
                    <div class="aliases-input">
                      <div class="aliases-tags">
                        <span v-for="(alias, i) in form.aliases_ru" :key="i" class="alias-tag">
                          {{ alias }} <button type="button" @click="form.aliases_ru.splice(i, 1)" class="remove-alias">×</button>
                        </span>
                      </div>
                      <input v-model="aliasInput_ru" class="alias-field" placeholder="Добавить, Enter" @keydown.enter.prevent="addAlias('ru')" @keydown.comma.prevent="addAlias('ru')" />
                    </div>
                  </div>
                  <div class="field"><label class="field-label">Определение (RU)</label><textarea v-model="form.definition_ru" rows="4" class="field-textarea text-sm" /></div>
                </template>
                <template v-else-if="activeLang === 'zh'">
                  <div class="field"><label class="field-label">Название (ZH)</label><input v-model="form.title_zh" class="field-input text-sm" /></div>
                  <div class="field"><label class="field-label">Slug (ZH)</label><input v-model="form.slug_zh" class="field-input text-sm" /></div>
                  <div class="field">
                    <label class="field-label">Синонимы (ZH)</label>
                    <div class="aliases-input">
                      <div class="aliases-tags">
                        <span v-for="(alias, i) in form.aliases_zh" :key="i" class="alias-tag">
                          {{ alias }} <button type="button" @click="form.aliases_zh.splice(i, 1)" class="remove-alias">×</button>
                        </span>
                      </div>
                      <input v-model="aliasInput_zh" class="alias-field" placeholder="Добавить, Enter" @keydown.enter.prevent="addAlias('zh')" @keydown.comma.prevent="addAlias('zh')" />
                    </div>
                  </div>
                  <div class="field"><label class="field-label">Определение (ZH)</label><textarea v-model="form.definition_zh" rows="4" class="field-textarea text-sm" /></div>
                </template>
              </div>

              <!-- Right Col -->
              <div class="space-y-4">
                <div class="field">
                  <label class="field-label">Презентация ({{ activeLang.toUpperCase() }})</label>
                  <div class="flex gap-2 items-center">
                    <input v-if="activeLang === 'en'" v-model="form.presentation_path" class="field-input flex-1 font-mono text-[10px]" placeholder="URL /presentations/..." />
                    <input v-else-if="activeLang === 'ru'" v-model="form.presentation_path_ru" class="field-input flex-1 font-mono text-[10px]" placeholder="URL" />
                    <input v-else v-model="form.presentation_path_zh" class="field-input flex-1 font-mono text-[10px]" placeholder="URL" />
                    <button v-if="(activeLang === 'en' && form.presentation_path) || (activeLang === 'ru' && form.presentation_path_ru) || (activeLang === 'zh' && form.presentation_path_zh)" type="button" @click="clearPresentation(activeLang)" class="text-red-500 hover:text-red-700" title="Удалить презентацию">
                      <UIcon name="i-heroicons-trash" />
                    </button>
                  </div>
                  <label class="text-[10px] text-sky-500 hover:text-sky-600 cursor-pointer flex items-center gap-1 mt-1 font-bold">
                    <input type="file" accept=".odp,.pptx,.pdf" class="sr-only" :disabled="isUploadingPresentation" @change="uploadPresentation($event, activeLang)" />
                    <UIcon v-if="!isUploadingPresentation" name="i-heroicons-arrow-up-tray" />
                    <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
                    <span>{{ isUploadingPresentation ? 'Загрузка...' : 'Загрузить файл' }}</span>
                  </label>
                </div>

                <div class="field mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <label class="field-label">Предпросмотр</label>
                  <button 
                    type="button" 
                    class="wiki-term py-2 px-3 border border-sky-200 dark:border-sky-900/50 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors font-bold flex justify-center items-center gap-1.5 text-xs w-full max-w-[200px]" 
                    :data-term-slug="term.slug"
                    :data-term-lang="activeLang"
                  >
                    <UIcon name="i-heroicons-eye" class="text-sm" />
                    Открыть попап ({{ activeLang.toUpperCase() }})
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr class="border-gray-200 dark:border-gray-800 my-8" />

          <!-- GLOBAL PROPERTIES -->
          <div>
            <h3 class="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-wider flex items-center gap-2">
              <UIcon name="i-heroicons-globe-alt" class="text-sm" />
              Общие свойства (не зависят от языка)
            </h3>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
              <!-- Left Col -->
              <div class="space-y-4">
                <div class="field">
                  <label class="field-label">Категория</label>
                  <select v-model="form.category_id" class="field-input text-sm">
                    <option :value="null">Без категории</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.title }}</option>
                  </select>
                </div>
                <div class="field">
                  <!-- Aliases moved to language tabs -->
                </div>
              </div>

              <!-- Right Col -->
              <div class="space-y-4">
                <div class="field">
                  <label class="field-label">Изображение</label>
                  <AdminMediaPicker v-model="form.image_url" upload-endpoint="/api/admin/uploads/term-media" accept="image/*" />
                </div>
                <div class="field">
                  <label class="field-label">Видео</label>
                  <AdminMediaPicker v-model="form.video_url" upload-endpoint="/api/admin/uploads/term-media" accept="video/*" />
                </div>
              </div>
            </div>
          </div>

        </div>
        
        <!-- Create Article Footer -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161618] shrink-0">
            <button 
              type="button" 
              class="py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 text-sm w-full transition-colors"
              :class="term.article_id ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md' : 'border-2 border-dashed border-sky-300 dark:border-sky-800 text-sky-600 dark:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20'"
              @click="openArticleModal"
            >
              <UIcon :name="term.article_id ? 'i-heroicons-pencil-square' : 'i-heroicons-plus'" class="text-lg" />
              {{ term.article_id ? 'Редактировать статью' : 'Создать статью' }}
            </button>
          </div>

        <UModal v-model="isArticleModalOpen" fullscreen :ui="{ width: 'w-full', margin: 'sm:my-0' }">
          <div class="flex flex-col h-screen bg-white dark:bg-[#111113]">
            <div class="bg-gray-50 dark:bg-[#1e1e21] px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
              <div class="flex flex-col">
                <span class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <UIcon name="i-heroicons-document-text" class="text-sky-500" />
                  Редактор статьи
                </span>
                <span class="text-[11px] text-gray-500">
                  Связан с термином: <strong class="text-sky-600">{{ term.title }}</strong>
                </span>
              </div>
              
              <div class="flex items-center bg-gray-200/50 dark:bg-black/30 p-1 rounded-lg gap-1">
                <button 
                  v-for="l in ['en', 'ru', 'zh'] as const" 
                  :key="l"
                  type="button"
                  class="px-3 py-1 text-xs font-bold rounded-md transition-colors"
                  :class="modalLang === l ? 'bg-white dark:bg-[#2a2a2e] text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                  @click="modalLang = l"
                >
                  {{ l.toUpperCase() }}
                </button>
              </div>

              <button type="button" @click="isArticleModalOpen = false" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500">
                <UIcon name="i-heroicons-x-mark" class="text-xl" />
              </button>
            </div>
            
            <div class="flex-1 flex flex-col min-h-0 relative">
              <AdminArticleWysiwyg
                v-model:en="form.html_content"
                v-model:ru="form.html_content_ru"
                v-model:zh="form.html_content_zh"
                :active-lang="modalLang"
                :article-id="term.article_id"
                class="absolute inset-0 w-full h-full border-none rounded-none"
              />
            </div>
            
            <div class="bg-gray-50 dark:bg-[#1e1e21] px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
              <UButton 
                v-if="term.article_id || form.html_content || form.html_content_ru || form.html_content_zh"
                color="red" 
                variant="ghost" 
                icon="i-heroicons-trash"
                @click="clearArticle"
              >
                Очистить и удалить статью
              </UButton>
              <div v-else></div>
              <UButton color="gray" variant="soft" @click="isArticleModalOpen = false">Закрыть редактор (изменения сохранятся при основном сохранении)</UButton>
            </div>
          </div>
        </UModal>

      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import AdminArticleWysiwyg from './AdminArticleWysiwyg.vue'

const props = defineProps<{
  termId: number
}>()

const emit = defineEmits<{
  (e: 'loading-change', val: boolean): void
}>()

const store = userStore()
const toast = useToast()

const activeLang = ref<'en'|'ru'|'zh'>('en')
const isArticleModalOpen = ref(false)
const modalLang = ref<'en'|'ru'|'zh'>('en')

function openArticleModal() {
  modalLang.value = activeLang.value
  isArticleModalOpen.value = true
}

function clearArticle() {
  if (confirm('Вы уверены, что хотите удалить статью? Это очистит контент, а полное удаление произойдет при сохранении термина.')) {
    form.html_content = ''
    form.html_content_ru = ''
    form.html_content_zh = ''
    isArticleModalOpen.value = false
    toast.add({ title: 'Статья очищена', description: 'Не забудьте сохранить термин, чтобы изменения вступили в силу.', color: 'green' })
  }
}

const aliasInput_en = ref('')
const aliasInput_ru = ref('')
const aliasInput_zh = ref('')

const form = reactive({
  title: '', title_ru: '', title_zh: '',
  slug_ru: '', slug_zh: '',
  aliases: [] as string[],
  aliases_ru: [] as string[],
  aliases_zh: [] as string[],
  definition: '', definition_ru: '', definition_zh: '',
  category_id: null as number | null,
  html_content: '', html_content_ru: '', html_content_zh: '',
  image_url: '', video_url: '',
  presentation_path: '', presentation_path_ru: '', presentation_path_zh: '',
  change_summary: '',
  translation_valid_en: true, translation_valid_ru: false, translation_valid_zh: false,
})

const { data: categoriesData } = await useAsyncData<any[]>('admin-cats-edit', () => 
  $fetch<any[]>('/api/categories', { headers: store.getAuthHeader() })
)
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value
  return categoriesData.value?.items || []
})

const pending = ref(true)
const term = ref<any>(null)

async function fetchTerm() {
  pending.value = true
  emit('loading-change', true)
  try {
    const t = await $fetch<any>(`/api/admin/terms/${props.termId}`, { 
      headers: store.getAuthHeader()
    })
    term.value = t
    form.title = t.title || ''
    form.title_ru = t.title_ru || ''
    form.title_zh = t.title_zh || ''
    form.slug_ru = t.slug_ru || ''
    form.slug_zh = t.slug_zh || ''
    form.aliases = Array.isArray(t.aliases) ? [...t.aliases] : []
    form.aliases_ru = Array.isArray(t.aliases_ru) ? [...t.aliases_ru] : []
    form.aliases_zh = Array.isArray(t.aliases_zh) ? [...t.aliases_zh] : []
    form.definition = t.definition || ''
    form.definition_ru = t.definition_ru || ''
    form.definition_zh = t.definition_zh || ''
    form.category_id = t.category_id || null
    form.html_content = t.article_html || ''
    form.html_content_ru = t.article_html_ru || ''
    form.html_content_zh = t.article_html_zh || ''
    form.image_url = t.image_url || ''
    form.video_url = t.video_url || ''
    form.presentation_path = t.presentation_path || ''
    form.presentation_path_ru = t.presentation_path_ru || ''
    form.presentation_path_zh = t.presentation_path_zh || ''
    form.translation_valid_en = t.translation_valid_en ?? true
    form.translation_valid_ru = t.translation_valid_ru ?? false
    form.translation_valid_zh = t.translation_valid_zh ?? false
    form.change_summary = ''
  } catch(e) {
    console.error(e)
  } finally {
    pending.value = false
    emit('loading-change', false)
  }
}

watch(() => props.termId, () => {
  fetchTerm()
}, { immediate: true })

function addAlias(lang: 'en'|'ru'|'zh') {
  if (lang === 'en') {
    const val = aliasInput_en.value.trim().replace(/,$/, '')
    if (val && !form.aliases.includes(val)) form.aliases.push(val)
    aliasInput_en.value = ''
  } else if (lang === 'ru') {
    const val = aliasInput_ru.value.trim().replace(/,$/, '')
    if (val && !form.aliases_ru.includes(val)) form.aliases_ru.push(val)
    aliasInput_ru.value = ''
  } else if (lang === 'zh') {
    const val = aliasInput_zh.value.trim().replace(/,$/, '')
    if (val && !form.aliases_zh.includes(val)) form.aliases_zh.push(val)
    aliasInput_zh.value = ''
  }
}

const isSaving = ref(false)

const isUploadingPresentation = ref(false)

async function uploadPresentation(e: Event, locale: 'en' | 'ru' | 'zh') {
  const input = e.target as HTMLInputElement
  if (!input.files?.length || !term.value?.article_slug) {
    toast.add({ title: 'Ошибка', description: 'Сначала создайте статью', color: 'amber' })
    return
  }

  isUploadingPresentation.value = true
  try {
    const formData = new FormData()
    formData.append('file', input.files[0])

    const result = await $fetch<any>(`/api/articles/${term.value.article_slug}/presentation`, {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
      query: { locale },
    })

    if (locale === 'ru') form.presentation_path_ru = result.presentation_path
    else if (locale === 'zh') form.presentation_path_zh = result.presentation_path
    else form.presentation_path = result.presentation_path
    
    toast.add({ title: 'Презентация загружена', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка загрузки', description: err?.data?.statusMessage || err.message, color: 'red' })
  }
  isUploadingPresentation.value = false
  input.value = ''
}

function clearPresentation(locale: 'en' | 'ru' | 'zh') {
  if (locale === 'ru') form.presentation_path_ru = ''
  else if (locale === 'zh') form.presentation_path_zh = ''
  else form.presentation_path = ''
}

async function save() {
  if (!term.value) return
  isSaving.value = true
  try {
    await $fetch(`/api/terms/${term.value.slug}`, {
      method: 'PUT',
      headers: store.getAuthHeader(),
      body: {
        ...form,
        html_content: form.html_content || undefined,
        html_content_ru: form.html_content_ru || undefined,
        html_content_zh: form.html_content_zh || undefined,
      }
    })
    toast.add({ title: 'Сохранено!', color: 'green' })
    fetchTerm()
  } catch (e: any) {
    toast.add({ title: 'Ошибка сохранения', description: e.data?.statusMessage || e.message, color: 'red' })
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.editor-badge {
  font-size: 10px; font-weight: 800; color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 3px 8px; border-radius: 6px; letter-spacing: 0.1em;
}
.editor-title { font-size: 20px; font-weight: 800; margin: 4px 0 0 0; color: #1a1a1a; }
.dark .editor-title { color: #e5e5e5; }
.editor-slug { font-family: monospace; font-size: 11px; color: #888; }

.lang-flag-btn { padding: 2px 7px; border-radius: 999px; border: 1.5px solid transparent; font-size: 10px; font-weight: 700; transition: all 0.15s ease; }
.lang-flag--valid { border-color: #16a34a; background: #dcfce7; color: #15803d; }
.lang-flag--invalid { border-color: #d1d5db; color: #9ca3af; }
.dark .lang-flag--valid { border-color: #166534; background: #052e16; color: #4ade80; }
.dark .lang-flag--invalid { border-color: #3f3f46; color: #6b7280; }

.accordion-slide-enter-active, .accordion-slide-leave-active { transition: all 0.2s ease-in-out; max-height: 50vh; opacity: 1; }
.accordion-slide-enter-from, .accordion-slide-leave-to { max-height: 0; opacity: 0; overflow: hidden; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #888; }
.field-input, .field-textarea {
  padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; font-size: 13px; outline: none; transition: border-color 0.2s;
}
.field-input:focus, .field-textarea:focus { border-color: #0ea5e9; }
.dark .field-input, .dark .field-textarea { background: #1e1e21; border-color: #2a2a2e; color: #e5e5e5; }
.dark .field-input:focus, .dark .field-textarea:focus { border-color: #38bdf8; }

.aliases-input { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 6px 10px; display: flex; flex-wrap: wrap; gap: 6px; }
.dark .aliases-input { background: #1e1e21; border-color: #2a2a2e; }
.alias-tag { background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
.remove-alias { cursor: pointer; opacity: 0.6; }
.remove-alias:hover { opacity: 1; }
.alias-field { background: transparent; border: none; outline: none; flex: 1; min-width: 100px; font-size: 13px; color: #1a1a1a; }
.dark .alias-field { color: #e5e5e5; }
</style>
