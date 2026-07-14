<template>
  <div class="gv-workspace-page">
    <div class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] px-4 flex items-center gap-4">
      <button 
        class="py-3 text-sm font-semibold border-b-2 transition-colors"
        :class="activeTab === 'routes' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'"
        @click="activeTab = 'routes'"
      >
        Маршруты
      </button>
      <button 
        class="py-3 text-sm font-semibold border-b-2 transition-colors"
        :class="activeTab === 'templates' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'"
        @click="activeTab = 'templates'"
      >
        Шаблоны контекста
      </button>
    </div>

    <!-- Routes Tab -->
    <div v-if="activeTab === 'routes'" class="workspace-grid grid grid-cols-12 gap-0 flex-1 min-h-0">
      
      <!-- Left Pane: List (4/12) -->
      <div class="workspace-list col-span-4 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-sparkles" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Storytelling</h1>
              <p class="text-[10px] text-gray-500 font-medium">Маршруты (Stories)</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input 
              type="file" 
              ref="fileInputRef" 
              accept=".json" 
              class="hidden" 
              @change="onFileSelected"
            >
            <GvButton 
              type="button" 
              color="gray" 
              variant="ghost"
              size="xs" 
              icon="i-heroicons-arrow-up-tray"
              title="Импорт"
              @click="triggerImport"
            />
            <GvButton 
              type="button" 
              color="gray" 
              variant="ghost"
              size="xs" 
              icon="i-heroicons-arrow-down-tray"
              title="Экспорт"
              @click="exportRoutes"
            />
            <GvButton 
              type="button" 
              color="primary" 
              size="xs" 
              icon="i-heroicons-plus"
              @click="startCreate"
            >
              Новый
            </GvButton>
          </div>
        </header>
        
        <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <BaseSearch
            v-model="searchQuery"
            placeholder="Поиск маршрута..."
            :is-pending="false"
            class="flex-1"
          />
        </div>

        <div class="category-scroll-container flex-1 overflow-y-auto">
          <div v-if="!filteredRoutes || filteredRoutes.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-sparkles" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Маршруты не найдены</p>
          </div>
          <div v-else class="p-3 space-y-2">
            <div
              v-for="route in filteredRoutes"
              :key="route.id"
              class="group flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#161618] hover:border-sky-500/30 cursor-pointer transition-colors"
              :class="{ 'border-sky-500 ring-1 ring-sky-500': selectedRouteId === route.id }"
              @click="startEdit(route)"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{{ route.title }}</div>
                <div class="text-xs text-gray-500 truncate mt-0.5">{{ route.nodes_path?.length || 0 }} шагов</div>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <GvButton type="button" unstyled chromeless square size="xs" icon="i-heroicons-trash" class="text-gray-400 hover:text-red-500" @click.stop="deleteRoute(route.id)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Pane: Editor (8/12) -->
      <div class="workspace-editor-pane col-span-8 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        <div v-if="!mode" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите маршрут слева для редактирования или создайте новый</p>
        </div>

        <div v-else class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-3xl mx-auto">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">
              {{ mode === 'create' ? 'Создать маршрут' : 'Редактировать маршрут' }}
            </h2>
            <UForm :state="form" @submit="saveRoute" class="space-y-6">
              
              <GvInput 
                v-model="form.title" 
                label="Название маршрута" 
                placeholder="Введение в Gativus"
                required
              />
              
              <GvInput 
                v-model="form.description" 
                label="Описание" 
                placeholder="Короткое описание для админки"
              />

              <div class="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-gray-50 dark:bg-[#161618]">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white">Шаги маршрута (Узлы графа)</h3>
                  <span class="text-xs text-gray-500">{{ form.nodes_path.length }} / 25</span>
                </div>

                <!-- Поиск узла для добавления -->
                <div class="mb-4 flex gap-2">
                  <USelectMenu
                    v-model="selectedNodeToAdd"
                    :options="searchableNodes"
                    option-attribute="title"
                    value-attribute="id"
                    searchable
                    searchable-placeholder="Поиск узла (книга, статья, термин)..."
                    placeholder="Выберите узел для добавления"
                    class="flex-1"
                  >
                    <template #label>
                      <span v-if="selectedNodeToAdd" class="truncate">
                        {{ searchableNodes.find(n => n.id === selectedNodeToAdd)?.title }}
                      </span>
                      <span v-else>Выберите узел для добавления</span>
                    </template>
                  </USelectMenu>
                  <GvButton type="button" @click="addStep" :disabled="!selectedNodeToAdd || form.nodes_path.length >= 25">Добавить</GvButton>
                </div>

                <!-- Список шагов -->
                <div class="space-y-4">
                  <div v-for="(nodeId, idx) in form.nodes_path" :key="idx" class="flex gap-4 p-3 bg-white dark:bg-[#111113] border border-gray-200 dark:border-gray-800 rounded-lg relative">
                    <div class="flex-none pt-2 flex flex-col items-center">
                      <div class="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold">{{ idx + 1 }}</div>
                      <div v-if="idx < form.nodes_path.length - 1" class="w-px h-full bg-gray-200 dark:bg-gray-800 mt-2"></div>
                    </div>
                    <div class="flex-1 space-y-3">
                      <div class="font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center justify-between">
                        <span>{{ getNodeTitle(nodeId) }}</span>
                        <div class="flex gap-2">
                          <button type="button" class="text-gray-400 hover:text-sky-500" @click="moveStepUp(idx)" :disabled="idx === 0">
                            <UIcon name="i-heroicons-chevron-up" />
                          </button>
                          <button type="button" class="text-gray-400 hover:text-sky-500" @click="moveStepDown(idx)" :disabled="idx === form.nodes_path.length - 1">
                            <UIcon name="i-heroicons-chevron-down" />
                          </button>
                          <button type="button" class="text-gray-400 hover:text-red-500 ml-2" @click="removeStep(idx)">
                            <UIcon name="i-heroicons-trash" />
                          </button>
                        </div>
                      </div>
                      <UTextarea
                        v-model="form.custom_messages[idx]"
                        placeholder="Кастомный текст для этого шага (оставьте пустым для дефолтного описания узла)"
                        :rows="2"
                        class="w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
                <GvButton type="button" variant="ghost" color="gray" @click="mode = null">Отмена</GvButton>
                <GvButton type="submit" color="primary" :loading="isSaving">
                  Сохранить
                </GvButton>
              </div>
            </UForm>
          </div>
        </div>
      </div>
    </div>

    <!-- Templates Tab -->
    <div v-else-if="activeTab === 'templates'" class="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#fafafa] dark:bg-[#111113] p-6">
      <div class="max-w-3xl mx-auto w-full">
        <h2 class="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">Шаблоны контекста</h2>
        <div class="text-sm text-gray-500 mb-6">
          Эти тексты отображаются при переходах "Вверх" и "Вниз" в графе. Можно использовать переменные типа <code>{target_title}</code>, <code>{target_desc}</code>, <code>{mentions}</code>.
        </div>
        
        <UForm :state="templates" @submit="saveTemplates" class="space-y-6">
          <div class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#161618]">
            <h3 class="font-semibold mb-4 text-gray-900 dark:text-white">Термин ➔ Статья (Вверх)</h3>
            <UTextarea v-model="templates.term_to_article_up" placeholder="Термин встречается {mentions} раз в статье {target_title}." />
          </div>
          
          <div class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#161618]">
            <h3 class="font-semibold mb-4 text-gray-900 dark:text-white">Статья ➔ Книга (Вверх)</h3>
            <UTextarea v-model="templates.article_to_book_up" placeholder="Статья является частью книги {target_title}." />
          </div>
          
          <div class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#161618]">
            <h3 class="font-semibold mb-4 text-gray-900 dark:text-white">Книга ➔ Категория (Вверх)</h3>
            <UTextarea v-model="templates.book_to_category_up" placeholder="Книга находится в категории {target_title}." />
          </div>
          
          <div class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#161618]">
            <h3 class="font-semibold mb-4 text-gray-900 dark:text-white">Категория ➔ Книга (Вниз)</h3>
            <UTextarea v-model="templates.category_to_book_down" placeholder="В эту категорию входит книга {target_title}." />
          </div>

          <div class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#161618]">
            <h3 class="font-semibold mb-4 text-gray-900 dark:text-white">Книга ➔ Статья (Вниз)</h3>
            <UTextarea v-model="templates.book_to_article_down" placeholder="Книга включает статью {target_title}." />
          </div>

          <div class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#161618]">
            <h3 class="font-semibold mb-4 text-gray-900 dark:text-white">Статья ➔ Термин (Вниз)</h3>
            <UTextarea v-model="templates.article_to_term_down" placeholder="В статье часто упоминается {target_title} ({mentions} раз)." />
          </div>
          
          <div class="flex justify-end pt-4">
            <GvButton type="submit" color="primary" :loading="isSavingTemplates">Сохранить шаблоны</GvButton>
          </div>
        </UForm>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const activeTab = ref<'routes' | 'templates'>('routes')

const routes = ref<any[]>([])
const templates = ref<Record<string, string>>({})
const nodes = ref<any[]>([])
const searchQuery = ref('')
const selectedRouteId = ref<number | null>(null)
const mode = ref<'create' | 'edit' | null>(null)
const isSaving = ref(false)

const form = ref({
  id: null as number | null,
  title: '',
  description: '',
  nodes_path: [] as string[],
  custom_messages: {} as Record<number, string>
})

const selectedNodeToAdd = ref<string | undefined>(undefined)

const searchableNodes = computed(() => {
  return nodes.value.map(n => ({
    id: n.id,
    title: `[${n.type || 'node'}] ${n.title}`
  }))
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

const loadRoutes = async () => {
  try {
    routes.value = await $fetch('/api/admin/storytelling')
  } catch (e) {
    console.error(e)
  }
}

const loadNodes = async () => {
  try {
    const data = await $fetch<any>('/api/public/graph-data')
    nodes.value = data.nodes || []
  } catch (e) {
    console.error(e)
  }
}

const startCreate = () => {
  mode.value = 'create'
  selectedRouteId.value = null
  form.value = {
    id: null,
    title: '',
    description: '',
    nodes_path: [],
    custom_messages: {}
  }
  selectedNodeToAdd.value = undefined
}

const startEdit = (route: any) => {
  mode.value = 'edit'
  selectedRouteId.value = route.id
  form.value = {
    id: route.id,
    title: route.title,
    description: route.description || '',
    nodes_path: [...(route.nodes_path || [])],
    custom_messages: { ...(route.custom_messages || {}) }
  }
  selectedNodeToAdd.value = undefined
}

const addStep = () => {
  if (selectedNodeToAdd.value && form.value.nodes_path.length < 25) {
    form.value.nodes_path.push(selectedNodeToAdd.value)
    selectedNodeToAdd.value = undefined
  }
}

const removeStep = (idx: number) => {
  form.value.nodes_path.splice(idx, 1)
  // shift custom messages
  const newMsgs: Record<number, string> = {}
  form.value.nodes_path.forEach((_, i) => {
    if (i < idx) newMsgs[i] = form.value.custom_messages[i]
    if (i >= idx) newMsgs[i] = form.value.custom_messages[i + 1]
  })
  form.value.custom_messages = newMsgs
}

const moveStepUp = (idx: number) => {
  if (idx <= 0) return
  const path = form.value.nodes_path
  const msgs = form.value.custom_messages
  const tempPath = path[idx - 1]
  path[idx - 1] = path[idx]
  path[idx] = tempPath
  const tempMsg = msgs[idx - 1]
  msgs[idx - 1] = msgs[idx]
  msgs[idx] = tempMsg
}

const moveStepDown = (idx: number) => {
  if (idx >= form.value.nodes_path.length - 1) return
  const path = form.value.nodes_path
  const msgs = form.value.custom_messages
  const tempPath = path[idx + 1]
  path[idx + 1] = path[idx]
  path[idx] = tempPath
  const tempMsg = msgs[idx + 1]
  msgs[idx + 1] = msgs[idx]
  msgs[idx] = tempMsg
}

const saveRoute = async () => {
  isSaving.value = true
  try {
    const payload = {
      title: form.value.title,
      description: form.value.description,
      nodes_path: form.value.nodes_path,
      custom_messages: form.value.custom_messages
    }
    if (mode.value === 'create') {
      await $fetch('/api/admin/storytelling', { method: 'POST', body: payload })
    } else {
      await $fetch(`/api/admin/storytelling/${form.value.id}`, { method: 'PUT', body: payload })
    }
    await loadRoutes()
    mode.value = null
  } catch (e) {
    console.error(e)
    alert('Ошибка при сохранении')
  } finally {
    isSaving.value = false
  }
}

const deleteRoute = async (id: number) => {
  if (!confirm('Удалить маршрут?')) return
  try {
    await $fetch(`/api/admin/storytelling/${id}`, { method: 'DELETE' })
    if (selectedRouteId.value === id) mode.value = null
    await loadRoutes()
  } catch (e) {
    console.error(e)
  }
}

const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerImport = () => {
  fileInputRef.value?.click()
}

const onFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  try {
    const text = await file.text()
    const routes = JSON.parse(text)
    if (!Array.isArray(routes)) {
      alert('Неверный формат файла. Ожидается массив.')
      return
    }
    
    await $fetch('/api/admin/storytelling/import', {
      method: 'POST',
      body: routes
    })
    
    alert('Импорт успешно завершен')
    await loadRoutes()
  } catch (err) {
    console.error(err)
    alert('Ошибка при импорте. Проверьте формат файла.')
  } finally {
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const exportRoutes = () => {
  window.open('/api/admin/storytelling/export', '_blank')
}

onMounted(() => {
  loadRoutes()
  loadTemplates()
  loadNodes()
})

const isSavingTemplates = ref(false)

const loadTemplates = async () => {
  try {
    const data = await $fetch('/api/admin/context-templates')
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

const saveTemplates = async () => {
  isSavingTemplates.value = true
  try {
    await $fetch('/api/admin/context-templates', {
      method: 'POST',
      body: templates.value
    })
    toast.add({ title: 'Шаблоны сохранены', color: 'green' })
  } catch (e: any) {
    toast.add({ title: 'Ошибка сохранения', description: e.data?.message, color: 'red' })
  } finally {
    isSavingTemplates.value = false
  }
}
</script>
