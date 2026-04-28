<script setup lang="ts">
import type { AdminDashboardStats } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: 'Dashboard — Gativus Admin' })

const store = userStore()

/** Онтология визуального языка графа (docs/design/FOUNDATION.md) */
const ONTO = {
  category: '#ef4444',
  book: '#0ea5e9',
  article: '#6366f1',
  term: '#10b981',
} as const

const { data: stats, error, pending, refresh } = await useFetch<AdminDashboardStats>(
  '/api/admin/stats',
  { headers: store.getAuthHeader() },
)

const summaryRows = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { value: s.categories, label: 'Категории' },
    { value: s.books, label: 'Книги' },
    { value: s.articles, label: 'Статьи' },
    { value: s.terms, label: 'Термины' },
    { value: s.users, label: 'Пользователи' },
  ]
})

const graphKpis = computed(() => {
  const g = stats.value?.graph
  if (!g) return []
  return [
    { value: g.nodeCount, label: 'Узлы' },
    { value: g.edgesStructuralSum, label: 'Структура' },
    { value: g.edgesArticleTermRows, label: 'Статья↔термин' },
    { value: g.edgesStructuralSum + g.edgesArticleTermRows, label: 'Общие связи' },
  ]
})

type GraphEdgeRow = {
  label: string
  value: number
  accent: string
  dashed: boolean
  kind: 'virtual' | 'structural'
}

function edgeMarkStyle(row: Pick<GraphEdgeRow, 'accent' | 'dashed'>) {
  if (row.dashed) {
    return {
      backgroundImage: `repeating-linear-gradient(90deg, ${row.accent} 0 4px, transparent 4px 7px)`,
      backgroundColor: 'transparent',
    }
  }
  return { backgroundColor: row.accent }
}

const graphRows = computed<GraphEdgeRow[]>(() => {
  const g = stats.value?.graph
  if (!g) return []
  return [
    {
      label: 'Категория → родитель',
      value: g.edgesCategoryHierarchy,
      accent: ONTO.category,
      dashed: true,
      kind: 'virtual',
    },
    {
      label: 'Статья → категория',
      value: g.edgesArticleToCategory,
      accent: ONTO.article,
      dashed: true,
      kind: 'virtual',
    },
    {
      label: 'Статья → книга',
      value: g.edgesArticleToBook,
      accent: ONTO.article,
      dashed: false,
      kind: 'structural',
    },
    {
      label: 'Книга ↔ категория',
      value: g.edgesBookToCategory,
      accent: ONTO.book,
      dashed: true,
      kind: 'virtual',
    },
    {
      label: 'Термин → статья',
      value: g.edgesTermToArticle,
      accent: ONTO.term,
      dashed: false,
      kind: 'structural',
    },
    {
      label: 'Статья ↔ термин',
      value: g.edgesArticleTermRows,
      accent: ONTO.term,
      dashed: false,
      kind: 'structural',
    },
  ]
})

const quickLinks = [
  { to: '/admin/import', label: 'Импорт ODT', icon: 'i-heroicons-arrow-up-tray', primary: false },
  { to: '/admin/articles/create', label: 'Новая статья', icon: 'i-heroicons-document-plus', primary: true },
  { to: '/admin/books/create', label: 'Новая книга', icon: 'i-heroicons-book-open', primary: false },
  { to: '/admin/glossary', label: 'Глоссарий', icon: 'i-heroicons-rectangle-stack', primary: false },
  { to: '/admin/categories', label: 'Категории', icon: 'i-heroicons-folder', primary: false },
  { to: '/knowledge-graph', label: 'Граф знаний', icon: 'i-heroicons-share', primary: true },
] as const
</script>

<template>
  <div class="admin-page-stack">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <h1 class="hero-title gv-hero-gradient uppercase">Dashboard</h1>
          <p class="hero-subtitle">Gativus · администрирование</p>
        </div>
      </div>
    </section>

    <section v-if="pending" class="section-card">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-arrow-path" class="icon-spin" />
        <span>Загрузка…</span>
      </div>
    </section>

    <section v-else-if="error" class="section-card section-card--error">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-exclamation-triangle" class="icon-err" />
        <span>{{ error.message }}</span>
        <button type="button" class="cta-button secondary" @click="refresh()">Повторить</button>
      </div>
    </section>

    <template v-else-if="stats">
      <section class="section-card">
        <div class="card-header">
          <span class="card-badge">DATA</span>
          <h2 class="card-header-title">Сводка</h2>
        </div>
        <div class="card-body">
          <div class="gate-stats gate-stats--5">
            <div v-for="row in summaryRows" :key="row.label" class="stat-item">
              <span class="stat-value tabular-nums">{{ row.value }}</span>
              <span class="stat-label">{{ row.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <div class="two-col">
        <section class="section-card">
          <div class="card-header">
            <span class="card-badge">KG</span>
            <h2 class="card-header-title">Граф знаний</h2>
          </div>
          <div class="card-body">
            <div class="gate-stats gate-stats--4">
              <div v-for="k in graphKpis" :key="k.label" class="stat-item">
                <span class="stat-value tabular-nums">{{ k.value }}</span>
                <span class="stat-label">{{ k.label }}</span>
              </div>
            </div>
            <p class="edge-legend">
              Цвет отрезка — «дочерний» узел (принцип графа). Пунктир — виртуальная связь, сплошная — структурная.
            </p>
            <div class="onto-swatches" aria-hidden="true">
              <span class="onto-swatches__item"><i class="onto-swatch" style="background: #ef4444" />Категория</span>
              <span class="onto-swatches__item"><i class="onto-swatch" style="background: #0ea5e9" />Книга</span>
              <span class="onto-swatches__item"><i class="onto-swatch" style="background: #6366f1" />Статья</span>
              <span class="onto-swatches__item"><i class="onto-swatch" style="background: #10b981" />Термин</span>
            </div>
            <ul class="edge-lines">
              <li v-for="r in graphRows" :key="r.label" class="edge-lines__row">
                <div class="edge-lines__left">
                  <span
                    class="edge-lines__mark"
                    :class="{ 'edge-lines__mark--dashed': r.dashed }"
                    :style="edgeMarkStyle(r)"
                  />
                  <div class="edge-lines__text min-w-0">
                    <div class="edge-lines__title-row">
                      <span class="edge-lines__name">{{ r.label }}</span>
                      <span
                        class="edge-lines__kind"
                        :class="
                          r.kind === 'virtual' ? 'edge-lines__kind--virt' : 'edge-lines__kind--struct'
                        "
                      >
                        {{ r.kind === 'virtual' ? 'вирт.' : 'структ.' }}
                      </span>
                    </div>
                  </div>
                </div>
                <span class="edge-lines__val tabular-nums">{{ r.value }}</span>
              </li>
            </ul>
          </div>
        </section>

        <section class="section-card">
          <div class="card-header">
            <span class="card-badge">SYS</span>
            <h2 class="card-header-title">Система</h2>
          </div>
          <div class="card-body">
            <dl class="sys-dl">
              <div class="sys-dl__row">
                <dt>Ревизии</dt>
                <dd class="tabular-nums">{{ stats.articleRevisions }}</dd>
              </div>
              <div class="sys-dl__row sys-dl__row--stack">
                <dt>Обновлено</dt>
                <dd>{{ stats.meta.lastArticleUpdatedAt || '—' }}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section class="section-card cta-card">
        <div class="card-header">
          <span class="card-badge">ACT</span>
          <h2 class="card-header-title">Действия</h2>
        </div>
        <div class="card-body">
          <div class="cta-buttons cta-buttons--left">
            <NuxtLink
              v-for="link in quickLinks"
              :key="link.to"
              :to="link.to"
              class="cta-button"
              :class="link.primary ? 'primary' : 'secondary'"
            >
              <UIcon :name="link.icon" />
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
