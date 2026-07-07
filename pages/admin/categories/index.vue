<template>
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-12 gap-0">
      
      <!-- Left Pane: Tree (4/12) -->
      <div class="workspace-list col-span-4 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-briefcase" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Workspace</h1>
              <p class="text-[10px] text-gray-500 font-medium">Категории</p>
            </div>
          </div>
          <GvButton 
            type="button" 
            color="sky" 
            size="xs" 
            icon="i-heroicons-plus"
            @click="startCreate(null)"
          >
            Добавить корень
          </GvButton>
        </header>
        
        <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <BaseSearch
              v-model="searchQuery"
              placeholder="Поиск категории..."
              :is-pending="false"
              :is-debouncing="isTyping"
              class="flex-1"
            />
            
            <ExpandableFilters
              label="Фильтры"
              :active-count="activeFilterCount"
              :has-active-filters="activeFilterCount > 0"
            >
              <div class="filter-group">
                <span class="filter-group-label">Структура</span>
                <GvButton
                  type="button"
                  chromeless
                  variant="ghost"
                  color="gray"
                  class="gv-filter-pill gv-focusable"
                  :class="{ 'is-active': hasChildrenOnly }"
                  @click="hasChildrenOnly = !hasChildrenOnly"
                >
                  Только с подкатегориями
                </GvButton>
              </div>
            </ExpandableFilters>
          </div>
        </div>

        <div class="category-scroll-container flex-1 overflow-y-auto">
          <div v-if="!filteredTree || filteredTree.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-magnifying-glass" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Категории не найдены</p>
          </div>
          <div v-else class="p-3">
            <AdminCategoryItem
              v-for="cat in filteredTree"
              :key="cat.id"
              :category="cat"
              @delete="deleteCategory"
              @create-child="startCreate"
              @edit="startEdit"
              @move-up="moveUp"
              @move-down="moveDown"
            />
          </div>
        </div>
      </div>

      <!-- Right Pane: Editor (8/12) -->
      <div class="workspace-editor-pane col-span-8 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        <div v-if="!mode" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите категорию слева для редактирования или создайте новую</p>
        </div>

        <div v-else class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-2xl mx-auto">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">
              {{ mode === 'create' ? 'Создать категорию' : 'Редактировать категорию' }}
            </h2>
            <UForm :state="form" @submit="saveCategory" class="space-y-5">
              <UTabs :items="[
                { key: 'ru', label: 'Русский (RU)', icon: 'i-heroicons-language' },
                { key: 'en', label: 'English (EN)', icon: 'i-heroicons-globe-alt' }
              ]">
                <template #item="{ item }">
                  <div v-if="item.key === 'ru'" class="space-y-4 py-2">
                    <UFormGroup label="Название (RU)">
                      <UInput v-model="form.title_ru" />
                    </UFormGroup>
                    <UFormGroup label="Slug (RU)">
                      <UInput v-model="form.slug_ru" />
                    </UFormGroup>
                    <UFormGroup label="Описание (RU)">
                      <UTextarea v-model="form.description_ru" autoresize />
                    </UFormGroup>
                  </div>
                  <div v-else class="space-y-4 py-2">
                    <UFormGroup label="Название (EN/Default)" required>
                      <UInput v-model="form.title" />
                    </UFormGroup>
                    <UFormGroup label="Slug (EN/Default)">
                      <UInput v-model="form.slug" />
                    </UFormGroup>
                    <UFormGroup label="Описание (EN/Default)">
                      <UTextarea v-model="form.description" autoresize />
                    </UFormGroup>
                  </div>
                </template>
              </UTabs>

              <div class="grid md:grid-cols-2 gap-4">
                <UFormGroup label="Родитель">
                  <USelectMenu
                    v-model="form.parent_id"
                    :options="availableParentCategories"
                    value-attribute="id"
                    option-attribute="title"
                    searchable
                    clear-search-on-close
                  />
                </UFormGroup>

                <UFormGroup label="Порядок сортировки">
                  <UInput v-model.number="form.sort_order" type="number" />
                </UFormGroup>
              </div>

              <UFormGroup label="Иконка">
                <AdminIconPicker v-model="form.icon" />
              </UFormGroup>

              <div class="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <GvButton type="button" color="gray" variant="ghost" @click="cancelEdit">Отмена</GvButton>
                <GvButton type="submit" color="primary" :loading="saving">Сохранить</GvButton>
              </div>
            </UForm>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  fluid: true
})

useSeoMeta({ title: 'Категории — Workspace — Admin — Gativus' })

const store = userStore()
const toast = useToast()

const { data: tree, refresh } = await useFetch<any>('/api/categories?tree=true', {
  headers: store.getAuthHeader()
})

const { data: flatCategories, refresh: refreshFlat } = await useFetch<any>('/api/categories', {
  headers: store.getAuthHeader()
})

const allCategories = computed(() => (Array.isArray(flatCategories.value) ? flatCategories.value : []) as any[])

// Search and Filter
const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const hasChildrenOnly = ref(false)
const activeFilterCount = computed(() => (hasChildrenOnly.value ? 1 : 0))

const filteredTree = computed(() => {
  const source = (Array.isArray(tree.value) ? tree.value : []) as any[]
  const q = debouncedQuery.value.trim().toLowerCase()
  const visit = (nodes: any[]): any[] => nodes
    .map((node) => {
      const children = visit(node.children || [])
      const selfMatch = [node.title, node.title_ru, node.slug, node.slug_ru]
        .some((v) => String(v || '').toLowerCase().includes(q))
      if (!q && !selfMatch && !children.length) return { ...node, children }
      if (!q || selfMatch || children.length) return { ...node, children }
      return null
    })
    .filter(Boolean) as any[]
  const searched = visit(source)
  if (!hasChildrenOnly.value) return searched
  return searched.filter((node: any) => Array.isArray(node.children) && node.children.length > 0)
})

// Workspace States
const mode = ref<'create' | 'edit' | null>(null)
const editingCategoryId = ref<number | null>(null)
const saving = ref(false)

const form = reactive({
  title: '',
  title_ru: '',
  slug: '',
  slug_ru: '',
  parent_id: undefined as number | undefined,
  description: '',
  description_ru: '',
  icon: 'i-heroicons-folder',
  sort_order: 0
})

const availableParentCategories = computed(() => {
  const list = allCategories.value
  if (mode.value === 'edit' && editingCategoryId.value) {
    return list.filter((c: any) => c.id !== editingCategoryId.value)
  }
  return list
})

function startCreate(parentId: number | null = null) {
  mode.value = 'create'
  editingCategoryId.value = null
  form.title = ''
  form.title_ru = ''
  form.slug = ''
  form.slug_ru = ''
  form.parent_id = parentId ?? undefined
  form.description = ''
  form.description_ru = ''
  form.icon = 'i-heroicons-folder'
  form.sort_order = 0
}

function startEdit(cat: any) {
  mode.value = 'edit'
  editingCategoryId.value = cat.id
  form.title = cat.title || ''
  form.title_ru = cat.title_ru || ''
  form.slug = cat.slug || ''
  form.slug_ru = cat.slug_ru || ''
  form.parent_id = cat.parent_id ?? undefined
  form.description = cat.description || ''
  form.description_ru = cat.description_ru || ''
  form.icon = cat.icon || 'i-heroicons-folder'
  form.sort_order = cat.sort_order || 0
}

function cancelEdit() {
  mode.value = null
  editingCategoryId.value = null
}

async function saveCategory() {
  if (!form.title.trim()) {
    toast.add({ title: 'Укажите название EN/Default', color: 'red' })
    return
  }

  saving.value = true
  try {
    if (mode.value === 'create') {
      await $fetch('/api/categories', {
        method: 'POST',
        body: { ...form, parent_id: form.parent_id || null },
        headers: store.getAuthHeader()
      })
      toast.add({ title: 'Категория создана', color: 'green' })
    } else if (mode.value === 'edit' && editingCategoryId.value) {
      await $fetch(`/api/categories/${editingCategoryId.value}`, {
        method: 'PUT',
        body: { ...form, parent_id: form.parent_id || null },
        headers: store.getAuthHeader()
      })
      toast.add({ title: 'Категория сохранена', color: 'green' })
    }
    
    // Refresh both tree and flat list
    await Promise.all([refresh(), refreshFlat()])
    cancelEdit()
  } catch (err: any) {
    toast.add({ title: 'Ошибка сохранения', description: err?.data?.statusMessage || err.message, color: 'red' })
  } finally {
    saving.value = false
  }
}

const deleteCategory = async (id: number) => {
  if (!confirm('Вы уверены? Подкатегории будут перемещены на уровень выше.')) return

  try {
    await $fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: store.getAuthHeader()
    })
    if (editingCategoryId.value === id) {
      cancelEdit()
    }
    await Promise.all([refresh(), refreshFlat()])
    toast.add({ title: 'Категория удалена', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка при удалении', description: err.data?.statusMessage || err.message, color: 'red' })
  }
}

const moveUp = async (cat: any) => {
  await $fetch(`/api/categories/${cat.id}`, {
    method: 'PUT',
    body: { sort_order: (cat.sort_order || 0) - 1 },
    headers: store.getAuthHeader()
  })
  await refresh()
}

const moveDown = async (cat: any) => {
  await $fetch(`/api/categories/${cat.id}`, {
    method: 'PUT',
    body: { sort_order: (cat.sort_order || 0) + 1 },
    headers: store.getAuthHeader()
  })
  await refresh()
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

.category-scroll-container {
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
</style>
