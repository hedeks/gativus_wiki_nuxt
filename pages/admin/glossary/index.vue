<template>
  <div class="admin-page-stack">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Глоссарий</h1>
          <p class="hero-lead">Термины и статьи-раскрытия</p>
        </div>
      </div>
    </section>

    <div class="cta-buttons admin-index-toolbar cta-buttons--left">
      <GvButton
        type="button"
        variant="outline"
        color="gray"
        size="sm"
        icon="i-heroicons-wrench-screwdriver"
        :loading="repairingHtml"
        :disabled="relinking || repairingHtml"
        title="Снимает повреждённые wiki-term ссылки и мусор в HTML. Сразу после этого обязательно нажмите «Перелинковать статьи»."
        @click="repairLinkerHtml"
      >
        Починить разметку ссылок
      </GvButton>
      <GvButton
        type="button"
        variant="outline"
        color="gray"
        size="sm"
        icon="i-heroicons-arrow-path"
        :loading="relinking"
        :disabled="relinking || repairingHtml"
        @click="relinkAll"
      >
        Перелинковать статьи
      </GvButton>
      <GvButton to="/admin/glossary/create" color="sky" variant="solid" size="sm" icon="i-heroicons-plus">
        Создать термин
      </GvButton>
    </div>

    <section v-if="relinkResult" class="section-card" :class="{ 'section-card--error': relinkResult.error }">
      <div class="card-body card-body--row">
        <UIcon :name="relinkResult.error ? 'i-heroicons-exclamation-circle' : 'i-heroicons-check-circle'" />
        <span>{{ relinkResult.message }}</span>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">FILT</span>
        <h2 class="card-header-title">Поиск и фильтры</h2>
      </header>
      <div class="card-body">
        <div class="gv-admin-filter-row">
          <BaseSearch
            v-model="searchQuery"
            placeholder="Поиск термина..."
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
                <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)">{{ cat.title }}</option>
              </select>
            </div>
          </ExpandableFilters>
        </div>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">LIST</span>
        <h2 class="card-header-title">Термины</h2>
      </header>
      <div class="card-body card-body--flush overflow-x-auto terms-table-wrap-inner">
        <div v-if="pending" class="loading-rows">
          <div v-for="i in 8" :key="i" class="skeleton-row" />
        </div>

        <div v-else-if="filteredTerms.length === 0" class="empty-state empty-state--padded">
          <UIcon name="i-heroicons-inbox" />
          <span>Терминов нет — создайте первый</span>
        </div>

        <table v-else class="admin-table min-w-[760px]">
        <thead>
          <tr>
            <th>Термин</th>
            <th>Определение</th>
            <th>Категория</th>
            <th>Статья</th>
            <th>Синонимы</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="term in filteredTerms" :key="term.slug" class="term-row">
            <td>
              <div class="term-name-cell">
                <NuxtLink :to="`/glossary/${term.slug}`" class="term-name" target="_blank">
                  {{ term.title }}
                </NuxtLink>
                <code class="term-slug">{{ term.slug }}</code>
              </div>
            </td>
            <td>
              <p class="definition-preview">{{ term.definition }}</p>
            </td>
            <td>
              <span v-if="term.category_title" class="category-chip">
                {{ term.category_title }}
              </span>
              <span v-else class="no-category">—</span>
            </td>
            <td>
              <div class="flex flex-col gap-1 items-start">
                <UBadge v-if="term.has_article" color="green" variant="soft" size="xs" icon="i-heroicons-check">
                  Есть
                </UBadge>
                <UBadge v-else color="gray" variant="soft" size="xs">Нет</UBadge>
                
                <NuxtLink
                  v-if="term.term_article_id"
                  :to="`/admin/articles/${term.term_article_id}/edit`"
                  class="article-edit-link"
                >
                  <UIcon name="i-heroicons-pencil-square" class="mr-1" />
                  Редактировать
                </NuxtLink>
                <NuxtLink
                  v-else
                  :to="`/admin/articles/create?term_id=${term.id}`"
                  class="article-add-link"
                >
                  <UIcon name="i-heroicons-plus" class="mr-1" />
                  Добавить
                </NuxtLink>
              </div>
            </td>
            <td>
              <div class="aliases-list" v-if="term.aliases?.length">
                <span v-for="a in term.aliases.slice(0, 2)" :key="a" class="alias-pill">{{ a }}</span>
                <span v-if="term.aliases.length > 2" class="alias-more">+{{ term.aliases.length - 2 }}</span>
              </div>
              <span v-else class="no-category">—</span>
            </td>
            <td>
              <div class="actions-cell">
                <GvButton
                  :to="`/admin/glossary/${term.id}/edit`"
                  icon="i-heroicons-pencil-square"
                  size="xs"
                  variant="ghost"
                  color="gray"
                  title="Редактировать"
                />
                <GvButton
                  :to="`/glossary/${term.slug}`"
                  target="_blank"
                  icon="i-heroicons-eye"
                  size="xs"
                  variant="ghost"
                  color="gray"
                  title="Просмотр"
                />
                <GvButton
                  icon="i-heroicons-trash"
                  size="xs"
                  variant="ghost"
                  color="red"
                  title="Удалить"
                  @click="confirmDelete(term)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="data && !pending" class="card-after-table table-footer-inner">
        Всего: <strong class="tabular-nums">{{ data.total }}</strong> терминов
      </div>
      </div>
    </section>

    <!-- Delete confirm modal -->
    <UModal v-model="showDeleteModal">
      <div class="delete-modal">
        <UIcon name="i-heroicons-exclamation-triangle" class="modal-icon" />
        <h3>Удалить термин?</h3>
        <p>
          <strong>{{ termToDelete?.title }}</strong> будет удалён вместе со статьёй-раскрытием (если есть).
          Это действие необратимо.
        </p>
        <div class="modal-actions">
          <GvButton color="gray" variant="soft" @click="showDeleteModal = false">Отмена</GvButton>
          <GvButton color="red" :loading="deleting" @click="doDelete">Удалить</GvButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'role'] })

useSeoMeta({ title: 'Глоссарий — Admin — Gativus' })

const { searchQuery, debouncedQuery, isTyping } = useDebounce('', 300)
const categoryFilter = ref('')
const store = userStore()

// Categories
const { data: categoriesData } = await useAsyncData('admin-cats', () =>
  $fetch<any>('/api/categories', {
    headers: store.getAuthHeader()
  })
)
const categories = computed(() => {
  if (Array.isArray(categoriesData.value)) return categoriesData.value
  return categoriesData.value?.items || []
})
const activeFilterCount = computed(() => (categoryFilter.value ? 1 : 0))
const filteredTerms = computed(() => {
  const list = data.value?.items || []
  if (!categoryFilter.value) return list
  return list.filter((t: any) => String(t.category_id || '') === categoryFilter.value)
})

const { data, pending, refresh } = await useAsyncData(
  'admin-terms',
  () => $fetch<any>('/api/terms', {
    params: { search: debouncedQuery.value || undefined, limit: 100 },
    headers: store.getAuthHeader()
  }),
  { watch: [debouncedQuery] }
)

// Relink / repair linker HTML
const relinking = ref(false)
const repairingHtml = ref(false)
const relinkResult = ref<{ message: string; error?: boolean } | null>(null)

async function relinkAll () {
  relinking.value = true
  relinkResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/relink', {
      method: 'POST',
      headers: store.getAuthHeader(),
    })
    relinkResult.value = { message: res.message }
  } catch (e: any) {
    relinkResult.value = { message: e.data?.statusMessage || 'Ошибка перелинковки', error: true }
  } finally {
    relinking.value = false
    setTimeout(() => { relinkResult.value = null }, 8000)
  }
}

async function repairLinkerHtml () {
  repairingHtml.value = true
  relinkResult.value = null
  try {
    const res = await $fetch<any>('/api/admin/repair-linker-html', {
      method: 'POST',
      headers: store.getAuthHeader(),
    })
    relinkResult.value = { message: res.message }
  } catch (e: any) {
    relinkResult.value = { message: e.data?.statusMessage || 'Ошибка починки HTML', error: true }
  } finally {
    repairingHtml.value = false
    setTimeout(() => { relinkResult.value = null }, 8000)
  }
}

// Delete
const showDeleteModal = ref(false)
const termToDelete = ref<any>(null)
const deleting = ref(false)

function confirmDelete(term: any) {
  termToDelete.value = term
  showDeleteModal.value = true
}

async function doDelete() {
  if (!termToDelete.value) return
  deleting.value = true
  try {
    await $fetch(`/api/terms/${termToDelete.value.slug}`, {
      method: 'DELETE' as any,
      headers: store.getAuthHeader(),
    })
    showDeleteModal.value = false
    await refresh()
  } catch (e: any) {
    alert(e.data?.statusMessage || 'Ошибка удаления')
  } finally {
    deleting.value = false
  }
}

</script>

<style scoped>
.article-edit-link,
.article-add-link {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.15s;
}

.article-edit-link {
  color: var(--gv-primary);
}

.article-add-link {
  color: #10b981;
}

.article-edit-link:hover,
.article-add-link:hover {
  text-decoration: underline;
}

.empty-state--padded {
  padding: 48px 24px;
}

.table-footer-inner {
  font-size: 13px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
}

.dark .table-footer-inner {
  border-color: #27272a;
}

.table-footer-inner strong {
  color: #0ea5e9;
}

.loading-rows {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-row {
  height: 52px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200%;
  animation: shimmer 1.5s infinite;
}

.dark .skeleton-row {
  background: linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%);
  background-size: 200%;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.empty-state {
  padding: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 14px;
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
  background: #27272a;
  color: #9ca3af;
  border-bottom-color: #3f3f46;
}

.admin-table td {
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
  color: #374151;
  vertical-align: top;
}

.dark .admin-table td {
  border-bottom-color: #27272a;
  color: #d1d5db;
}

.term-row:hover td {
  background: #fafafa;
}

.dark .term-row:hover td {
  background: #232326;
}

.term-row:last-child td {
  border-bottom: none;
}

.actions-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.term-name-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.term-name {
  font-size: 14px;
  font-weight: 700;
  color: #0ea5e9;
  text-decoration: none;
  transition: color 0.15s;
}

.term-name:hover {
  color: #0284c7;
}

.term-slug {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

.definition-preview {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 240px;
  line-height: 1.5;
}

.dark .definition-preview {
  color: #71717a;
}

.category-chip {
  display: inline-flex;
  padding: 3px 9px;
  border-radius: 100px;
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
  font-size: 12px;
  font-weight: 600;
}

.no-category {
  color: #cbd5e1;
  font-size: 13px;
}

.dark .no-category {
  color: #52525b;
}

.aliases-list {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.alias-pill {
  padding: 2px 7px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
}

.dark .alias-pill {
  background: #27272a;
  color: #71717a;
}

.alias-more {
  font-size: 11px;
  color: #94a3b8;
}

.delete-modal {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.modal-icon {
  width: 48px;
  height: 48px;
  color: #ef4444;
}

.delete-modal h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.delete-modal p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  max-width: 340px;
  line-height: 1.6;
}

.dark .delete-modal p {
  color: #71717a;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .empty-state {
    padding: 28px 14px;
  }

  .definition-preview {
    max-width: none;
  }

  .admin-table th,
  .admin-table td {
    padding: 10px 12px;
  }
}
</style>
