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

const masterFile = ref<File | null>(null)
const masterFileInputRef = ref<HTMLInputElement | null>(null)
const projectId = ref<number | null>(null)
const projectBookId = ref<number | null>(null)
const parts = ref<any[]>([])
const loadingMaster = ref(false)
const uploadingPartId = ref<number | null>(null)
const isDragging = ref(false)
const publishing = ref(false)
const publishConfirmOpen = ref(false)

const publishStats = reactive({ draft: 0, live: 0 })

/** Локальные правки названий слота до сохранения на сервер */
const titleDrafts = ref<Record<number, { display_title?: string; display_title_ru?: string; display_title_zh?: string }>>({})
const savingTitlesPartId = ref<number | null>(null)

watch(books, (list) => {
  if (bookMode.value === 'existing' && selectedBookId.value == null && list.length > 0)
    selectedBookId.value = Number(list[0].id)
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

const importedCount = computed(() => parts.value.filter(p => p.status === 'imported').length)
const totalSlots = computed(() => parts.value.length)
const allSlotsImported = computed(() => totalSlots.value > 0 && importedCount.value === totalSlots.value)

const canPublish = computed(() => allSlotsImported.value && publishStats.draft > 0)
const allPublished = computed(() => allSlotsImported.value && publishStats.draft === 0 && publishStats.live > 0)

function handleMasterFile(file: File | null) {
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.odm')) {
    toast.add({ title: 'Нужен файл .odm', color: 'red' })
    return
  }
  masterFile.value = file
  projectId.value = null
  projectBookId.value = null
  parts.value = []
  publishStats.draft = 0
  publishStats.live = 0
  titleDrafts.value = {}
}

function onMasterSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) handleMasterFile(input.files[0])
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) handleMasterFile(f)
}

async function createProject() {
  if (!masterFile.value) return
  if (bookMode.value === 'existing' && (selectedBookId.value == null || selectedBookId.value === '')) {
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
    fd.append('file', masterFile.value)
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

function triggerPartUpload(partId: number) {
  const el = document.getElementById(`part-input-${partId}`)
  if (el) (el as HTMLInputElement).click()
}

async function handlePartFileChange(partId: number, event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  await uploadPart(partId, input.files)
  
  // Clear the input so the same file can be selected again if needed
  input.value = ''
}

async function uploadPart(partId: number, fileList: FileList | null) {
  if (!fileList?.length || !projectId.value) return
  const file = fileList[0]
  if (!file.name.toLowerCase().endsWith('.odt')) {
    toast.add({ title: 'Для слота нужен .odt', color: 'red' })
    return
  }
  uploadingPartId.value = partId
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/import/odm/project/${projectId.value}/part/${partId}`, {
      method: 'POST',
      body: fd,
      headers: store.getAuthHeader(),
    })
    toast.add({
      title: 'Глава в черновиках',
      description: 'Статья импортирована как черновик. Опубликуйте сбором, когда будете готовы.',
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

function resetFlow() {
  masterFile.value = null
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

    <!-- Publication Status -->
    <section v-if="projectId && allSlotsImported" class="section-card publish-ready-card">
      <header class="card-header">
        <span class="card-badge">READY</span>
        <h2 class="card-header-title">Статус публикации</h2>
      </header>
      <div class="card-body">
        <div class="flex items-start gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5">
          <div class="p-3 rounded-xl bg-white dark:bg-black/20 shadow-sm">
            <UIcon :name="allPublished ? 'i-heroicons-check-badge' : 'i-heroicons-eye-slash'" class="size-8"
              :class="allPublished ? 'text-green-500' : 'text-sky-500'" />
          </div>
          <div class="flex-1">
            <h3 class="text-base font-bold mb-1">
              {{ allPublished ? 'Все материалы на сайте' : `Черновики: ${publishStats.draft} · На сайте:
              ${publishStats.live}` }}
            </h3>
            <p class="text-sm opacity-60 leading-relaxed">
              {{ allPublished
                ? `Все статьи этого проекта успешно опубликованы. Вы можете продолжить редактирование в общем списке
              статей.`
                : `Импорт завершен, но статьи не видны читателям. Проверьте содержимое и нажмите кнопку ниже.`
              }}
            </p>
            <div v-if="!allPublished" class="flex gap-3 mt-4">
              <GvButton color="sky" size="lg" icon="i-heroicons-rocket-launch" :disabled="!canPublish" class="px-8"
                @click="publishConfirmOpen = true">
                Опубликовать сборку
              </GvButton>
              <GvButton v-if="projectBookId" :to="`/admin/books/${projectBookId}/edit`" variant="outline" color="gray"
                size="lg" icon="i-heroicons-pencil-square">
                Правки книги
              </GvButton>
            </div>
          </div>
        </div>
      </div>
    </section>

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

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">ODM</span>
        <h2 class="card-header-title">Книга и мастер-документ</h2>
      </header>
      <div class="card-body space-y-8">
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
                        <UTextarea v-model="newBookForm.description_zh" :rows="4" placeholder="书的简要摘要..."
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
        <UFormGroup label="Язык подписей глав" help="Нумерация в тексте (Глава / Chapter / 第N章) и имена слотов по умолчанию">
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

        <!-- Drop Zone or Project Info -->
        <div v-if="!projectId" class="pt-4">
          <div class="drop-zone gv-focusable" :class="{ 'drop-zone--active': isDragging || masterFile }"
            @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
            <div class="drop-zone-inner">
              <div class="p-4 rounded-full bg-sky-500/10 text-sky-500 mb-2">
                <UIcon :name="masterFile ? 'i-heroicons-document-check' : 'i-heroicons-cloud-arrow-up'"
                  class="size-10" />
              </div>
              <p class="text-base font-bold">
                {{ masterFile ? masterFile.name : 'Перетащите мастер .odm файл' }}
              </p>
              <p class="text-xs opacity-50 mb-4">Файл задает последовательность и названия глав</p>
              <input
                ref="masterFileInputRef"
                type="file"
                accept=".odm"
                class="sr-only"
                @change="onMasterSelect"
              >
              <GvButton
                type="button"
                variant="outline"
                color="gray"
                size="sm"
                icon="i-heroicons-folder-open"
                @click="masterFileInputRef?.click()"
              >
                Выбрать файл
              </GvButton>
            </div>
          </div>

          <div class="flex justify-center pt-8">
            <GvButton
              color="sky"
              size="lg"
              icon="i-heroicons-play"
              :loading="loadingMaster"
              :disabled="!masterFile || (bookMode === 'existing' && selectedBookId == null)"
              class="px-12 rounded-2xl"
              @click="createProject"
            >
              Создать проект и слоты
            </GvButton>
          </div>
        </div>

        <div v-else class="project-banner p-6 rounded-2xl border-2 border-dashed border-sky-500/30 bg-sky-500/5">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
                <UIcon name="i-heroicons-beaker" class="size-6" />
              </div>
              <div>
                <p class="text-lg font-black uppercase tracking-tight">Проект #{{ projectId }}</p>
                <p class="text-sm opacity-60">Слотов: {{ totalSlots }} · Импортировано: {{ importedCount }}</p>
              </div>
            </div>
            <GvButton variant="outline" color="gray" size="sm" @click="resetFlow">Новый проект</GvButton>
          </div>
        </div>
      </div>
    </section>

    <section v-if="parts.length" class="section-card">
      <header class="card-header">
        <span class="card-badge">ODT</span>
        <h2 class="card-header-title">Очередь загрузки глав</h2>
        <span class="ml-auto text-xs opacity-50 font-bold">{{ importedCount }}/{{ totalSlots }}</span>
      </header>
      <div class="card-body card-body--flush overflow-x-auto">
        <div class="p-4 text-xs opacity-80 bg-black/5 dark:bg-white/5 space-y-1.5 leading-relaxed">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Загружайте главы (.odt) по порядку.</p>
          <p class="opacity-90">Перед загрузкой можно задать три заголовка: <strong>EN</strong> — поле <code class="rounded bg-black/10 px-1 py-0.5 text-[11px] dark:bg-white/15">title</code> и будущая ссылка <code class="rounded bg-black/10 px-1 py-0.5 text-[11px] dark:bg-white/15">/articles/…</code>; <strong>RU</strong> и <strong>ZH</strong> — по желанию.</p>
        </div>
        <table class="admin-table min-w-[1040px]">
          <thead>
            <tr>
              <th class="w-12">#</th>
              <th class="min-w-[320px]">Заголовки статьи</th>
              <th class="hidden lg:table-cell">HREF</th>
              <th>Статус</th>
              <th>Публикация</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in parts" :key="p.id">
              <td class="tabular-nums font-bold opacity-30 text-xs text-center">{{ p.sort_order }}</td>
              <td class="align-top py-2">
                <template v-if="p.status === 'imported'">
                  <div class="text-sm font-bold">{{ p.display_title }}</div>
                  <div v-if="p.display_title_ru || p.display_title_zh" class="text-[11px] opacity-70 mt-1 space-y-0.5">
                    <div v-if="p.display_title_ru">RU: {{ p.display_title_ru }}</div>
                    <div v-if="p.display_title_zh">ZH: {{ p.display_title_zh }}</div>
                  </div>
                </template>
                <div v-else class="flex flex-col gap-3 min-w-[280px] py-1">
                  <UFormGroup
                    label="Заголовок EN"
                    help="Поле title; по нему строится основной slug и ссылка /articles/…"
                    class="[&_.text-sm]:text-[10px]"
                  >
                    <UInput
                      size="xs"
                      :model-value="partTitleField(p, 'display_title')"
                      @update:model-value="setTitleDraft(p.id, 'display_title', $event)"
                    />
                  </UFormGroup>
                  <UFormGroup
                    label="Заголовок RU"
                    help="Необязательно · title_ru"
                    class="[&_.text-sm]:text-[10px]"
                  >
                    <UInput
                      size="xs"
                      :model-value="partTitleField(p, 'display_title_ru')"
                      @update:model-value="setTitleDraft(p.id, 'display_title_ru', $event)"
                    />
                  </UFormGroup>
                  <UFormGroup
                    label="Заголовок ZH"
                    help="Необязательно · title_zh"
                    class="[&_.text-sm]:text-[10px]"
                  >
                    <UInput
                      size="xs"
                      :model-value="partTitleField(p, 'display_title_zh')"
                      @update:model-value="setTitleDraft(p.id, 'display_title_zh', $event)"
                    />
                  </UFormGroup>
                  <GvButton
                    variant="soft"
                    color="sky"
                    size="xs"
                    class="self-start"
                    :loading="savingTitlesPartId === p.id"
                    icon="i-heroicons-check"
                    @click="saveSlotTitles(p.id)"
                  >
                    Сохранить названия
                  </GvButton>
                </div>
              </td>
              <td class="hidden lg:table-cell text-[10px] font-mono opacity-50">{{ p.master_href }}</td>
              <td>
                <span class="gv-status-pill" :data-status="p.status">
                  {{ p.status === 'imported' ? 'Готово' : 'Ожидание' }}
                </span>
              </td>
              <td>
                <span v-if="p.status === 'imported'" class="gv-status-pill" :data-pub="slotRowStatus(p)">
                  {{ p.articles_publish === 'published' ? 'Live' : 'Draft' }}
                </span>
                <span v-else class="text-[10px] opacity-30">—</span>
              </td>
              <td>
                <template v-if="p.status !== 'imported'">
                  <GvButton
                    variant="outline"
                    color="gray"
                    size="xs"
                    :loading="uploadingPartId === p.id"
                    icon="i-heroicons-arrow-up-tray"
                    @click="triggerPartUpload(p.id)"
                  >
                    Загрузить .odt
                  </GvButton>
                  <input :id="`part-input-${p.id}`" type="file" accept=".odt" class="hidden"
                    @change="handlePartFileChange(p.id, $event)">
                </template>
                <span v-else class="text-[10px] font-bold opacity-40 truncate max-w-[120px] inline-block">
                  {{ p.odt_original_name }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
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
