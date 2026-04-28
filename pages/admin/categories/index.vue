<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

const store = userStore()
const { data: tree, refresh } = await useFetch('/api/categories?tree=true', {
  headers: store.getAuthHeader()
})
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
const router = useRouter()
const openCreate = (parentId: number | null = null) => {
  if (parentId) {
    router.push(`/admin/categories/create?parent_id=${parentId}`)
    return
  }
  router.push('/admin/categories/create')
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
  <div class="categories-page gv-admin-page">
    <div class="page-header gv-admin-index-head">
      <div class="gv-admin-head">
        <p class="gv-admin-eyebrow">ADMIN</p>
        <h1 class="gv-admin-title">Категории</h1>
        <p class="gv-admin-subtitle">Дерево категорий и быстрые операции</p>
      </div>
      <div class="gv-admin-index-actions">
        <UButton icon="i-heroicons-plus" color="red" @click="openCreate()">
          Добавить корень
        </UButton>
      </div>
    </div>

    <div class="gv-admin-filter-row">
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
          <button
            type="button"
            class="gv-filter-pill gv-focusable"
            :class="{ 'is-active': hasChildrenOnly }"
            @click="hasChildrenOnly = !hasChildrenOnly"
          >
            Только с подкатегориями
          </button>
        </div>
      </ExpandableFilters>
    </div>

    <div class="category-tree gv-admin-surface overflow-x-auto">
      <div v-if="!filteredTree || filteredTree.length === 0" class="empty-state">
        Категории не найдены.
      </div>

      <AdminCategoryItem v-for="cat in filteredTree" :key="cat.id" :category="cat" @delete="deleteCategory"
        @create-child="openCreate" @move-up="moveUp" @move-down="moveDown" />
    </div>
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

.dark .page-subtitle {
  color: #999;
}

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
