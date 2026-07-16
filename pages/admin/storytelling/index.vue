<template>
  <div class="gv-workspace-page flex flex-col h-full min-h-0">
    <div class="workspace-grid grid grid-cols-12 gap-0 flex-1 min-h-0">
      
      <!-- Left Pane (4/12) -->
      <div v-show="!mode" class="workspace-list lg:col-span-4 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <UIcon name="i-heroicons-sparkles" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Storytelling</h1>
              <p class="text-[10px] text-gray-500 font-medium">Маршруты и шаблоны</p>
            </div>
          </div>
        </header>

        <!-- Tabs Switcher -->
        <div class="flex border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-[#161618] px-4 pt-2 gap-4">
          <button 
            class="py-2 text-sm font-semibold border-b-2 transition-colors outline-none"
            :class="activeTab === 'routes' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="activeTab = 'routes'"
          >
            Маршруты
          </button>
          <button 
            class="py-2 text-sm font-semibold border-b-2 transition-colors outline-none"
            :class="activeTab === 'templates' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="activeTab = 'templates'"
          >
            Шаблоны текстов
          </button>
        </div>

        <!-- Routes List View -->
        <template v-if="activeTab === 'routes'">
          <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <BaseSearch
              v-model="searchQuery"
              placeholder="Поиск экскурсии..."
              :is-pending="false"
              class="flex-1"
            />
            <GvButton 
              type="button" 
              color="indigo" 
              size="xs" 
              icon="i-heroicons-plus"
              @click="startCreate"
            >
              Создать
            </GvButton>
          </div>

          <div class="list-scroll-container flex-1 overflow-y-auto custom-scrollbar">
            <div v-if="filteredRoutes.length === 0" class="p-8 text-center text-gray-400">
              <UIcon name="i-heroicons-magnifying-glass" class="text-3xl mb-2 opacity-50" />
              <p class="text-xs">Маршруты не найдены</p>
            </div>
            <div v-else class="p-3 space-y-1">
              <div 
                v-for="r in filteredRoutes" 
                :key="r.id"
                class="group p-3 rounded-lg cursor-pointer transition-colors border"
                :class="selectedRouteId === r.id ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-[#1a1a1d]'"
                @click="startEdit(r)"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1 min-w-0 pr-2">
                    <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ r.title }}</div>
                    <div class="text-xs text-gray-500 truncate mt-0.5">{{ r.description || 'Нет описания' }}</div>
                    <div class="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                      <UIcon name="i-heroicons-map" />
                      {{ r.nodes_path?.length || 0 }} шагов
                    </div>
                  </div>
                  <button 
                    type="button"
                    class="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded transition-all"
                    @click.stop="deleteRoute(r.id)"
                    title="Удалить"
                  >
                    <UIcon name="i-heroicons-trash" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161618] flex gap-2 shrink-0">
            <input type="file" ref="fileInputRef" accept=".json" class="hidden" @change="onFileSelected">
            <GvButton type="button" color="gray" variant="ghost" size="xs" icon="i-heroicons-arrow-up-tray" @click="triggerImport" class="flex-1 justify-center">Импорт</GvButton>
            <GvButton type="button" color="gray" variant="ghost" size="xs" icon="i-heroicons-arrow-down-tray" @click="exportRoutes" class="flex-1 justify-center">Экспорт</GvButton>
          </div>
        </template>
        
        <!-- Templates List View (Empty state or instructions) -->
        <template v-else>
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-document-text" class="text-4xl mb-3 opacity-30" />
            <p class="text-sm">Редактирование шаблонов контекстных сообщений для графа.</p>
            <p class="text-xs mt-2 opacity-70">Настройте шаблоны в правой панели.</p>
          </div>
        </template>
      </div>

      <!-- Right Pane (8/12 or 12/12) -->
      <div :class="!mode ? 'col-span-12 lg:col-span-8' : 'col-span-12'" class="workspace-editor-pane bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        
        <!-- Templates Editor -->
        <template v-if="activeTab === 'templates'">
          <div class="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
            <div class="max-w-3xl mx-auto">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Шаблоны контекстных подсказок</h2>
              <p class="text-sm text-gray-500 mb-8">Эти тексты отображаются при переходах "Вверх" и "Вниз" в графе. Можно использовать переменные типа <code>{target_title}</code>, <code>{mentions}</code>.</p>
              
              <UForm :state="templates" @submit="saveTemplates" class="space-y-6">
                <!-- Group: Вверх -->
                <div class="bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
                  <div class="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <UIcon name="i-heroicons-arrow-up" class="text-lg" />
                    <h3 class="font-bold uppercase tracking-wider text-xs">Переходы Вверх</h3>
                  </div>
                  <UFormGroup label="Термин -> Статья"><UTextarea v-model="templates.term_to_article_up" autoresize :rows="2" /></UFormGroup>
                  <UFormGroup label="Статья -> Книга"><UTextarea v-model="templates.article_to_book_up" autoresize :rows="2" /></UFormGroup>
                  <UFormGroup label="Книга -> Категория"><UTextarea v-model="templates.book_to_category_up" autoresize :rows="2" /></UFormGroup>
                </div>

                <!-- Group: Вниз -->
                <div class="bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
                  <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <UIcon name="i-heroicons-arrow-down" class="text-lg" />
                    <h3 class="font-bold uppercase tracking-wider text-xs">Переходы Вниз</h3>
                  </div>
                  <UFormGroup label="Категория -> Книга"><UTextarea v-model="templates.category_to_book_down" autoresize :rows="2" /></UFormGroup>
                  <UFormGroup label="Книга -> Статья"><UTextarea v-model="templates.book_to_article_down" autoresize :rows="2" /></UFormGroup>
                  <UFormGroup label="Статья -> Термин"><UTextarea v-model="templates.article_to_term_down" autoresize :rows="2" /></UFormGroup>
                </div>

                <div class="flex justify-end sticky bottom-0 py-4 bg-[#fafafa] dark:bg-[#161618] border-t border-gray-200 dark:border-gray-800 mt-8">
                  <GvButton type="submit" color="indigo" :loading="isSavingTemplates">Сохранить шаблоны</GvButton>
                </div>
              </UForm>
            </div>
          </div>
        </template>

        <!-- Route Editor -->
        <template v-else>
          <div v-if="!mode" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
            <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
            <p class="text-sm font-medium text-gray-500">Выберите маршрут слева или создайте новый</p>
          </div>

          <div v-else class="workspace-editor-scroll flex-1 overflow-y-auto bg-white dark:bg-[#111113] custom-scrollbar">
            
            <header class="editor-header shrink-0 px-6 py-4 bg-white dark:bg-[#1a1a1d] border-b border-gray-200 dark:border-[#2a2a2e] sticky top-0 z-10 flex justify-between items-center">
              <div>
                <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                  {{ mode === 'create' ? 'Новый маршрут' : 'Редактирование' }}
                </span>
                <h2 class="text-lg font-bold text-gray-900 dark:text-white mt-1">{{ form.title || 'Без названия' }}</h2>
              </div>
              <div class="flex items-center gap-2">
                <GvButton @click="mode = null" color="gray" variant="ghost" size="sm" icon="i-heroicons-arrow-left">Вернуться к списку</GvButton>
                <GvButton @click="saveRoute" color="indigo" :loading="isSaving" size="sm" icon="i-heroicons-check">Сохранить</GvButton>
              </div>
            </header>

            <div class="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              <!-- Left Column: Route Properties & Steps -->
              <div class="space-y-8">
                
                <UTabs :items="[
                  { key: 'ru', label: 'Русский (RU)' },
                  { key: 'en', label: 'English (EN/Default)' },
                  { key: 'zh', label: 'Chinese (ZH)' }
                ]" v-model="selectedLangIndex" class="mb-2" />

                <div class="space-y-4">
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 pb-2">Основные данные</h3>
                  <UFormGroup :label="`Название экскурсии (${currentLang.toUpperCase()})`" required>
                    <UInput v-if="currentLang === 'ru'" v-model="form.title_ru" placeholder="Введение в Gativus" />
                    <UInput v-else-if="currentLang === 'zh'" v-model="form.title_zh" placeholder="Gativus 简介" />
                    <UInput v-else v-model="form.title" placeholder="Introduction to Gativus" />
                  </UFormGroup>
                  <UFormGroup :label="`Описание (${currentLang.toUpperCase()})`">
                    <UInput v-if="currentLang === 'ru'" v-model="form.description_ru" placeholder="Коротко о маршруте" />
                    <UInput v-else-if="currentLang === 'zh'" v-model="form.description_zh" placeholder="关于路线" />
                    <UInput v-else v-model="form.description" placeholder="Short description" />
                  </UFormGroup>
                </div>

                <div class="space-y-4">
                  <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
                    <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Шаги маршрута ({{ form.nodes_path.length }})</h3>
                  </div>
                  
                  <div v-if="form.nodes_path.length === 0" class="text-sm text-gray-500 italic p-4 border border-dashed rounded-lg text-center">
                    Нет узлов. Выберите их из панели справа.
                  </div>
                  
                  <div class="space-y-3">
                    <div v-for="(nodeId, idx) in form.nodes_path" :key="idx" class="flex gap-3 p-3 bg-gray-50 dark:bg-[#1a1a1d] border border-gray-200 dark:border-gray-800 rounded-lg group">
                      
                      <div class="flex flex-col gap-1 mt-1 shrink-0">
                        <button type="button" @click="moveStepUp(idx)" :disabled="idx === 0" class="text-gray-400 hover:text-indigo-500 disabled:opacity-30"><UIcon name="i-heroicons-chevron-up" /></button>
                        <button type="button" @click="moveStepDown(idx)" :disabled="idx === form.nodes_path.length - 1" class="text-gray-400 hover:text-indigo-500 disabled:opacity-30"><UIcon name="i-heroicons-chevron-down" /></button>
                      </div>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-2">
                          <div class="text-sm font-semibold truncate">{{ idx + 1 }}. {{ getNodeTitle(nodeId) }}</div>
                          <button type="button" @click="removeStep(idx)" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Удалить шаг"><UIcon name="i-heroicons-x-mark" /></button>
                        </div>
                        <UInput v-if="currentLang === 'ru'" v-model="form.custom_messages_ru[idx]" placeholder="Сообщение гида (необязательно)..." size="sm" />
                        <UInput v-else-if="currentLang === 'zh'" v-model="form.custom_messages_zh[idx]" placeholder="导游留言（选填）..." size="sm" />
                        <UInput v-else v-model="form.custom_messages[idx]" placeholder="Guide message (optional)..." size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Node Selector by Subgroups -->
              <div class="space-y-4 border-l border-gray-200 dark:border-gray-800 pl-8 -ml-4">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 pb-2 flex justify-between items-center">
                  <span>Добавить узлы</span>
                  <span class="text-xs font-normal text-gray-500 normal-case">{{ form.nodes_path.length }} / 25 макс.</span>
                </h3>
                
                <BaseSearch
                  v-model="nodeSearchQuery"
                  placeholder="Поиск по всем группам..."
                  :is-pending="false"
                  class="w-full"
                />

                <UTabs :items="nodeGroups" class="mt-4">
                  <template #item="{ item }">
                    <div class="py-3">
                      <div v-if="groupedNodes[item.key]?.length === 0" class="text-sm text-gray-500 italic p-4 text-center">
                        Ничего не найдено
                      </div>
                      <div v-else class="max-h-[500px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                        <div 
                          v-for="n in groupedNodes[item.key]" 
                          :key="n.id"
                          class="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2e] rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors cursor-pointer group"
                          @click="addNodeToRoute(n.id)"
                        >
                          <span class="text-sm truncate mr-2">{{ n.title }}</span>
                          <UIcon name="i-heroicons-plus-circle" class="text-indigo-500 opacity-0 group-hover:opacity-100 text-lg" />
                        </div>
                      </div>
                    </div>
                  </template>
                </UTabs>
              </div>

            </div>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
  fluid: true
})

useHead({
  title: 'Storytelling - Админ-панель'
})

const store = userStore()
const toast = useToast()

const activeTab = ref<'routes' | 'templates'>('routes')

// Data
const routes = ref<any[]>([])
const templates = ref<Record<string, string>>({})
const nodes = ref<any[]>([])

// UI State
const searchQuery = ref('')
const nodeSearchQuery = ref('')
const selectedRouteId = ref<number | null>(null)
const mode = ref<'create' | 'edit' | null>(null)
const selectedLangIndex = ref(0)
const currentLang = computed(() => {
  return ['ru', 'en', 'zh'][selectedLangIndex.value]
})

const isSaving = ref(false)
const isSavingTemplates = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = ref({
  id: null as number | null,
  title: '',
  title_ru: '',
  title_zh: '',
  description: '',
  description_ru: '',
  description_zh: '',
  nodes_path: [] as string[],
  custom_messages: {} as Record<number, string>,
  custom_messages_ru: {} as Record<number, string>,
  custom_messages_zh: {} as Record<number, string>
})

// Subgroups setup
const nodeGroups = [
  { key: 'category', label: 'Категории', icon: 'i-heroicons-folder' },
  { key: 'book', label: 'Книги', icon: 'i-heroicons-book-open' },
  { key: 'article', label: 'Статьи', icon: 'i-heroicons-document-text' },
  { key: 'term', label: 'Термины', icon: 'i-heroicons-hashtag' }
]

const groupedNodes = computed(() => {
  const groups: Record<string, any[]> = {
    category: [],
    book: [],
    article: [],
    term: []
  }
  
  const q = nodeSearchQuery.value.toLowerCase()
  nodes.value.forEach(n => {
    if (q && !n.title.toLowerCase().includes(q)) return
    const type = n.type || 'category'
    if (groups[type]) {
      groups[type].push(n)
    }
  })
  
  return groups
})

const filteredRoutes = computed(() => {
  if (!searchQuery.value) return routes.value
  const q = searchQuery.value.toLowerCase()
  return routes.value.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
})

const getNodeTitle = (id: string) => {
  const n = nodes.value.find(n => n.id === id)
  return n ? n.title : id
}

// Actions
const loadRoutes = async () => {
  try {
    routes.value = await $fetch('/api/admin/storytelling', { headers: store.getAuthHeader() })
  } catch (e) {
    console.error(e)
  }
}

const loadNodes = async () => {
  try {
    const data = await $fetch<any>('/api/knowledge-graph')
    nodes.value = data.nodes || []
  } catch (e) {
    console.error(e)
  }
}

const loadTemplates = async () => {
  try {
    const data = await $fetch('/api/admin/context-templates', { headers: store.getAuthHeader() })
    templates.value = {
      term_to_article_up: data.term_to_article_up || '',
      article_to_book_up: data.article_to_book_up || '',
      book_to_category_up: data.book_to_category_up || '',
      category_to_book_down: data.category_to_book_down || '',
      book_to_article_down: data.book_to_article_down || '',
      article_to_term_down: data.article_to_term_down || ''
    }
  } catch (e) {
    console.error(e)
  }
}

const startCreate = () => {
  mode.value = 'create'
  selectedRouteId.value = null
  selectedLangIndex.value = 0
  form.value = {
    id: null,
    title: '',
    title_ru: '',
    title_zh: '',
    description: '',
    description_ru: '',
    description_zh: '',
    nodes_path: [],
    custom_messages: {},
    custom_messages_ru: {},
    custom_messages_zh: {}
  }
}

const startEdit = (route: any) => {
  mode.value = 'edit'
  selectedRouteId.value = route.id
  selectedLangIndex.value = 0
  form.value = {
    id: route.id,
    title: route.title,
    title_ru: route.title_ru || '',
    title_zh: route.title_zh || '',
    description: route.description || '',
    description_ru: route.description_ru || '',
    description_zh: route.description_zh || '',
    nodes_path: [...(route.nodes_path || [])],
    custom_messages: { ...(route.custom_messages || {}) },
    custom_messages_ru: { ...(route.custom_messages_ru || {}) },
    custom_messages_zh: { ...(route.custom_messages_zh || {}) }
  }
}

const addNodeToRoute = (nodeId: string) => {
  if (form.value.nodes_path.length >= 25) {
    toast.add({ title: 'Лимит', description: 'Не более 25 узлов в маршруте', color: 'orange' })
    return
  }
  form.value.nodes_path.push(nodeId)
}

const removeStep = (idx: number) => {
  form.value.nodes_path.splice(idx, 1)
  
  const shiftMessages = (msgs: Record<number, string>) => {
    const newMsgs: Record<number, string> = {}
    form.value.nodes_path.forEach((_, i) => {
      if (i < idx) newMsgs[i] = msgs[i]
      if (i >= idx) newMsgs[i] = msgs[i + 1]
    })
    return newMsgs
  }
  
  form.value.custom_messages = shiftMessages(form.value.custom_messages)
  form.value.custom_messages_ru = shiftMessages(form.value.custom_messages_ru)
  form.value.custom_messages_zh = shiftMessages(form.value.custom_messages_zh)
}

const swapMessages = (idx1: number, idx2: number) => {
  const swap = (msgs: Record<number, string>) => {
    const temp = msgs[idx1]
    msgs[idx1] = msgs[idx2]
    msgs[idx2] = temp
  }
  swap(form.value.custom_messages)
  swap(form.value.custom_messages_ru)
  swap(form.value.custom_messages_zh)
}

const moveStepUp = (idx: number) => {
  if (idx <= 0) return
  const path = form.value.nodes_path
  const tempPath = path[idx - 1]
  path[idx - 1] = path[idx]
  path[idx] = tempPath
  swapMessages(idx - 1, idx)
}

const moveStepDown = (idx: number) => {
  if (idx >= form.value.nodes_path.length - 1) return
  const path = form.value.nodes_path
  const tempPath = path[idx + 1]
  path[idx + 1] = path[idx]
  path[idx] = tempPath
  swapMessages(idx + 1, idx)
}

const saveRoute = async () => {
  if (!form.value.title || !form.value.title.trim()) {
    toast.add({ title: 'Ошибка', description: 'Укажите название экскурсии', color: 'red' })
    return
  }

  isSaving.value = true
  try {
    const payload = {
      title: form.value.title,
      title_ru: form.value.title_ru,
      title_zh: form.value.title_zh,
      description: form.value.description,
      description_ru: form.value.description_ru,
      description_zh: form.value.description_zh,
      nodes_path: form.value.nodes_path,
      custom_messages: form.value.custom_messages,
      custom_messages_ru: form.value.custom_messages_ru,
      custom_messages_zh: form.value.custom_messages_zh
    }
    if (mode.value === 'create') {
      await $fetch('/api/admin/storytelling', { method: 'POST', body: payload, headers: store.getAuthHeader() })
    } else {
      await $fetch(`/api/admin/storytelling/${form.value.id}`, { method: 'PUT', body: payload, headers: store.getAuthHeader() })
    }
    await loadRoutes()
    mode.value = null
    toast.add({ title: 'Сохранено', color: 'green' })
  } catch (e: any) {
    console.error(e)
    toast.add({ title: 'Ошибка сохранения', description: e.data?.message || e.message, color: 'red' })
  } finally {
    isSaving.value = false
  }
}

const deleteRoute = async (id: number) => {
  if (!confirm('Удалить маршрут?')) return
  try {
    await $fetch(`/api/admin/storytelling/${id}`, { method: 'DELETE', headers: store.getAuthHeader() })
    if (selectedRouteId.value === id) mode.value = null
    await loadRoutes()
    toast.add({ title: 'Удалено', color: 'green' })
  } catch (e) {
    console.error(e)
  }
}

const triggerImport = () => {
  fileInputRef.value?.click()
}

const onFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const importedRoutes = JSON.parse(text)
    if (!Array.isArray(importedRoutes)) {
      toast.add({ title: 'Ошибка формата', description: 'Неверный JSON', color: 'red' })
      return
    }
    
    await $fetch('/api/admin/storytelling/import', {
      method: 'POST',
      body: importedRoutes,
      headers: store.getAuthHeader()
    })
    
    toast.add({ title: 'Импорт завершен', color: 'green' })
    await loadRoutes()
  } catch (err: any) {
    console.error(err)
    toast.add({ title: 'Ошибка', description: err.message, color: 'red' })
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const exportRoutes = () => {
  window.open('/api/admin/storytelling/export', '_blank')
}

const saveTemplates = async () => {
  isSavingTemplates.value = true
  try {
    await $fetch('/api/admin/context-templates', {
      method: 'POST',
      body: templates.value,
      headers: store.getAuthHeader()
    })
    toast.add({ title: 'Шаблоны сохранены', color: 'green' })
  } catch (e: any) {
    toast.add({ title: 'Ошибка сохранения', description: e.data?.message, color: 'red' })
  } finally {
    isSavingTemplates.value = false
  }
}

onMounted(() => {
  loadRoutes()
  loadTemplates()
  loadNodes()
})
</script>

<style scoped>
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px);
  overflow: hidden;
  background: var(--gv-surface);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #334155;
}
</style>
