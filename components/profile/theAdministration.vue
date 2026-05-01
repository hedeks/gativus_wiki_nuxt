<script setup lang="ts">
import type { AdminDashboardStats } from '~/types'

const store = userStore()
const role = computed(() => store.userInfo?.role)

const canAccess = computed(
  () => role.value === 'admin' || role.value === 'editor',
)

const heading = computed(() =>
  role.value === 'admin'
    ? 'Управление базой знаний'
    : 'Работа с контентом',
)

const lead = computed(() => {
  if (role.value === 'admin') {
    return 'Вы настраиваете глобальную структуру вики: категории, книги, статьи, глоссарий и связи в графе. Дашборд показывает объёмы данных, согласованные с публичным графом и страницей знаний.'
  }
  return 'Вы ведёте контент: книги, статьи, термины и их место в структуре. Панель администрирования — единая точка правок; метрики ниже совпадают с тем, что видит читатель на сайте.'
})

const { data: stats, pending, error } = await useAsyncData(
  `profile-administration-stats-${store.userInfo?.id ?? 'anon'}`,
  async () => {
    if (!canAccess.value)
      return null as AdminDashboardStats | null
    return await $fetch<AdminDashboardStats>('/api/admin/stats', {
      headers: store.getAuthHeader(),
    })
  },
  {
    immediate: true,
    watch: [canAccess],
  },
)

const summaryItems = computed(() => {
  const s = stats.value
  if (!s)
    return []
  const rows: { value: number; label: string }[] = [
    { value: s.categories, label: 'Категории' },
    { value: s.books, label: 'Книги' },
    { value: s.articles, label: 'Статьи' },
    { value: s.terms, label: 'Термины' },
  ]
  if (role.value === 'admin')
    rows.push({ value: s.users, label: 'Пользователи' })
  return rows
})

const graphTeaser = computed(() => {
  const g = stats.value?.graph
  if (!g)
    return null
  return {
    nodes: g.nodeCount,
    structural: g.edgesStructuralSum,
    mentions: g.edgesArticleTermRows,
  }
})

const lastArticleTouch = computed(() => {
  const raw = stats.value?.meta?.lastArticleUpdatedAt
  if (!raw)
    return null
  return new Date(raw).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<template>
  <section
    v-if="canAccess"
    id="administration"
    class="gv-surface-card overflow-hidden"
  >
    <div class="gv-card-header flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-3">
        <span class="admin-eyebrow">Панель</span>
        <h2 class="admin-card-title">
          {{ heading }}
        </h2>
      </div>
      <p class="admin-card-lead m-0">
        {{ lead }}
      </p>
    </div>
    <div class="admin-card-body">
      <div
        v-if="error"
        class="admin-message admin-message--warn"
        role="status"
      >
        Не удалось загрузить сводку. Откройте
        <NuxtLink to="/admin" class="admin-inline-link">
          дашборд
        </NuxtLink>
        — данные будут запрошены там.
      </div>

      <template v-else-if="stats">
        <ul
          class="admin-kpi-grid"
          aria-label="Объёмы контента в базе"
        >
          <li
            v-for="row in summaryItems"
            :key="row.label"
            class="admin-kpi"
          >
            <span class="admin-kpi-value">{{ row.value }}</span>
            <span class="admin-kpi-label">{{ row.label }}</span>
          </li>
        </ul>

        <div
          v-if="graphTeaser"
          class="admin-graph-teaser"
        >
          <p class="admin-graph-title m-0">
            Граф знаний (срез как на сайте)
          </p>
          <p class="admin-graph-desc m-0">
            <strong>{{ graphTeaser.nodes }}</strong>
            узлов публичного графа ·
            <strong>{{ graphTeaser.structural }}</strong>
            структурных связей ·
            <strong>{{ graphTeaser.mentions }}</strong>
            упоминаний терминов в статьях
          </p>
        </div>

        <p
          v-if="lastArticleTouch"
          class="admin-meta m-0"
        >
          Последнее обновление контента статей:
          <time :datetime="stats.meta.lastArticleUpdatedAt ?? undefined">{{ lastArticleTouch }}</time>
        </p>
      </template>

      <p
        v-else-if="!pending"
        class="admin-message m-0"
      >
        Сводка недоступна в этом сеансе.
      </p>

      <GvButton
        icon="i-heroicons-arrow-right"
        trailing
        block
        color="sky"
        variant="solid"
        to="/admin"
        label="Открыть панель администрирования"
        :loading="pending"
      />
    </div>
  </section>
</template>

<style scoped>
.admin-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-header));
  color: var(--gv-primary);
  border: 1px solid color-mix(in srgb, var(--gv-primary) 28%, var(--gv-border-principal));
}

.admin-card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--gv-text-primary);
}

.admin-card-lead {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--gv-text-secondary);
  max-width: 52rem;
}

.admin-card-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.admin-kpi-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.625rem;
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
}

.admin-kpi {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 0.875rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface);
  min-width: 0;
}

.admin-kpi-value {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--gv-text-primary);
  line-height: 1.2;
}

.admin-kpi-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.admin-graph-teaser {
  padding: 0.875rem 1rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid color-mix(in srgb, var(--gv-primary) 22%, var(--gv-border-principal));
  background: color-mix(in srgb, var(--gv-primary) 7%, var(--gv-surface-card));
}

.admin-graph-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gv-primary);
  margin-bottom: 0.375rem !important;
}

.admin-graph-desc {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gv-text-secondary);
}

.admin-graph-desc strong {
  color: var(--gv-text-primary);
  font-weight: 700;
}

.admin-meta {
  font-size: 0.75rem;
  color: var(--gv-text-secondary);
}

.admin-message {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gv-text-secondary);
}

.admin-message--warn {
  padding: 0.75rem 0.875rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: color-mix(in srgb, var(--gv-surface-header) 88%, var(--gv-primary) 12%);
  color: var(--gv-text-primary);
}

.admin-inline-link {
  color: var(--gv-primary);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.admin-inline-link:hover {
  color: var(--gv-primary-hover);
}
</style>
