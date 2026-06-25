<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  bookId?: number | string | null
}>()

const emit = defineEmits<{
  (e: 'saved', id: number): void
  (e: 'deleted'): void
  (e: 'refresh-list'): void
}>()

const store = userStore()
const toast = useToast()

const activeTab = ref<'metadata' | 'structure'>('metadata')
const activeLangTab = ref<'en' | 'ru' | 'zh'>('ru')

// --- Metadata Form State ---
const isNewBook = computed(() => !props.bookId || props.bookId === 'new')
const loadingBook = ref(false)
const savingMetadata = ref(false)

const form = reactive({
  title: '',
  title_ru: '',
  title_zh: '',
  slug: '',
  description: '',
  description_ru: '',
  description_zh: '',
  cover_image: '',
  sort_order: 0,
  category_ids: [] as number[]
})

// Sync Slug flags
const syncSlug = ref(true)
const syncSlugRu = ref(true)
const syncSlugZh = ref(true)

watch(() => form.title, (newVal) => {
  if (syncSlug.value && isNewBook.value) {
    form.slug = slugify(newVal)
  }
})

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
}

// Categories list
const { data: categoriesData } = await useFetch<any[]>('/api/categories', {
  headers: store.getAuthHeader()
})
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value as any[]
  return []
})

// Books list for sorting
const { data: booksData } = await useFetch<any[]>('/api/books', {
  headers: store.getAuthHeader()
})
const allBooks = computed(() => {
  if (Array.isArray(booksData.value)) {
    return (booksData.value as any[]).filter(b => b.id !== Number(props.bookId))
  }
  return []
})

const sortPosition = ref('')

const sortPositionOptions = computed(() => {
  const options = [
    { label: isNewBook.value ? 'Вставить в конец списка' : 'Не менять текущую позицию', value: isNewBook.value ? 'at_end' : '' }
  ]
  if (!isNewBook.value) {
    options.push({ label: 'Вставить в конец списка', value: 'at_end' })
  }
  allBooks.value.forEach((b: any) => {
    options.push({
      label: `Вставить перед: ${b.title}`,
      value: `before_${b.id}`
    })
  })
  return options
})

// --- Project & Slots (Skeleton) State ---
const projectId = ref<number | null>(null)
const parts = ref<any[]>([])
const loadingProject = ref(false)
const loadingMaster = ref(false)
const uploadingPartId = ref<number | null>(null)
const clearingPartId = ref<number | null>(null)
const publishing = ref(false)
const existingArticlesCount = ref(0)

const splitLevel = ref<'none' | 'h1' | 'h2'>('none')
const odmContentLocale = ref<'ru' | 'en' | 'zh'>('ru')

const allTranslatedEn = computed(() => {
  if (!parts.value || parts.value.length === 0) return false
  const enabledParts = parts.value.filter(p => p.is_enabled === 1)
  if (enabledParts.length === 0) return false
  return enabledParts.every(p => !!p.has_translation_en)
})

const allTranslatedRu = computed(() => {
  if (!parts.value || parts.value.length === 0) return false
  const enabledParts = parts.value.filter(p => p.is_enabled === 1)
  if (enabledParts.length === 0) return false
  return enabledParts.every(p => !!p.has_translation_ru)
})

const allTranslatedZh = computed(() => {
  if (!parts.value || parts.value.length === 0) return false
  const enabledParts = parts.value.filter(p => p.is_enabled === 1)
  if (enabledParts.length === 0) return false
  return enabledParts.every(p => !!p.has_translation_zh)
})

// ODM Files refs
const masterFileEn = ref<File | null>(null)
const masterFileRu = ref<File | null>(null)
const masterFileZh = ref<File | null>(null)

// Edit Slot Titles Modal state
const isEditSlotModalOpen = ref(false)
const activeEditSlot = ref<any>(null)
const slotTitleForm = reactive({
  display_title: '',
  display_title_ru: '',
  display_title_zh: ''
})
const savingSlotTitles = ref(false)

// Link Existing Article Modal state
const isLinkArticleModalOpen = ref(false)
const articleSearchQuery = ref('')
const selectedArticleForLink = ref<any>(null)
const loadingArticles = ref(false)
const articlesList = ref<any[]>([])

// Bulk ODT upload state
const showBulkPanel = ref(false)
const bulkInputRef = ref<HTMLInputElement | null>(null)
const bulkFiles = ref<File[]>([])
const bulkDragging = ref(false)
const bulkUploading = ref(false)
const bulkHeadingLocale = ref<'ru' | 'en' | 'zh' | 'none' | ''>('')
const bulkChapterStart = ref(1)

// --- Load Book Data ---
async function loadBookData() {
  if (isNewBook.value) {
    // Reset form
    form.title = ''
    form.title_ru = ''
    form.title_zh = ''
    form.slug = ''
    form.description = ''
    form.description_ru = ''
    form.description_zh = ''
    form.cover_image = ''
    form.sort_order = 0
    form.category_ids = []
    
    projectId.value = null
    parts.value = []
    existingArticlesCount.value = 0
    activeTab.value = 'metadata'
    return
  }

  loadingBook.value = true
  try {
    const book = await $fetch<any>(`/api/books/${props.bookId}`, {
      headers: store.getAuthHeader()
    })
    if (book) {
      form.title = book.title || ''
      form.title_ru = book.title_ru || ''
      form.title_zh = book.title_zh || ''
      form.slug = book.slug || ''
      form.description = book.description || ''
      form.description_ru = book.description_ru || ''
      form.description_zh = book.description_zh || ''
      form.cover_image = book.cover_image || ''
      form.sort_order = Number(book.sort_order || 0)
      form.category_ids = book.category_ids || []
      
      projectId.value = book.odm_project_id || null
      existingArticlesCount.value = book.articles ? book.articles.length : 0
      syncSlug.value = false
      syncSlugRu.value = false
      syncSlugZh.value = false

      if (projectId.value) {
        await fetchProjectDetails()
      } else {
        parts.value = []
      }
    }
  } catch (e: any) {
    toast.add({ title: 'Ошибка при загрузке книги', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingBook.value = false
  }
}

watch(() => props.bookId, () => {
  loadBookData()
  if (isNewBook.value) {
    sortPosition.value = 'at_end'
  } else {
    sortPosition.value = ''
  }
}, { immediate: true })

// --- Save Metadata ---
async function saveMetadata() {
  if (!form.title.trim()) {
    toast.add({ title: 'Укажите название на английском (EN)', color: 'red' })
    return
  }
  if (!form.slug.trim()) {
    toast.add({ title: 'Укажите URL slug', color: 'red' })
    return
  }

  savingMetadata.value = true
  try {
    const body = { ...form, sort_position: sortPosition.value }
    
    if (isNewBook.value) {
      const res = await $fetch<any>('/api/books', {
        method: 'POST',
        headers: store.getAuthHeader(),
        body
      })
      toast.add({ title: 'Книга создана', color: 'green' })
      emit('saved', res.id)
    } else {
      await $fetch<any>(`/api/books/${form.slug}`, {
        method: 'PUT',
        headers: store.getAuthHeader(),
        body
      })
      toast.add({ title: 'Метаданные обновлены', color: 'green' })
      emit('saved', Number(props.bookId))
    }
  } catch (e: any) {
    toast.add({ title: 'Не удалось сохранить книгу', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    savingMetadata.value = false
  }
}

// --- Fetch project details ---
async function fetchProjectDetails() {
  if (!projectId.value) return
  loadingProject.value = true
  try {
    const res = await $fetch<any>(`/api/import/odm/project/${projectId.value}`, {
      headers: store.getAuthHeader()
    })
    parts.value = res.parts || []
    emit('refresh-list')
  } catch (e: any) {
    console.error('Failed to load project parts:', e)
  } finally {
    loadingProject.value = false
  }
}

// --- Initialize structure manually ---
async function initStructureManually() {
  if (isNewBook.value) return
  loadingProject.value = true
  try {
    const res = await $fetch<any>('/api/import/odm/project', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        book_id: Number(props.bookId),
        category_id: form.category_ids.length > 0 ? form.category_ids[0] : null,
        is_manual: true
      }
    })
    projectId.value = res.projectId
    parts.value = res.parts || []
    toast.add({ title: 'Скелет книги успешно создан вручную', color: 'green' })
    emit('refresh-list')
  } catch (e: any) {
    toast.add({ title: 'Ошибка инициализации структуры', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingProject.value = false
  }
}

async function generateSkeletonFromExisting() {
  if (isNewBook.value) return
  loadingProject.value = true
  try {
    const res = await $fetch<any>('/api/import/odm/project', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        book_id: Number(props.bookId),
        category_id: form.category_ids.length > 0 ? form.category_ids[0] : null,
        is_from_existing: true
      }
    })
    projectId.value = res.projectId
    parts.value = res.parts || []
    existingArticlesCount.value = 0
    toast.add({ title: 'Структура скелета успешно воссоздана по статьям книги', color: 'green' })
    emit('refresh-list')
  } catch (e: any) {
    toast.add({ title: 'Ошибка сборки структуры', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingProject.value = false
  }
}

// --- Initialize structure via ODM ---
async function initStructureOdm() {
  if (isNewBook.value) return
  if (!masterFileEn.value && !masterFileRu.value && !masterFileZh.value) {
    toast.add({ title: 'Загрузите хотя бы один файл .odm', color: 'red' })
    return
  }

  loadingMaster.value = true
  try {
    const options = {
      book_id: Number(props.bookId),
      category_id: form.category_ids.length > 0 ? form.category_ids[0] : null,
      split_level: splitLevel.value,
      content_locale: odmContentLocale.value
    }

    const fd = new FormData()
    if (masterFileEn.value) fd.append('file_en', masterFileEn.value)
    if (masterFileRu.value) fd.append('file_ru', masterFileRu.value)
    if (masterFileZh.value) fd.append('file_zh', masterFileZh.value)
    fd.append('options', JSON.stringify(options))

    const res = await $fetch<any>('/api/import/odm/project', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: fd
    })

    projectId.value = res.projectId
    parts.value = res.parts || []
    
    // Clear file refs
    masterFileEn.value = null
    masterFileRu.value = null
    masterFileZh.value = null

    toast.add({ title: 'Структура из ODM успешно импортирована', color: 'green' })
    emit('refresh-list')
  } catch (e: any) {
    toast.add({ title: 'Ошибка разбора ODM', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingMaster.value = false
  }
}

// --- Delete Entire Project/Structure ---
async function deleteStructure() {
  if (!projectId.value) return
  const ok = confirm(
    'Вы уверены, что хотите полностью удалить структуру глав книги? ' +
    'Все связанные черновики статей будут удалены! Опубликованные статьи останутся, и проект нельзя будет удалить, пока вы их не снимете с публикации.'
  )
  if (!ok) return

  loadingProject.value = true
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}`, {
      method: 'DELETE',
      headers: store.getAuthHeader()
    })
    projectId.value = null
    parts.value = []
    toast.add({ title: 'Структура глав успешно удалена', color: 'green' })
    emit('refresh-list')
  } catch (e: any) {
    toast.add({ title: 'Не удалось удалить структуру', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingProject.value = false
  }
}

// --- Add empty chapter slot ---
async function addChapterSlot() {
  if (!projectId.value) return
  loadingProject.value = true
  try {
    const res = await $fetch<any>(`/api/import/odm/project/${projectId.value}/part`, {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        display_title: `Глава ${parts.value.length + 1}`
      }
    })
    if (res.ok) {
      toast.add({ title: 'Добавлен пустой слот главы', color: 'green' })
      await fetchProjectDetails()
    }
  } catch (e: any) {
    toast.add({ title: 'Не удалось добавить главу', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingProject.value = false
  }
}

// --- Linking Existing Article functions ---
async function loadArticlesForLinking() {
  loadingArticles.value = true
  try {
    const res = await $fetch<any>('/api/articles', {
      headers: store.getAuthHeader(),
      query: {
        limit: 100,
        published_only: 'false',
        search: articleSearchQuery.value || undefined
      }
    })
    articlesList.value = res.items || []
  } catch (e) {
    console.error('Failed to load articles:', e)
  } finally {
    loadingArticles.value = false
  }
}

watch(articleSearchQuery, () => {
  loadArticlesForLinking()
})

function openLinkArticleModal() {
  articleSearchQuery.value = ''
  selectedArticleForLink.value = null
  isLinkArticleModalOpen.value = true
  loadArticlesForLinking()
}

async function linkExistingArticle() {
  if (!selectedArticleForLink.value || !projectId.value) return
  loadingProject.value = true
  try {
    const res = await $fetch<any>(`/api/import/odm/project/${projectId.value}/part`, {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        article_id: selectedArticleForLink.value.id
      }
    })
    if (res.ok) {
      toast.add({ title: 'Статья успешно добавлена в структуру', color: 'green' })
      isLinkArticleModalOpen.value = false
      await fetchProjectDetails()
    }
  } catch (e: any) {
    toast.add({ title: 'Не удалось привязать статью', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingProject.value = false
  }
}

// --- Fullscreen Article Editor Overlay state & helper functions ---
const activeArticleIdForEdit = ref<number | null>(null)
const isArticleEditorOpen = ref(false)

function parseImportedIds(raw: string | null): number[] {
  if (!raw) return []
  try {
    const a = JSON.parse(raw)
    if (!Array.isArray(a)) return []
    return a.map(x => Number(x)).filter(x => Number.isFinite(x))
  } catch {
    return []
  }
}

function getImportedArticleId(part: any): number | null {
  const ids = parseImportedIds(part.imported_article_ids)
  return ids.length > 0 ? ids[0] : null
}

function openArticleEditor(articleId: number) {
  activeArticleIdForEdit.value = articleId
  isArticleEditorOpen.value = true
}

// --- Delete Slot chapter ---
async function deleteChapterSlot(partId: number) {
  if (!projectId.value) return
  const p = parts.value.find(x => x.id === partId)
  if (!p) return

  const ok = confirm(`Удалить главу "${p.display_title || 'Глава'}"? При этом связанные черновики статей будут удалены, а последующие главы сбросят импорт для перенумерации.`)
  if (!ok) return

  loadingProject.value = true
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${partId}`, {
      method: 'DELETE',
      headers: store.getAuthHeader()
    })
    toast.add({ title: 'Глава успешно удалена', color: 'green' })
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Не удалось удалить главу', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    loadingProject.value = false
  }
}

// --- Toggle Slot Enabled State ---
async function toggleSlotEnabled(part: any) {
  if (!projectId.value || part.status !== 'pending') return
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${part.id}`, {
      method: 'PATCH',
      headers: store.getAuthHeader(),
      body: {
        is_enabled: !part.is_enabled
      }
    })
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Ошибка изменения состояния слота', description: e?.data?.statusMessage || e?.message, color: 'red' })
  }
}

// --- Trigger ODT upload ---
function triggerPartOdtUpload(partId: number, lang: 'en' | 'ru' | 'zh') {
  const el = document.getElementById(`part-odt-input-${partId}-${lang}`)
  if (el) (el as HTMLInputElement).click()
}

// --- Handle file input change for slot ---
async function handlePartOdtFileChange(partId: number, lang: 'en' | 'ru' | 'zh', event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  if (!file.name.toLowerCase().endsWith('.odt')) {
    toast.add({ title: 'Для слота необходим файл .odt', color: 'red' })
    input.value = ''
    return
  }

  const p = parts.value.find(x => x.id === partId)
  if (!p) return

  uploadingPartId.value = partId
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('titles', JSON.stringify({
      display_title: p.display_title,
      display_title_ru: p.display_title_ru,
      display_title_zh: p.display_title_zh
    }))

    const res = await $fetch<any>(`/api/import/odm/project/${projectId.value}/part/${partId}?lang=${lang}`, {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: fd
    })

    toast.add({
      title: lang === 'en' ? 'Глава EN успешно импортирована' : `Перевод ${lang.toUpperCase()} импортирован`,
      description: `Импортировано статей: ${res.imported}`,
      color: 'green'
    })
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Ошибка импорта ODT', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    uploadingPartId.value = null
    input.value = ''
  }
}

// --- Clear slot ODT ---
async function clearSlotOdt(partId: number, lang: 'en' | 'ru' | 'zh') {
  if (!projectId.value) return
  const label = lang.toUpperCase()
  const confirmationText = lang === 'en'
    ? 'Сбросить импорт этого слота и всех последующих глав? Все связанные черновики статей будут стерты.'
    : `Сбросить перевод ${label} для этого слота и всех последующих глав? Переведенный контент будет удален.`

  if (!confirm(confirmationText)) return

  clearingPartId.value = partId
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${partId}/import?lang=${lang}`, {
      method: 'DELETE',
      headers: store.getAuthHeader()
    })
    toast.add({ title: `Импорт ${label} сброшен`, color: 'green' })
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Не удалось сбросить импорт', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    clearingPartId.value = null
  }
}

// --- Edit Slot Titles modal ---
function openEditSlotModal(part: any) {
  activeEditSlot.value = part
  slotTitleForm.display_title = part.display_title || ''
  slotTitleForm.display_title_ru = part.display_title_ru || ''
  slotTitleForm.display_title_zh = part.display_title_zh || ''
  isEditSlotModalOpen.value = true
}

async function saveSlotTitles() {
  if (!activeEditSlot.value || !projectId.value) return
  if (!slotTitleForm.display_title.trim()) {
    toast.add({ title: 'Заголовок EN не может быть пустым', color: 'red' })
    return
  }

  savingSlotTitles.value = true
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${activeEditSlot.value.id}`, {
      method: 'PATCH',
      headers: store.getAuthHeader(),
      body: {
        display_title: slotTitleForm.display_title.trim(),
        display_title_ru: slotTitleForm.display_title_ru.trim() || null,
        display_title_zh: slotTitleForm.display_title_zh.trim() || null
      }
    })
    toast.add({ title: 'Названия главы сохранены', color: 'green' })
    isEditSlotModalOpen.value = false
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Не удалось сохранить названия', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    savingSlotTitles.value = false
  }
}

// --- Publish Project ---
async function publishBookProject() {
  if (!projectId.value) return
  publishing.value = true
  try {
    const res = await $fetch<any>(`/api/import/odm/project/${projectId.value}/publish`, {
      method: 'POST',
      headers: store.getAuthHeader()
    })
    toast.add({
      title: 'Опубликовано',
      description: `${res.publishedCount} глав выведены на сайт.`,
      color: 'green'
    })
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Не удалось опубликовать', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    publishing.value = false
  }
}


const toolsDropdownItems = computed(() => [
  [
    {
      label: 'Опубликовать все главы',
      icon: 'i-heroicons-rocket-launch',
      click: publishBookProject,
      disabled: publishing.value
    },
    {
      label: 'Удалить проект структуры',
      icon: 'i-heroicons-trash-solid',
      click: deleteStructure,
      class: 'text-red-500 hover:text-red-700'
    }
  ]
])

function onBulkFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input?.files) {
    handleBulkFiles(input.files)
  }
}

// --- Native Drag & Drop for reordering slots ---
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const isSorting = ref(false)

function handleDragStart(index: number) {
  draggedIndex.value = index
}

function handleDragEnter(index: number) {
  if (draggedIndex.value === null) return
  dragOverIndex.value = index
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

async function handleDrop(index: number) {
  if (draggedIndex.value === null || draggedIndex.value === index) return
  
  const items = [...parts.value]
  const [moved] = items.splice(draggedIndex.value, 1)
  items.splice(index, 0, moved)
  
  parts.value = items.map((p, idx) => ({ ...p, sort_order: idx + 1 }))
  
  // Save reorder to backend
  isSorting.value = true
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/reorder`, {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        partIds: parts.value.map(p => p.id)
      }
    })
    toast.add({ title: 'Порядок глав сохранен', color: 'green' })
  } catch (e: any) {
    toast.add({ title: 'Ошибка сохранения порядка', description: e?.data?.statusMessage || e?.message, color: 'red' })
    await fetchProjectDetails() // revert
  } finally {
    isSorting.value = false
    draggedIndex.value = null
    dragOverIndex.value = null
  }
}

// --- Drag & Drop for Bulk upload area ---
function handleBulkFiles(files: FileList | File[]) {
  const odts = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.odt'))
  if (!odts.length) {
    toast.add({ title: 'Нужны файлы .odt', color: 'red' })
    return
  }
  bulkFiles.value = odts
}

const bulkMatchedFiles = computed(() => {
  return bulkFiles.value.map(file => {
    const fileBn = file.name.toLowerCase()
    let matchedPart: any = null
    let matchedLang: 'en' | 'ru' | 'zh' | null = null

    for (const p of parts.value) {
      const bnEn = p.master_href_en ? p.master_href_en.replace(/\\/g, '/').split('/').pop()?.toLowerCase() : null
      const bnRu = p.master_href_ru ? p.master_href_ru.replace(/\\/g, '/').split('/').pop()?.toLowerCase() : null
      const bnZh = p.master_href_zh ? p.master_href_zh.replace(/\\/g, '/').split('/').pop()?.toLowerCase() : null

      if (bnEn && bnEn === fileBn) {
        matchedPart = p
        matchedLang = 'en'
        break
      }
      if (bnRu && (bnRu === fileBn || fileBn.includes('_ru') || fileBn.includes('.ru.'))) {
        matchedPart = p
        matchedLang = 'ru'
        break
      }
      if (bnZh && (bnZh === fileBn || fileBn.includes('_zh') || fileBn.includes('.zh.'))) {
        matchedPart = p
        matchedLang = 'zh'
        break
      }
    }

    // fallback matching by order name (e.g. part-1 matching chapter-1)
    if (!matchedPart) {
      const numMatch = fileBn.match(/\d+/)
      if (numMatch) {
        const order = parseInt(numMatch[0])
        matchedPart = parts.value.find(p => p.sort_order === order)
        matchedLang = fileBn.includes('ru') ? 'ru' : fileBn.includes('zh') ? 'zh' : 'en'
      }
    }

    return {
      file,
      filename: file.name,
      matchedPart,
      matchedLang
    }
  })
})

const hasUnmatchedBulkFiles = computed(() => bulkMatchedFiles.value.some(m => !m.matchedPart))

async function runBulkOdtImport() {
  if (!projectId.value || !bulkFiles.value.length) return
  if (hasUnmatchedBulkFiles.value) {
    if (!confirm('Некоторые файлы не удалось сопоставить со структурой. Они будут пропущены. Продолжить?')) {
      return
    }
  }

  bulkUploading.value = true
  try {
    const fd = new FormData()
    if (bulkHeadingLocale.value) fd.append('heading_locale', bulkHeadingLocale.value)
    fd.append('chapter_start', String(bulkChapterStart.value))
    
    for (const f of bulkFiles.value) {
      fd.append('files', f, f.name)
    }

    const res = await $fetch<any>(`/api/import/odm/project/${projectId.value}/bulk-odt`, {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: fd
    })

    bulkFiles.value = []
    toast.add({
      title: 'Массовый импорт завершен',
      description: `Создано: ${res.created} · Обновлено: ${res.updated} · Пропущено: ${res.skipped}`,
      color: 'green'
    })
    await fetchProjectDetails()
  } catch (e: any) {
    toast.add({ title: 'Ошибка импорта', description: e?.data?.statusMessage || e?.message, color: 'red' })
  } finally {
    bulkUploading.value = false
  }
}
</script>

<template>
  <div class="admin-book-form flex flex-col h-full bg-white dark:bg-[#161618] overflow-hidden relative">
    
    <!-- Top info bar / header -->
    <header class="workspace-editor-header flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-[#1a1a1c]">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-base font-bold text-gray-900 dark:text-white">
            {{ isNewBook ? 'Создание новой книги' : form.title || 'Редактор книги' }}
          </h2>
          <div v-if="!isNewBook && projectId" class="flex items-center gap-1.5 shrink-0">
            <span 
              class="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" 
              :class="allTranslatedEn 
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' 
                : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'"
              :title="allTranslatedEn ? 'English: Все главы переведены' : 'English: Не все главы переведены'"
            >
              EN
            </span>
            <span 
              class="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" 
              :class="allTranslatedRu 
                ? 'bg-sky-500/10 text-sky-600 border border-sky-500/30' 
                : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'"
              :title="allTranslatedRu ? 'Русский: Все главы переведены' : 'Русский: Не все главы переведены'"
            >
              RU
            </span>
            <span 
              class="px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider" 
              :class="allTranslatedZh 
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' 
                : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'"
              :title="allTranslatedZh ? '中文: Все главы переведены' : '中文: Не все главы переведены'"
            >
              ZH
            </span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-0.5">
          {{ isNewBook ? 'Заполните метаданные для начала' : `ID Книги: #${bookId} · URL: /books/${form.slug}` }}
        </p>
      </div>

      <!-- Navigation tabs -->
      <div v-if="!isNewBook" class="flex gap-1 bg-gray-150 dark:bg-zinc-800 p-1 rounded-xl">
        <button
          type="button"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
          :class="activeTab === 'metadata' ? 'bg-white dark:bg-zinc-700 shadow-sm text-sky-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'"
          @click="activeTab = 'metadata'"
        >
          Метаданные
        </button>
        <button
          type="button"
          class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
          :class="activeTab === 'structure' ? 'bg-white dark:bg-zinc-700 shadow-sm text-sky-500' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'"
          @click="activeTab = 'structure'"
        >
          Структура глав
        </button>
      </div>
    </header>

    <!-- Scrollable container for forms -->
    <div class="flex-1 overflow-y-auto p-6 min-h-0 bg-[#fafafa] dark:bg-[#111113]">
      <div v-if="loadingBook" class="flex flex-col items-center justify-center py-20 opacity-60">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-sky-500 mb-2" />
        <p class="text-sm">Загрузка информации о книге...</p>
      </div>

      <!-- TAB 1: METADATA -->
      <div v-else-if="activeTab === 'metadata'" class="space-y-6 max-w-4xl mx-auto">
        <form @submit.prevent="saveMetadata" class="space-y-6">
          <div class="p-6 bg-white dark:bg-[#1a1a1c] border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Локализованная информация</h3>
            
            <div class="lang-tabs flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-3 mb-5">
              <button
                v-for="l in (['en', 'ru', 'zh'] as const)"
                :key="l"
                type="button"
                class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-all"
                :class="activeLangTab === l 
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-500'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'"
                @click="activeLangTab = l"
              >
                {{ l === 'en' ? '🇬🇧 EN' : l === 'ru' ? '🇷🇺 RU' : '🇨🇳 ZH' }}
              </button>
            </div>

            <!-- EN fields -->
            <div v-if="activeLangTab === 'en'" class="space-y-4">
              <UFormGroup label="Название книги (English) *" required>
                <UInput v-model="form.title" placeholder="e.g. Core System Architecture" size="lg" />
              </UFormGroup>
              <UFormGroup label="Описание (English)">
                <UTextarea v-model="form.description" :rows="4" placeholder="Description of the book content..." />
              </UFormGroup>
            </div>

            <!-- RU fields -->
            <div v-if="activeLangTab === 'ru'" class="space-y-4">
              <UFormGroup label="Название книги (Русский)">
                <UInput v-model="form.title_ru" placeholder="например, Архитектура базовой системы" size="lg" />
              </UFormGroup>
              <UFormGroup label="Описание (Русский)">
                <UTextarea v-model="form.description_ru" :rows="4" placeholder="Краткое описание содержания книги..." />
              </UFormGroup>
            </div>

            <!-- ZH fields -->
            <div v-if="activeLangTab === 'zh'" class="space-y-4">
              <UFormGroup label="Название книги (中文)">
                <UInput v-model="form.title_zh" placeholder="例如，核心系统架构" size="lg" />
              </UFormGroup>
              <UFormGroup label="Описание (中文)">
                <UTextarea v-model="form.description_zh" :rows="4" placeholder="图书内容简要介绍..." />
              </UFormGroup>
            </div>
          </div>

          <div class="p-6 bg-white dark:bg-[#1a1a1c] border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <UFormGroup label="URL Slug *" required help="Уникальный идентификатор книги в адресной строке">
                <div class="flex items-center gap-2">
                  <UInput v-model="form.slug" class="flex-1" :disabled="!isNewBook" />
                  <UCheckbox v-if="isNewBook" v-model="syncSlug" label="Синхрон." class="text-xs shrink-0" />
                </div>
              </UFormGroup>

              <UFormGroup label="Категории / Рубрики">
                <USelectMenu
                  v-model="form.category_ids"
                  :options="categories"
                  multiple
                  value-attribute="id"
                  option-attribute="title"
                  searchable
                  placeholder="Выберите категории..."
                />
              </UFormGroup>

              <UFormGroup label="Позиция в каталоге книг" help="Укажите, в какое место списка поместить эту книгу">
                <USelectMenu
                  v-model="sortPosition"
                  :options="sortPositionOptions"
                  value-attribute="value"
                  option-attribute="label"
                  placeholder="Выберите позицию..."
                />
              </UFormGroup>
            </div>

            <div class="space-y-4">
              <UFormGroup label="Обложка книги" help="Используется в каталоге книг на сайте">
                <AdminMediaPicker
                  v-model="form.cover_image"
                  upload-endpoint="/api/admin/uploads/cover"
                  accept="image/*"
                />
              </UFormGroup>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <GvButton
              type="submit"
              color="sky"
              size="lg"
              :loading="savingMetadata"
              icon="i-heroicons-check"
              class="rounded-xl px-8"
            >
              Сохранить метаданные
            </GvButton>
          </div>
        </form>
      </div>

      <!-- TAB 2: STRUCTURE (SKELETON & IMPORTS) -->
      <div v-else-if="activeTab === 'structure'" class="space-y-6">
        
        <!-- CASE A: Structure project is NOT initialized yet -->
        <div v-if="!projectId" class="max-w-2xl mx-auto space-y-6 py-8">
          <!-- Notice if book has articles in db but no project structure -->
          <div v-if="existingArticlesCount > 0" class="p-6 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-2xl text-amber-500 shrink-0" />
              <div>
                <div class="text-sm font-bold text-gray-900 dark:text-white">Найдено существующих статей: {{ existingArticlesCount }}</div>
                <div class="text-xs text-gray-500 mt-0.5">В базе данных есть главы для этой книги, но скелет структуры не создан. Вы можете перенести их в скелет.</div>
              </div>
            </div>
            <GvButton color="sky" size="sm" icon="i-heroicons-wrench-screwdriver" @click="generateSkeletonFromExisting">Собрать структуру</GvButton>
          </div>

          <div class="text-center p-8 bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mb-4">
              <UIcon name="i-heroicons-swatch" class="text-3xl" />
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white">Структура глав не создана</h3>
            <p class="text-xs text-gray-500 mt-2 max-w-md mx-auto">
              Чтобы наполнять книгу контентом и подгружать файлы глав, нужно задать её структуру. Вы можете накидать главы вручную или импортировать структуру из ODM мастер-файла.
            </p>
            
            <div class="mt-6 flex flex-wrap justify-center gap-4">
              <GvButton
                color="sky"
                variant="solid"
                icon="i-heroicons-pencil-square"
                @click="initStructureManually"
              >
                Создать структуру вручную
              </GvButton>
            </div>
          </div>

          <div class="p-6 bg-white dark:bg-[#1a1a1c] border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-arrow-up-tray" />
              Или импортировать из ODM мастер-документа
            </h4>
            <p class="text-xs text-gray-500">
              Загрузите файл оглавления `.odm`, чтобы система автоматически создала скелет книги по ссылкам на главы.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <UFormGroup label="EN ODM">
                <input
                  type="file"
                  accept=".odm"
                  class="text-xs block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 dark:file:bg-zinc-800 dark:file:text-zinc-300 cursor-pointer"
                  @change="(e: any) => masterFileEn = e.target.files?.[0] || null"
                />
              </UFormGroup>
              <UFormGroup label="RU ODM">
                <input
                  type="file"
                  accept=".odm"
                  class="text-xs block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 dark:file:bg-zinc-800 dark:file:text-zinc-300 cursor-pointer"
                  @change="(e: any) => masterFileRu = e.target.files?.[0] || null"
                />
              </UFormGroup>
              <UFormGroup label="ZH ODM">
                <input
                  type="file"
                  accept=".odm"
                  class="text-xs block w-full text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 dark:file:bg-zinc-800 dark:file:text-zinc-300 cursor-pointer"
                  @change="(e: any) => masterFileZh = e.target.files?.[0] || null"
                />
              </UFormGroup>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-zinc-800">
              <UFormGroup label="Разбивать главы по заголовкам" help="Split Level для оглавления">
                <select v-model="splitLevel" class="gv-admin-filter-select w-full min-h-[38px] text-xs">
                  <option value="none">Не разбивать (одна статья на файл)</option>
                  <option value="h1">По заголовкам H1</option>
                  <option value="h2">По заголовкам H2</option>
                </select>
              </UFormGroup>
              <UFormGroup label="Исходный язык книги" help="Content Locale">
                <select v-model="odmContentLocale" class="gv-admin-filter-select w-full min-h-[38px] text-xs">
                  <option value="en">English (EN)</option>
                  <option value="ru">Русский (RU)</option>
                  <option value="zh">中文 (ZH)</option>
                </select>
              </UFormGroup>
            </div>

            <div class="flex justify-end pt-2">
              <GvButton
                color="sky"
                size="sm"
                icon="i-heroicons-arrow-up-tray"
                :loading="loadingMaster"
                :disabled="!masterFileEn && !masterFileRu && !masterFileZh"
                @click="initStructureOdm"
              >
                Разобрать ODM и создать скелет
              </GvButton>
            </div>
          </div>
        </div>

        <!-- CASE B: Structure exists -->
        <div v-else class="space-y-6">
          
          <!-- Structure Controls / Stats Toolbar -->
          <div class="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-[#1a1a1c] border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-sm shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <UIcon name="i-heroicons-circle-stack" class="text-xl" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wide">Проект структуры</h4>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-sm font-black text-gray-900 dark:text-white">ID #{{ projectId }}</span>
                  <span class="text-xs text-gray-400">·</span>
                  <span class="text-xs font-medium text-gray-500">Глав всего: {{ parts.length }}</span>
                </div>
              </div>
            </div>

            <!-- Toolbar buttons -->
            <div class="flex flex-wrap items-center gap-2">
              <GvButton
                color="sky"
                variant="soft"
                size="sm"
                icon="i-heroicons-plus"
                @click="addChapterSlot"
              >
                Добавить главу
              </GvButton>

              <GvButton
                color="sky"
                variant="soft"
                size="sm"
                icon="i-heroicons-link"
                @click="openLinkArticleModal"
              >
                Добавить из существующих
              </GvButton>

              <GvButton
                color="gray"
                variant="soft"
                size="sm"
                icon="i-heroicons-folder-open"
                @click="showBulkPanel = !showBulkPanel"
              >
                Массовый импорт
              </GvButton>

              <UDropdown :items="toolsDropdownItems">
                <GvButton color="gray" variant="soft" size="sm" icon="i-heroicons-cog-8-tooth">Инструменты</GvButton>
              </UDropdown>
            </div>
          </div>

          <!-- Bulk Upload Collapsible Panel -->
          <div v-if="showBulkPanel" class="p-6 bg-white dark:bg-[#1a1a1c] border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 transition-all">
            <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">Пакетный импорт файлов .odt</h4>
            <p class="text-xs text-gray-500">
              Перетащите файлы глав `.odt`. Система сопоставит их по именам с файлами в слотах (например, `chapter-1.odt` к первой главе).
            </p>

            <div 
              class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
              :class="bulkDragging ? 'border-sky-500 bg-sky-500/5' : 'border-gray-300 hover:border-sky-400 dark:border-zinc-800'"
              @dragover.prevent="bulkDragging = true"
              @dragleave="bulkDragging = false"
              @drop.prevent="e => { bulkDragging = false; if (e.dataTransfer?.files) handleBulkFiles(e.dataTransfer.files) }"
              @click="() => bulkInputRef?.click()"
            >
              <input
                ref="bulkInputRef"
                type="file"
                multiple
                accept=".odt"
                class="sr-only"
                @change="onBulkFileSelect"
              />
              <UIcon name="i-heroicons-cloud-arrow-up" class="text-3xl text-gray-400 mb-2" />
              <p class="text-xs font-bold text-gray-600 dark:text-gray-300">Нажмите для выбора или перетащите файлы .odt сюда</p>
            </div>

            <!-- Matched Files List -->
            <div v-if="bulkMatchedFiles.length > 0" class="space-y-2">
              <div v-for="m in bulkMatchedFiles" :key="m.filename" class="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-zinc-800/30 text-xs">
                <span class="font-mono text-[10px] truncate max-w-[200px]" :title="m.filename">{{ m.filename }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span v-if="m.matchedPart" class="text-green-500 font-bold">
                    Сопоставлено: #{{ m.matchedPart.sort_order }} ({{ m.matchedLang?.toUpperCase() }})
                  </span>
                  <span v-else class="text-red-500 font-bold">Не сопоставлен</span>
                </div>
              </div>

              <div class="flex justify-end gap-3 pt-2">
                <GvButton color="gray" variant="ghost" size="xs" @click="bulkFiles = []">Сбросить</GvButton>
                <GvButton color="sky" size="xs" :loading="bulkUploading" @click="runBulkOdtImport">Запустить импорт ({{ bulkFiles.length }})</GvButton>
              </div>
            </div>
          </div>

          <!-- Slots / Chapters List -->
          <div class="bg-white dark:bg-[#1a1a1c] border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 dark:bg-[#202022]/50 border-b border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <th class="py-3 px-4 w-12 text-center">Сорт.</th>
                  <th class="py-3 px-2 w-12 text-center">#</th>
                  <th class="py-3 px-4">Заголовок главы (EN / RU / ZH)</th>
                  <th class="py-3 px-4 w-32">Статус</th>
                  <th class="py-3 px-4 w-72">Файлы .odt (EN / RU / ZH)</th>
                  <th class="py-3 px-4 w-28 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(part, index) in parts" 
                  :key="part.id"
                  class="border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-800/20 transition-all text-xs"
                  :class="{ 
                    'opacity-40 bg-zinc-100/30 dark:bg-zinc-900/10': !part.is_enabled,
                    'border-2 border-sky-400': dragOverIndex === index
                  }"
                  :draggable="true"
                  @dragstart="handleDragStart(index)"
                  @dragover.prevent
                  @dragenter="handleDragEnter(index)"
                  @dragend="handleDragEnd"
                  @drop="handleDrop(index)"
                >
                  <!-- Sorting Drag Handle -->
                  <td class="py-3 px-4 text-center text-gray-400 cursor-grab active:cursor-grabbing">
                    <UIcon name="i-heroicons-bars-2" class="text-sm" />
                  </td>

                  <!-- Number index -->
                  <td class="py-3 px-2 text-center font-bold text-gray-500">
                    #{{ part.sort_order }}
                  </td>

                  <!-- Chapter Titles -->
                  <td class="py-3 px-4 space-y-1">
                    <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1 rounded uppercase">EN</span>
                      {{ part.display_title || '— Без заголовка —' }}
                    </div>
                    <div class="text-gray-500 flex items-center gap-1.5">
                      <span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1 rounded uppercase">RU</span>
                      {{ part.display_title_ru || '— Не переведено —' }}
                    </div>
                    <div class="text-gray-500 flex items-center gap-1.5">
                      <span class="text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1 rounded uppercase">ZH</span>
                      {{ part.display_title_zh || '— Не переведено —' }}
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="py-3 px-4">
                    <span 
                      v-if="part.status === 'pending'"
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      Ожидает
                    </span>
                    <span 
                      v-else-if="part.status === 'imported'"
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    >
                      Импорт.
                    </span>
                    <span 
                      v-else
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    >
                      Ошибка
                    </span>
                  </td>

                  <!-- Files uploading ODT pills -->
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <!-- Input elements (hidden) -->
                      <input
                        :id="`part-odt-input-${part.id}-en`"
                        type="file"
                        accept=".odt"
                        class="sr-only"
                        @change="e => handlePartOdtFileChange(part.id, 'en', e)"
                      />
                      <input
                        :id="`part-odt-input-${part.id}-ru`"
                        type="file"
                        accept=".odt"
                        class="sr-only"
                        @change="e => handlePartOdtFileChange(part.id, 'ru', e)"
                      />
                      <input
                        :id="`part-odt-input-${part.id}-zh`"
                        type="file"
                        accept=".odt"
                        class="sr-only"
                        @change="e => handlePartOdtFileChange(part.id, 'zh', e)"
                      />

                      <!-- EN Pill -->
                      <div class="flex items-center">
                        <button
                          type="button"
                          class="px-2 py-1 rounded-l text-[10px] font-bold uppercase"
                          :class="part.has_translation_en 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-gray-100 text-gray-500 hover:bg-sky-500 hover:text-white dark:bg-zinc-800 dark:text-zinc-400'"
                          @click="triggerPartOdtUpload(part.id, 'en')"
                          :disabled="uploadingPartId === part.id"
                        >
                          EN
                        </button>
                        <button
                          v-if="part.has_translation_en"
                          type="button"
                          class="px-1.5 py-1 bg-emerald-600 text-white rounded-r hover:bg-red-500 hover:text-white transition-colors"
                          @click="clearSlotOdt(part.id, 'en')"
                          title="Сбросить EN"
                          :disabled="clearingPartId === part.id"
                        >
                          <UIcon name="i-heroicons-x-mark" />
                        </button>
                      </div>

                      <!-- RU Pill (Only if EN uploaded) -->
                      <div class="flex items-center">
                        <button
                          type="button"
                          class="px-2 py-1 rounded-l text-[10px] font-bold uppercase"
                          :class="part.has_translation_ru 
                            ? 'bg-sky-500 text-white' 
                            : 'bg-gray-100 text-gray-500 hover:bg-sky-500 hover:text-white dark:bg-zinc-800 dark:text-zinc-400'"
                          :disabled="!part.has_translation_en || uploadingPartId === part.id"
                          @click="triggerPartOdtUpload(part.id, 'ru')"
                        >
                          RU
                        </button>
                        <button
                          v-if="part.has_translation_ru"
                          type="button"
                          class="px-1.5 py-1 bg-sky-600 text-white rounded-r hover:bg-red-500 hover:text-white transition-colors"
                          @click="clearSlotOdt(part.id, 'ru')"
                          title="Сбросить RU"
                          :disabled="clearingPartId === part.id"
                        >
                          <UIcon name="i-heroicons-x-mark" />
                        </button>
                      </div>

                      <!-- ZH Pill (Only if EN uploaded) -->
                      <div class="flex items-center">
                        <button
                          type="button"
                          class="px-2 py-1 rounded-l text-[10px] font-bold uppercase"
                          :class="part.has_translation_zh 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-gray-100 text-gray-500 hover:bg-sky-500 hover:text-white dark:bg-zinc-800 dark:text-zinc-400'"
                          :disabled="!part.has_translation_en || uploadingPartId === part.id"
                          @click="triggerPartOdtUpload(part.id, 'zh')"
                        >
                          ZH
                        </button>
                        <button
                          v-if="part.has_translation_zh"
                          type="button"
                          class="px-1.5 py-1 bg-amber-600 text-white rounded-r hover:bg-red-500 hover:text-white transition-colors"
                          @click="clearSlotOdt(part.id, 'zh')"
                          title="Сбросить ZH"
                          :disabled="clearingPartId === part.id"
                        >
                          <UIcon name="i-heroicons-x-mark" />
                        </button>
                      </div>

                    </div>
                  </td>

                  <!-- Row Actions -->
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <GvButton
                        icon="i-heroicons-pencil-square"
                        variant="ghost"
                        color="gray"
                        size="xs"
                        title="Редактировать заголовки"
                        @click="openEditSlotModal(part)"
                      />
                      <GvButton
                        v-if="part.status === 'imported' && getImportedArticleId(part)"
                        icon="i-heroicons-document-text"
                        variant="ghost"
                        color="indigo"
                        size="xs"
                        title="Редактировать саму статью"
                        @click="openArticleEditor(getImportedArticleId(part)!)"
                      />
                      <GvButton
                        v-if="part.status === 'pending'"
                        :icon="part.is_enabled ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                        variant="ghost"
                        :color="part.is_enabled ? 'gray' : 'red'"
                        size="xs"
                        :title="part.is_enabled ? 'Исключить из импорта' : 'Включить в импорт'"
                        @click="toggleSlotEnabled(part)"
                      />
                      <GvButton
                        icon="i-heroicons-trash"
                        variant="ghost"
                        color="red"
                        size="xs"
                        title="Удалить главу"
                        @click="deleteChapterSlot(part.id)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Slot Titles Modal -->
    <UModal v-model="isEditSlotModalOpen" :ui="{ width: 'sm:max-w-lg' }">
      <div class="p-6 bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl space-y-6">
        <div>
          <h3 class="text-base font-bold text-gray-900 dark:text-white">Редактирование названий главы</h3>
          <p class="text-xs text-gray-500 mt-1">Определите названия главы на разных языках.</p>
        </div>

        <div class="space-y-4">
          <UFormGroup label="Заголовок EN (English) *" required>
            <UInput v-model="slotTitleForm.display_title" />
          </UFormGroup>
          <UFormGroup label="Заголовок RU (Русский)">
            <UInput v-model="slotTitleForm.display_title_ru" />
          </UFormGroup>
          <UFormGroup label="Заголовок ZH (中文)">
            <UInput v-model="slotTitleForm.display_title_zh" />
          </UFormGroup>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <GvButton color="gray" variant="soft" @click="isEditSlotModalOpen = false">Отмена</GvButton>
          <GvButton color="sky" :loading="savingSlotTitles" @click="saveSlotTitles">Сохранить</GvButton>
        </div>
      </div>
    </UModal>
    <!-- Link Existing Article Modal -->
    <UModal v-model="isLinkArticleModalOpen" :ui="{ width: 'sm:max-w-xl' }">
      <div class="p-6 bg-white dark:bg-[#1a1a1c] border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col h-[70vh]">
        <div>
          <h3 class="text-base font-bold text-gray-900 dark:text-white">Добавить главу из существующей статьи</h3>
          <p class="text-xs text-gray-500 mt-1">Выберите статью из базы данных для привязки в качестве новой главы.</p>
        </div>

        <div class="mt-4 shrink-0">
          <BaseSearch v-model="articleSearchQuery" placeholder="Поиск по статьям..." />
        </div>

        <div class="flex-1 overflow-y-auto mt-4 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-zinc-800 min-h-0 bg-gray-50 dark:bg-zinc-900/30">
          <div v-if="loadingArticles" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
          </div>
          <div v-else-if="articlesList.length === 0" class="p-8 text-center text-gray-400 text-xs">
            Ничего не найдено
          </div>
          <div 
            v-else
            v-for="art in articlesList" 
            :key="art.id"
            class="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-start gap-3 transition-colors"
            :class="{ 'bg-sky-500/10 hover:bg-sky-500/15': selectedArticleForLink?.id === art.id }"
            @click="selectedArticleForLink = art"
          >
            <UIcon name="i-heroicons-document" class="text-lg text-gray-400 mt-0.5 shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-gray-900 dark:text-white truncate">{{ art.title }}</div>
              <div class="text-[10px] text-gray-400 truncate mt-0.5" v-if="art.book_title">Книга: {{ art.book_title }}</div>
              <div class="text-[10px] text-gray-500 truncate" v-else>Без книги</div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 shrink-0">
          <GvButton color="gray" variant="soft" @click="isLinkArticleModalOpen = false">Отмена</GvButton>
          <GvButton color="sky" :disabled="!selectedArticleForLink" @click="linkExistingArticle">Привязать</GvButton>
        </div>
      </div>
    </UModal>

    <!-- Fullscreen Article Editor Overlay -->
    <div 
      v-if="isArticleEditorOpen" 
      class="fixed inset-0 z-50 bg-white dark:bg-[#111113] flex flex-col"
    >
      <header class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-[#161618]">
        <div class="flex items-center gap-2">
          <GvButton 
            variant="ghost" 
            color="gray" 
            icon="i-heroicons-arrow-left" 
            @click="isArticleEditorOpen = false"
          >
            Назад к книге
          </GvButton>
          <span class="text-sm font-bold text-gray-900 dark:text-white">Редактирование статьи</span>
        </div>
      </header>
      <div class="flex-1 overflow-y-auto">
        <AdminArticleForm
          v-if="activeArticleIdForEdit"
          :article-id="activeArticleIdForEdit"
          @article-saved="async () => { await fetchProjectDetails(); isArticleEditorOpen = false; }"
        />
      </div>
    </div>

  </div>
</template>
