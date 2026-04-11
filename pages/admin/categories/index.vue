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
  slug: '',
  parent_id: null as number | null,
  description: '',
  icon: 'i-heroicons-folder',
  sort_order: 0
})

const openCreate = (parentId: number | null = null) => {
  form.id = null
  form.title = ''
  form.slug = ''
  form.parent_id = parentId
  form.description = ''
  form.icon = 'i-heroicons-folder'
  form.sort_order = 0
  selectedCategory.value = null
  isModalOpen.value = true
}

const openEdit = (cat: any) => {
  form.id = cat.id
  form.title = cat.title
  form.slug = cat.slug
  form.parent_id = cat.parent_id
  form.description = cat.description || ''
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
          <UFormGroup label="Название" required>
            <UInput v-model="form.title" placeholder="Архитектура сознания" />
          </UFormGroup>

          <UFormGroup label="Slug (необязательно)" help="Будет сгенерирован автоматически из названия">
            <UInput v-model="form.slug" placeholder="philosophy-of-mind" />
          </UFormGroup>

          <UFormGroup label="Иконка (Nuxt UI Icon)" help="Например: i-heroicons-light-bulb">
            <UInput v-model="form.icon" />
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
