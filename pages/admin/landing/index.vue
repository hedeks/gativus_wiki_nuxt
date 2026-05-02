<template>
  <div class="admin-page-stack landing-cms-page admin-gv-skin">
    <header class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo">
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN · CMS</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Лендинг</h1>
          <p class="hero-lead">Управление блоками главной страницы: порядок, видимость и локализация.</p>
        </div>
      </div>
    </header>

    <div class="cta-buttons admin-index-toolbar">
      <GvButton
        type="button"
        color="sky"
        size="sm"
        icon="i-heroicons-plus"
        :loading="creating"
        @click="openCreate"
      >
        Новый блок
      </GvButton>
      <GvButton
        type="button"
        variant="outline"
        color="gray"
        size="sm"
        icon="i-heroicons-arrow-path"
        :loading="pending"
        @click="refresh()"
      >
        Обновить
      </GvButton>
      <div class="flex-1" />
    </div>

    <section v-if="fetchError" class="section-card section-card--error">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-exclamation-triangle" class="size-5" />
        <span>{{ fetchError.message }}</span>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Sidebar / List -->
      <section class="section-card lg:col-span-5 xl:col-span-3">
        <header class="card-header">
          <span class="card-badge">CMS</span>
          <h2 class="card-header-title">Список блоков</h2>
          <span class="ml-auto text-xs font-bold opacity-50">{{ sortedRows.length }}</span>
        </header>
        <div class="card-body card-body--flush">
          <div v-if="pending" class="p-4 space-y-3">
            <div v-for="i in 5" :key="i" class="skeleton-row" />
          </div>
          <div v-else class="divide-y divide-black/5 dark:divide-white/5">
            <div
              v-for="row in sortedRows"
              :key="row.id"
              class="landing-list-item gv-focusable"
              :class="{ 'landing-list-item--active': selected?.id === row.id }"
              @click="selectRow(row)"
            >
              <div class="flex items-center gap-3 w-full">
                <span class="text-[10px] font-black opacity-30 w-4">{{ row.sort_order }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold truncate">{{ row.title_en || 'Untitled Block' }}</p>
                  <p class="text-[10px] uppercase tracking-wider opacity-50 font-bold">
                    {{ blockLabel(row.block_type) }}
                  </p>
                </div>
                <div class="flex items-center gap-1" @click.stop>
                  <GvButton
                    chromeless
                    square
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-chevron-up"
                    @click="move(row, -1)"
                  />
                  <GvButton
                    chromeless
                    square
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-chevron-down"
                    @click="move(row, 1)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Editor -->
      <div class="lg:col-span-7 xl:col-span-9 space-y-6">
        <!-- Create State -->
        <section v-if="createOpen" class="section-card">
          <header class="card-header">
            <span class="card-badge">NEW</span>
            <h2 class="card-header-title">Создание блока</h2>
          </header>
          <div class="card-body space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormGroup label="Тип блока" help="Выберите структуру контента">
                <select v-model="createForm.block_type" class="gv-admin-filter-select w-full min-h-[44px]">
                  <option v-for="b in blockTypes" :key="b" :value="b">{{ blockLabel(b) }}</option>
                </select>
              </UFormGroup>
              <UFormGroup label="Anchor ID" help="Для прямой навигации (#anchor)">
                <UInput v-model="createForm.anchor_id" placeholder="например, features" size="lg" />
              </UFormGroup>
            </div>
            <UFormGroup>
              <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-black/5 dark:bg-white/5 gv-focusable">
                <input v-model="createForm.is_published" type="checkbox" class="w-4 h-4 rounded border-gray-300">
                <div>
                  <p class="text-sm font-bold">Опубликовать сразу</p>
                  <p class="text-xs opacity-50">Блок станет виден на главной странице</p>
                </div>
              </label>
            </UFormGroup>
            <div class="flex justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
              <GvButton variant="ghost" color="gray" @click="createOpen = false">Отмена</GvButton>
              <GvButton color="sky" :loading="creating" icon="i-heroicons-check" @click="submitCreate">Создать блок</GvButton>
            </div>
          </div>
        </section>

        <!-- Edit State -->
        <div v-else-if="selected" class="space-y-6">
          <section class="section-card">
            <header class="card-header">
              <span class="card-badge">EDIT</span>
              <h2 class="card-header-title">Настройки блока #{{ selected.id }}</h2>
              <div class="ml-auto" @click.stop>
                <GvButton
                  chromeless
                  variant="ghost"
                  color="red"
                  size="xs"
                  icon="i-heroicons-trash"
                  @click="removeRow(selected)"
                >
                  Удалить
                </GvButton>
              </div>
            </header>
            <div class="card-body space-y-8">
              <!-- Meta -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <UFormGroup label="Порядок">
                  <UInput v-model.number="edit.sort_order" type="number" size="lg" />
                </UFormGroup>
                <UFormGroup label="Тип">
                  <select v-model="edit.block_type" class="gv-admin-filter-select w-full min-h-[44px]">
                    <option v-for="b in blockTypes" :key="b" :value="b">{{ blockLabel(b) }}</option>
                  </select>
                </UFormGroup>
                <UFormGroup label="Anchor ID">
                  <UInput v-model="edit.anchor_id" size="lg" />
                </UFormGroup>
                <UFormGroup label="Статус">
                  <div class="flex items-center h-[44px]">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input v-model="edit.is_published" type="checkbox" class="w-4 h-4 rounded">
                      <span class="text-sm font-bold">{{ edit.is_published ? 'Опубликован' : 'Черновик' }}</span>
                    </label>
                  </div>
                </UFormGroup>
              </div>

              <!-- Content Tabs -->
              <UTabs
                :items="[
                  { label: '🇬🇧 Основное (EN)', slot: 'en' },
                  { label: '🇷🇺 Перевод (RU)', slot: 'ru' },
                  { label: '🇨🇳 Перевод (ZH)', slot: 'zh' },
                  { label: '🛠 Payload & Media', slot: 'payload' },
                  { label: '👁 Предпросмотр', slot: 'preview' },
                ]"
                class="w-full"
              >
                <template #en>
                  <div class="space-y-4 pt-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UFormGroup label="Neuron Label"><UInput v-model="edit.neuron_label_en" /></UFormGroup>
                      <UFormGroup label="Kicker"><UInput v-model="edit.kicker_en" /></UFormGroup>
                    </div>
                    <UFormGroup label="Title"><UInput v-model="edit.title_en" size="lg" /></UFormGroup>
                    <UFormGroup label="Subtitle"><UTextarea v-model="edit.subtitle_en" :rows="2" /></UFormGroup>
                    <UFormGroup label="Body (HTML support)"><UTextarea v-model="edit.body_en" :rows="6" class="font-mono text-sm" /></UFormGroup>
                    <UFormGroup label="Footnote"><UInput v-model="edit.footnote_en" /></UFormGroup>
                  </div>
                </template>
                <template #ru>
                  <div class="space-y-4 pt-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UFormGroup label="Метка нейрона"><UInput v-model="edit.neuron_label_ru" /></UFormGroup>
                      <UFormGroup label="Китч (Kicker)"><UInput v-model="edit.kicker_ru" /></UFormGroup>
                    </div>
                    <UFormGroup label="Заголовок"><UInput v-model="edit.title_ru" size="lg" /></UFormGroup>
                    <UFormGroup label="Подзаголовок"><UTextarea v-model="edit.subtitle_ru" :rows="2" /></UFormGroup>
                    <UFormGroup label="Текст (HTML)"><UTextarea v-model="edit.body_ru" :rows="6" class="font-mono text-sm" /></UFormGroup>
                    <UFormGroup label="Сноска"><UInput v-model="edit.footnote_ru" /></UFormGroup>
                  </div>
                </template>
                <template #zh>
                  <div class="space-y-4 pt-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <UFormGroup label="Neuron Label"><UInput v-model="edit.neuron_label_zh" /></UFormGroup>
                      <UFormGroup label="Kicker"><UInput v-model="edit.kicker_zh" /></UFormGroup>
                    </div>
                    <UFormGroup label="标题"><UInput v-model="edit.title_zh" size="lg" /></UFormGroup>
                    <UFormGroup label="小标题"><UTextarea v-model="edit.subtitle_zh" :rows="2" /></UFormGroup>
                    <UFormGroup label="文本 (HTML)"><UTextarea v-model="edit.body_zh" :rows="6" class="font-mono text-sm" /></UFormGroup>
                    <UFormGroup label="脚注"><UInput v-model="edit.footnote_zh" /></UFormGroup>
                  </div>
                </template>

                <template #payload>
                  <div class="space-y-8 pt-4">
                    <UFormGroup label="Главное изображение" help="Фоновое или основное изображение блока">
                      <AdminMediaPicker v-model="edit.image_path" upload-endpoint="/api/admin/uploads/landing" />
                    </UFormGroup>

                    <!-- Специальный редактор для сложного блока Архитектуры -->
                    <AdminArchitecturePayloadEditor
                      v-if="edit.block_type === 'about'"
                      v-model="edit.payload_json"
                    />

                    <div v-if="hasPayloadEditor && edit.block_type !== 'about'" class="space-y-4">
                      <div class="flex items-center justify-between">
                        <p class="gv-admin-eyebrow">Содержимое ({{ payloadKey }})</p>
                        <GvButton size="xs" variant="soft" color="sky" icon="i-heroicons-plus" @click="addPayloadItem">
                          Добавить элемент
                        </GvButton>
                      </div>

                      <div class="space-y-3">
                        <div
                          v-for="(item, idx) in payloadItems"
                          :key="idx"
                          class="p-4 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] relative group"
                        >
                          <GvButton
                            chromeless
                            square
                            variant="ghost"
                            color="red"
                            size="xs"
                            icon="i-heroicons-x-mark"
                            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            @click="removePayloadItem(idx)"
                          />

                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <UFormGroup v-if="'badge' in item" label="Badge"><UInput v-model="item.badge" /></UFormGroup>
                            <UFormGroup v-if="'accent' in item" label="Accent (color)">
                              <UInput v-model="item.accent" placeholder="book, article, term..." />
                            </UFormGroup>
                            
                            <div class="md:col-span-2 grid grid-cols-3 gap-2">
                              <UFormGroup :label="('label_en' in item ? 'Label' : 'Title') + ' EN'">
                                <UInput v-model="item.label_en" v-if="'label_en' in item" />
                                <UInput v-model="item.title_en" v-if="'title_en' in item" />
                              </UFormGroup>
                              <UFormGroup :label="('label_ru' in item ? 'Label' : 'Title') + ' RU'">
                                <UInput v-model="item.label_ru" v-if="'label_ru' in item" />
                                <UInput v-model="item.title_ru" v-if="'title_ru' in item" />
                              </UFormGroup>
                              <UFormGroup :label="('label_zh' in item ? 'Label' : 'Title') + ' ZH'">
                                <UInput v-model="item.label_zh" v-if="'label_zh' in item" />
                                <UInput v-model="item.title_zh" v-if="'title_zh' in item" />
                              </UFormGroup>
                            </div>

                            <div v-if="'desc_en' in item" class="md:col-span-2 grid grid-cols-1 gap-2">
                              <UFormGroup label="Description EN"><UInput v-model="item.desc_en" /></UFormGroup>
                              <UFormGroup label="Description RU"><UInput v-model="item.desc_ru" /></UFormGroup>
                              <UFormGroup label="Description ZH"><UInput v-model="item.desc_zh" /></UFormGroup>
                            </div>

                            <UFormGroup v-if="'href' in item" label="Link (href)"><UInput v-model="item.href" /></UFormGroup>
                            <UFormGroup v-if="'icon' in item" label="Icon">
                              <AdminIconPicker v-model="item.icon" />
                            </UFormGroup>
                            <UFormGroup v-if="'color' in item" label="Color">
                              <select v-model="item.color" class="gv-admin-filter-select w-full min-h-[36px]">
                                <option value="sky">Sky (Blue)</option>
                                <option value="gray">Gray</option>
                                <option value="white">White</option>
                              </select>
                            </UFormGroup>
                            <UFormGroup v-if="'variant' in item" label="Variant">
                              <select v-model="item.variant" class="gv-admin-filter-select w-full min-h-[36px]">
                                <option value="solid">Solid</option>
                                <option value="outline">Outline</option>
                                <option value="ghost">Ghost</option>
                              </select>
                            </UFormGroup>

                            <UFormGroup v-if="'image' in item" label="Image" class="md:col-span-2">
                              <AdminMediaPicker v-model="item.image" upload-endpoint="/api/admin/uploads/landing" />
                            </UFormGroup>
                          </div>
                        </div>
                      </div>
                    </div>

                    <UFormGroup label="Payload RAW JSON (для тонкой настройки)">
                      <UTextarea v-model="edit.payload_json" :rows="8" class="font-mono text-[11px] leading-relaxed" spellcheck="false" />
                    </UFormGroup>
                  </div>
                </template>

                <template #preview>
                  <div class="pt-4 space-y-6">
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-bold opacity-50 uppercase tracking-widest">Живой предпросмотр ({{ previewLang.toUpperCase() }})</p>
                      <div class="flex gap-2">
                        <GvButton 
                          v-for="l in ['en', 'ru', 'zh']" 
                          :key="l"
                          size="xs" 
                          :variant="previewLang === l ? 'solid' : 'ghost'"
                          color="gray"
                          @click="previewLang = l"
                        >
                          {{ l.toUpperCase() }}
                        </GvButton>
                      </div>
                    </div>
                    
                    <!-- Real Landing Component Render -->
                    <div class="admin-landing-preview-frame">
                      <div class="home-stack">
                        <div class="home-section home-section--enter">
                          <component
                            :is="landingBlockComponent(edit.block_type)"
                            :block="resolvedPreviewBlock"
                            reduced-motion
                          />
                        </div>
                      </div>
                    </div>

                    <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/20 flex gap-3 items-start">
                      <UIcon name="i-heroicons-information-circle" class="size-5 text-amber-500 mt-0.5" />
                      <p class="text-xs text-amber-700 dark:text-amber-300">
                        В предпросмотре используются реальные компоненты и стили главной страницы. 
                        Анимации появления отключены для удобства редактирования.
                      </p>
                    </div>
                  </div>
                </template>
              </UTabs>

              <div class="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
                <p v-if="saveError" class="text-sm text-red-500 font-bold">{{ saveError }}</p>
                <div class="ml-auto">
                  <GvButton color="sky" size="lg" :loading="saving" icon="i-heroicons-check" class="rounded-xl px-10" @click="saveEdit">
                    Сохранить изменения
                  </GvButton>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center p-12 text-center opacity-30">
          <UIcon name="i-heroicons-adjustments-horizontal" class="size-16 mb-4" />
          <p class="text-lg font-bold">Выберите блок для редактирования</p>
          <p class="text-sm">Или создайте новый, используя кнопку выше</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LandingBlockRow, LandingBlockType, LandingBlockResolved } from '~/types/landing'
import { landingBlockComponent } from '~/utils/landingBlockMap'
import '~/assets/css/landing-home.css'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: 'Лендинг — Gativus Admin' })

const store = userStore()
const toast = useToast()

const blockLabels: Record<LandingBlockType, string> = {
  hero: 'Hero',
  card_row: 'Ряд карточек',
  richtext: 'Текст',
  link_grid: 'Сетка ссылок',
  cta: 'Призыв к действию',
  about: 'Архитектура',
}

function blockLabel(t: string) {
  return blockLabels[t as LandingBlockType] || t
}

const blockTypes: LandingBlockType[] = [
  'hero',
  'card_row',
  'richtext',
  'link_grid',
  'cta',
  'about',
]

const {
  data: rows,
  pending,
  refresh,
  error: fetchError,
} = await useFetch<LandingBlockRow[]>('/api/admin/landing', {
  default: () => [],
  headers: store.getAuthHeader(),
})

const sortedRows = computed(() =>
  [...(rows.value || [])].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
)

const selected = ref<LandingBlockRow | null>(null)
const createOpen = ref(false)
const creating = ref(false)
const saving = ref(false)
const saveError = ref('')

const createForm = reactive({
  block_type: 'richtext' as LandingBlockType,
  anchor_id: '',
  is_published: false,
})

const edit = reactive({
  sort_order: 0,
  is_published: true,
  block_type: 'richtext' as string,
  anchor_id: '' as string | null,
  neuron_label_en: '' as string | null,
  neuron_label_ru: '' as string | null,
  neuron_label_zh: '' as string | null,
  kicker_en: '' as string | null,
  kicker_ru: '' as string | null,
  kicker_zh: '' as string | null,
  title_en: '' as string | null,
  title_ru: '' as string | null,
  title_zh: '' as string | null,
  subtitle_en: '' as string | null,
  subtitle_ru: '' as string | null,
  subtitle_zh: '' as string | null,
  body_en: '' as string | null,
  body_ru: '' as string | null,
  body_zh: '' as string | null,
  footnote_en: '' as string | null,
  footnote_ru: '' as string | null,
  footnote_zh: '' as string | null,
  image_path: '' as string | null,
  payload_json: '{}',
})

// Preview Language
const previewLang = ref('en')

// Resolved Block for Preview
const resolvedPreviewBlock = computed<LandingBlockResolved>(() => {
  const l = previewLang.value as 'en' | 'ru' | 'zh'
  const suffix = l === 'en' ? 'en' : l === 'ru' ? 'ru' : 'zh'
  
  return {
    id: selected.value?.id || 0,
    sortOrder: edit.sort_order,
    blockType: edit.block_type as LandingBlockType,
    anchorId: edit.anchor_id,
    neuronLabel: edit[`neuron_label_${suffix}` as keyof typeof edit] as string | null,
    kicker: edit[`kicker_${suffix}` as keyof typeof edit] as string | null,
    title: edit[`title_${suffix}` as keyof typeof edit] as string | null,
    subtitle: edit[`subtitle_${suffix}` as keyof typeof edit] as string | null,
    body: edit[`body_${suffix}` as keyof typeof edit] as string | null,
    footnote: edit[`footnote_${suffix}` as keyof typeof edit] as string | null,
    imagePath: edit.image_path,
    payload: JSON.parse(edit.payload_json || '{}')
  }
})

// Payload Reactive Editor
const payloadItems = ref<any[]>([])
const payloadKey = computed(() => {
  if (edit.block_type === 'hero') return 'ctas'
  if (edit.block_type === 'card_row') return 'cards'
  if (edit.block_type === 'link_grid') return 'links'
  if (edit.block_type === 'cta') return 'buttons'
  if (edit.block_type === 'about') return 'architecture'
  return null
})
const hasPayloadEditor = computed(() => !!payloadKey.value)

// Synchronize payloadItems with edit.payload_json
watch(() => edit.payload_json, (val) => {
  if (!val) {
    payloadItems.value = []
    return
  }
  try {
    const parsed = JSON.parse(val)
    const key = payloadKey.value
    if (key && Array.isArray(parsed[key])) {
      if (JSON.stringify(parsed[key]) !== JSON.stringify(payloadItems.value)) {
        payloadItems.value = JSON.parse(JSON.stringify(parsed[key]))
      }
    } else if (!key) {
      payloadItems.value = []
    }
  } catch {
    // invalid json, ignore
  }
}, { immediate: true })

// Synchronize edit.payload_json with payloadItems
watch(payloadItems, (items) => {
  const key = payloadKey.value
  if (!key) return
  
  try {
    const current = JSON.parse(edit.payload_json || '{}')
    current[key] = items
    const newJson = JSON.stringify(current, null, 2)
    if (newJson !== edit.payload_json) {
      edit.payload_json = newJson
    }
  } catch {
    edit.payload_json = JSON.stringify({ [key]: items }, null, 2)
  }
}, { deep: true })

function addPayloadItem() {
  const key = payloadKey.value
  if (!key) return
  
  let newItem = {}
  if (key === 'ctas' || key === 'buttons') {
    newItem = { label_en: 'New Button', href: '#', color: 'sky', variant: 'solid' }
  } else if (key === 'cards') {
    newItem = { badge: 'NEW', title_en: 'New Card', desc_en: '', image: '', href: '#' }
  } else if (key === 'links') {
    newItem = { label_en: 'New Link', desc_en: '', icon: 'i-heroicons-link', href: '#', accent: 'gray' }
  }
  
  payloadItems.value.push(newItem)
}

function removePayloadItem(idx: number) {
  payloadItems.value.splice(idx, 1)
}

function selectRow(row: LandingBlockRow) {
  createOpen.value = false
  selected.value = row
  saveError.value = ''
  edit.sort_order = row.sort_order
  edit.is_published = !!row.is_published
  edit.block_type = row.block_type
  edit.anchor_id = row.anchor_id
  edit.neuron_label_en = row.neuron_label_en
  edit.neuron_label_ru = row.neuron_label_ru
  edit.neuron_label_zh = row.neuron_label_zh
  edit.kicker_en = row.kicker_en
  edit.kicker_ru = row.kicker_ru
  edit.kicker_zh = row.kicker_zh
  edit.title_en = row.title_en
  edit.title_ru = row.title_ru
  edit.title_zh = row.title_zh
  edit.subtitle_en = row.subtitle_en
  edit.subtitle_ru = row.subtitle_ru
  edit.subtitle_zh = row.subtitle_zh
  edit.body_en = row.body_en
  edit.body_ru = row.body_ru
  edit.body_zh = row.body_zh
  edit.footnote_en = row.footnote_en
  edit.footnote_ru = row.footnote_ru
  edit.footnote_zh = row.footnote_zh
  edit.image_path = row.image_path
  edit.payload_json = row.payload_json || '{}'
}

function openCreate() {
  selected.value = null
  createOpen.value = true
  createForm.block_type = 'richtext'
  createForm.anchor_id = ''
  createForm.is_published = false
}

async function submitCreate() {
  creating.value = true
  try {
    await $fetch('/api/admin/landing', {
      method: 'POST',
      headers: store.getAuthHeader(),
      body: {
        block_type: createForm.block_type,
        anchor_id: createForm.anchor_id || null,
        is_published: createForm.is_published,
        payload_json: '{}',
      },
    })
    createOpen.value = false
    await refresh()
    toast.add({ title: 'Блок создан', color: 'green' })
  }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    toast.add({ title: 'Не удалось создать', description: msg, color: 'red' })
  }
  finally {
    creating.value = false
  }
}

async function saveEdit() {
  if (!selected.value) return
  saving.value = true
  saveError.value = ''
  try {
    let payload = edit.payload_json
    try {
      payload = JSON.stringify(JSON.parse(edit.payload_json || '{}'))
    }
    catch {
      throw new Error('Payload JSON невалиден')
    }
    await $fetch(`/api/admin/landing/${selected.value.id}`, {
      method: 'PUT',
      headers: store.getAuthHeader(),
      body: {
        sort_order: edit.sort_order,
        is_published: edit.is_published,
        block_type: edit.block_type,
        anchor_id: edit.anchor_id || null,
        neuron_label_en: edit.neuron_label_en,
        neuron_label_ru: edit.neuron_label_ru,
        neuron_label_zh: edit.neuron_label_zh,
        kicker_en: edit.kicker_en,
        kicker_ru: edit.kicker_ru,
        kicker_zh: edit.kicker_zh,
        title_en: edit.title_en,
        title_ru: edit.title_ru,
        title_zh: edit.title_zh,
        subtitle_en: edit.subtitle_en,
        subtitle_ru: edit.subtitle_ru,
        subtitle_zh: edit.subtitle_zh,
        body_en: edit.body_en,
        body_ru: edit.body_ru,
        body_zh: edit.body_zh,
        footnote_en: edit.footnote_en,
        footnote_ru: edit.footnote_ru,
        footnote_zh: edit.footnote_zh,
        image_path: edit.image_path,
        payload_json: payload,
      },
    })
    await refresh()
    const next = sortedRows.value.find(r => r.id === selected.value!.id)
    if (next) selectRow(next)
    toast.add({ title: 'Сохранено', color: 'green' })
  }
  catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : String(e)
  }
  finally {
    saving.value = false
  }
}

async function move(row: LandingBlockRow, dir: number) {
  const list = sortedRows.value
  const i = list.findIndex(r => r.id === row.id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  const a = list[i]
  const b = list[j]
  const ao = a.sort_order
  const bo = b.sort_order
  try {
    await $fetch(`/api/admin/landing/${a.id}`, {
      method: 'PUT',
      headers: store.getAuthHeader(),
      body: { sort_order: bo },
    })
    await $fetch(`/api/admin/landing/${b.id}`, {
      method: 'PUT',
      headers: store.getAuthHeader(),
      body: { sort_order: ao },
    })
    await refresh()
  }
  catch {
    /* ignore */
  }
}

async function removeRow(row: LandingBlockRow) {
  if (!confirm(`Удалить блок #${row.id} (${blockLabel(row.block_type)})?`)) return
  try {
    await $fetch(`/api/admin/landing/${row.id}`, {
      method: 'DELETE',
      headers: store.getAuthHeader(),
    })
    if (selected.value?.id === row.id) selected.value = null
    await refresh()
    toast.add({ title: 'Блок удалён', color: 'green' })
  }
  catch {
    /* ignore */
  }
}
</script>

<style scoped>
.landing-cms-page {
  max-width: 1440px;
}

.landing-list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.landing-list-item:hover {
  background: color-mix(in srgb, var(--gv-primary) 5%, transparent);
}

.landing-list-item--active {
  background: color-mix(in srgb, var(--gv-primary) 8%, transparent);
  border-left-color: var(--gv-primary);
}

.skeleton-row {
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--gv-border-subtle) 25%, var(--gv-border-principal) 50%, var(--gv-border-subtle) 75%);
  background-size: 200% 100%;
  animation: sk 1.5s ease-in-out infinite;
}

.admin-landing-preview-frame {
  padding: 2rem;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-subtle);
  border-radius: 24px;
  overflow: hidden;
  position: relative;
}

@keyframes sk {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 1024px) {
  .landing-cms-page {
    padding-bottom: 2rem;
  }
}
</style>
