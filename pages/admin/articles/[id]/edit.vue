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

const translationValidEn = ref(true)
const translationValidRu = ref(false)
const translationValidZh = ref(false)

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
    translationValidEn.value = article.translation_valid_en !== undefined ? Boolean(article.translation_valid_en) : true
    translationValidRu.value = Boolean(article.translation_valid_ru)
    translationValidZh.value = Boolean(article.translation_valid_zh)
    nextTick(() => pushHistory('Загрузка статьи'))
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
const viewMode = ref<'code' | 'split' | 'preview'>('code')
const showPreview = computed(() => viewMode.value === 'preview')
const showTermModal = ref(false)

const viewModeIcons: Record<string, string> = {
  code: 'i-heroicons-code-bracket',
  split: 'i-heroicons-squares-2x2',
  preview: 'i-heroicons-eye',
}
const viewModeLabels: Record<string, string> = {
  code: 'Код',
  split: 'Сплит',
  preview: 'Preview',
}
const nextViewMode: Record<string, 'code' | 'split' | 'preview'> = {
  code: 'split',
  split: 'preview',
  preview: 'code',
}

function cycleViewMode() {
  viewMode.value = nextViewMode[viewMode.value]
}

const activeHtmlContent = computed(() => {
  if (activeTab.value === 'ru') return htmlContentRu.value
  if (activeTab.value === 'zh') return htmlContentZh.value
  return htmlContent.value
})

function insertTerm(term: any) {
  pushHistory(`Термин: ${term.title}`)
  const termTag = `<a class="wiki-term" data-term-slug="${term.slug}">${term.title}</a>`

  if (previewEditMode.value) {
    insertHtmlAtCursor(termTag)
    return
  }

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
    toast.add({
      title: 'Ошибка сохранения',
      description: err?.data?.statusMessage || err.message,
      color: 'red'
    })
  }

  isSaving.value = false
}

// Translation prompt
const promptCopied = ref(false)

function buildTranslationPrompt(): string {
  const langNames: Record<string, string> = { en: 'английский', ru: 'русский', zh: 'китайский' }
  const allLangs = ['en', 'ru', 'zh']
  const sourceLang = activeTab.value
  const targetLangs = allLangs.filter(l => l !== sourceLang).map(l => langNames[l])
  const sourceLangName = langNames[sourceLang]

  const currentHtml = sourceLang === 'ru' ? htmlContentRu.value
    : sourceLang === 'zh' ? htmlContentZh.value
    : htmlContent.value

  return `Твоя задача — перевести следующий HTML-фрагмент с ${sourceLangName} на ${targetLangs.join(' и ')}.

Правила:
1. Атрибуты id у заголовков (<h2>, <h3> и т.д.) должны быть на английском, в kebab-case. Пример: id="dva-tsikla" → id="two-cycles".
2. Теги <a class="wiki-term" ...>...</a> не изменять совсем — атрибуты и содержимое оставить как есть.
3. HTML-структуру сохранить, переводить только текстовое содержимое тегов.
4. Верни каждый перевод в отдельном блоке, помеченном названием языка.

HTML:
${currentHtml}`
}

async function copyTranslationPrompt() {
  const prompt = buildTranslationPrompt()
  await navigator.clipboard.writeText(prompt)
  promptCopied.value = true
  toast.add({ title: 'Промт скопирован', description: 'Вставьте в чат-бот для перевода', color: 'green' })
  setTimeout(() => { promptCopied.value = false }, 2000)
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

// Contenteditable preview
const previewRef = ref<HTMLDivElement | null>(null)
const previewEditMode = ref(false)
let _syncingPreview = false

function onPreviewInput(e: Event) {
  if (_syncingPreview) return
  const html = (e.target as HTMLDivElement).innerHTML
  if (activeTab.value === 'en') htmlContent.value = html
  else if (activeTab.value === 'ru') htmlContentRu.value = html
  else if (activeTab.value === 'zh') htmlContentZh.value = html
  scheduleHistoryCapture()
}

function syncPreviewContent() {
  if (!previewRef.value || !previewEditMode.value) return
  _syncingPreview = true
  previewRef.value.innerHTML = activeHtmlContent.value
  nextTick(() => { _syncingPreview = false })
}

watch(previewEditMode, (val) => {
  if (val) nextTick(syncPreviewContent)
})

watch(activeTab, () => {
  if (previewEditMode.value) nextTick(syncPreviewContent)
})

watch(viewMode, (val) => {
  if (val !== 'preview') previewEditMode.value = false
})

// Toolbar Logic
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function insertHtmlAtCursor(html: string) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const fragment = range.createContextualFragment(html)
  const lastNode = fragment.lastChild
  range.insertNode(fragment)
  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  const html2 = previewRef.value?.innerHTML || ''
  if (activeTab.value === 'en') htmlContent.value = html2
  else if (activeTab.value === 'ru') htmlContentRu.value = html2
  else if (activeTab.value === 'zh') htmlContentZh.value = html2
}

function insertTag(tag: string, closingTag?: string) {
  pushHistory(`<${tag}>`)
  let insertion = ''
  if (tag === 'img') {
    insertion = `<img src="/api/uploads/articles/placeholder.jpg" alt="" />`
  } else if (tag === 'table') {
    insertion = `\n<table>\n  <tr>\n    <td>Ячейка 1</td>\n    <td>Ячейка 2</td>\n  </tr>\n</table>\n`
  } else {
    insertion = closingTag
      ? `<${tag}>\${selected}</${closingTag}>`
      : `<${tag}>\${selected}</${tag}>`
  }

  if (previewEditMode.value) {
    const sel = window.getSelection()
    const selectedText = sel && sel.rangeCount > 0 ? sel.toString() : ''
    insertHtmlAtCursor(insertion.replace('${selected}', selectedText))
    return
  }

  const el = textareaRef.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  const selectedText = text.substring(start, end)
  const resolved = insertion.replace('${selected}', selectedText)

  el.value = text.substring(0, start) + resolved + text.substring(end)
  if (activeTab.value === 'en') htmlContent.value = el.value
  else if (activeTab.value === 'ru') htmlContentRu.value = el.value
  else if (activeTab.value === 'zh') htmlContentZh.value = el.value

  nextTick(() => {
    el.focus()
    el.setSelectionRange(start + resolved.length, start + resolved.length)
  })
}

// ─── Local history (undo/redo) ───

interface HistoryEntry {
  en: string
  ru: string
  zh: string
  label: string
  ts: number
}

const MAX_HISTORY = 15
const historyStack = ref<HistoryEntry[]>([])
const historyPointer = ref(-1)
const showHistoryPanel = ref(false)
const selectedHistoryIdx = ref<number | null>(null)
let _restoringHistory = false
let _historyDebounceTimer: ReturnType<typeof setTimeout> | null = null

function pushHistory(label: string) {
  if (_restoringHistory) return
  if (_historyDebounceTimer) { clearTimeout(_historyDebounceTimer); _historyDebounceTimer = null }

  // Drop redo branch
  if (historyPointer.value < historyStack.value.length - 1)
    historyStack.value.splice(historyPointer.value + 1)

  historyStack.value.push({
    en: htmlContent.value,
    ru: htmlContentRu.value,
    zh: htmlContentZh.value,
    label,
    ts: Date.now(),
  })

  if (historyStack.value.length > MAX_HISTORY)
    historyStack.value.shift()

  historyPointer.value = historyStack.value.length - 1
}

function scheduleHistoryCapture(label = 'Набор текста') {
  if (_restoringHistory) return
  if (_historyDebounceTimer) clearTimeout(_historyDebounceTimer)
  _historyDebounceTimer = setTimeout(() => pushHistory(label), 1500)
}

function applyHistoryEntry(entry: HistoryEntry) {
  _restoringHistory = true
  htmlContent.value = entry.en
  htmlContentRu.value = entry.ru
  htmlContentZh.value = entry.zh
  nextTick(() => {
    _restoringHistory = false
    if (previewEditMode.value) syncPreviewContent()
  })
}

function undo() {
  if (historyPointer.value <= 0) return
  historyPointer.value--
  applyHistoryEntry(historyStack.value[historyPointer.value])
}

function redo() {
  if (historyPointer.value >= historyStack.value.length - 1) return
  historyPointer.value++
  applyHistoryEntry(historyStack.value[historyPointer.value])
}

const canUndo = computed(() => historyPointer.value > 0)
const canRedo = computed(() => historyPointer.value < historyStack.value.length - 1)

function restoreSelectedHistory() {
  if (selectedHistoryIdx.value === null) return
  const entry = historyStack.value[selectedHistoryIdx.value]
  if (!entry) return
  applyHistoryEntry(entry)
  historyPointer.value = selectedHistoryIdx.value
}

// Keyboard shortcuts
function onEditorKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
}

// Diff engine
function prettifyHtml(html: string): string[] {
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
}

interface DiffLine { type: 'same' | 'add' | 'remove'; text: string }

function computeDiff(oldHtml: string, newHtml: string): DiffLine[] {
  const a = prettifyHtml(oldHtml)
  const b = prettifyHtml(newHtml)

  if (a.length > 400 || b.length > 400) {
    return [{ type: 'same', text: `(слишком большой файл для построчного diff — ${a.length} → ${b.length} строк)` }]
  }

  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])

  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
      result.unshift({ type: 'same', text: a[i-1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', text: b[j-1] }); j--
    } else {
      result.unshift({ type: 'remove', text: a[i-1] }); i--
    }
  }
  return result
}

const historyDiff = computed<DiffLine[]>(() => {
  if (selectedHistoryIdx.value === null) return []
  const entry = historyStack.value[selectedHistoryIdx.value]
  if (!entry) return []
  const currentHtml = activeTab.value === 'ru' ? htmlContentRu.value
    : activeTab.value === 'zh' ? htmlContentZh.value
    : htmlContent.value
  const entryHtml = activeTab.value === 'ru' ? entry.ru
    : activeTab.value === 'zh' ? entry.zh
    : entry.en
  return computeDiff(currentHtml, entryHtml)
})

const historyDiffStats = computed(() => {
  const added = historyDiff.value.filter(l => l.type === 'add').length
  const removed = historyDiff.value.filter(l => l.type === 'remove').length
  return { added, removed }
})

function formatHistoryTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Floating context toolbars (contenteditable) ───

const tableCtx = reactive({ show: false, style: '', cell: null as Element | null })
const selBubble = reactive({ show: false, style: '' })

function syncPreviewBack() {
  const html = previewRef.value?.innerHTML || ''
  if (activeTab.value === 'en') htmlContent.value = html
  else if (activeTab.value === 'ru') htmlContentRu.value = html
  else if (activeTab.value === 'zh') htmlContentZh.value = html
}

function updateContextToolbars() {
  if (!previewEditMode.value) {
    tableCtx.show = false
    selBubble.show = false
    return
  }

  const sel = window.getSelection()

  // Find table cell in selection ancestors
  let foundCell: Element | null = null
  if (sel && sel.rangeCount > 0) {
    let node: Node | null = sel.anchorNode
    while (node && node !== previewRef.value) {
      if (node.nodeType === 1) {
        const tag = (node as Element).tagName
        if (tag === 'TD' || tag === 'TH') { foundCell = node as Element; break }
      }
      node = node.parentNode
    }
  }

  if (foundCell) {
    tableCtx.cell = foundCell
    const r = foundCell.getBoundingClientRect()
    tableCtx.style = `top:${r.bottom + 4}px;left:${r.left}px`
    tableCtx.show = true
  } else {
    tableCtx.show = false
  }

  // Selection bubble
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) { selBubble.show = false; return }
  const range = sel.getRangeAt(0)
  if (!previewRef.value?.contains(range.commonAncestorContainer)) { selBubble.show = false; return }
  const rect = range.getBoundingClientRect()
  if (rect.width === 0) { selBubble.show = false; return }
  const bw = 280
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - bw / 2, window.innerWidth - bw - 8))
  selBubble.style = `top:${rect.top - 46}px;left:${left}px`
  selBubble.show = true
}

// ─── Right-click context menu ───

const ctxMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  type: 'default' as 'table' | 'image' | 'default',
  target: null as Element | null,
  imgSrcEdit: false,
  imgSrc: '',
  imgAlt: '',
})

function onContextMenu(e: MouseEvent) {
  if (!previewEditMode.value) return

  const target = e.target as Element
  let type: 'table' | 'image' | 'default' = 'default'
  let menuTarget: Element | null = null

  if (target.tagName === 'IMG') {
    type = 'image'
    menuTarget = target
  } else {
    let node: Element | null = target
    while (node && node !== previewRef.value) {
      if (node.tagName === 'TD' || node.tagName === 'TH') {
        type = 'table'
        menuTarget = node
        tableCtx.cell = node
        break
      }
      node = node.parentElement
    }
  }

  if (type === 'default') return

  const mx = Math.min(e.clientX, window.innerWidth - 220)
  const my = Math.min(e.clientY, window.innerHeight - 300)

  ctxMenu.show = true
  ctxMenu.x = mx
  ctxMenu.y = my
  ctxMenu.type = type
  ctxMenu.target = menuTarget
  ctxMenu.imgSrcEdit = false

  if (type === 'image') {
    ctxMenu.imgSrc = (menuTarget as HTMLImageElement).src || ''
    ctxMenu.imgAlt = (menuTarget as HTMLImageElement).alt || ''
  }
}

function closeCtxMenu() {
  ctxMenu.show = false
  ctxMenu.imgSrcEdit = false
}

function ctxDeleteTable() {
  const cell = tableCtx.cell as HTMLTableCellElement | null
  if (!cell) return
  pushHistory('Удалить таблицу')
  cell.closest('table')?.remove()
  tableCtx.show = false
  closeCtxMenu()
  syncPreviewBack()
}

function ctxDeleteImage() {
  if (!ctxMenu.target) return
  pushHistory('Удалить изображение')
  ctxMenu.target.remove()
  closeCtxMenu()
  syncPreviewBack()
}

function ctxApplyImageSrc() {
  if (!ctxMenu.target) return
  pushHistory('Изменить изображение')
  ;(ctxMenu.target as HTMLImageElement).src = ctxMenu.imgSrc
  ;(ctxMenu.target as HTMLImageElement).alt = ctxMenu.imgAlt
  closeCtxMenu()
  syncPreviewBack()
}

function onDocClick(e: MouseEvent) {
  if (ctxMenu.show) closeCtxMenu()
}

onMounted(() => {
  document.addEventListener('selectionchange', updateContextToolbars)
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  document.removeEventListener('selectionchange', updateContextToolbars)
  document.removeEventListener('click', onDocClick)
})

function applyFormat(tag: string) {
  pushHistory(`Формат <${tag}>`)
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  const wrapper = document.createElement(tag)
  try {
    range.surroundContents(wrapper)
  } catch {
    const frag = range.extractContents()
    wrapper.appendChild(frag)
    range.insertNode(wrapper)
  }
  selBubble.show = false
  syncPreviewBack()
}

function getCellColIndex(cell: HTMLTableCellElement): number {
  return Array.from((cell.parentElement as HTMLTableRowElement).cells).indexOf(cell)
}

function insertColumn(after: boolean) {
  pushHistory(after ? 'Таблица: +столбец справа' : 'Таблица: +столбец слева')
  const cell = tableCtx.cell as HTMLTableCellElement | null
  if (!cell) return
  const table = cell.closest('table')
  if (!table) return
  const idx = getCellColIndex(cell)
  table.querySelectorAll('tr').forEach(row => {
    const ref = row.querySelectorAll('td, th')[idx]
    if (!ref) return
    const nc = document.createElement(ref.tagName.toLowerCase() as 'td' | 'th')
    nc.innerHTML = '&nbsp;'
    after ? ref.after(nc) : ref.before(nc)
  })
  syncPreviewBack()
}

function deleteColumn() {
  pushHistory('Таблица: -столбец')
  const cell = tableCtx.cell as HTMLTableCellElement | null
  if (!cell) return
  const table = cell.closest('table')
  if (!table) return
  const idx = getCellColIndex(cell)
  table.querySelectorAll('tr').forEach(row => row.querySelectorAll('td, th')[idx]?.remove())
  tableCtx.show = false
  syncPreviewBack()
}

function insertRow(after: boolean) {
  pushHistory(after ? 'Таблица: +строка ниже' : 'Таблица: +строка выше')
  const cell = tableCtx.cell as HTMLTableCellElement | null
  if (!cell) return
  const row = cell.closest('tr')
  if (!row) return
  const count = row.querySelectorAll('td, th').length
  const newRow = document.createElement('tr')
  for (let i = 0; i < count; i++) {
    const td = document.createElement('td')
    td.innerHTML = '&nbsp;'
    newRow.appendChild(td)
  }
  after ? row.after(newRow) : row.before(newRow)
  syncPreviewBack()
}

function deleteRow() {
  pushHistory('Таблица: -строка')
  const cell = tableCtx.cell as HTMLTableCellElement | null
  cell?.closest('tr')?.remove()
  tableCtx.show = false
  syncPreviewBack()
}

// ODT Import
const isParsingOdt = ref(false)
const odtInput = ref<HTMLInputElement | null>(null)

async function importOdt(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return

  isParsingOdt.value = true
  try {
    const formData = new FormData()
    formData.append('file', input.files[0])

    const result = await $fetch<{ html: string }>('/api/admin/articles/parse-odt', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader(),
    })

    if (activeTab.value === 'en') htmlContent.value = result.html
    else if (activeTab.value === 'ru') htmlContentRu.value = result.html
    else if (activeTab.value === 'zh') htmlContentZh.value = result.html

    pushHistory(`ODT → ${activeTab.value.toUpperCase()}`)
    toast.add({ title: 'ODT импортирован', description: `Вкладка ${activeTab.value.toUpperCase()} обновлена`, color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка парсинга ODT', description: err?.data?.statusMessage || err.message, color: 'red' })
  }
  isParsingOdt.value = false
  input.value = ''
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
  <div class="admin-page-stack admin-page-stack--fluid editor-page gv-admin-page" @keydown="onEditorKeydown" tabindex="-1">
    <!-- Top Bar -->
    <div class="editor-topbar">
      <div class="editor-topbar-left">
        <h1 class="editor-title">{{ title || 'Без названия' }}</h1>
        <div class="translation-flags">
          <button
            type="button"
            class="lang-flag-btn"
            :class="translationValidEn ? 'lang-flag--valid' : 'lang-flag--invalid'"
            :title="translationValidEn ? 'EN: перевод валиден' : 'EN: перевод не валиден'"
            @click="translationValidEn = !translationValidEn"
          >EN</button>
          <button
            type="button"
            class="lang-flag-btn"
            :class="translationValidRu ? 'lang-flag--valid' : 'lang-flag--invalid'"
            :title="translationValidRu ? 'RU: перевод валиден' : 'RU: перевод не валиден'"
            @click="translationValidRu = !translationValidRu"
          >RU</button>
          <button
            type="button"
            class="lang-flag-btn"
            :class="translationValidZh ? 'lang-flag--valid' : 'lang-flag--invalid'"
            :title="translationValidZh ? 'ZH: перевод валиден' : 'ZH: перевод не валиден'"
            @click="translationValidZh = !translationValidZh"
          >ZH</button>
        </div>
        <div v-if="fullArticle?.is_term_article" class="term-ref-badge">
          <UIcon name="i-heroicons-book-open" />
          <span>Disclosure for: </span>
          <NuxtLink :to="`/admin/glossary/${fullArticle.term_id}/edit`" class="term-ref-link">
            {{ fullArticle.term_title }}
          </NuxtLink>
        </div>
      </div>
      <div class="editor-topbar-right">
        <div class="undo-redo-group">
          <button class="undo-redo-btn" @click="undo" :disabled="!canUndo" title="Отменить (Ctrl+Z)">
            <UIcon name="i-heroicons-arrow-uturn-left" />
          </button>
          <button class="undo-redo-btn" @click="redo" :disabled="!canRedo" title="Повторить (Ctrl+Y)">
            <UIcon name="i-heroicons-arrow-uturn-right" />
          </button>
          <button
            class="undo-redo-btn"
            :class="{ 'undo-redo-btn--active': showHistoryPanel }"
            @click="showHistoryPanel = !showHistoryPanel"
            :title="`История (${historyStack.length})`"
          >
            <UIcon name="i-heroicons-list-bullet" />
            <span class="undo-count">{{ historyStack.length }}</span>
          </button>
        </div>
        <button class="toggle-preview" @click="cycleViewMode" :title="`Следующий режим: ${viewModeLabels[nextViewMode[viewMode]]}`">
          <UIcon :name="viewModeIcons[viewMode]" />
          <span>{{ viewModeLabels[viewMode] }}</span>
        </button>
        <button
          v-if="viewMode === 'preview'"
          class="toggle-preview"
          :class="{ 'toggle-preview--active': previewEditMode }"
          @click="previewEditMode = !previewEditMode"
          :title="previewEditMode ? 'Выключить редактирование' : 'Редактировать в preview'"
        >
          <UIcon :name="previewEditMode ? 'i-heroicons-pencil-square' : 'i-heroicons-pencil'" />
          <span>{{ previewEditMode ? 'Editing' : 'Edit' }}</span>
        </button>
        <button class="translate-prompt-btn" @click="copyTranslationPrompt" :title="`Скопировать промт перевода с ${activeTab.toUpperCase()}`">
          <UIcon :name="promptCopied ? 'i-heroicons-check' : 'i-heroicons-language'" />
          <span>{{ promptCopied ? 'Скопировано' : 'Промт' }}</span>
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
        <div v-if="!showPreview || previewEditMode" class="editor-toolbar">
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
          <div class="toolbar-sep"></div>
          <div class="toolbar-group">
            <button @click="odtInput?.click()" :disabled="isParsingOdt" :title="`Импортировать ODT → HTML (${activeTab.toUpperCase()})`" class="odt-import-btn">
              <UIcon v-if="!isParsingOdt" name="i-heroicons-arrow-up-tray" />
              <UIcon v-else name="i-heroicons-arrow-path" class="animate-spin" />
              <span class="toolbar-btn-label">ODT</span>
            </button>
            <input ref="odtInput" type="file" accept=".odt" class="hidden" @change="importOdt" />
          </div>
        </div>

        <div class="editor-main" :class="{ 'editor-main--split': viewMode === 'split' }">
          <!-- Code side: shown in 'code' and 'split' modes -->
          <template v-if="viewMode !== 'preview'">
            <textarea
              v-if="activeTab === 'en'"
              ref="textareaRef"
              v-model="htmlContent"
              class="html-editor"
              placeholder="HTML-контент статьи (EN)..."
              spellcheck="false"
              @input="scheduleHistoryCapture()"
            />
            <textarea
              v-else-if="activeTab === 'ru'"
              ref="textareaRef"
              v-model="htmlContentRu"
              class="html-editor"
              placeholder="HTML-контент статьи (RU)..."
              spellcheck="false"
              @input="scheduleHistoryCapture()"
            />
            <textarea
              v-else-if="activeTab === 'zh'"
              ref="textareaRef"
              v-model="htmlContentZh"
              class="html-editor"
              placeholder="HTML-контент статьи (ZH)..."
              spellcheck="false"
              @input="scheduleHistoryCapture()"
            />
          </template>

          <!-- Preview: read-only -->
          <div
            v-if="viewMode !== 'code' && !previewEditMode"
            class="preview-pane article-prose"
            v-html="activeHtmlContent"
          />
          <!-- Preview: contenteditable -->
          <div
            v-if="viewMode !== 'code' && previewEditMode"
            ref="previewRef"
            class="preview-pane article-prose preview-pane--editable"
            contenteditable="true"
            spellcheck="false"
            @input="onPreviewInput"
            @contextmenu.prevent="onContextMenu"
          />
        </div>
      </div>
    </div>

    <!-- Local history panel -->
    <div v-if="showHistoryPanel" class="history-panel">
      <div class="history-panel-header">
        <span>Локальная история — {{ activeTab.toUpperCase() }}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <span v-if="selectedHistoryIdx !== null" class="diff-stats">
            <span class="diff-stat-add">+{{ historyDiffStats.added }}</span>
            <span class="diff-stat-remove">-{{ historyDiffStats.removed }}</span>
          </span>
          <button class="history-restore-btn" :disabled="selectedHistoryIdx === null" @click="restoreSelectedHistory">
            Восстановить
          </button>
          <button class="history-close-btn" @click="showHistoryPanel = false">
            <UIcon name="i-heroicons-x-mark" />
          </button>
        </div>
      </div>
      <div class="history-panel-body">
        <div class="history-list">
          <button
            v-for="(entry, idx) in [...historyStack].reverse()"
            :key="idx"
            class="history-entry"
            :class="{
              'history-entry--selected': selectedHistoryIdx === (historyStack.length - 1 - idx),
              'history-entry--current': historyPointer === (historyStack.length - 1 - idx),
            }"
            @click="selectedHistoryIdx = historyStack.length - 1 - idx"
          >
            <span class="history-entry-label">{{ entry.label }}</span>
            <span class="history-entry-time">{{ formatHistoryTime(entry.ts) }}</span>
          </button>
        </div>
        <div class="history-diff" v-if="selectedHistoryIdx !== null">
          <div
            v-for="(line, i) in historyDiff"
            :key="i"
            class="diff-line"
            :class="`diff-line--${line.type}`"
          >
            <span class="diff-prefix">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }}</span>
            <code class="diff-text">{{ line.text }}</code>
          </div>
          <div v-if="historyDiff.length === 0" class="diff-empty">Нет изменений</div>
        </div>
        <div v-else class="history-diff history-diff--placeholder">
          <span>Выберите запись слева для просмотра diff</span>
        </div>
      </div>
    </div>

    <!-- Modal for glossary terms -->
    <AdminTermSelectorModal v-model="showTermModal" @select="insertTerm" />

    <!-- Right-click context menu -->
    <Teleport to="body">
      <div v-if="ctxMenu.show" class="ctx-menu" :style="`top:${ctxMenu.y}px;left:${ctxMenu.x}px`" @click.stop>

        <!-- TABLE context -->
        <template v-if="ctxMenu.type === 'table'">
          <div class="ctx-section-label">Столбец</div>
          <button class="ctx-item" @click="insertColumn(false); closeCtxMenu()">
            <UIcon name="i-heroicons-arrow-left" class="ctx-icon" /> Добавить слева
          </button>
          <button class="ctx-item" @click="insertColumn(true); closeCtxMenu()">
            <UIcon name="i-heroicons-arrow-right" class="ctx-icon" /> Добавить справа
          </button>
          <button class="ctx-item ctx-item--danger" @click="deleteColumn(); closeCtxMenu()">
            <UIcon name="i-heroicons-x-mark" class="ctx-icon" /> Удалить столбец
          </button>
          <div class="ctx-sep" />
          <div class="ctx-section-label">Строка</div>
          <button class="ctx-item" @click="insertRow(false); closeCtxMenu()">
            <UIcon name="i-heroicons-arrow-up" class="ctx-icon" /> Добавить выше
          </button>
          <button class="ctx-item" @click="insertRow(true); closeCtxMenu()">
            <UIcon name="i-heroicons-arrow-down" class="ctx-icon" /> Добавить ниже
          </button>
          <button class="ctx-item ctx-item--danger" @click="deleteRow(); closeCtxMenu()">
            <UIcon name="i-heroicons-x-mark" class="ctx-icon" /> Удалить строку
          </button>
          <div class="ctx-sep" />
          <button class="ctx-item ctx-item--danger" @click="ctxDeleteTable">
            <UIcon name="i-heroicons-trash" class="ctx-icon" /> Удалить таблицу
          </button>
        </template>

        <!-- IMAGE context -->
        <template v-else-if="ctxMenu.type === 'image'">
          <div class="ctx-section-label">Изображение</div>
          <template v-if="!ctxMenu.imgSrcEdit">
            <button class="ctx-item" @click="ctxMenu.imgSrcEdit = true">
              <UIcon name="i-heroicons-pencil" class="ctx-icon" /> Изменить src / alt
            </button>
            <button class="ctx-item ctx-item--danger" @click="ctxDeleteImage">
              <UIcon name="i-heroicons-trash" class="ctx-icon" /> Удалить изображение
            </button>
          </template>
          <template v-else>
            <div class="ctx-img-edit">
              <label class="ctx-img-label">src</label>
              <input v-model="ctxMenu.imgSrc" class="ctx-img-input" placeholder="URL изображения" @keydown.enter="ctxApplyImageSrc" />
              <label class="ctx-img-label">alt</label>
              <input v-model="ctxMenu.imgAlt" class="ctx-img-input" placeholder="Описание" @keydown.enter="ctxApplyImageSrc" />
              <div class="ctx-img-actions">
                <button class="ctx-img-btn ctx-img-btn--apply" @click="ctxApplyImageSrc">Применить</button>
                <button class="ctx-img-btn" @click="ctxMenu.imgSrcEdit = false">Отмена</button>
              </div>
            </div>
          </template>
        </template>

      </div>
    </Teleport>

    <!-- Floating table toolbar -->
    <Teleport to="body">
      <div v-if="tableCtx.show" class="float-table-bar" :style="tableCtx.style">
        <button @mousedown.prevent @click="insertColumn(false)" title="Столбец слева">
          <UIcon name="i-heroicons-arrow-left" /><span>col</span>
        </button>
        <button @mousedown.prevent @click="insertColumn(true)" title="Столбец справа">
          <span>col</span><UIcon name="i-heroicons-arrow-right" />
        </button>
        <button @mousedown.prevent @click="deleteColumn" title="Удалить столбец" class="float-btn--danger">
          <UIcon name="i-heroicons-x-mark" /><span>col</span>
        </button>
        <div class="float-sep"></div>
        <button @mousedown.prevent @click="insertRow(false)" title="Строка выше">
          <UIcon name="i-heroicons-arrow-up" /><span>row</span>
        </button>
        <button @mousedown.prevent @click="insertRow(true)" title="Строка ниже">
          <span>row</span><UIcon name="i-heroicons-arrow-down" />
        </button>
        <button @mousedown.prevent @click="deleteRow" title="Удалить строку" class="float-btn--danger">
          <UIcon name="i-heroicons-x-mark" /><span>row</span>
        </button>
      </div>
    </Teleport>

    <!-- Floating selection bubble -->
    <Teleport to="body">
      <div v-if="selBubble.show" class="float-sel-bubble" :style="selBubble.style">
        <button @mousedown.prevent @click="applyFormat('strong')" title="Жирный"><strong>B</strong></button>
        <button @mousedown.prevent @click="applyFormat('em')" title="Курсив"><em>I</em></button>
        <button @mousedown.prevent @click="applyFormat('u')" title="Подчёркивание"><u>U</u></button>
        <button @mousedown.prevent @click="applyFormat('s')" title="Зачёркивание"><s>S</s></button>
        <button @mousedown.prevent @click="applyFormat('code')" title="Код"><UIcon name="i-heroicons-code-bracket" /></button>
        <div class="float-sep"></div>
        <button @mousedown.prevent @click="showTermModal = true" title="Термин">
          <UIcon name="i-heroicons-book-open" class="text-sky-500" />
        </button>
      </div>
    </Teleport>
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

.translation-flags {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lang-flag-btn {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.4;
}

.lang-flag--valid {
  border-color: #16a34a;
  background: #dcfce7;
  color: #15803d;
}

.dark .lang-flag--valid {
  border-color: #166534;
  background: #052e16;
  color: #4ade80;
}

.lang-flag--invalid {
  border-color: #d1d5db;
  background: transparent;
  color: #9ca3af;
}

.dark .lang-flag--invalid {
  border-color: #3f3f46;
  color: #6b7280;
}

.lang-flag-btn:hover {
  opacity: 0.75;
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

.translate-prompt-btn {
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
  transition: all 0.2s;
}
.translate-prompt-btn:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0284c7;
}
.dark .translate-prompt-btn {
  border-color: #333;
  color: #aaa;
}
.dark .translate-prompt-btn:hover {
  background: #082f49;
  border-color: #0c4a6e;
  color: #7dd3fc;
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

.toggle-preview--active {
  background: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
}
.dark .toggle-preview--active {
  background: #052e16;
  border-color: #166534;
  color: #4ade80;
}

.preview-pane--editable {
  outline: none;
  cursor: text;
  border-left: 3px solid #86efac;
}
.dark .preview-pane--editable {
  border-left-color: #166534;
}

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

.odt-import-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  width: auto !important;
  padding: 0 10px !important;
}

.toolbar-btn-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
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

.editor-main--split {
  gap: 0;
}

.editor-main--split .html-editor {
  width: 50%;
  border-right: 1px solid #e5e7eb;
}

.dark .editor-main--split .html-editor {
  border-right-color: #2a2a2e;
}

.editor-main--split .preview-pane {
  width: 50%;
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

/* ─── Undo/Redo group ─── */
.undo-redo-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: #f3f4f6;
  border-radius: 9px;
}
.dark .undo-redo-group { background: #252528; }

.undo-redo-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 7px;
  border: none;
  background: none;
  cursor: pointer;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s;
}
.undo-redo-btn:hover:not(:disabled) { background: #fff; color: #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.undo-redo-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.undo-redo-btn--active { background: #fff; color: var(--gv-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.dark .undo-redo-btn:hover:not(:disabled) { background: #333; color: #e5e5e5; }
.dark .undo-redo-btn--active { background: #333; color: var(--gv-primary); }

.undo-count {
  font-size: 10px;
  font-weight: 800;
  color: #888;
  min-width: 14px;
  text-align: center;
}

/* ─── History panel ─── */
.history-panel {
  flex-shrink: 0;
  height: 260px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}
.dark .history-panel { background: #161618; border-top-color: #2a2a2e; }

.history-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  flex-shrink: 0;
  gap: 8px;
}
.dark .history-panel-header { border-bottom-color: #2a2a2e; }

.diff-stats { display: flex; gap: 6px; font-size: 11px; font-weight: 700; }
.diff-stat-add { color: #16a34a; }
.diff-stat-remove { color: #dc2626; }

.history-restore-btn {
  padding: 4px 12px;
  border-radius: 7px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  color: var(--gv-primary);
  transition: all 0.15s;
  text-transform: none;
  letter-spacing: 0;
}
.history-restore-btn:hover:not(:disabled) { background: var(--gv-primary); color: #fff; border-color: var(--gv-primary); }
.history-restore-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.dark .history-restore-btn { background: #1e1e21; border-color: #2a2a2e; }

.history-close-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  border-radius: 6px; border: none; background: none; cursor: pointer; color: #888;
}
.history-close-btn:hover { background: #e5e7eb; color: #1a1a1a; }
.dark .history-close-btn:hover { background: #2a2a2e; color: #e5e5e5; }

.history-panel-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.history-list {
  width: 200px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
  padding: 4px;
}
.dark .history-list { border-right-color: #2a2a2e; }

.history-entry {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 10px;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  border: none;
  background: none;
  transition: all 0.12s;
}
.history-entry:hover { background: #f3f4f6; }
.dark .history-entry:hover { background: #252528; }
.history-entry--selected { background: #eff6ff !important; }
.dark .history-entry--selected { background: #0c1a2e !important; }
.history-entry--current { border-left: 3px solid #86efac; padding-left: 7px; }

.history-entry-label { font-size: 12px; font-weight: 600; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dark .history-entry-label { color: #e5e5e5; }
.history-entry-time { font-size: 10px; color: #999; font-family: monospace; }

.history-diff {
  flex: 1;
  overflow: auto;
  padding: 8px 10px;
}

.history-diff--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 13px;
}

.diff-line {
  display: flex;
  gap: 8px;
  padding: 1px 4px;
  border-radius: 2px;
  min-height: 18px;
}
.diff-line--add { background: #f0fdf4; }
.diff-line--remove { background: #fef2f2; }
.dark .diff-line--add { background: #052e16; }
.dark .diff-line--remove { background: #2a0a0a; }

.diff-prefix {
  font-family: monospace;
  font-size: 11px;
  width: 12px;
  flex-shrink: 0;
  color: #aaa;
  user-select: none;
}
.diff-line--add .diff-prefix { color: #16a34a; }
.diff-line--remove .diff-prefix { color: #dc2626; }

.diff-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #444;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}
.diff-line--add .diff-text { color: #15803d; }
.diff-line--remove .diff-text { color: #b91c1c; }
.dark .diff-text { color: #ccc; }
.dark .diff-line--add .diff-text { color: #4ade80; }
.dark .diff-line--remove .diff-text { color: #f87171; }

.diff-empty { font-size: 12px; color: #aaa; padding: 12px; text-align: center; }

/* ─── Right-click context menu ─── */
.ctx-menu {
  position: fixed;
  z-index: 99999;
  min-width: 200px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.dark .ctx-menu {
  background: #1e1e21;
  border-color: #2a2a2e;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.ctx-section-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #aaa;
  padding: 4px 10px 2px;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  text-align: left;
  width: 100%;
  transition: all 0.12s;
}
.ctx-item:hover { background: #f3f4f6; }
.ctx-item--danger { color: #dc2626; }
.ctx-item--danger:hover { background: #fef2f2; }
.dark .ctx-item { color: #e5e5e5; }
.dark .ctx-item:hover { background: #252528; }
.dark .ctx-item--danger { color: #f87171; }
.dark .ctx-item--danger:hover { background: #2a1010; }

.ctx-icon { width: 16px; height: 16px; flex-shrink: 0; color: #888; }
.ctx-item--danger .ctx-icon { color: #dc2626; }
.dark .ctx-item--danger .ctx-icon { color: #f87171; }

.ctx-sep {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 6px;
}
.dark .ctx-sep { background: #2a2a2e; }

.ctx-img-edit {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
}

.ctx-img-label {
  font-size: 10px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ctx-img-input {
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid #e5e7eb;
  font-size: 12px;
  font-family: monospace;
  color: #1a1a1a;
  background: #f9fafb;
  outline: none;
}
.ctx-img-input:focus { border-color: var(--gv-primary); }
.dark .ctx-img-input { background: #111113; border-color: #2a2a2e; color: #e5e5e5; }

.ctx-img-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.ctx-img-btn {
  flex: 1;
  padding: 6px;
  border-radius: 7px;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  transition: all 0.12s;
}
.ctx-img-btn:hover { background: #e5e7eb; }
.ctx-img-btn--apply { background: var(--gv-primary); color: #fff; border-color: var(--gv-primary); }
.ctx-img-btn--apply:hover { opacity: 0.9; }

/* ─── Floating toolbars ─── */
.float-table-bar,
.float-sel-bubble {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 2px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  pointer-events: all;
}

.float-table-bar button,
.float-sel-bubble button {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 8px;
  border-radius: 7px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #444;
  transition: all 0.15s;
  white-space: nowrap;
}

.float-table-bar button:hover,
.float-sel-bubble button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.float-btn--danger:hover {
  background: #fef2f2 !important;
  color: #ef4444 !important;
}

.float-sep {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 2px;
  flex-shrink: 0;
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
