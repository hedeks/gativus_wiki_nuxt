<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

useHead({ title: 'Статьи — Gativus Admin' })

const store = userStore()
const toast = useToast()

// Filters
const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const filterBookId = ref<string>('')
const currentPage = ref(1)

// Fetch articles
const { data: articlesData, refresh, pending } = await useFetch('/api/articles', {
  query: computed(() => ({
    page: currentPage.value,
    limit: 20,
    search: debouncedQuery.value || undefined,
    book_id: filterBookId.value || undefined,
    published_only: 'false',
    include_term_articles: 'true',
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

const activeFilterCount = computed(() => (filterBookId.value ? 1 : 0))
watch(debouncedQuery, () => {
  currentPage.value = 1
})

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

</script>

<template>
  <div class="admin-page-stack">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Статьи</h1>
          <p class="hero-lead tabular-nums">{{ totalItems }} статей в базе</p>
        </div>
      </div>
    </section>

    <div class="cta-buttons admin-index-toolbar cta-buttons--left">
      <GvButton to="/admin/import" variant="outline" color="gray" size="sm" icon="i-heroicons-arrow-up-tray">
        Импорт ODT
      </GvButton>
      <GvButton to="/admin/articles/create" color="sky" variant="solid" size="sm" icon="i-heroicons-plus">
        Создать статью
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
            placeholder="Поиск по названию..."
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
              <span class="filter-group-label">Книги</span>
              <select v-model="filterBookId" class="filter-select gv-admin-filter-select" @change="currentPage = 1">
                <option value="">Все книги</option>
                <option v-for="book in books" :key="book.id" :value="book.id">
                  {{ book.title }}
                </option>
              </select>
            </div>
          </ExpandableFilters>
        </div>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">LIST</span>
        <h2 class="card-header-title">Список статей</h2>
      </header>
      <div class="card-body card-body--flush overflow-x-auto">
        <table class="admin-table min-w-[760px]">
        <thead>
          <tr>
            <th>Название</th>
            <th>Книга</th>
            <th>Модель</th>
            <th>Статус</th>
            <th>Обновлено</th>
            <th>Действия</th>
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
              <NuxtLink v-if="article.book_title && article.book_id" :to="`/admin/books/${article.book_id}/edit`" class="book-badge">{{ article.book_title }}</NuxtLink>
              <span v-else class="text-muted">—</span>
            </td>
            <td>
              <span class="locale-badge">GLOBAL</span>
            </td>
            <td>
              <span class="status-badge" :class="article.is_published ? 'status--published' : 'status--draft'">
                {{ article.is_published ? 'Опубликовано' : 'Черновик' }}
              </span>
              <span v-if="article.is_term_article" class="term-badge" title="Раскрытие термина">Термин</span>
              <UIcon v-if="article.presentation_path || article.presentation_path_ru || article.presentation_path_zh" name="i-heroicons-presentation-chart-bar" class="pres-indicator"
                title="Есть презентация" />
            </td>
            <td class="text-muted">{{ formatDate(article.updated_at) }}</td>
            <td>
              <div class="actions-cell">
                <GvButton
                  :to="`/admin/articles/${article.id}/edit`"
                  icon="i-heroicons-pencil-square"
                  size="xs"
                  variant="ghost"
                  color="gray"
                  title="Редактировать"
                />
                <GvButton
                  :to="`/articles/${article.slug}`"
                  target="_blank"
                  icon="i-heroicons-eye"
                  size="xs"
                  variant="ghost"
                  color="gray"
                  title="Просмотр"
                />
                <GvButton
                  :to="`/admin/articles/${article.id}/history`"
                  icon="i-heroicons-clock"
                  size="xs"
                  variant="ghost"
                  color="gray"
                  title="История"
                />
                <GvButton
                  icon="i-heroicons-trash"
                  size="xs"
                  variant="ghost"
                  color="red"
                  title="Удалить"
                  @click="deleteSlug = article.slug"
                />
              </div>
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
      <div v-if="totalPages > 1" class="card-after-table">
        <div class="pagination">
          <GvButton
            type="button"
            variant="outline"
            color="gray"
            size="sm"
            square
            class="page-btn"
            :disabled="currentPage <= 1"
            @click="currentPage--; refresh()"
          >
            <UIcon name="i-heroicons-chevron-left" />
          </GvButton>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <GvButton
            type="button"
            variant="outline"
            color="gray"
            size="sm"
            square
            class="page-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage++; refresh()"
          >
            <UIcon name="i-heroicons-chevron-right" />
          </GvButton>
        </div>
      </div>
    </section>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteSlug" class="modal-overlay" @click.self="deleteSlug = null">
        <div class="modal-card">
          <h3 class="modal-title">Удалить статью?</h3>
          <p class="modal-desc">Это действие нельзя отменить. Все ревизии также будут удалены.</p>
          <div class="modal-actions">
            <GvButton type="button" variant="outline" color="gray" size="sm" @click="deleteSlug = null">Отмена</GvButton>
            <GvButton type="button" color="red" variant="solid" size="sm" :loading="isDeleting" @click="confirmDelete">
              Удалить
            </GvButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Table & modals — shell uses shared admin-about-cards.css */
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

/* ─── Table (как admin/books) ─── */
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
  background: #27272a;
  color: #9ca3af;
  border-bottom-color: #3f3f46;
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

.table-row:hover td {
  background: #fafafa;
}

.dark .table-row:hover td {
  background: #232326;
}

.actions-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

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

.article-link:hover {
  color: #6366f1;
}

.dark .article-link {
  color: #e5e5e5;
}

.dark .article-link:hover {
  color: #818cf8;
}

.article-slug {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.book-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: #eef2ff;
  color: #6366f1;
  font-weight: 600;
}

.dark .book-badge {
  background: #1e1b4b;
  color: #818cf8;
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

.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status--published {
  background: #ecfdf5;
  color: #059669;
}

.dark .status--published {
  background: #064e3b;
  color: #34d399;
}

.status--draft {
  background: #fef3c7;
  color: #d97706;
}

.dark .status--draft {
  background: #451a03;
  color: #fbbf24;
}

.term-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f0f9ff;
  color: #0ea5e9;
  border: 1px solid #bae6fd;
  text-transform: uppercase;
  margin-left: 6px;
  vertical-align: middle;
}

.dark .term-badge {
  background: #082f49;
  color: #7dd3fc;
  border-color: #0c4a6e;
}

.text-muted {
  color: #888;
  font-size: 13px;
}

.pres-indicator {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-left: 6px;
  color: #6366f1;
  vertical-align: middle;
}

/* ─── Empty State ─── */
.empty-row {
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #999;
}

.empty-icon {
  width: 36px;
  height: 36px;
}

.empty-link {
  color: #6366f1;
  text-decoration: none;
  font-weight: 600;
}

.empty-link:hover {
  text-decoration: underline;
}

/* ─── Pagination ─── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 0;
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

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.dark .page-btn {
  border-color: #333;
  background: #1e1e21;
  color: #aaa;
}

.page-info {
  font-size: 14px;
  color: #888;
  font-weight: 600;
}

/* ─── Modal ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
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
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.dark .modal-card {
  background: #1e1e21;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.dark .modal-title {
  color: #e5e5e5;
}

.modal-desc {
  color: #888;
  font-size: 14px;
  margin: 0 0 20px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

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

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn--preview {
  background: #f3f4f6;
  color: #555;
}

.dark .action-btn--preview {
  background: #252528;
  color: #aaa;
}

.action-btn--danger {
  background: #ef4444;
  color: #fff;
}

.action-btn--danger:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .admin-table th,
  .admin-table td {
    padding: 10px 12px;
  }

  .admin-table {
    font-size: 13px;
  }
}
</style>
