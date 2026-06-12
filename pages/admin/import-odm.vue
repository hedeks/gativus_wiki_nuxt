<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: 'Книга из ODM — Gativus Admin' })

const store = userStore()
const toast = useToast()
const { goBack } = useAdminHistory()

const { data: booksData /* , refresh: refreshBooks */ } = await useFetch('/api/books', { headers: store.getAuthHeader() })
const { data: categoriesData } = await useFetch('/api/categories', { headers: store.getAuthHeader() })
const books = computed(() => (booksData.value || []) as any[])
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value as any[]
  return []
})

type BookMode = 'existing' | 'new'
const bookMode = ref<BookMode>('existing')
const selectedBookId = ref<number | null>(null)
const selectedCategoryId = ref<number | null>(null)
const splitLevel = ref<'none' | 'h1' | 'h2'>('none')
const odmContentLocale = ref<'ru' | 'en' | 'zh'>('ru')

const newBookForm = reactive({
  title: '',
  title_ru: '',
  title_zh: '',
  slug: '',
  description: '',
  description_ru: '',
  description_zh: '',
  sort_order: 0,
  category_ids: [] as number[],
  cover_image: '',
})

const masterFileEn = ref<File | null>(null)
const masterFileRu = ref<File | null>(null)
const masterFileZh = ref<File | null>(null)
const masterFileEnInputRef = ref<HTMLInputElement | null>(null)
const masterFileRuInputRef = ref<HTMLInputElement | null>(null)
const masterFileZhInputRef = ref<HTMLInputElement | null>(null)
const hasAnyMasterFile = computed(() => !!(masterFileEn.value || masterFileRu.value || masterFileZh.value))

const projectId = ref<number | null>(null)
const projectBookId = ref<number | null>(null)
const parts = ref<any[]>([])
const loadingMaster = ref(false)
const uploadingPartId = ref<number | null>(null)
const clearingPartId = ref<number | null>(null)
const isDragging = ref(false)
const publishing = ref(false)
const publishConfirmOpen = ref(false)

const publishStats = reactive({ draft: 0, live: 0 })

/** Локальные правки названий слота до сохранения на сервер */
const titleDrafts = ref<Record<number, { display_title?: string; display_title_ru?: string; display_title_zh?: string }>>({})
const savingTitlesPartId = ref<number | null>(null)
const editingPartId = ref<number | null>(null)

function startEditing(p: any) {
  editingPartId.value = p.id
  if (!titleDrafts.value[p.id]) {
    titleDrafts.value[p.id] = {}
  }
  if (titleDrafts.value[p.id].display_title === undefined) {
    titleDrafts.value[p.id].display_title = p.display_title || ''
  }
  if (titleDrafts.value[p.id].display_title_ru === undefined) {
    titleDrafts.value[p.id].display_title_ru = p.display_title_ru || ''
  }
  if (titleDrafts.value[p.id].display_title_zh === undefined) {
    titleDrafts.value[p.id].display_title_zh = p.display_title_zh || ''
  }
}

// ─── Enrich locale (дополнительный ODM для другого языка) ───
const enrichLocale = ref<'ru' | 'en' | 'zh'>('ru')
const enrichFile = ref<File | null>(null)
const enrichFileInputRef = ref<HTMLInputElement | null>(null)
const enriching = ref(false)

function onEnrichSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    const f = input.files[0]
    if (!f.name.toLowerCase().endsWith('.odm')) {
      toast.add({ title: 'Нужен файл .odm', color: 'red' })
      return
    }
    enrichFile.value = f
  }
}

async function runEnrichLocale() {
  if (!projectId.value || !enrichFile.value) return
  enriching.value = true
  try {
    const fd = new FormData()
    fd.append('file', enrichFile.value)
    fd.append('locale', enrichLocale.value)
    const res = await $fetch<{ updatedCount: number; totalSlots: number }>(`/api/import/odm/project/${projectId.value}/enrich-locale`, {
      method: 'POST',
      body: fd,
      headers: store.getAuthHeader(),
    })
    enrichFile.value = null
    await refreshProject()
    toast.add({
      title: 'Названия обновлены',
      description: `Обновлено ${res.updatedCount} из ${res.totalSlots} слотов (${enrichLocale.value.toUpperCase()}).`,
      color: 'green',
    })
  }
  catch (e: any) {
    toast.add({ title: 'Ошибка обогащения', description: e?.data?.statusMessage || e?.message, color: 'red' })
  }
  enriching.value = false
}

// ─── Bulk ODT upload ───
const bulkFiles = ref<File[]>([])
const bulkFileInputRef = ref<HTMLInputElement | null>(null)
const bulkDragging = ref(false)
const bulkUploading = ref(false)
const bulkHeadingLocale = ref<'ru' | 'en' | 'zh' | 'none' | ''>('')
const bulkChapterStart = ref(1)

interface MatchedOdtFile {
  file: File
  filename: string
  matchedPart: any | null
  matchedLang: 'en' | 'ru' | 'zh' | null
}

const bulkMatchedFiles = computed<MatchedOdtFile[]>(() => {
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
      if (bnRu && bnRu === fileBn) {
        matchedPart = p
        matchedLang = 'ru'
        break
      }
      if (bnZh && bnZh === fileBn) {
        matchedPart = p
        matchedLang = 'zh'
        break
      }
    }

    return {
      file,
      filename: file.name,
      matchedPart,
      matchedLang,
    }
  })
})

const hasUnmatchedBulkFiles = computed(() => bulkMatchedFiles.value.some(m => !m.matchedPart))

function handleBulkFiles(files: FileList | File[]) {
  const odtFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.odt'))
  if (!odtFiles.length) {
    toast.add({ title: 'Нужны файлы .odt', color: 'red' })
    return
  }
  bulkFiles.value = odtFiles
}

function onBulkSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) handleBulkFiles(input.files)
}

function onBulkDragOver(e: DragEvent) { e.preventDefault(); bulkDragging.value = true }
function onBulkDragLeave() { bulkDragging.value = false }
function onBulkDrop(e: DragEvent) {
  e.preventDefault(); bulkDragging.value = false
  if (e.dataTransfer?.files?.length) handleBulkFiles(e.dataTransfer.files)
}

async function runBulkOdt() {
  if (!projectId.value || !bulkFiles.value.length) return
  if (hasUnmatchedBulkFiles.value) {
    if (!confirm('Некоторые файлы не сопоставлены со структурой ODM. Они будут пропущены при импорте. Продолжить?')) {
      return
    }
  }
  bulkUploading.value = true
  try {
    const fd = new FormData()
    if (bulkHeadingLocale.value) fd.append('heading_locale', bulkHeadingLocale.value)
    fd.append('chapter_start', String(bulkChapterStart.value))
    for (const f of bulkFiles.value) fd.append('files', f, f.name)
    const res = await $fetch<{ matched: number; created: number; updated: number; skipped: number }>(`/api/import/odm/project/${projectId.value}/bulk-odt`, {
      method: 'POST',
      body: fd,
      headers: store.getAuthHeader(),
    })
    bulkFiles.value = []
    titleDrafts.value = {}
    await refreshProject()
    let skippedMsg = ''
    if (res.skipped > 0) {
      skippedMsg = ` (Пропущено: ${res.skipped})`
    }
    toast.add({
      title: 'Массовый импорт завершён',
      description: `Создано: ${res.created} · Обновлено: ${res.updated}${skippedMsg}`,
      color: 'primary',
    })
  }
  catch (e: any) {
    toast.add({ title: 'Ошибка массового импорта', description: e?.data?.statusMessage || e?.message, color: 'red' })
  }
  bulkUploading.value = false
}

const route = useRoute()
watch(books, (list) => {
  if (bookMode.value === 'existing' && selectedBookId.value == null && list.length > 0) {
    const qId = Number(route.query.bookId)
    if (qId && list.some(b => Number(b.id) === qId)) {
      selectedBookId.value = qId
    } else {
      selectedBookId.value = Number(list[0].id)
    }
  }
}, { immediate: true })

function partTitleField(p: any, key: 'display_title' | 'display_title_ru' | 'display_title_zh'): string {
  const d = titleDrafts.value[p.id]?.[key]
  if (d !== undefined)
    return d
  const raw = p[key]
  return raw == null ? '' : String(raw)
}

function setTitleDraft(partId: number, key: 'display_title' | 'display_title_ru' | 'display_title_zh', val: string) {
  titleDrafts.value = {
    ...titleDrafts.value,
    [partId]: { ...titleDrafts.value[partId], [key]: val },
  }
}

async function saveSlotTitles(partId: number) {
  const p = parts.value.find((x: any) => x.id === partId)
  if (!p || p.status !== 'pending' || !projectId.value)
    return
  const d = titleDrafts.value[partId] || {}
  const display_title = (d.display_title ?? p.display_title)?.trim()
  if (!display_title) {
    toast.add({
      title: 'Укажите заголовок EN',
      description: 'Он задаёт title статьи и основной slug для ссылки.',
      color: 'red',
    })
    return
  }
  savingTitlesPartId.value = partId
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${partId}`, {
      method: 'PATCH',
      headers: store.getAuthHeader(),
      body: {
        display_title,
        display_title_ru: (d.display_title_ru ?? p.display_title_ru ?? '').trim() || null,
        display_title_zh: (d.display_title_zh ?? p.display_title_zh ?? '').trim() || null,
      },
    })
    const next = { ...titleDrafts.value }
    delete next[partId]
    titleDrafts.value = next
    editingPartId.value = null
    await refreshProject()
    toast.add({ title: 'Названия слота сохранены', color: 'green' })
  }
  catch (e: any) {
    toast.add({
      title: 'Не удалось сохранить',
      description: e?.data?.statusMessage || e?.message,
      color: 'red',
    })
  }
  savingTitlesPartId.value = null
}

async function refreshProject() {
  if (!projectId.value) return
  try {
    const res = await $fetch<{
      project: any
      parts: any[]
      stats?: { draft_article_count: number; live_article_count: number }
    }>(`/api/import/odm/project/${projectId.value}`, {
      headers: store.getAuthHeader(),
    })
    projectBookId.value = res.project?.book_id != null ? Number(res.project.book_id) : null
    parts.value = res.parts || []
    if (res.stats) {
      publishStats.draft = res.stats.draft_article_count
      publishStats.live = res.stats.live_article_count
    }
    else {
      publishStats.draft = 0
      publishStats.live = 0
    }
  }
  catch (e: any) {
    toast.add({ title: 'Не удалось загрузить проект', description: e?.data?.statusMessage || e?.message, color: 'red' })
  }
}

const enabledParts = computed(() => parts.value.filter((p: any) => Number(p.is_enabled ?? 1) === 1))
const importedCount = computed(() => enabledParts.value.filter((p: any) => p.status === 'imported').length)
const totalSlots = computed(() => enabledParts.value.length)
const allSlotsImported = computed(() => totalSlots.value > 0 && importedCount.value === totalSlots.value)

const canPublish = computed(() => allSlotsImported.value && publishStats.draft > 0)
const allPublished = computed(() => allSlotsImported.value && publishStats.draft === 0 && publishStats.live > 0)

async function togglePartEnabled(partId: number) {
  const p = parts.value.find((x: any) => x.id === partId)
  if (!p || p.status !== 'pending' || !projectId.value) return
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${partId}`, {
      method: 'PATCH',
      headers: store.getAuthHeader(),
      body: {
        is_enabled: Number(p.is_enabled ?? 1) !== 1,
      },
    })
    await refreshProject()
  }
  catch (e: any) {
    toast.add({
      title: 'Не удалось изменить выбор главы',
      description: e?.data?.statusMessage || e?.message,
      color: 'red',
    })
  }
}

async function createProject() {
  if (!hasAnyMasterFile.value) return
  if (bookMode.value === 'existing' && !selectedBookId.value) {
    toast.add({
      title: 'Выберите книгу',
      description: 'Импорт ODM доступен только в составе книги.',
      color: 'red',
    })
    return
  }
  if (bookMode.value === 'new' && !newBookForm.title.trim()) {
    toast.add({ title: 'Укажите название книги (EN)', color: 'red' })
    return
  }

  loadingMaster.value = true
  try {
    const options: Record<string, any> = {
      split_level: splitLevel.value,
      content_locale: odmContentLocale.value,
    }
    if (bookMode.value === 'existing') {
      options.book_id = selectedBookId.value
      options.category_id = selectedCategoryId.value
    }
    else {
      options.create_book = {
        title: newBookForm.title.trim(),
        title_ru: newBookForm.title_ru || undefined,
        title_zh: newBookForm.title_zh || undefined,
        slug: newBookForm.slug || undefined,
        description: newBookForm.description || undefined,
        description_ru: newBookForm.description_ru || undefined,
        description_zh: newBookForm.description_zh || undefined,
        sort_order: newBookForm.sort_order,
        category_ids: newBookForm.category_ids?.length ? newBookForm.category_ids : undefined,
        cover_image: newBookForm.cover_image || undefined,
      }
    }

    const fd = new FormData()
    if (masterFileEn.value) fd.append('file_en', masterFileEn.value)
    if (masterFileRu.value) fd.append('file_ru', masterFileRu.value)
    if (masterFileZh.value) fd.append('file_zh', masterFileZh.value)
    fd.append('options', JSON.stringify(options))
    const res = await $fetch<{ projectId: number; parts: any[]; book_id?: number | null }>('/api/import/odm/project', {
      method: 'POST',
      body: fd,
      headers: store.getAuthHeader(),
    })
    projectId.value = res.projectId
    projectBookId.value = res.book_id != null ? Number(res.book_id) : null
    await refreshProject()
    toast.add({
      title: 'Проект готов',
      description: `${res.parts?.length ?? 0} слотов. Статьи останутся черновиками до публикации.`,
      color: 'green',
    })
  }
  catch (e: any) {
    toast.add({
      title: 'Ошибка разбора ODM',
      description: e?.data?.statusMessage || e?.message,
      color: 'red',
    })
  }
  loadingMaster.value = false
}

function triggerPartUpload(partId: number, lang: 'en' | 'ru' | 'zh') {
  const el = document.getElementById(`part-input-${partId}-${lang}`)
  if (el) (el as HTMLInputElement).click()
}

async function handlePartFileChange(partId: number, lang: 'en' | 'ru' | 'zh', event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  await uploadPart(partId, lang, input.files)
  
  // Clear the input so the same file can be selected again if needed
  input.value = ''
}

async function uploadPart(partId: number, lang: 'en' | 'ru' | 'zh', fileList: FileList | null) {
  if (!fileList?.length || !projectId.value) return
  const file = fileList[0]
  if (!file.name.toLowerCase().endsWith('.odt')) {
    toast.add({ title: 'Для слота нужен .odt', color: 'red' })
    return
  }
  const p = parts.value.find((x: any) => x.id === partId)
  if (!p) return
  if (Number(p.is_enabled ?? 1) !== 1) {
    toast.add({
      title: 'Слот исключён из импорта',
      description: 'Включите слот, если хотите загрузить для него .odt.',
      color: 'red',
    })
    return
  }
  const d = titleDrafts.value[partId] || {}
  const display_title = String(d.display_title ?? p.display_title ?? '').trim()
  if (!display_title) {
    toast.add({
      title: 'Укажите заголовок EN',
      description: 'Он задаёт title статьи и основной slug.',
      color: 'red',
    })
    return
  }
  const display_title_ru = String(d.display_title_ru ?? p.display_title_ru ?? '').trim() || null
  const display_title_zh = String(d.display_title_zh ?? p.display_title_zh ?? '').trim() || null

  uploadingPartId.value = partId
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('titles', JSON.stringify({
      display_title,
      display_title_ru,
      display_title_zh,
    }))
    const res = await $fetch<{ imported: number }>(`/api/import/odm/project/${projectId.value}/part/${partId}?lang=${lang}`, {
      method: 'POST',
      body: fd,
      headers: store.getAuthHeader(),
    })
    const next = { ...titleDrafts.value }
    delete next[partId]
    titleDrafts.value = next
    toast.add({
      title: lang === 'en' ? (p.status === 'imported' ? 'Глава EN заменена' : 'Глава EN импортирована') : `Перевод ${lang.toUpperCase()} успешно импортирован`,
      description: `${res.imported} статей. На публичном графе знаний рёбра по терминам появятся после публикации сборки.`,
      color: 'primary',
    })
    await refreshProject()
  }
  catch (e: any) {
    toast.add({
      title: 'Ошибка импорта главы',
      description: e?.data?.statusMessage || e?.message,
      color: 'red',
    })
  }
  uploadingPartId.value = null
}

async function publishProject() {
  if (!projectId.value || !canPublish.value) return
  publishing.value = true
  try {
    const res = await $fetch<{ publishedCount: number; book_id: number | null }>(`/api/import/odm/project/${projectId.value}/publish`, {
      method: 'POST',
      headers: store.getAuthHeader(),
    })
    toast.add({
      title: 'Опубликовано',
      description: `${res.publishedCount} статей выведены на сайт.`,
      color: 'green',
    })
    publishConfirmOpen.value = false
    await refreshProject()
  }
  catch (e: any) {
    toast.add({
      title: 'Не удалось опубликовать',
      description: e?.data?.statusMessage || e?.message,
      color: 'red',
    })
  }
  publishing.value = false
}

async function clearSlotImport(partId: number, lang: 'en' | 'ru' | 'zh') {
  if (!projectId.value) return
  const label = lang.toUpperCase()
  const confirmationText = lang === 'en'
    ? 'Сбросить импорт этого слота и всех следующих? Черновики статей из этих слотов будут удалены из базы.'
    : `Сбросить перевод ${label} для этого слота и всех последующих? Переведенный контент будет очищен.`

  if (!confirm(confirmationText))
    return
  clearingPartId.value = partId
  try {
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${partId}/import?lang=${lang}`, {
      method: 'DELETE',
      headers: store.getAuthHeader(),
    })
    toast.add({ title: `Импорт ${label} сброшен`, color: 'green' })
    await refreshProject()
  }
  catch (e: any) {
    toast.add({
      title: 'Не удалось сбросить',
      description: e?.data?.statusMessage || e?.message,
      color: 'red',
    })
  }
  clearingPartId.value = null
}

async function resetFlow() {
  if (projectId.value) {
    const hasWork
      = importedCount.value > 0
        || publishStats.draft > 0
        || publishStats.live > 0
        || parts.value.some((x: any) => x.status === 'pending')
    if (hasWork) {
      const ok = confirm(
        'Удалить текущий проект ODM? Все черновики статей из этого импорта будут удалены. '
        + 'Если книга была создана только для этого проекта и в ней не останется статей — она тоже будет удалена. '
        + 'Если в проекте есть опубликованные статьи, удаление будет отклонено — сначала снимите их с публикации.',
      )
      if (!ok) return
    }
    try {
      await $fetch(`/api/import/odm/project/${projectId.value}`, {
        method: 'DELETE',
        headers: store.getAuthHeader(),
      })
      toast.add({ title: 'Проект удалён', color: 'green' })
    }
    catch (e: any) {
      toast.add({
        title: 'Не удалось удалить проект',
        description: e?.data?.statusMessage || e?.message,
        color: 'red',
      })
      return
    }
  }
  masterFileEn.value = null
  masterFileRu.value = null
  masterFileZh.value = null
  projectId.value = null
  projectBookId.value = null
  parts.value = []
  publishStats.draft = 0
  publishStats.live = 0
  titleDrafts.value = {}
}

function slotRowStatus(part: any) {
  if (part.status !== 'imported')
    return part.status
  const ap = part.articles_publish
  if (ap === 'published')
    return 'live'
  if (ap === 'draft')
    return 'draft'
  if (ap === 'mixed')
    return 'mixed'
  return 'imported'
}
</script>

<template>
  <div class="admin-page-stack import-odm-page admin-gv-skin">
    <header class="admin-dash-hero">
      <div class="hero-title-container">
        <UIcon name="i-heroicons-arrow-up-tray" class="hero-logo text-sky-500" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">Книга · Мастер-документ</p>
          <h1 class="hero-title">Импорт ODM</h1>
        </div>
      </div>
      <div class="cta-buttons admin-index-toolbar">
        <GvButton variant="soft" color="gray" size="sm" icon="i-heroicons-arrow-left" @click="goBack">
          Назад
        </GvButton>
        <GvButton v-if="projectBookId" :to="`/admin/books/${projectBookId}/edit`" variant="outline" color="sky" size="sm"
          icon="i-heroicons-book-open">
          Редактор книги
        </GvButton>
        <div class="flex-1" />
        <GvButton v-if="projectId" variant="ghost" color="gray" size="sm" icon="i-heroicons-arrow-path"
          @click="refreshProject">
          Обновить проект
        </GvButton>
      </div>
    </header>

    <!-- Project Info Banner (Top-level status summary) -->
    <div v-if="projectId" class="flex items-center justify-between p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-sky-500/10 text-sky-500">
          <UIcon name="i-heroicons-beaker" class="size-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">Проект #{{ projectId }}</h3>
          <p class="text-xs opacity-60">Активных глав: {{ totalSlots }} · Импортировано ODT: {{ importedCount }} из {{ totalSlots }}</p>
        </div>
      </div>
      <GvButton variant="ghost" color="red" size="sm" icon="i-heroicons-trash" @click="resetFlow">
        Удалить проект
      </GvButton>
    </div>

    <!-- Publication Status (Only when all slots uploaded) -->
    <section v-if="projectId && allSlotsImported" class="section-card publish-ready-card">
      <div class="card-body p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl" :class="allPublished ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'">
            <UIcon :name="allPublished ? 'i-heroicons-check-badge' : 'i-heroicons-eye-slash'" class="size-6" />
          </div>
          <div>
            <h3 class="text-sm font-bold">
              {{ allPublished ? 'Все материалы опубликованы' : `Черновики: ${publishStats.draft} · На сайте: ${publishStats.live}` }}
            </h3>
            <p class="text-xs opacity-60">
              {{ allPublished ? 'Все статьи этого проекта успешно выведены в общий доступ.' : 'Импорт завершен, но статьи не видны читателям. Опубликуйте их для вывода на сайт.' }}
            </p>
          </div>
        </div>
        <div v-if="!allPublished" class="flex gap-2">
          <GvButton color="sky" size="sm" icon="i-heroicons-rocket-launch" :disabled="!canPublish" @click="publishConfirmOpen = true">
            Опубликовать сборку
          </GvButton>
        </div>
      </div>
    </section>

    <!-- Project Creation Form (Hidden once project is active) -->
    <section v-if="!projectId" class="section-card">
      <header class="card-header">
        <span class="card-badge">ODM</span>
        <h2 class="card-header-title">Книга и мастер-документ</h2>
      </header>
      <div class="card-body space-y-6">
        <!-- Mode Switcher -->
        <div>
          <p class="gv-admin-eyebrow mb-3">Режим импорта</p>
          <div class="flex flex-wrap gap-2">
            <GvButton v-for="opt in ([
              { label: 'В существующую книгу', value: 'existing' as const, icon: 'i-heroicons-book-open' },
              { label: 'Создать новую книгу', value: 'new' as const, icon: 'i-heroicons-plus-circle' },
            ])" :key="opt.value" :variant="bookMode === opt.value ? 'solid' : 'outline'"
              :color="bookMode === opt.value ? 'sky' : 'gray'" size="sm" :icon="opt.icon" :disabled="!!projectId"
              @click="bookMode = opt.value">
              {{ opt.label }}
            </GvButton>
          </div>
        </div>

        <!-- Mode Specific Forms -->
        <div v-if="bookMode === 'existing'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormGroup label="Целевая книга *" help="Импорт ODM только в книгу — слоты станут её главами">
            <select v-model="selectedBookId" class="gv-admin-filter-select w-full min-h-[44px]" :disabled="!!projectId" required>
              <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
            </select>
          </UFormGroup>
          <UFormGroup label="Категория (Rubric)" help="Будет проставлена во все статьи">
            <select v-model="selectedCategoryId" class="gv-admin-filter-select w-full min-h-[44px]"
              :disabled="!!projectId">
              <option :value="null">— Без категории —</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.title }}</option>
            </select>
          </UFormGroup>
        </div>

        <div v-else class="space-y-6">
          <div class="p-6 rounded-2xl bg-black/5 dark:bg-white/5">
            <p class="gv-admin-eyebrow mb-6">Параметры новой книги</p>

            <div class="form-grid">
              <!-- Left Column: Localized Info -->
              <div class="form-column">
                <UTabs :items="[
                  { label: '🇬🇧 EN', slot: 'en' },
                  { label: '🇷🇺 RU', slot: 'ru' },
                  { label: '🇨🇳 ZH', slot: 'zh' }
                ]" class="w-full">
                  <template #en>
                    <div class="space-y-4 pt-4">
                      <UFormGroup label="Title (English)" required>
                        <UInput v-model="newBookForm.title" placeholder="Gativus: Core Concepts" size="lg"
                          :disabled="!!projectId" />
                      </UFormGroup>
                      <UFormGroup label="Description (English)">
                        <UTextarea v-model="newBookForm.description" :rows="4" placeholder="Brief summary..."
                          :disabled="!!projectId" />
                      </UFormGroup>
                    </div>
                  </template>
                  <template #ru>
                    <div class="space-y-4 pt-4">
                      <UFormGroup label="Заголовок (Русский)">
                        <UInput v-model="newBookForm.title_ru" placeholder="Gativus: Базовые концепции" size="lg"
                          :disabled="!!projectId" />
                      </UFormGroup>
                      <UFormGroup label="Описание (Русский)">
                        <UTextarea v-model="newBookForm.description_ru" :rows="4" placeholder="Краткое описание..."
                          :disabled="!!projectId" />
                      </UFormGroup>
                    </div>
                  </template>
                  <template #zh>
                    <div class="space-y-4 pt-4">
                      <UFormGroup label="标题 (中文)">
                        <UInput v-model="newBookForm.title_zh" placeholder="Gativus：核心概念" size="lg"
                          :disabled="!!projectId" />
                      </UFormGroup>
                      <UFormGroup label="描述 (中文)">
                        <UTextarea v-model="newBookForm.description_zh" :rows="4" placeholder="书의简要摘要..."
                          :disabled="!!projectId" />
                      </UFormGroup>
                    </div>
                  </template>
                </UTabs>

                <UFormGroup label="Slug (URL)" help="Оставьте пустым для автогенерации">
                  <UInput v-model="newBookForm.slug" placeholder="gativus-core-concepts" :disabled="!!projectId" />
                </UFormGroup>
              </div>

              <!-- Right Column: Meta Info -->
              <div class="form-column">
                <UFormGroup label="Обложка" help="Загрузите изображение для новой книги">
                  <AdminMediaPicker v-model="newBookForm.cover_image" upload-endpoint="/api/admin/uploads/cover"
                    :disabled="!!projectId" />
                </UFormGroup>

                <div class="dual-row">
                  <UFormGroup label="Порядок сортировки" class="flex-1">
                    <UInput v-model.number="newBookForm.sort_order" type="number" icon="i-heroicons-bars-3-center-left"
                      :disabled="!!projectId" />
                  </UFormGroup>
                </div>

                <UFormGroup label="Категории" help="Выберите рубрики">
                  <USelectMenu v-model="newBookForm.category_ids" :options="categories" value-attribute="id"
                    option-attribute="title" multiple placeholder="Выберите категории" searchable
                    :disabled="!!projectId" />
                </UFormGroup>
              </div>
            </div>
          </div>
        </div>

        <!-- Global Settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <UFormGroup label="Язык подписей глав" help="Нумерация в тексте и имена слотов по умолчанию">
            <div class="flex flex-wrap gap-2">
              <GvButton
                v-for="opt in ([
                  { label: 'RU · Глава', value: 'ru' as const },
                  { label: 'EN · Chapter', value: 'en' as const },
                  { label: 'ZH · 章', value: 'zh' as const },
                ])"
                :key="opt.value"
                :variant="odmContentLocale === opt.value ? 'solid' : 'outline'"
                :color="odmContentLocale === opt.value ? 'sky' : 'gray'"
                size="xs"
                :disabled="!!projectId"
                @click="odmContentLocale = opt.value"
              >
                {{ opt.label }}
              </GvButton>
            </div>
          </UFormGroup>

          <UFormGroup label="Режим разборки ODT" help="Разрезать ли главы на отдельные статьи">
            <div class="flex gap-2">
              <GvButton
                v-for="opt in ([{ label: 'Целиком', value: 'none' }, { label: 'По H1', value: 'h1' }, { label: 'По H2', value: 'h2' }] as const)"
                :key="opt.value" :variant="splitLevel === opt.value ? 'solid' : 'outline'"
                :color="splitLevel === opt.value ? 'sky' : 'gray'" size="xs" :disabled="!!projectId"
                @click="splitLevel = opt.value">
                {{ opt.label }}
              </GvButton>
            </div>
          </UFormGroup>
        </div>

        <!-- 3 ODM File Selectors -->
        <div v-if="!projectId" class="pt-4 space-y-6 border-t border-black/5 dark:border-white/5">
          <p class="gv-admin-eyebrow">Мастер-документы .odm (загрузите до 3 языковых версий)</p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- English ODM -->
            <div
              class="drop-zone gv-focusable !py-8"
              :style="masterFileEn ? 'border-color: var(--gv-primary); background: color-mix(in srgb, var(--gv-primary) 5%, var(--gv-surface-card))' : ''"
              @click="masterFileEnInputRef?.click()"
            >
              <div class="drop-zone-inner">
                <div class="p-3 rounded-full bg-sky-500/10 text-sky-500 mb-2">
                  <UIcon :name="masterFileEn ? 'i-heroicons-document-check' : 'i-heroicons-cloud-arrow-up'" class="size-8" />
                </div>
                <p class="text-sm font-bold">🇬🇧 English ODM</p>
                <p class="text-[11px] opacity-60 truncate max-w-full px-2 mt-1 mb-3">
                  {{ masterFileEn ? masterFileEn.name : 'Выбрать .odm' }}
                </p>
                <input
                  ref="masterFileEnInputRef"
                  type="file"
                  accept=".odm"
                  class="sr-only"
                  @change="masterFileEn = ($event.target as HTMLInputElement).files?.[0] || null"
                  @click.stop
                >
                <GvButton
                  v-if="masterFileEn"
                  type="button"
                  variant="ghost"
                  color="red"
                  size="xs"
                  icon="i-heroicons-trash"
                  @click.stop="masterFileEn = null"
                >
                  Удалить
                </GvButton>
              </div>
            </div>

            <!-- Russian ODM -->
            <div
              class="drop-zone gv-focusable !py-8"
              :style="masterFileRu ? 'border-color: var(--gv-primary); background: color-mix(in srgb, var(--gv-primary) 5%, var(--gv-surface-card))' : ''"
              @click="masterFileRuInputRef?.click()"
            >
              <div class="drop-zone-inner">
                <div class="p-3 rounded-full bg-sky-500/10 text-sky-500 mb-2">
                  <UIcon :name="masterFileRu ? 'i-heroicons-document-check' : 'i-heroicons-cloud-arrow-up'" class="size-8" />
                </div>
                <p class="text-sm font-bold">🇷🇺 Русский ODM</p>
                <p class="text-[11px] opacity-60 truncate max-w-full px-2 mt-1 mb-3">
                  {{ masterFileRu ? masterFileRu.name : 'Выбрать .odm' }}
                </p>
                <input
                  ref="masterFileRuInputRef"
                  type="file"
                  accept=".odm"
                  class="sr-only"
                  @change="masterFileRu = ($event.target as HTMLInputElement).files?.[0] || null"
                  @click.stop
                >
                <GvButton
                  v-if="masterFileRu"
                  type="button"
                  variant="ghost"
                  color="red"
                  size="xs"
                  icon="i-heroicons-trash"
                  @click.stop="masterFileRu = null"
                >
                  Удалить
                </GvButton>
              </div>
            </div>

            <!-- Chinese ODM -->
            <div
              class="drop-zone gv-focusable !py-8"
              :style="masterFileZh ? 'border-color: var(--gv-primary); background: color-mix(in srgb, var(--gv-primary) 5%, var(--gv-surface-card))' : ''"
              @click="masterFileZhInputRef?.click()"
            >
              <div class="drop-zone-inner">
                <div class="p-3 rounded-full bg-sky-500/10 text-sky-500 mb-2">
                  <UIcon :name="masterFileZh ? 'i-heroicons-document-check' : 'i-heroicons-cloud-arrow-up'" class="size-8" />
                </div>
                <p class="text-sm font-bold">🇨🇳 Китайский ODM</p>
                <p class="text-[11px] opacity-60 truncate max-w-full px-2 mt-1 mb-3">
                  {{ masterFileZh ? masterFileZh.name : 'Выбрать .odm' }}
                </p>
                <input
                  ref="masterFileZhInputRef"
                  type="file"
                  accept=".odm"
                  class="sr-only"
                  @change="masterFileZh = ($event.target as HTMLInputElement).files?.[0] || null"
                  @click.stop
                >
                <GvButton
                  v-if="masterFileZh"
                  type="button"
                  variant="ghost"
                  color="red"
                  size="xs"
                  icon="i-heroicons-trash"
                  @click.stop="masterFileZh = null"
                >
                  Удалить
                </GvButton>
              </div>
            </div>
          </div>

          <div class="flex justify-center pt-4">
            <GvButton
              color="sky"
              size="lg"
              icon="i-heroicons-play"
              :loading="loadingMaster"
              :disabled="!hasAnyMasterFile || (bookMode === 'existing' && selectedBookId == null)"
              class="px-12 rounded-2xl"
              @click="createProject"
            >
              Создать проект и слоты
            </GvButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Table of Slots (Queue) -->
    <section v-if="parts.length" class="section-card">
      <header class="card-header">
        <span class="card-badge">QUEUE</span>
        <h2 class="card-header-title">Очередь глав (слоты)</h2>
        <span class="ml-auto text-xs opacity-50 font-bold">{{ importedCount }} / {{ totalSlots }}</span>
      </header>
      <div class="card-body card-body--flush overflow-x-auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="w-12 text-center">#</th>
              <th class="w-16 text-center">Импорт</th>
              <th class="min-w-[320px]">Статья (Глава)</th>
              <th class="w-[220px]">🇬🇧 Английский (EN)</th>
              <th class="w-[220px]">🇷🇺 Русский (RU)</th>
              <th class="w-[220px]">🇨🇳 Китайский (ZH)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in parts" :key="p.id" :class="{ 'opacity-40 select-none': Number(p.is_enabled ?? 1) !== 1 }">
              <!-- Row Index -->
              <td class="tabular-nums font-bold opacity-30 text-xs text-center align-middle">{{ p.sort_order }}</td>
              
              <!-- Enabled Status Toggle -->
              <td class="text-center align-middle py-2">
                <GvButton
                  variant="ghost"
                  :color="Number(p.is_enabled ?? 1) === 1 ? 'sky' : 'gray'"
                  size="xs"
                  :icon="Number(p.is_enabled ?? 1) === 1 ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                  :disabled="p.status !== 'pending'"
                  @click="togglePartEnabled(p.id)"
                  :title="Number(p.is_enabled ?? 1) === 1 ? 'Глава включена в импорт' : 'Глава исключена из импорта'"
                />
              </td>

              <!-- Article titles + Inline Editor -->
              <td class="align-middle py-2 pr-4">
                <div v-if="editingPartId === p.id" class="flex flex-col gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10">
                  <UInput
                    size="xs"
                    placeholder="Название (EN) *"
                    :model-value="partTitleField(p, 'display_title')"
                    @update:model-value="setTitleDraft(p.id, 'display_title', $event)"
                  />
                  <UInput
                    size="xs"
                    placeholder="Название (RU)"
                    :model-value="partTitleField(p, 'display_title_ru')"
                    @update:model-value="setTitleDraft(p.id, 'display_title_ru', $event)"
                  />
                  <UInput
                    size="xs"
                    placeholder="Название (ZH)"
                    :model-value="partTitleField(p, 'display_title_zh')"
                    @update:model-value="setTitleDraft(p.id, 'display_title_zh', $event)"
                  />
                  <div class="flex gap-2 justify-end mt-1">
                    <GvButton
                      variant="ghost"
                      color="gray"
                      size="xs"
                      icon="i-heroicons-x-mark"
                      @click="editingPartId = null"
                    >
                      Отмена
                    </GvButton>
                    <GvButton
                      color="sky"
                      size="xs"
                      icon="i-heroicons-check"
                      :loading="savingTitlesPartId === p.id"
                      @click="saveSlotTitles(p.id)"
                    >
                      Сохранить
                    </GvButton>
                  </div>
                </div>
                <div v-else class="group flex items-start justify-between gap-4 py-1" :title="`Исходные пути:
EN: ${p.master_href_en || 'нет'}
RU: ${p.master_href_ru || 'нет'}
ZH: ${p.master_href_zh || 'нет'}`">
                  <div class="space-y-1 select-text">
                    <div class="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                      {{ p.display_title || 'Без названия (EN)' }}
                    </div>
                    <div v-if="p.display_title_ru" class="text-xs opacity-60 flex items-center gap-1.5 leading-none">
                      <span class="text-[10px]">🇷🇺</span>
                      <span>{{ p.display_title_ru }}</span>
                    </div>
                    <div v-if="p.display_title_zh" class="text-xs opacity-60 flex items-center gap-1.5 leading-none">
                      <span class="text-[10px]">🇨🇳</span>
                      <span>{{ p.display_title_zh }}</span>
                    </div>
                  </div>
                  <GvButton
                    v-if="p.status === 'pending' && Number(p.is_enabled ?? 1) === 1"
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-pencil"
                    class="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                    @click="startEditing(p)"
                    title="Редактировать названия"
                  />
                </div>
              </td>

              <!-- EN File Column -->
              <td class="align-middle py-2">
                <div class="flex items-center gap-3" :class="{ 'opacity-50': Number(p.is_enabled ?? 1) !== 1 }">
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span v-if="!p.odt_original_name" class="size-2 rounded-full bg-gray-300 dark:bg-gray-700 shadow-[0_0_6px_rgba(156,163,175,0.3)]" title="Файл не загружен"></span>
                    <span v-else class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="slotRowStatus(p) === 'live' ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2" :class="slotRowStatus(p) === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'" :title="slotRowStatus(p) === 'live' ? 'На сайте (Live)' : 'Черновик (Draft)'"></span>
                    </span>
                    <span class="text-[10px] font-bold tracking-wider opacity-60">{{ p.odt_original_name ? (slotRowStatus(p) === 'live' ? 'LIVE' : 'DRAFT') : 'EMPTY' }}</span>
                  </div>
                  
                  <div class="flex items-center gap-1">
                    <GvButton
                      variant="ghost"
                      color="gray"
                      size="xs"
                      :loading="uploadingPartId === p.id"
                      :disabled="Number(p.is_enabled ?? 1) !== 1"
                      icon="i-heroicons-arrow-up-tray"
                      @click="triggerPartUpload(p.id, 'en')"
                      :title="p.odt_original_name ? 'Заменить файл .odt' : 'Загрузить файл .odt'"
                    />
                    <GvButton
                      v-if="p.odt_original_name"
                      variant="ghost"
                      color="red"
                      size="xs"
                      icon="i-heroicons-trash"
                      :loading="clearingPartId === p.id"
                      @click="clearSlotImport(p.id, 'en')"
                      title="Сбросить импорт EN"
                    />
                  </div>
                </div>
                <div v-if="p.odt_original_name" class="text-[10px] opacity-40 font-mono truncate max-w-[170px] mt-1" :title="p.odt_original_name">
                  {{ p.odt_original_name }}
                </div>
                <input :id="`part-input-${p.id}-en`" type="file" accept=".odt" class="hidden" @change="handlePartFileChange(p.id, 'en', $event)">
              </td>

              <!-- RU File Column -->
              <td class="align-middle py-2">
                <div v-if="!p.master_href_ru" class="text-xs opacity-20 italic">
                  —
                </div>
                <div v-else>
                  <div class="flex items-center gap-3" :class="{ 'opacity-50': Number(p.is_enabled ?? 1) !== 1 }">
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span v-if="!p.odt_original_name_ru" class="size-2 rounded-full bg-gray-300 dark:bg-gray-700 shadow-[0_0_6px_rgba(156,163,175,0.3)]" title="Файл не загружен"></span>
                      <span v-else class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="slotRowStatus(p) === 'live' ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2" :class="slotRowStatus(p) === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'" :title="slotRowStatus(p) === 'live' ? 'На сайте (Live)' : 'Черновик (Draft)'"></span>
                      </span>
                      <span class="text-[10px] font-bold tracking-wider opacity-60">{{ p.odt_original_name_ru ? (slotRowStatus(p) === 'live' ? 'LIVE' : 'DRAFT') : 'EMPTY' }}</span>
                    </div>
                    
                    <div class="flex items-center gap-1">
                      <GvButton
                        variant="ghost"
                        color="gray"
                        size="xs"
                        :loading="uploadingPartId === p.id"
                        :disabled="Number(p.is_enabled ?? 1) !== 1 || !p.odt_original_name"
                        icon="i-heroicons-arrow-up-tray"
                        @click="triggerPartUpload(p.id, 'ru')"
                        :title="p.odt_original_name_ru ? 'Заменить перевод RU .odt' : 'Загрузить перевод RU .odt'"
                      />
                      <GvButton
                        v-if="p.odt_original_name_ru"
                        variant="ghost"
                        color="red"
                        size="xs"
                        icon="i-heroicons-trash"
                        :loading="clearingPartId === p.id"
                        @click="clearSlotImport(p.id, 'ru')"
                        title="Сбросить перевод RU"
                      />
                    </div>
                  </div>
                  <div v-if="p.odt_original_name_ru" class="text-[10px] opacity-40 font-mono truncate max-w-[170px] mt-1" :title="p.odt_original_name_ru">
                    {{ p.odt_original_name_ru }}
                  </div>
                  <input :id="`part-input-${p.id}-ru`" type="file" accept=".odt" class="hidden" @change="handlePartFileChange(p.id, 'ru', $event)">
                </div>
              </td>

              <!-- ZH File Column -->
              <td class="align-middle py-2">
                <div v-if="!p.master_href_zh" class="text-xs opacity-20 italic">
                  —
                </div>
                <div v-else>
                  <div class="flex items-center gap-3" :class="{ 'opacity-50': Number(p.is_enabled ?? 1) !== 1 }">
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span v-if="!p.odt_original_name_zh" class="size-2 rounded-full bg-gray-300 dark:bg-gray-700 shadow-[0_0_6px_rgba(156,163,175,0.3)]" title="Файл не загружен"></span>
                      <span v-else class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" :class="slotRowStatus(p) === 'live' ? 'bg-emerald-400' : 'bg-amber-400'"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2" :class="slotRowStatus(p) === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'" :title="slotRowStatus(p) === 'live' ? 'На сайте (Live)' : 'Черновик (Draft)'"></span>
                      </span>
                      <span class="text-[10px] font-bold tracking-wider opacity-60">{{ p.odt_original_name_zh ? (slotRowStatus(p) === 'live' ? 'LIVE' : 'DRAFT') : 'EMPTY' }}</span>
                    </div>
                    
                    <div class="flex items-center gap-1">
                      <GvButton
                        variant="ghost"
                        color="gray"
                        size="xs"
                        :loading="uploadingPartId === p.id"
                        :disabled="Number(p.is_enabled ?? 1) !== 1 || !p.odt_original_name"
                        icon="i-heroicons-arrow-up-tray"
                        @click="triggerPartUpload(p.id, 'zh')"
                        :title="p.odt_original_name_zh ? 'Заменить перевод ZH .odt' : 'Загрузить перевод ZH .odt'"
                      />
                      <GvButton
                        v-if="p.odt_original_name_zh"
                        variant="ghost"
                        color="red"
                        size="xs"
                        icon="i-heroicons-trash"
                        :loading="clearingPartId === p.id"
                        @click="clearSlotImport(p.id, 'zh')"
                        title="Сбросить перевод ZH"
                      />
                    </div>
                  </div>
                  <div v-if="p.odt_original_name_zh" class="text-[10px] opacity-40 font-mono truncate max-w-[170px] mt-1" :title="p.odt_original_name_zh">
                    {{ p.odt_original_name_zh }}
                  </div>
                  <input :id="`part-input-${p.id}-zh`" type="file" accept=".odt" class="hidden" @change="handlePartFileChange(p.id, 'zh', $event)">
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ─── Enrich: Дополнить названия из ODM другого языка ─── -->
    <section v-if="projectId" class="section-card">
      <header class="card-header">
        <span class="card-badge">TRANSLATION</span>
        <h2 class="card-header-title">Обогатить названия из другого ODM</h2>
      </header>
      <div class="card-body">
        <div class="flex flex-wrap items-end gap-4">
          <UFormGroup label="Язык ODM" class="shrink-0">
            <div class="flex gap-2">
              <GvButton
                v-for="opt in ([
                  { label: 'RU', value: 'ru' as const },
                  { label: 'EN', value: 'en' as const },
                  { label: 'ZH', value: 'zh' as const },
                ])"
                :key="opt.value"
                :variant="enrichLocale === opt.value ? 'solid' : 'outline'"
                :color="enrichLocale === opt.value ? 'sky' : 'gray'"
                size="xs"
                @click="enrichLocale = opt.value"
              >
                {{ opt.label }}
              </GvButton>
            </div>
          </UFormGroup>
          <UFormGroup label="ODM файл" class="flex-1 min-w-[200px]">
            <div class="flex items-center gap-3">
              <input ref="enrichFileInputRef" type="file" accept=".odm" class="sr-only" @change="onEnrichSelect" />
              <GvButton variant="outline" color="gray" size="sm" icon="i-heroicons-folder-open"
                @click="enrichFileInputRef?.click()">
                {{ enrichFile ? enrichFile.name : 'Выбрать .odm' }}
              </GvButton>
              <span v-if="enrichFile" class="text-xs opacity-50 truncate max-w-[180px]">{{ enrichFile.name }}</span>
            </div>
          </UFormGroup>
          <GvButton color="sky" size="sm" icon="i-heroicons-language" :loading="enriching"
            :disabled="!enrichFile" @click="runEnrichLocale">
            Применить
          </GvButton>
        </div>
      </div>
    </section>

    <!-- ─── Bulk ODT upload ─── -->
    <section v-if="projectId" class="section-card">
      <header class="card-header">
        <span class="card-badge">BULK</span>
        <h2 class="card-header-title">Массовая загрузка .odt</h2>
      </header>
      <div class="card-body space-y-4">
        <div class="flex flex-wrap items-end gap-6">
          <UFormGroup label="Формат нумерации" help="Автоопределение на основе языка">
            <div class="flex gap-1.5 flex-wrap">
              <GvButton
                v-for="opt in ([
                  { label: 'Глава N', value: 'ru' as const },
                  { label: 'Chapter N', value: 'en' as const },
                  { label: '第N章', value: 'zh' as const },
                  { label: 'N', value: 'none' as const },
                  { label: 'Авто', value: '' as const },
                ])"
                :key="opt.value"
                :variant="bulkHeadingLocale === opt.value ? 'solid' : 'outline'"
                :color="bulkHeadingLocale === opt.value ? 'sky' : 'gray'"
                size="xs"
                @click="bulkHeadingLocale = opt.value"
              >
                {{ opt.label }}
              </GvButton>
            </div>
          </UFormGroup>
          <UFormGroup label="Первая глава №">
            <UInput v-model.number="bulkChapterStart" type="number" :min="1" size="sm" class="w-20" />
          </UFormGroup>
        </div>

        <div
          class="drop-zone gv-focusable"
          :class="{ 'drop-zone--active': bulkDragging || bulkFiles.length }"
          @dragover="onBulkDragOver"
          @dragleave="onBulkDragLeave"
          @drop="onBulkDrop"
        >
          <div class="drop-zone-inner">
            <div class="p-3 rounded-full bg-sky-500/10 text-sky-500 mb-2">
              <UIcon name="i-heroicons-document-duplicate" class="size-8" />
            </div>
            <p class="text-sm font-bold">
              {{ bulkFiles.length ? `Выбрано ${bulkFiles.length} файлов` : 'Перетащите .odt файлы сюда' }}
            </p>
            <ul v-if="bulkFiles.length" class="text-[11px] mt-2 mb-3 space-y-1 text-left max-h-36 overflow-y-auto border border-black/10 dark:border-white/10 rounded-lg p-2 bg-black/5 dark:bg-white/5">
              <li v-for="m in bulkMatchedFiles" :key="m.filename" class="flex items-center justify-between gap-3">
                <span class="truncate max-w-[280px] font-mono opacity-80" :class="{ 'text-red-500': !m.matchedPart }">
                  {{ m.filename }}
                </span>
                <span v-if="m.matchedPart && m.matchedLang" class="shrink-0 flex items-center gap-1.5">
                  <span class="gv-status-pill text-[9px] !px-1.5 !py-0.5" :data-pub="m.matchedLang === 'en' ? 'live' : 'draft'">
                    {{ m.matchedLang.toUpperCase() }}
                  </span>
                  <span class="opacity-50">→ Глава {{ m.matchedPart.sort_order }}</span>
                </span>
                <span v-else class="shrink-0 text-red-500 font-bold flex items-center gap-1">
                  <UIcon name="i-heroicons-exclamation-triangle" class="size-3.5" />
                  Не найдено в ODM
                </span>
              </li>
            </ul>
            <div class="flex gap-2 mt-3">
              <input ref="bulkFileInputRef" type="file" accept=".odt" multiple class="sr-only" @change="onBulkSelect" />
              <GvButton variant="outline" color="gray" size="sm" icon="i-heroicons-folder-open"
                @click="bulkFileInputRef?.click()">
                Выбрать файлы
              </GvButton>
              <GvButton v-if="bulkFiles.length" variant="soft" color="gray" size="sm"
                icon="i-heroicons-x-mark" @click="bulkFiles = []">
                Очистить
              </GvButton>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <GvButton color="sky" size="lg" icon="i-heroicons-arrow-up-tray"
            :loading="bulkUploading" :disabled="!bulkFiles.length"
            class="px-10 rounded-2xl"
            @click="runBulkOdt">
            Импортировать {{ bulkFiles.length ? `(${bulkFiles.length} файлов)` : '' }}
          </GvButton>
        </div>
      </div>
    </section>

    <!-- Publication Confirmation Modal -->
    <UModal v-model="publishConfirmOpen">
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2 rounded-lg bg-sky-500/10 text-sky-500">
            <UIcon name="i-heroicons-rocket-launch" class="size-6" />
          </div>
          <h3 class="text-lg font-bold">Опубликовать {{ publishStats.draft }} статей?</h3>
        </div>
        <p class="text-sm opacity-70 mb-6 leading-relaxed">
          Статьи станут доступны всем пользователям согласно настройкам видимости книги. Вы сможете скрыть их вручную
          позже в панели управления статьями.
        </p>
        <div class="flex justify-end gap-3">
          <GvButton variant="ghost" color="gray" @click="publishConfirmOpen = false">Отмена</GvButton>
          <GvButton color="sky" :loading="publishing" @click="publishProject">Подтверждаю публикацию</GvButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<style scoped>
.import-odm-page {
  max-width: 1100px;
}

.drop-zone {
  border: 2px dashed var(--gv-border-principal);
  border-radius: 24px;
  padding: 48px 24px;
  text-align: center;
  background: var(--gv-surface-card);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.drop-zone:hover,
.drop-zone--active {
  border-color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 5%, var(--gv-surface-card));
  transform: translateY(-2px);
  box-shadow: var(--gv-shadow-md);
}

.drop-zone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gv-status-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.gv-status-pill[data-status="imported"] {
  background: color-mix(in srgb, #10b981 15%, transparent);
  color: #059669;
}

.gv-status-pill[data-pub="live"] {
  background: color-mix(in srgb, #0ea5e9 15%, transparent);
  color: #0284c7;
}

.gv-status-pill[data-pub="draft"] {
  background: color-mix(in srgb, var(--gv-text-secondary) 10%, transparent);
  color: var(--gv-text-secondary);
}

@media (max-width: 1024px) {
  .import-odm-page {
    padding-bottom: 2rem;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dual-row {
  display: flex;
  gap: 16px;
}
</style>
