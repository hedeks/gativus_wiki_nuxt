<template>
  <div class="admin-page-stack">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Книги</h1>
          <p class="hero-lead">Единый список · <span class="tabular-nums">{{ bookTotal }}</span> в базе</p>
        </div>
      </div>
    </section>

    <div class="cta-buttons admin-index-toolbar cta-buttons--left">
      <GvButton to="/admin/books/create" color="sky" variant="solid" size="sm" icon="i-heroicons-plus">
        Создать книгу
      </GvButton>
    </div>

    <section v-if="pending" class="section-card">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-arrow-path" class="icon-spin" />
        <span>Загрузка…</span>
      </div>
    </section>

    <section v-else-if="error" class="section-card section-card--error">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-exclamation-triangle" class="icon-err" />
        <span>Ошибка при загрузке книг: {{ error.message }}</span>
      </div>
    </section>

    <template v-else>
      <section class="section-card">
        <header class="card-header">
          <span class="card-badge">FILT</span>
          <h2 class="card-header-title">Поиск и фильтры</h2>
        </header>
        <div class="card-body">
          <div class="gv-admin-filter-row">
            <BaseSearch
              v-model="searchQuery"
              placeholder="Поиск по названию или slug..."
              :is-pending="pending"
              :is-debouncing="isTyping"
              class="flex-1"
            />
            <ExpandableFilters
              label="Фильтры"
              :active-count="activeFilterCount"
              :has-active-filters="activeFilterCount > 0"
            >
              <div class="filter-group">
                <span class="filter-group-label">Категории</span>
                <select v-model="categoryFilter" class="gv-admin-filter-select">
                  <option value="">Все категории</option>
                  <option v-for="cat in categoriesList" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
                </select>
              </div>
            </ExpandableFilters>
          </div>
        </div>
      </section>

      <section class="section-card">
        <header class="card-header">
          <span class="card-badge">LIST</span>
          <h2 class="card-header-title">Список книг</h2>
        </header>
        <div class="card-body card-body--flush overflow-x-auto">
          <div v-if="selectedIds.size > 0" class="bulk-bar">
            <span class="bulk-bar-info">Выбрано: <strong>{{ selectedIds.size }}</strong></span>
            <GvButton color="gray" variant="ghost" size="sm" @click="selectedIds = new Set()">Снять выбор</GvButton>
            <GvButton color="red" variant="solid" size="sm" icon="i-heroicons-trash" :loading="isBulkDeleting" @click="bulkDelete">Удалить выбранные</GvButton>
          </div>
          <table class="admin-table">
        <thead>
          <tr>
            <th class="th-check">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" class="gv-checkbox" />
            </th>
            <th>ID</th>
            <th>Обложка</th>
            <th>Заголовок</th>
            <th>Категории</th>
            <th class="text-center">Глав</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in filteredBooks" :key="book.id" :class="{ 'row--selected': selectedIds.has(book.id) }">
            <td class="td-check">
              <input type="checkbox" :checked="selectedIds.has(book.id)" @change="toggleSelect(book.id)" class="gv-checkbox" />
            </td>
            <td class="text-xs text-gray-500">#{{ book.id }}</td>
            <td>
              <div class="book-cover-preview">
                <img v-if="book.cover_image" :src="book.cover_image" :alt="book.title" />
                <div v-else class="book-cover-placeholder">
                  <UIcon name="i-heroicons-book-open" />
                </div>
              </div>
            </td>
            <td>
              <div class="book-title-cell">
                <span class="book-title-text">{{ book.title }}</span>
                <span class="book-slug">/{{ book.slug }}</span>
              </div>
            </td>
            <td>
              <div class="category-tags">
                <span v-for="catId in (book.category_ids || [])" :key="catId" class="cat-tag">
                  {{ getCategoryTitle(catId) }}
                </span>
              </div>
            </td>
            <td>
              <span class="article-count">{{ book.count_en || 0 }}</span>
            </td>
            <td>
              <div class="actions-cell">
                <GvButton :to="`/admin/books/${book.id}/edit`" icon="i-heroicons-pencil-square" size="xs" variant="ghost" color="gray" title="Редактировать" />
                <GvButton :to="`/books/${book.slug}`" target="_blank" icon="i-heroicons-eye" size="xs" variant="ghost" color="gray" title="Просмотр" />
                <GvButton icon="i-heroicons-trash" size="xs" variant="ghost" color="red" title="Удалить" @click="confirmDelete(book)" />
              </div>
            </td>
          </tr>
          <tr v-if="filteredBooks.length === 0">
            <td colspan="8" class="empty-row">Книги не найдены.</td>
          </tr>
        </tbody>
      </table>
        </div>
      </section>
    </template>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="deleteModalOpen">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4">Удалить книгу?</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Вы уверены, что хотите удалить книгу <b>{{ bookToDelete?.title }}</b>?
        </p>
        <label class="delete-articles-checkbox">
          <input type="checkbox" v-model="deleteArticlesToo" class="mr-2" />
          <span>Удалить все статьи книги (<b>{{ bookToDelete?.count_en || 0 }}</b> шт.)</span>
        </label>
        <p v-if="!deleteArticlesToo" class="text-xs text-gray-400 mt-2">
          Статьи останутся в базе без привязки к книге.
        </p>
        <p v-else class="text-xs text-red-500 mt-2">
          Статьи и их история изменений будут удалены безвозвратно.
        </p>
        <div class="flex justify-end gap-3 mt-6">
          <GvButton color="gray" variant="ghost" @click="deleteModalOpen = false">Отмена</GvButton>
          <GvButton color="red" :loading="deleting" @click="handleDelete">Удалить</GvButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const store = userStore()
const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const categoryFilter = ref('')

const { data: books, pending, error, refresh } = await useFetch('/api/books', {
  headers: store.getAuthHeader()
})
const { data: categories } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})
const categoriesList = computed(() => {
  if (Array.isArray(categories.value)) return categories.value as any[]
  return ((categories.value as any)?.items || []) as any[]
})
const activeFilterCount = computed(() => (categoryFilter.value ? 1 : 0))
const bookTotal = computed(() => (Array.isArray(books.value) ? books.value.length : 0))
const filteredBooks = computed(() => {
  const list = (Array.isArray(books.value) ? books.value : []) as any[]
  const query = debouncedQuery.value.trim().toLowerCase()
  return list.filter((book: any) => {
    const matchesSearch = !query || [book.title, book.slug, book.title_ru, book.title_zh].some((v) =>
      String(v || '').toLowerCase().includes(query)
    )
    const matchesCategory = !categoryFilter.value || (Array.isArray(book.category_ids) && book.category_ids.includes(Number(categoryFilter.value)))
    return matchesSearch && matchesCategory
  })
})

// Multi-select
const selectedIds = ref(new Set<number>())

const allSelected = computed(() =>
  filteredBooks.value.length > 0 && filteredBooks.value.every((b: any) => selectedIds.value.has(b.id))
)

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function toggleAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(filteredBooks.value.map((b: any) => b.id))
}

const isBulkDeleting = ref(false)
const toast = useToast()

async function bulkDelete() {
  if (!selectedIds.value.size) return
  isBulkDeleting.value = true
  const targets = filteredBooks.value.filter((b: any) => selectedIds.value.has(b.id))
  let ok = 0, fail = 0
  for (const b of targets) {
    try {
      await $fetch(`/api/books/${b.slug}`, { method: 'DELETE', headers: store.getAuthHeader() })
      ok++
    } catch { fail++ }
  }
  selectedIds.value = new Set()
  isBulkDeleting.value = false
  toast.add({ title: fail ? `Удалено: ${ok}, ошибок: ${fail}` : `Удалено ${ok} книг`, color: fail ? 'orange' : 'green' })
  await refresh()
}

const deleteModalOpen = ref(false)
const bookToDelete = ref<any>(null)
const deleting = ref(false)
const deleteArticlesToo = ref(false)

function getCategoryTitle(id: number) {
  const source = categoriesList.value
  if (!source.length) return `ID: ${id}`
  const cat = source.find((c: any) => c.id === id)
  return cat ? cat.title : `ID: ${id}`
}

function confirmDelete(book: any) {
  bookToDelete.value = book
  deleteArticlesToo.value = false
  deleteModalOpen.value = true
}

async function handleDelete() {
  if (!bookToDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/books/${bookToDelete.value.slug}`, {
      method: 'DELETE',
      headers: store.getAuthHeader(),
      query: deleteArticlesToo.value ? { delete_articles: 'true' } : undefined,
    })
    deleteModalOpen.value = false
    await refresh()
  } catch (err: any) {
    alert('Ошибка при удалении: ' + (err.data?.statusMessage || err.message))
  } finally {
    deleting.value = false
  }
}

</script>

<style scoped>
.bulk-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
  font-size: 13px;
}

.dark .bulk-bar {
  background: #450a0a;
  border-color: #7f1d1d;
}

.bulk-bar-info {
  flex: 1;
  color: #991b1b;
}

.dark .bulk-bar-info {
  color: #f87171;
}

.th-check, .td-check {
  width: 40px;
  padding: 14px 8px 14px 20px !important;
}

.gv-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #ef4444;
}

.row--selected td {
  background: #fff5f5 !important;
}

.dark .row--selected td {
  background: #2d1515 !important;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  text-align: left;
  padding: 14px 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.dark .admin-table th {
  background: #27272a; /* zinc-800 */
  color: #9ca3af;
  border-bottom-color: #3f3f46; /* zinc-700 */
}

.admin-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
  color: #374151;
}

.dark .admin-table td {
  border-bottom-color: #27272a;
  color: #d1d5db;
}

.book-cover-preview {
  width: 44px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
}

.dark .book-cover-preview {
  background: #27272a;
  border-color: #3f3f46;
}

.book-cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-cover-placeholder {
  color: #9ca3af;
  font-size: 20px;
}

.book-title-cell {
  display: flex;
  flex-direction: column;
}

.book-title-text {
  font-weight: 600;
  color: #111827;
}

.dark .book-title-text {
  color: #f3f4f6;
}

.book-slug {
  font-size: 12px;
  color: #9ca3af;
}

.locale-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  background: #f3f4f6;
  color: #4b5563;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .locale-badge {
  background: #27272a;
  color: #9ca3af;
}

.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  background: #eff6ff; /* sky-50 */
  color: #0284c7; /* sky-600 */
  border: 1px solid #bae6fd; /* sky-200 */
  font-weight: 600;
}

.dark .cat-tag {
  background: #082f49; /* sky-950/deep accent */
  color: #0ea5e9; /* sky-500 */
  border-color: #0c4a6e; /* sky-900 */
}

.article-count {
  font-weight: 800;
  color: #0284c7;
}

.dark .article-count {
  color: #0ea5e9;
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.empty-row {
  padding: 60px !important;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.delete-articles-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.dark .delete-articles-checkbox {
  color: #d1d5db;
  background: #450a0a;
  border-color: #7f1d1d;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Transitions */
.view-transition {
  transition: all 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

@media (max-width: 768px) {
  .books-admin-page {
    padding: 0;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
  }

  .admin-table th,
  .admin-table td {
    padding: 10px 12px;
  }
}
</style>
