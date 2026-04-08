<template>
  <div class="books-admin-page">
    <div class="page-header">
      <h2 class="page-title">Управление книгами</h2>
      <div class="page-actions">
        <UButton to="/admin/books/create" icon="i-heroicons-plus" color="primary">
          Создать книгу
        </UButton>
      </div>
    </div>

    <div v-if="pending" class="loading-state">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <UIcon name="i-heroicons-exclamation-triangle" class="text-2xl text-red-500" />
      <span>Ошибка при загрузке книг: {{ error.message }}</span>
    </div>

    <div v-else class="books-list card">
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Обложка</th>
            <th>Заголовок</th>
            <th>Категории</th>
            <th class="text-center">Глав (RU | EN | ZH)</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in (books || [])" :key="book.id">
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
              <div class="flex items-center justify-center gap-3">
                <div class="flex items-center gap-1" title="Русский">
                  <span class="text-xs opacity-70">🇷🇺</span>
                  <span class="article-count" :class="{ 'opacity-20': !book.count_ru }">{{ book.count_ru || 0 }}</span>
                </div>
                <div class="flex items-center gap-1" title="English">
                  <span class="text-xs opacity-70">🇬🇧</span>
                  <span class="article-count" :class="{ 'opacity-20': !book.count_en }">{{ book.count_en || 0 }}</span>
                </div>
                <div class="flex items-center gap-1" title="Chinese">
                  <span class="text-xs opacity-70">🇨🇳</span>
                  <span class="article-count" :class="{ 'opacity-20': !book.count_zh }">{{ book.count_zh || 0 }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="actions-cell">
                <UButton :to="`/admin/books/${book.id}/edit`" icon="i-heroicons-pencil-square" size="xs" variant="ghost" color="gray" title="Редактировать" />
                <UButton :to="`/books/${book.slug}`" target="_blank" icon="i-heroicons-eye" size="xs" variant="ghost" color="gray" title="Просмотр" />
                <UButton icon="i-heroicons-trash" size="xs" variant="ghost" color="red" title="Удалить" @click="confirmDelete(book)" />
              </div>
            </td>
          </tr>
          <tr v-if="(books || []).length === 0">
            <td colspan="7" class="empty-row">Книги не найдены.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="deleteModalOpen">
      <div class="p-6">
        <h3 class="text-lg font-bold mb-4">Удалить книгу?</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Вы уверены, что хотите удалить книгу <b>{{ bookToDelete?.title }}</b>? 
          Статьи останутся в базе, но перестанут быть привязаны к этой книге.
        </p>
        <div class="flex justify-end gap-3">
          <UButton color="gray" variant="ghost" @click="deleteModalOpen = false">Отмена</UButton>
          <UButton color="red" :loading="deleting" @click="handleDelete">Удалить</UButton>
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

const { data: books, pending, error, refresh } = await useFetch('/api/books', {
  headers: store.getAuthHeader()
})
const { data: categories } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})

const deleteModalOpen = ref(false)
const bookToDelete = ref<any>(null)
const deleting = ref(false)

function getCategoryTitle(id: number) {
  if (!categories.value || !Array.isArray(categories.value)) return `ID: ${id}`
  const cat = (categories.value as any[]).find((c: any) => c.id === id)
  return cat ? cat.title : `ID: ${id}`
}

function confirmDelete(book: any) {
  bookToDelete.value = book
  deleteModalOpen.value = true
}

async function handleDelete() {
  if (!bookToDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/books/${bookToDelete.value.slug}`, { 
      method: 'DELETE',
      headers: store.getAuthHeader()
    })
    deleteModalOpen.value = false
    await refresh()
  } catch (err: any) {
    alert('Ошибка при удалении: ' + (err.data?.statusMessage || err.message))
  } finally {
    deleting.value = false
  }
}

const localeFlagMap: Record<string, string> = { en: '🇬🇧', ru: '🇷🇺', zh: '🇨🇳' }
</script>

<style scoped>
.books-admin-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #1a1a1a;
}

.dark .page-title {
  color: #e5e5e5;
}

.card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.dark .card {
  background: #18181b; /* zinc-900 */
  border-color: #27272a; /* zinc-800 */
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
</style>
