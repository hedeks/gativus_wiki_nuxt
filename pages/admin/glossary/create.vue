<template>
  <div class="glossary-form-page">
    <div class="form-header">
      <NuxtLink to="/admin/glossary" class="back-link">
        <UIcon name="i-heroicons-arrow-left" /> Назад к глоссарию
      </NuxtLink>
      <h1 class="form-title">Создать термин</h1>
    </div>

    <form class="term-form" @submit.prevent="handleSubmit">

      <!-- Title -->
      <div class="field">
        <label class="field-label">Название <span class="required">*</span></label>
        <input v-model="form.title" class="field-input" placeholder="Например: b-вектор" required />
        <p class="field-hint">Отображаемое название термина</p>
      </div>

      <!-- Slug -->
      <div class="field">
        <label class="field-label">Slug</label>
        <input v-model="form.slug" class="field-input mono" :placeholder="autoSlug" />
        <p class="field-hint">URL-идентификатор. Оставьте пустым — сгенерируется автоматически</p>
      </div>

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
          <input
            v-model="aliasInput"
            class="alias-field"
            placeholder="Добавить синоним, Enter"
            @keydown.enter.prevent="addAlias"
            @keydown.comma.prevent="addAlias"
          />
        </div>
        <p class="field-hint">Нажмите Enter или запятую для добавления</p>
      </div>

      <!-- Definition -->
      <div class="field">
        <label class="field-label">Определение <span class="required">*</span></label>
        <textarea
          v-model="form.definition"
          class="field-textarea"
          rows="3"
          placeholder="Краткое определение в 1–2 предложения (plain text). Отображается в попапе и карточке."
          required
        />
      </div>

      <!-- Category -->
      <div class="field">
        <label class="field-label">Категория</label>
        <select v-model="form.category_id" class="field-input">
          <option :value="null">Без категории</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.title }}
          </option>
        </select>
        <p class="field-hint">Категория применяется к статье-раскрытию. Если статьи нет — не используется.</p>
      </div>

      <!-- Presentation -->
      <div class="field">
        <label class="field-label">Путь к презентации</label>
        <input v-model="form.presentation_path" class="field-input" placeholder="/presentations/your-file.pdf" />
        <p class="field-hint">Опционально. Если указано, будет создана статья с этой презентацией.</p>
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
            ref="editorRef"
            v-model="form.html_content"
            class="field-textarea editor-textarea"
            rows="16"
            placeholder="Опционально. Расширенное раскрытие термина в HTML-формате.&#10;Будет отображаться на странице /glossary/:slug."
          />
        </div>
        <p class="field-hint">Если заполнено — будет создана скрытая статья-раскрытие (is_term_article = true)</p>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <NuxtLink to="/admin/glossary">
          <UButton color="gray" variant="soft">Отмена</UButton>
        </NuxtLink>
        <UButton type="submit" color="sky" :loading="submitting" icon="i-heroicons-check">
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
definePageMeta({ layout: 'admin', middleware: 'auth' })
useSeoMeta({ title: 'Создать термин — Admin' })

const router = useRouter()

const form = reactive({
  title: '',
  slug: '',
  aliases: [] as string[],
  definition: '',
  html_content: '',
  presentation_path: '',
  category_id: null as number | null,
})

const aliasInput = ref('')
const store = userStore()
const submitting = ref(false)
const error = ref('')
const editorRef = ref<HTMLTextAreaElement>()
const showTermModal = ref(false)

function insertTerm(term: any) {
  const ta = editorRef.value
  if (!ta) return
  const { selectionStart: s, selectionEnd: e } = ta
  const text = ta.value
  const selectedText = text.substring(s, e) || term.title
  
  const insertion = `<a class="wiki-term" data-term-slug="${term.slug}">${selectedText}</a>`

  form.html_content = text.substring(0, s) + insertion + text.substring(e)
  
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
const categories = computed(() => categoriesData.value?.items || [])

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
  form.html_content = ta.value.slice(0, s) + wrapped + ta.value.slice(e)
  nextTick(() => { ta.setSelectionRange(s, s + wrapped.length) })
}
function insertTag(tag: string) {
  const ta = editorRef.value
  if (!ta) return
  const insert = `<${tag}></${tag}>`
  const pos = ta.selectionStart
  form.html_content = ta.value.slice(0, pos) + insert + ta.value.slice(pos)
}

async function handleSubmit() {
  if (!form.title || !form.definition) return
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
        slug: form.slug || undefined,
        aliases: form.aliases,
        definition: form.definition,
        html_content: form.html_content || undefined,
        presentation_path: form.presentation_path || undefined,
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
.glossary-form-page { max-width: 800px; }

.form-header { margin-bottom: 28px; }
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: #64748b;
  text-decoration: none; margin-bottom: 12px; transition: color 0.15s;
}
.back-link:hover { color: #0ea5e9; }
.back-link svg { width: 15px; height: 15px; }
.form-title { font-size: 24px; font-weight: 800; margin: 0; }

.term-form { display: flex; flex-direction: column; gap: 24px; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field-label {
  font-size: 13px; font-weight: 700; color: #374151;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.dark .field-label { color: #d1d5db; }
.required { color: #ef4444; }
.field-hint { font-size: 12px; color: #94a3b8; margin: 0; }

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
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
}
.mono { font-family: 'JetBrains Mono', 'Courier New', monospace; }

.aliases-input {
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: white; padding: 8px 12px; display: flex;
  flex-wrap: wrap; gap: 6px; align-items: center;
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
  color: #0ea5e9; font-size: 16px; line-height: 1;
  padding: 0; transition: color 0.15s;
}
.remove-alias:hover { color: #ef4444; }
.alias-field {
  border: none; outline: none; background: transparent;
  font-size: 14px; color: #1e293b; min-width: 160px; flex: 1;
}
.dark .alias-field { color: #e2e8f0; }

.editor-wrap {
  border: 1.5px solid #e2e8f0; border-radius: 10px; overflow: hidden;
  transition: border-color 0.2s;
}
.dark .editor-wrap { border-color: #3f3f46; }
.editor-wrap:focus-within { border-color: #0ea5e9; }

.editor-toolbar {
  display: flex; gap: 2px; padding: 8px 10px;
  background: #f8fafc; border-bottom: 1px solid #e2e8f0;
}
.dark .editor-toolbar { background: #1c1c1f; border-color: #3f3f46; }
.toolbar-btn {
  padding: 5px 10px; border-radius: 6px;
  border: none; background: transparent; cursor: pointer;
  font-size: 13px; color: #64748b; font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.toolbar-btn:hover { background: #e0f2fe; color: #0284c7; }
.dark .toolbar-btn:hover { background: #1e3a5f; color: #38bdf8; }

.editor-textarea {
  border: none; border-radius: 0; resize: vertical;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 13px;
}
.editor-textarea:focus { box-shadow: none; }

.form-actions {
  display: flex; gap: 12px; padding-top: 8px;
  border-top: 1px solid #f1f5f9;
}
.dark .form-actions { border-color: #27272a; }

.error-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px;
  background: #fee2e2; color: #dc2626; font-size: 14px; font-weight: 600;
}
.dark .error-banner { background: #450a0a; color: #f87171; }
</style>
