<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

useHead({ title: 'Dashboard — Gativus Admin' })

const db = ref({
  articles: 0,
  terms: 0,
  categories: 0,
  books: 0,
  users: 0
})

// Fetch dashboard stats
try {
  const { data } = await useFetch('/api/admin/stats')
  if (data.value) {
    db.value = data.value as any
  }
} catch { }

const statCards = computed(() => [
  { label: 'Статьи', value: db.value.articles, icon: 'i-heroicons-document-text', color: '#0ea5e9' },
  { label: 'Термины', value: db.value.terms, icon: 'i-heroicons-document-magnifying-glass', color: '#8b5cf6' },
  { label: 'Категории', value: db.value.categories, icon: 'i-heroicons-folder', color: '#a855f7' },
  { label: 'Книги', value: db.value.books, icon: 'i-heroicons-book-open', color: '#ec4899' },
  { label: 'Пользователи', value: db.value.users, icon: 'i-heroicons-users', color: '#14b8a6' },
])
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-title">Dashboard</h1>
      <p class="dashboard-subtitle">Обзор системы Gativus</p>
    </div>

    <div class="stats-grid">
      <div v-for="stat in statCards" :key="stat.label" class="stat-card">
        <div class="stat-icon-wrap" :style="{ background: stat.color + '15' }">
          <UIcon :name="stat.icon" class="stat-icon" :style="{ color: stat.color }" />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="dashboard-section">
      <h2 class="section-title">Быстрые действия</h2>
      <div class="actions-grid">
        <NuxtLink to="/admin/import" class="action-card">
          <UIcon name="i-heroicons-arrow-up-tray" class="action-icon" />
          <span class="action-label">Импорт ODT</span>
          <span class="action-desc">Загрузить документ</span>
        </NuxtLink>
        <NuxtLink to="/admin/articles" class="action-card">
          <UIcon name="i-heroicons-plus-circle" class="action-icon" />
          <span class="action-label">Новая статья</span>
          <span class="action-desc">Создать вручную</span>
        </NuxtLink>
        <NuxtLink to="/admin/glossary" class="action-card">
          <UIcon name="i-heroicons-document-magnifying-glass" class="action-icon" />
          <span class="action-label">Глоссарий</span>
          <span class="action-desc">Управление терминами</span>
        </NuxtLink>
        <NuxtLink to="/admin/glossary/create" class="action-card">
          <UIcon name="i-heroicons-document-plus" class="action-icon" />
          <span class="action-label">Новый термин</span>
          <span class="action-desc">Добавить в глоссарий</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1000px;
}

.dashboard-header {
  margin-bottom: 28px;
}

.dashboard-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.dark .dashboard-title {
  color: #e5e5e5;
}

.dashboard-subtitle {
  color: #888;
  font-size: 14px;
  margin: 4px 0 0;
}

/* ─── Stats ─── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 14px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e9e9e9;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.1);
  transform: translateY(-2px);
}

.dark .stat-card {
  background: #1a1a1a;
  border-color: #3a3a3a;
}

.dark .stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon {
  width: 22px;
  height: 22px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.1;
}

.dark .stat-value {
  color: #e5e5e5;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

/* ─── Actions ─── */
.dashboard-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 14px;
}

.dark .section-title {
  color: #e5e5e5;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e9e9e9;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
  cursor: pointer;
}

.action-card:hover {
  border-color: #0ea5e9;
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.1);
  transform: translateY(-2px);
}

.dark .action-card {
  background: #1a1a1a;
  border-color: #3a3a3a;
}

.dark .action-card:hover {
  border-color: #444;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.action-icon {
  width: 24px;
  height: 24px;
  color: #0ea5e9;
}

.action-label {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.dark .action-label {
  color: #e5e5e5;
}

.action-desc {
  font-size: 12px;
  color: #888;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
