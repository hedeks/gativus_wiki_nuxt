<template>
  <div class="glossary-form-page" v-if="term">
    <div class="form-header">
      <NuxtLink to="/admin/glossary" class="back-link">
        <UIcon name="i-heroicons-arrow-left" /> Назад к глоссарию
      </NuxtLink>
      <h1 class="form-title">Редактировать термин</h1>
      <code class="term-slug-display">{{ term.slug }}</code>
    </div>

    <form class="term-form" @submit.prevent="handleSubmit">

      <div class="field">
        <label class="field-label">Название <span class="required">*</span></label>
        <input v-model="form.title" class="field-input" required />
      </div>

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
        <label class="field-label">Определение <span class="required">*</span></label>
        <textarea v-model="form.definition" class="field-textarea" rows="3" required />
      </div>

      <div class="field">
        <label class="field-label">Категория</label>
        <select v-model="form.category_id" class="field-input">
          <option :value="null">Без категории</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.title }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field-label">Путь к презентации</label>
        <input v-model="form.presentation_path" class="field-input" placeholder="/presentations/your-file.pdf" />
      </div>

      <div class="field">
        <label class="field-label">
          Статья-раскрытие (HTML)
          <span v-if="term.has_article" class="has-article-badge">
            <UIcon name="i-heroicons-check-circle" /> Статья существует
          </span>
        </label>
        <div class="editor-wrap">
          <div class="editor-toolbar">
            <button type="button" class="toolbar-btn" @click="wrapSelection('strong')"><strong>B</strong></button>
            <button type="button" class="toolbar-btn" @click="wrapSelection('em')"><em>I</em></button>
            <button type="button" class="toolbar-btn" @click="wrapSelection('code')">&lt;/&gt;</button>
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
            rows="18"
            placeholder="HTML статьи-раскрытия термина..."
          />
        </div>
      </div>

      <div class="field">
        <label class="field-label">Описание изменения</label>
        <input v-model="form.change_summary" class="field-input" placeholder="Что изменено..." />
      </div>

      <div class="form-actions">
        <NuxtLink to="/admin/glossary">
          <UButton color="gray" variant="soft">Отмена</UButton>
        </NuxtLink>
        <NuxtLink :to="`/glossary/${term.slug}`" target="_blank">
          <UButton color="gray" variant="ghost" icon="i-heroicons-eye">Просмотр</UButton>
        </NuxtLink>
        <UButton type="submit" color="sky" :loading="submitting" icon="i-heroicons-check">
          Сохранить
        </UButton>
      </div>

      <div v-if="success" class="success-banner">
        <UIcon name="i-heroicons-check-circle" /> Термин сохранён
      </div>
      <div v-if="error" class="error-banner">
        <UIcon name="i-heroicons-exclamation-circle" /> {{ error }}
      </div>
    </form>

    <!-- Modal for glossary terms -->
    <AdminTermSelectorModal v-model="showTermModal" @select="insertTerm" />
  </div>

  <div v-else-if="!pending" class="not-found">
    <p>Термин не найден</p>
    <NuxtLink to="/admin/glossary">← Назад</NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const termId = route.params.id as string

// Load by ID: we use GET /api/terms?id= workaround — actually load all and find
// Better: load via slug, but we have id. Let's call the admin terms list and find by id
const { data: listData, pending } = await useAsyncData(`admin-term-edit-${termId}`,
  () => $fetch<any>('/api/terms', { 
    params: { limit: 1000 },
    headers: store.getAuthHeader()
  })
)

const term = computed(() => listData.value?.items?.find((t: any) => String(t.id) === termId))

// Pre-fill form from loaded term
const form = reactive({
  title: '',
  aliases: [] as string[],
  definition: '',
  html_content: '',
  presentation_path: '',
  category_id: null as number | null,
  change_summary: '',
})

watch(term, (t) => {
  if (!t) return
  form.title = t.title
  form.aliases = Array.isArray(t.aliases) ? [...t.aliases] : []
  form.definition = t.definition
  form.html_content = t.article_html || ''
  form.presentation_path = t.presentation_path || ''
  form.category_id = t.category_id || null
}, { immediate: true })

// Also fetch full term with html if it has an article
const { data: fullTerm } = await useAsyncData(`admin-term-full-${termId}`,
  async () => {
    const slug = term.value?.slug
    if (!slug) return null
    return $fetch<any>(`/api/terms/${slug}`, {
      headers: store.getAuthHeader()
    })
  },
  { watch: [term] }
)
watch(fullTerm, (ft) => {
  if (ft?.article_html) form.html_content = ft.article_html
}, { immediate: true })

useSeoMeta({ title: computed(() => `Редактировать: ${term.value?.title || '...'} — Admin`) })

const aliasInput = ref('')
const store = userStore()
const submitting = ref(false)
const error = ref('')
const success = ref(false)
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

const { data: categoriesData } = await useAsyncData('admin-cats-edit', () => 
  $fetch<any>('/api/categories', {
    headers: store.getAuthHeader()
  })
)
const categories = computed(() => categoriesData.value?.items || [])

function addAlias() {
  const val = aliasInput.value.trim().replace(/,$/, '')
  if (val && !form.aliases.includes(val)) form.aliases.push(val)
  aliasInput.value = ''
}
function removeAlias(i: number) { form.aliases.splice(i, 1) }

function wrapSelection(tag: string) {
  const ta = editorRef.value; if (!ta) return
  const { selectionStart: s, selectionEnd: e } = ta
  const sel = ta.value.slice(s, e)
  const wrapped = `<${tag}>${sel}</${tag}>`
  form.html_content = ta.value.slice(0, s) + wrapped + ta.value.slice(e)
  nextTick(() => ta.setSelectionRange(s, s + wrapped.length))
}
function insertTag(tag: string) {
  const ta = editorRef.value; if (!ta) return
  const insert = `<${tag}></${tag}>`
  const pos = ta.selectionStart
  form.html_content = ta.value.slice(0, pos) + insert + ta.value.slice(pos)
}

async function handleSubmit() {
  if (!term.value) return
  submitting.value = true; error.value = ''; success.value = false
  try {
    await $fetch(`/api/terms/${term.value.slug}`, {
      method: 'PUT' as any,
      headers: {
        ...store.getAuthHeader(),
      },
      body: {
        title: form.title,
        aliases: form.aliases,
        definition: form.definition,
        html_content: form.html_content || undefined,
        presentation_path: form.presentation_path || undefined,
        category_id: form.category_id,
        change_summary: form.change_summary || undefined,
      },
    })
    success.value = true
    setTimeout(() => { success.value = false }, 3000)
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Ошибка при сохранении'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.glossary-form-page { max-width: 800px; }
.form-header { margin-bottom: 28px; display: flex; flex-direction: column; gap: 6px; }
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: #64748b;
  text-decoration: none; transition: color 0.15s;
}
.back-link:hover { color: #0ea5e9; }
.form-title { font-size: 24px; font-weight: 800; margin: 0; }
.term-slug-display {
  font-family: monospace; font-size: 13px; color: #94a3b8;
  background: #f1f5f9; padding: 3px 8px; border-radius: 6px;
  align-self: flex-start;
}
.dark .term-slug-display { background: #27272a; }

.term-form { display: flex; flex-direction: column; gap: 24px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field-label {
  font-size: 13px; font-weight: 700; color: #374151;
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; gap: 10px;
}
.dark .field-label { color: #d1d5db; }
.required { color: #ef4444; }

.has-article-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: #16a34a; font-weight: 600;
  background: #dcfce7; padding: 3px 8px; border-radius: 100px;
  text-transform: none; letter-spacing: 0;
}
.dark .has-article-badge { background: #14532d; color: #4ade80; }

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
  padding: 5px 10px; border-radius: 6px; border: none;
  background: transparent; cursor: pointer; font-size: 13px;
  color: #64748b; font-family: inherit; transition: background 0.15s;
}
.toolbar-btn:hover { background: #e0f2fe; color: #0284c7; }
.editor-textarea {
  border: none; border-radius: 0; resize: vertical;
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
}
.editor-textarea:focus { box-shadow: none; }

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
</style>
