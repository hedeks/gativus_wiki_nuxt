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
  <div class="admin-page-stack">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Категории</h1>
          <p class="hero-lead">Дерево категорий и быстрые операции</p>
        </div>
      </div>
    </section>

    <div class="cta-buttons admin-index-toolbar cta-buttons--left">
      <GvButton type="button" color="sky" variant="solid" size="sm" icon="i-heroicons-plus" @click="openCreate()">
        Добавить корень
      </GvButton>
    </div>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">FILT</span>
        <h2 class="card-header-title">Поиск и фильтры</h2>
      </header>
      <div class="card-body">
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
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">TREE</span>
        <h2 class="card-header-title">Иерархия</h2>
      </header>
      <div class="card-body card-body--flush overflow-x-auto category-tree">
        <div v-if="!filteredTree || filteredTree.length === 0" class="empty-state">
          Категории не найдены.
        </div>

        <AdminCategoryItem
          v-for="cat in filteredTree"
          :key="cat.id"
          :category="cat"
          @delete="deleteCategory"
          @create-child="openCreate"
          @move-up="moveUp"
          @move-down="moveDown"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.category-tree {
  min-height: 80px;
  padding: 12px 16px 20px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #888;
}

.dark .empty-state {
  color: #a1a1aa;
}
</style>
