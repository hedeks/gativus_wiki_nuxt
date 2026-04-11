<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

useHead({ title: 'Статьи — Gativus Admin' })

const store = userStore()
const toast = useToast()

// Filters
const search = ref('')
const filterBookId = ref<string>('')
const currentPage = ref(1)

// Fetch articles
const { data: articlesData, refresh } = await useFetch('/api/articles', {
  query: computed(() => ({
    page: currentPage.value,
    limit: 20,
    search: search.value || undefined,
    book_id: filterBookId.value || undefined,
    published_only: 'false',
  })),
  headers: store.getAuthHeader(),
})

const articles = computed(() => (articlesData.value as any)?.items || [])
const totalPages = computed(() => (articlesData.value as any)?.pages || 1)
const totalItems = computed(() => (articlesData.value as any)?.total || 0)

// Books for filter
const { data: booksData } = await useFetch('/api/books', {
  headers: store.getAuthHeader()
})
const books = computed(() => (booksData.value || []) as any[])

// Search with debounce
let searchTimer: NodeJS.Timeout
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    refresh()
  }, 300)
}

// Delete
const deleteSlug = ref<string | null>(null)
const isDeleting = ref(false)

async function confirmDelete() {
  if (!deleteSlug.value) return
  isDeleting.value = true

  try {
    await $fetch(`/api/articles/${deleteSlug.value}`, {
      method: 'DELETE',
      headers: store.getAuthHeader(),
    })
    toast.add({ title: 'Статья удалена', color: 'green' })
    deleteSlug.value = null
    refresh()
  } catch (err: any) {
    toast.add({ title: 'Ошибка', description: err?.data?.statusMessage || 'Не удалось удалить', color: 'red' })
  }

  isDeleting.value = false
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

const localeFlagMap: Record<string, string> = { en: '🇬🇧', ru: '🇷🇺', zh: '🇨🇳' }
</script>

<template>
  <div class="articles-page">
    <div class="articles-header">
      <div>
        <h1 class="articles-title">Статьи</h1>
        <p class="articles-subtitle">{{ totalItems }} статей в базе</p>
      </div>
      <div class="flex gap-3">
        <NuxtLink to="/admin/import" class="header-btn header-btn--secondary">
          <UIcon name="i-heroicons-arrow-up-tray" />
          <span>Импорт ODT</span>
        </NuxtLink>
        <NuxtLink to="/admin/articles/create" class="header-btn">
          <UIcon name="i-heroicons-plus" />
          <span>Создать статью</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-wrap">
        <UIcon name="i-heroicons-magnifying-glass" class="search-icon" />
        <input
          v-model="search"
          @input="onSearchInput"
          placeholder="Поиск по названию..."
          class="search-input"
        />
      </div>
      <select v-model="filterBookId" class="filter-select" @change="currentPage = 1; refresh()">
        <option value="">Все книги</option>
        <option v-for="book in books" :key="book.id" :value="book.id">
          {{ book.title }}
        </option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table class="articles-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Книга</th>
            <th>Язык</th>
            <th>Статус</th>
            <th>Обновлено</th>
            <th class="th-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articles" :key="article.id" class="table-row">
            <td>
              <div class="article-cell">
                <NuxtLink :to="`/admin/articles/${article.id}/edit`" class="article-link">
                  {{ article.title }}
                </NuxtLink>
                <span class="article-slug">/articles/{{ article.slug }}</span>
              </div>
            </td>
            <td>
              <span v-if="article.book_title" class="book-badge">{{ article.book_title }}</span>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span class="locale-badge">{{ localeFlagMap[article.locale] || article.locale }}</span>
            </td>
            <td>
              <span
                class="status-badge"
                :class="article.is_published ? 'status--published' : 'status--draft'"
              >
                {{ article.is_published ? 'Опубликовано' : 'Черновик' }}
              </span>
              <UIcon v-if="article.presentation_path" name="i-heroicons-presentation-chart-bar" class="pres-indicator" title="Есть презентация" />
            </td>
            <td class="text-muted">{{ formatDate(article.updated_at) }}</td>
            <td class="td-actions">
              <NuxtLink :to="`/articles/${article.slug}`" class="row-btn" title="Просмотр">
                <UIcon name="i-heroicons-eye" />
              </NuxtLink>
              <NuxtLink :to="`/admin/articles/${article.id}/edit`" class="row-btn" title="Редактировать">
                <UIcon name="i-heroicons-pencil-square" />
              </NuxtLink>
              <NuxtLink :to="`/admin/articles/${article.id}/history`" class="row-btn" title="История">
                <UIcon name="i-heroicons-clock" />
              </NuxtLink>
              <button class="row-btn row-btn--danger" @click="deleteSlug = article.slug" title="Удалить">
                <UIcon name="i-heroicons-trash" />
              </button>
            </td>
          </tr>
          <tr v-if="articles.length === 0">
            <td colspan="6" class="empty-row">
              <div class="empty-state">
                <UIcon name="i-heroicons-document-text" class="empty-icon" />
                <span>Статей пока нет</span>
                <NuxtLink to="/admin/import" class="empty-link">Импортировать из ODT</NuxtLink>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="currentPage--; refresh()"
      >
        <UIcon name="i-heroicons-chevron-left" />
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="currentPage++; refresh()"
      >
        <UIcon name="i-heroicons-chevron-right" />
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteSlug" class="modal-overlay" @click.self="deleteSlug = null">
        <div class="modal-card">
          <h3 class="modal-title">Удалить статью?</h3>
          <p class="modal-desc">Это действие нельзя отменить. Все ревизии также будут удалены.</p>
          <div class="modal-actions">
            <button class="action-btn action-btn--preview" @click="deleteSlug = null">Отмена</button>
            <button class="action-btn action-btn--danger" @click="confirmDelete" :disabled="isDeleting">
              <UIcon v-if="isDeleting" name="i-heroicons-arrow-path" class="animate-spin" />
              <span>Удалить</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.articles-page { max-width: 1100px; }

.articles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.articles-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}
.dark .articles-title { color: #e5e5e5; }
.articles-subtitle { color: #888; font-size: 14px; margin: 4px 0 0; }

.header-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.header-btn:hover { background: #4f46e5; transform: translateY(-1px); }
.header-btn--secondary { background: #f3f4f6; color: #555; }
.dark .header-btn--secondary { background: #252528; color: #aaa; }
.header-btn--secondary:hover { background: #e5e7eb; }
.dark .header-btn--secondary:hover { background: #333; }

/* ─── Filters ─── */
.filters-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.search-wrap {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #999;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 38px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 14px;
  color: #1a1a1a;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: #6366f1; }
.dark .search-input {
  background: #1e1e21;
  border-color: #2a2a2e;
  color: #e5e5e5;
}
.dark .search-input:focus { border-color: #6366f1; }

.filter-select {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  min-width: 160px;
}
.dark .filter-select {
  background: #1e1e21;
  border-color: #2a2a2e;
  color: #e5e5e5;
}

/* ─── Table ─── */
.table-wrap {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  overflow: hidden;
}
.dark .table-wrap {
  background: #1e1e21;
  border-color: #2a2a2e;
}

.articles-table {
  width: 100%;
  border-collapse: collapse;
}

.articles-table thead {
  background: #f8fafc;
}
.dark .articles-table thead { background: #252528; }

.articles-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e5e7eb;
}
.dark .articles-table th { border-bottom-color: #2a2a2e; }

.table-row td {
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f2;
  font-size: 14px;
}
.dark .table-row td { border-bottom-color: #232326; }

.table-row:last-child td { border-bottom: none; }

.table-row:hover { background: #fafafa; }
.dark .table-row:hover { background: #232326; }

.article-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.article-link {
  font-weight: 600;
  color: #1a1a1a;
  text-decoration: none;
  transition: color 0.2s;
}
.article-link:hover { color: #6366f1; }
.dark .article-link { color: #e5e5e5; }
.dark .article-link:hover { color: #818cf8; }

.article-slug { font-size: 11px; color: #999; font-family: monospace; }

.book-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #eef2ff;
  color: #6366f1;
  font-weight: 600;
}
.dark .book-badge { background: #1e1b4b; color: #818cf8; }

.locale-badge { font-size: 16px; }

.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.status--published { background: #ecfdf5; color: #059669; }
.dark .status--published { background: #064e3b; color: #34d399; }
.status--draft { background: #fef3c7; color: #d97706; }
.dark .status--draft { background: #451a03; color: #fbbf24; }

.text-muted { color: #888; font-size: 13px; }

.pres-indicator {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-left: 6px;
  color: #6366f1;
  vertical-align: middle;
}

.th-actions { width: 160px; }
.td-actions {
  display: flex;
  gap: 4px;
}

.row-btn {
  padding: 6px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: #888;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}
.row-btn:hover { background: #f3f4f6; color: #1a1a1a; }
.dark .row-btn:hover { background: #252528; color: #e5e5e5; }
.row-btn--danger:hover { background: #fef2f2; color: #ef4444; }
.dark .row-btn--danger:hover { background: #2a1a1a; color: #f87171; }

/* ─── Empty State ─── */
.empty-row { text-align: center; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #999;
}
.empty-icon { width: 36px; height: 36px; }
.empty-link { color: #6366f1; text-decoration: none; font-weight: 600; }
.empty-link:hover { text-decoration: underline; }

/* ─── Pagination ─── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}
.page-btn {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  color: #555;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { background: #f3f4f6; }
.page-btn:disabled { opacity: 0.4; cursor: default; }
.dark .page-btn { border-color: #333; background: #1e1e21; color: #aaa; }
.page-info { font-size: 14px; color: #888; font-weight: 600; }

/* ─── Modal ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.dark .modal-card { background: #1e1e21; }
.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}
.dark .modal-title { color: #e5e5e5; }
.modal-desc { color: #888; font-size: 14px; margin: 0 0 20px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn--preview { background: #f3f4f6; color: #555; }
.dark .action-btn--preview { background: #252528; color: #aaa; }
.action-btn--danger { background: #ef4444; color: #fff; }
.action-btn--danger:hover { background: #dc2626; }

@media (max-width: 768px) {
  .filters-bar { flex-direction: column; }
  .td-actions { flex-wrap: wrap; }
  .articles-table { font-size: 13px; }
}
</style>
