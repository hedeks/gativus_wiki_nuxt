<!-- pages/articles/index.vue -->
<template>
  <KnowledgeIndexLayout
    accent-theme="article"
    :title="t.heroTitle"
    :description="t.heroDesc"
  >
    <template #search>
      <div class="search-filters-row">
        <BaseSearch
          v-model="searchQuery"
          :placeholder="t.searchPlaceholder"
          :is-pending="pending"
          :is-debouncing="isTyping"
          class="flex-1"
        />
        <ExpandableFilters
          :label="t.filters"
          :active-count="activeFilterCount"
          :has-active-filters="activeFilterCount > 0"
        >
          <div class="filter-group">
            <span class="filter-group-label">{{ t.categories }}</span>
            <div class="filter-pills">
              <button
                v-for="cat in categories"
                :key="cat.id"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeCategory === cat.id }"
                @click="toggleCategory(cat.id)"
                :style="
                  activeCategory === cat.id
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : {}
                "
              >
                <UIcon :name="cat.icon || 'i-heroicons-tag'" class="mr-1" />
                {{ cat.title.split('—')[0].trim() }}
              </button>
            </div>
          </div>
        </ExpandableFilters>
      </div>
    </template>

    <div class="content-wrapper w-full">
      <BaseStateWrapper
        :pending="pending"
        :error="error"
        :empty="!pending && !error && !paginatedArticles.length"
        :error-title="t.loadingError"
        :error-hint="t.refreshHint"
        class="w-full"
      >
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <UIcon name="i-heroicons-document-text" class="w-6 h-6" />
            </div>
            <p>{{ t.notFound }}</p>
            <button
              v-if="searchQuery || activeCategory !== null"
              type="button"
              class="reset-btn"
              @click="resetFilters"
            >
              {{ t.resetFilters }}
            </button>
          </div>
        </template>

        <KnowledgeListTransition class="cards-list">
          <ListItemCard
            v-for="(article, index) in paginatedArticles"
            :key="article.id"
            variant="article"
            :category-link-kind="article.book_title ? 'structural' : 'virtual'"
            :to="`/articles/${article.slug}`"
            icon="i-heroicons-document-text"
            :title="article.title"
            :description="article.excerpt"
            :badges="getArticleBadges(article)"
            :index="`#${(page - 1) * 10 + index + 1}`"
          />
        </KnowledgeListTransition>
      </BaseStateWrapper>
    </div>

    <div v-if="totalPages > 1" class="pagination-footer">
      <UPagination
        v-model="page"
        :page-count="10"
        :total="totalFiltered"
        size="lg"
        :ui="{ rounded: 'rounded-xl', base: 'pagination-button' }"
      />
    </div>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch, slicePage } from '~/composables/useSearch'
import type { CardBadge } from '~/components/common/ListItemCard.vue'

const route = useRoute()
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTitle: 'ARTICLES',
    heroDesc: 'Architecture, fundamental principles, and Gativus methodology.',
    searchPlaceholder: 'Search by title or description...',
    filters: 'Filters',
    categories: 'Categories',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found',
    resetFilters: 'Reset filters',
  },
  ru: {
    heroTitle: 'СТАТЬИ',
    heroDesc: 'Архитектура, фундаментальные принципы и методология Gativus.',
    searchPlaceholder: 'Поиск по названию или описанию...',
    filters: 'Фильтры',
    categories: 'Категории',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    notFound: 'Ничего не найдено',
    resetFilters: 'Сбросить фильтры',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const { searchQuery, debouncedQuery, isTyping } = useDebounce(
  (route.query.search as string) || '',
  300
)

const page = ref(parseInt(route.query.page as string) || 1)
const activeCategory = ref<number | null>(
  route.query.category_id ? parseInt(route.query.category_id as string) : null
)

const categories = ref<any[]>([])
const allArticles = ref<any[]>([])
const pending = ref(true)
const error = ref<any>(null)

const activeFilterCount = computed(() => (activeCategory.value ? 1 : 0))

const filteredArticles = computed(() => {
  let result = allArticles.value
  if (activeCategory.value !== null) {
    result = result.filter((a: any) => a.category_id === activeCategory.value)
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'excerpt'])
  return result
})

const totalFiltered = computed(() => filteredArticles.value.length)
const totalPages = computed(() => Math.ceil(totalFiltered.value / 10))

const paginatedArticles = computed(() =>
  slicePage(filteredArticles.value, page.value, 10)
)

function getArticleBadges(article: any): CardBadge[] {
  const badges: CardBadge[] = []
  if (article.category_title) {
    badges.push({
      label: article.category_title,
      class: article.category_color ? 'category-badge' : 'category-badge ontology-category',
      icon: article.category_icon,
      style: article.category_color
        ? { color: article.category_color, borderColor: article.category_color }
        : undefined,
    })
  }
  if (article.book_title) {
    badges.push({
      label: article.book_title,
      icon: 'i-heroicons-book-open',
      class: 'ontology-book-bridge',
    })
  }
  return badges
}

function toggleCategory(id: number) {
  activeCategory.value = activeCategory.value === id ? null : id
  page.value = 1
}

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = null
  page.value = 1
}

async function loadAll() {
  pending.value = true
  error.value = null
  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      $fetch<any[]>('/api/articles/all', { query: { lang: langStore.currentLang } }),
      $fetch<any[]>('/api/categories', { query: { lang: langStore.currentLang } }),
    ])
    allArticles.value = articlesRes || []
    categories.value = categoriesRes || []
  } catch (e) {
    error.value = e
  } finally {
    pending.value = false
  }
}

await loadAll()

watch(() => langStore.currentLang, () => loadAll())

watch([debouncedQuery, activeCategory], () => {
  page.value = 1
})

watch([page, searchQuery, activeCategory], () => {
  navigateTo(
    {
      path: '/articles',
      query: {
        page: page.value > 1 ? String(page.value) : undefined,
        search: searchQuery.value || undefined,
        category_id:
          activeCategory.value != null ? String(activeCategory.value) : undefined,
      },
    },
    { replace: true }
  )
})

useHead({ title: () => `${t.value.heroTitle} — Gativus` })
</script>
