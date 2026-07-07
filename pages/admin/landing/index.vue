<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-12 gap-0">
      
      <!-- Left Pane: Blocks List (3/12) -->
      <div class="workspace-list col-span-3 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-computer-desktop" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Workspace</h1>
              <p class="text-[10px] text-gray-500 font-medium">Лендинг</p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <GvButton
              type="button"
              color="gray"
              variant="soft"
              size="xs"
              icon="i-heroicons-arrow-path"
              :loading="pending"
              @click="refresh()"
            />
            <GvButton
              type="button"
              color="sky"
              size="xs"
              icon="i-heroicons-plus"
              @click="openCreate"
            >
              Новый
            </GvButton>
          </div>
        </header>

        <div class="blocks-scroll-container flex-1 overflow-y-auto">
          <div v-if="pending && sortedRows.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Загрузка блоков...</p>
          </div>
          <div v-else-if="sortedRows.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-computer-desktop" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Блоки не найдены</p>
          </div>
          <div v-else class="divide-y divide-black/5 dark:divide-white/5">
            <div
              v-for="row in sortedRows"
              :key="row.id"
              class="landing-list-item p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/10"
              :class="{ 'landing-list-item--active': selected?.id === row.id && !createOpen }"
              @click="selectRow(row)"
            >
              <div class="flex items-center gap-3 w-full min-w-0">
                <span class="text-[10px] font-black opacity-30 w-4 text-center">{{ row.sort_order }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ row.title_en || 'Untitled Block' }}</p>
                  <p class="text-[10px] uppercase tracking-wider opacity-50 font-bold mt-0.5 text-gray-500">
                    {{ blockLabel(row.block_type) }}
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0" @click.stop>
                  <GvButton
                    chromeless
                    square
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-chevron-up"
                    title="Переместить вверх"
                    @click="move(row, -1)"
                  />
                  <GvButton
                    chromeless
                    square
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-chevron-down"
                    title="Переместить вниз"
                    @click="move(row, 1)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Pane: Editor (9/12) -->
      <div class="workspace-editor-pane col-span-9 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        
        <!-- Empty State -->
        <div v-if="!selected && !createOpen" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-adjustments-horizontal" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите блок слева для редактирования или создайте новый</p>
        </div>

        <!-- Create Block Form -->
        <div v-else-if="createOpen" class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-2xl mx-auto space-y-6">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Создание блока</h2>
            
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
        </div>

        <!-- Edit Block Form -->
        <div v-else-if="selected" class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-4xl mx-auto space-y-6">
            <div class="flex items-center justify-between border-b border-gray-150 dark:border-gray-800 pb-4">
              <div>
                <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Настройки блока #{{ selected.id }}</h2>
                <p class="text-xs text-gray-500 mt-1">Тип: {{ blockLabel(edit.block_type) }}</p>
              </div>
              <GvButton
                chromeless
                variant="ghost"
                color="red"
                size="sm"
                icon="i-heroicons-trash"
                @click="removeRow(selected)"
              >
                Удалить блок
              </GvButton>
            </div>

            <!-- Meta Settings -->
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
                    <span class="text-sm font-bold text-gray-900 dark:text-white">{{ edit.is_published ? 'Опубликован' : 'Черновик' }}</span>
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
                    <AdminMediaPicker v-model="edit.image_path as any" upload-endpoint="/api/admin/uploads/landing" />
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

            <div class="flex items-center justify-between pt-6 border-t border-gray-150 dark:border-gray-800">
              <p v-if="saveError" class="text-sm text-red-500 font-bold">{{ saveError }}</p>
              <div class="ml-auto">
                <GvButton color="sky" size="lg" :loading="saving" icon="i-heroicons-check" class="rounded-xl px-10" @click="saveEdit">
                  Сохранить изменения
                </GvButton>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import type { LandingBlockRow, LandingBlockType, LandingBlockResolved } from '~/types/landing'
import { landingBlockComponent } from '~/utils/landingBlockMap'
import '~/assets/css/landing-home.css'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  fluid: true
})

useHead({ title: 'Лендинг — Workspace — Gativus Admin' })

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
  anchor_id: undefined as string | undefined,
  neuron_label_en: undefined as string | undefined,
  neuron_label_ru: undefined as string | undefined,
  neuron_label_zh: undefined as string | undefined,
  kicker_en: undefined as string | undefined,
  kicker_ru: undefined as string | undefined,
  kicker_zh: undefined as string | undefined,
  title_en: undefined as string | undefined,
  title_ru: undefined as string | undefined,
  title_zh: undefined as string | undefined,
  subtitle_en: undefined as string | undefined,
  subtitle_ru: undefined as string | undefined,
  subtitle_zh: undefined as string | undefined,
  body_en: undefined as string | undefined,
  body_ru: undefined as string | undefined,
  body_zh: undefined as string | undefined,
  footnote_en: undefined as string | undefined,
  footnote_ru: undefined as string | undefined,
  footnote_zh: undefined as string | undefined,
  image_path: undefined as string | undefined,
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
    anchorId: edit.anchor_id ?? null,
    neuronLabel: edit[`neuron_label_${suffix}` as keyof typeof edit] as string | null,
    kicker: edit[`kicker_${suffix}` as keyof typeof edit] as string | null,
    title: edit[`title_${suffix}` as keyof typeof edit] as string | null,
    subtitle: edit[`subtitle_${suffix}` as keyof typeof edit] as string | null,
    body: edit[`body_${suffix}` as keyof typeof edit] as string | null,
    footnote: edit[`footnote_${suffix}` as keyof typeof edit] as string | null,
    imagePath: edit.image_path ?? null,
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
  edit.anchor_id = row.anchor_id ?? undefined
  edit.neuron_label_en = row.neuron_label_en ?? undefined
  edit.neuron_label_ru = row.neuron_label_ru ?? undefined
  edit.neuron_label_zh = row.neuron_label_zh ?? undefined
  edit.kicker_en = row.kicker_en ?? undefined
  edit.kicker_ru = row.kicker_ru ?? undefined
  edit.kicker_zh = row.kicker_zh ?? undefined
  edit.title_en = row.title_en ?? undefined
  edit.title_ru = row.title_ru ?? undefined
  edit.title_zh = row.title_zh ?? undefined
  edit.subtitle_en = row.subtitle_en ?? undefined
  edit.subtitle_ru = row.subtitle_ru ?? undefined
  edit.subtitle_zh = row.subtitle_zh ?? undefined
  edit.body_en = row.body_en ?? undefined
  edit.body_ru = row.body_ru ?? undefined
  edit.body_zh = row.body_zh ?? undefined
  edit.footnote_en = row.footnote_en ?? undefined
  edit.footnote_ru = row.footnote_ru ?? undefined
  edit.footnote_zh = row.footnote_zh ?? undefined
  edit.image_path = row.image_path ?? undefined
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
        neuron_label_en: edit.neuron_label_en || null,
        neuron_label_ru: edit.neuron_label_ru || null,
        neuron_label_zh: edit.neuron_label_zh || null,
        kicker_en: edit.kicker_en || null,
        kicker_ru: edit.kicker_ru || null,
        kicker_zh: edit.kicker_zh || null,
        title_en: edit.title_en || null,
        title_ru: edit.title_ru || null,
        title_zh: edit.title_zh || null,
        subtitle_en: edit.subtitle_en || null,
        subtitle_ru: edit.subtitle_ru || null,
        subtitle_zh: edit.subtitle_zh || null,
        body_en: edit.body_en || null,
        body_ru: edit.body_ru || null,
        body_zh: edit.body_zh || null,
        footnote_en: edit.footnote_en || null,
        footnote_ru: edit.footnote_ru || null,
        footnote_zh: edit.footnote_zh || null,
        image_path: edit.image_path || null,
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
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px); /* 65px is the topbar height */
  overflow: hidden;
  background: var(--gv-surface);
}

.workspace-grid {
  height: 100%;
  flex: 1;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.blocks-scroll-container {
  overflow-y: auto;
  flex: 1;
}

.workspace-editor-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workspace-editor-scroll {
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.landing-list-item {
  border-bottom: 1px solid var(--gv-border-subtle);
}

.landing-list-item--active {
  background: rgba(14, 165, 233, 0.05) !important;
  border-left: 3px solid #0ea5e9;
  padding-left: 13px !important;
}
.dark .landing-list-item--active {
  background: rgba(14, 165, 233, 0.1) !important;
}

.admin-landing-preview-frame {
  padding: 2rem;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-subtle);
  border-radius: 24px;
  overflow: hidden;
  position: relative;
}
</style>
