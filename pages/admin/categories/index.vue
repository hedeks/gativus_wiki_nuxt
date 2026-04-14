<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const store = userStore()
const { data: tree, refresh } = await useFetch('/api/categories?tree=true', {
  headers: store.getAuthHeader()
})

const isModalOpen = ref(false)
const isDeleting = ref(false)
const selectedCategory = ref<any>(null)
const form = reactive({
  id: null as number | null,
  title: '',
  title_ru: '',
  slug: '',
  slug_ru: '',
  parent_id: null as number | null,
  description: '',
  description_ru: '',
  icon: 'i-heroicons-folder',
  sort_order: 0
})

const openCreate = (parentId: number | null = null) => {
  form.id = null
  form.title = ''
  form.title_ru = ''
  form.slug = ''
  form.slug_ru = ''
  form.parent_id = parentId
  form.description = ''
  form.description_ru = ''
  form.icon = 'i-heroicons-folder'
  form.sort_order = 0
  selectedCategory.value = null
  isModalOpen.value = true
}

const openEdit = (cat: any) => {
  form.id = cat.id
  form.title = cat.title
  form.title_ru = cat.title_ru || ''
  form.slug = cat.slug
  form.slug_ru = cat.slug_ru || ''
  form.parent_id = cat.parent_id
  form.description = cat.description || ''
  form.description_ru = cat.description_ru || ''
  form.icon = cat.icon || 'i-heroicons-folder'
  form.sort_order = cat.sort_order || 0
  selectedCategory.value = cat
  isModalOpen.value = true
}

const saveCategory = async () => {
  try {
    const method = form.id ? 'PUT' : 'POST'
    const url = form.id ? `/api/categories/${form.id}` : '/api/categories'
    
    await $fetch(url, {
      method,
      body: { ...form },
      headers: store.getAuthHeader()
    })
    
    isModalOpen.value = false
    refresh()
  } catch (err: any) {
    alert('Ошибка при сохранении: ' + (err.data?.statusMessage || err.message))
  }
}

const deleteCategory = async (id: number) => {
  if (!confirm('Вы уверены? Подкатегории будут перемещены на уровень выше.')) return
  
  try {
    await $fetch(`/api/categories/${id}`, { 
      method: 'DELETE',
      headers: store.getAuthHeader()
    })
    refresh()
  } catch (err: any) {
    alert('Ошибка при удалении: ' + (err.data?.statusMessage || err.message))
  }
}

const moveUp = async (cat: any) => {
  await $fetch(`/api/categories/${cat.id}`, {
    method: 'PUT',
    body: { sort_order: (cat.sort_order || 0) - 1 },
    headers: store.getAuthHeader()
  })
  refresh()
}

const moveDown = async (cat: any) => {
  await $fetch(`/api/categories/${cat.id}`, {
    method: 'PUT',
    body: { sort_order: (cat.sort_order || 0) + 1 },
    headers: store.getAuthHeader()
  })
  refresh()
}

const commonIcons = [
  'i-heroicons-folder', 'i-heroicons-folder-open', 'i-heroicons-book-open',
  'i-heroicons-academic-cap', 'i-heroicons-light-bulb', 'i-heroicons-briefcase',
  'i-heroicons-chart-bar', 'i-heroicons-chat-bubble-left-right', 'i-heroicons-cloud',
  'i-heroicons-code-bracket', 'i-heroicons-cog-6-tooth', 'i-heroicons-cpu-chip',
  'i-heroicons-cube', 'i-heroicons-device-tablet', 'i-heroicons-document-text',
  'i-heroicons-beaker', 'i-heroicons-globe-alt', 'i-heroicons-heart',
  'i-heroicons-home', 'i-heroicons-identification', 'i-heroicons-key',
  'i-heroicons-map', 'i-heroicons-microphone', 'i-heroicons-moon',
  'i-heroicons-newspaper', 'i-heroicons-paint-brush', 'i-heroicons-puzzle-piece',
  'i-heroicons-rocket', 'i-heroicons-shield-check', 'i-heroicons-sparkles',
  'i-heroicons-star', 'i-heroicons-user-group', 'i-heroicons-variable',
  'i-heroicons-video-camera', 'i-heroicons-wrench-screwdriver'
]

const showIconSelector = ref(false)
const selectIcon = (icon: string) => {
  form.icon = icon
  showIconSelector.value = false
}
</script>

<template>
  <div class="categories-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Управление категориями</h1>
        <p class="page-subtitle">Дерево категорий проекта Gativus</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        @click="openCreate()"
      >
        Добавить корень
      </UButton>
    </div>

    <div class="category-tree">
      <div v-if="!tree || tree.length === 0" class="empty-state">
        Категории не найдены.
      </div>
      
      <AdminCategoryItem
        v-for="cat in tree"
        :key="cat.id"
        :category="cat"
        @edit="openEdit"
        @delete="deleteCategory"
        @create-child="openCreate"
        @move-up="moveUp"
        @move-down="moveDown"
      />
    </div>

    <!-- Edit Modal -->
    <UModal v-model="isModalOpen">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ form.id ? 'Редактировать категорию' : 'Новая категория' }}
            </h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="isModalOpen = false" />
          </div>
        </template>

        <UForm :state="form" @submit="saveCategory" class="space-y-4">
          
          <UTabs :items="[
            { key: 'ru', label: 'Русский (RU)', icon: 'i-heroicons-language' },
            { key: 'en', label: 'English (EN)', icon: 'i-heroicons-globe-alt' }
          ]" class="mb-4">
            <template #item="{ item }">
              <div v-if="item.key === 'ru'" class="space-y-4 py-2">
                <UFormGroup label="Название (RU)" required>
                  <UInput v-model="form.title_ru" placeholder="Архитектура сознания" />
                </UFormGroup>
                <UFormGroup label="Slug (RU)">
                  <UInput v-model="form.slug_ru" placeholder="arkhitektura-soznaniya" />
                </UFormGroup>
                <UFormGroup label="Описание (RU)">
                  <UTextarea v-model="form.description_ru" autoresize />
                </UFormGroup>
              </div>
              <div v-else class="space-y-4 py-2">
                <UFormGroup label="Название (EN/Default)" required>
                  <UInput v-model="form.title" placeholder="Architecture of Mind" />
                </UFormGroup>
                <UFormGroup label="Slug (EN/Default)">
                  <UInput v-model="form.slug" placeholder="architecture-of-mind" />
                </UFormGroup>
                <UFormGroup label="Описание (EN/Default)">
                  <UTextarea v-model="form.description" autoresize />
                </UFormGroup>
              </div>
            </template>
          </UTabs>

          <UFormGroup label="Иконка (Универсальная)" help="Выберите иконку для визуализации в графе">
            <div class="flex gap-2">
              <UInput v-model="form.icon" class="flex-1" />
              <UPopover v-model:open="showIconSelector">
                <UButton color="gray" variant="solid" :icon="form.icon" />
                
                <template #panel>
                  <div class="p-3 grid grid-cols-6 gap-1 max-h-[300px] overflow-y-auto w-[240px]">
                    <button
                      v-for="icon in commonIcons"
                      :key="icon"
                      type="button"
                      class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                      :class="{ 'bg-sky-50 dark:bg-sky-900/30 text-sky-600': form.icon === icon }"
                      @click="selectIcon(icon)"
                    >
                      <UIcon :name="icon" class="w-5 h-5" />
                    </button>
                  </div>
                </template>
              </UPopover>
            </div>
          </UFormGroup>

          <UFormGroup label="Описание">
            <UTextarea v-model="form.description" autoresize />
          </UFormGroup>

          <div class="flex justify-end gap-3 mt-6">
            <UButton color="gray" variant="ghost" @click="isModalOpen = false">Отмена</UButton>
            <UButton type="submit" color="primary">Сохранить</UButton>
          </div>
        </UForm>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}
.page-subtitle {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}
.dark .page-subtitle { color: #999; }

.category-tree {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}
.dark .category-tree {
  background: #1a1a1d;
  border-color: #2a2a2e;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #888;
}
</style>
