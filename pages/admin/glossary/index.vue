<template>
  <div class="admin-glossary">
    <div class="page-header">
      <div>
        <h1 class="page-title">Глоссарий</h1>
        <p class="page-desc">Управление терминами и их статьями-раскрытиями</p>
      </div>
      <div class="header-actions">
        <UButton icon="i-heroicons-arrow-path" color="gray" variant="soft" :loading="relinking" @click="relinkAll">
          Перелинковать статьи
        </UButton>
        <NuxtLink to="/admin/glossary/create">
          <UButton icon="i-heroicons-plus" color="sky">Создать термин</UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Relink status -->
    <div v-if="relinkResult" class="relink-banner" :class="relinkResult.error ? 'error' : 'success'">
      <UIcon :name="relinkResult.error ? 'i-heroicons-exclamation-circle' : 'i-heroicons-check-circle'" />
      {{ relinkResult.message }}
    </div>

    <!-- Search -->
    <div class="search-bar">
      <UIcon name="i-heroicons-magnifying-glass" class="search-icon" />
      <input v-model="search" class="search-input" placeholder="Поиск термина..." />
    </div>

    <!-- Table -->
    <div class="terms-table-wrap">
      <div v-if="pending" class="loading-rows">
        <div v-for="i in 8" :key="i" class="skeleton-row" />
      </div>

      <div v-else-if="!data?.items?.length" class="empty-state">
        <UIcon name="i-heroicons-inbox" />
        <span>Терминов нет — создайте первый</span>
      </div>

      <table v-else class="terms-table">
        <thead>
          <tr>
            <th>Термин</th>
            <th>Определение</th>
            <th>Категория</th>
            <th>Статья</th>
            <th>Синонимы</th>
            <th class="col-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="term in data.items" :key="term.slug" class="term-row">
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
              <UBadge v-if="term.has_article" color="green" variant="soft" size="xs" icon="i-heroicons-check">
                Есть
              </UBadge>
              <UBadge v-else color="gray" variant="soft" size="xs">Нет</UBadge>
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
                <NuxtLink :to="`/admin/glossary/${term.id}/edit`">
                  <UButton icon="i-heroicons-pencil-square" color="gray" variant="ghost" size="xs" />
                </NuxtLink>
                <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="confirmDelete(term)" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Stats -->
    <div v-if="data" class="table-footer">
      Всего: <strong>{{ data.total }}</strong> терминов
    </div>

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
          <UButton color="gray" variant="soft" @click="showDeleteModal = false">Отмена</UButton>
          <UButton color="red" :loading="deleting" @click="doDelete">Удалить</UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth' })

useSeoMeta({ title: 'Глоссарий — Admin — Gativus Wiki' })

const search = ref('')
const dSearch = refDebounced(search, 300)
const store = userStore()

// Categories
const { data: categoriesData } = await useAsyncData('admin-cats', () =>
  $fetch<any>('/api/categories', {
    headers: store.getAuthHeader()
  })
)
const categories = computed(() => categoriesData.value?.items || [])

const { data, pending, refresh } = await useAsyncData(
  'admin-terms',
  () => $fetch<any>('/api/terms', { 
    params: { search: dSearch.value || undefined, limit: 100 },
    headers: store.getAuthHeader()
  }),
  { watch: [dSearch] }
)

// Relink all
const relinking = ref(false)
const relinkResult = ref<{ message: string; error?: boolean } | null>(null)
async function relinkAll() {
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
    setTimeout(() => { relinkResult.value = null }, 5000)
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

function refDebounced<T>(source: Ref<T>, delay: number) {
  const d = ref(source.value) as Ref<T>
  let t: ReturnType<typeof setTimeout>
  watch(source, v => { clearTimeout(t); t = setTimeout(() => { d.value = v }, delay) })
  return d
}
</script>

<style scoped>
.admin-glossary {
  padding: 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.dark .page-desc {
  color: #71717a;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.relink-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
}

.relink-banner.success {
  background: #dcfce7;
  color: #16a34a;
}

.relink-banner.error {
  background: #fee2e2;
  color: #dc2626;
}

.dark .relink-banner.success {
  background: #14532d;
  color: #4ade80;
}

.dark .relink-banner.error {
  background: #450a0a;
  color: #f87171;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 14px;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}

.dark .search-bar {
  background: #18181b;
  border-color: #3f3f46;
}

.search-bar:focus-within {
  border-color: #0ea5e9;
}

.search-icon {
  width: 16px;
  height: 16px;
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 11px 10px;
  font-size: 14px;
  color: #1e293b;
}

.dark .search-input {
  color: #e2e8f0;
}

/* Table */
.terms-table-wrap {
  background: white;
  border: 1.5px solid #f1f5f9;
  border-radius: 16px;
  overflow: hidden;
}

.dark .terms-table-wrap {
  background: #18181b;
  border-color: #27272a;
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

.terms-table {
  width: 100%;
  border-collapse: collapse;
}

.terms-table thead {
  background: #f8fafc;
}

.dark .terms-table thead {
  background: #1c1c1f;
}

.terms-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #94a3b8;
  border-bottom: 1px solid #f1f5f9;
}

.dark .terms-table th {
  border-color: #27272a;
}

.terms-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f8fafc;
  vertical-align: top;
}

.dark .terms-table td {
  border-color: #1c1c1f;
}

.term-row:last-child td {
  border-bottom: none;
}

.term-row:hover td {
  background: rgba(14, 165, 233, 0.02);
}

.col-actions {
  width: 100px;
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

.actions-cell {
  display: flex;
  gap: 4px;
}

.table-footer {
  padding: 12px 16px;
  font-size: 13px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
}

.dark .table-footer {
  border-color: #27272a;
}

.table-footer strong {
  color: #0ea5e9;
}

/* Delete modal */
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
</style>
