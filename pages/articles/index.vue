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
              <GvButton
                type="button"
                chromeless
                variant="ghost"
                color="gray"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeCategory === null }"
                @click="onSelectCategory(null)"
              >
                {{ t.allArticles }}
              </GvButton>
              <GvButton
                v-for="cat in categoriesList"
                :key="cat.id"
                type="button"
                chromeless
                variant="ghost"
                color="gray"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeCategory === cat.id }"
                @click="onSelectCategory(activeCategory === cat.id ? null : cat.id)"
              >
                {{ cat.title }}
              </GvButton>
            </div>
          </div>
        </ExpandableFilters>
      </div>
    </template>

    <div class="content-wrapper w-full">
      <BaseStateWrapper
        :pending="pending"
        :error="error"
        :empty="!pending && !error && filteredArticles.length === 0"
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
            <GvButton
              v-if="searchQuery || activeCategory !== null"
              type="button"
              unstyled
              chromeless
              class="reset-btn"
              @click="resetFilters"
            >
              {{ t.resetFilters }}
            </GvButton>
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
            :description-html="renderInlineMarkup(article.excerpt || '')"
            :badges="getArticleBadges(article)"
            :index="`#${index + 1}`"
          />
        </KnowledgeListTransition>
        <!-- Sentinel for infinite scroll -->
        <div v-if="page < totalPages" ref="sentinelRef" class="h-4 w-full" />
      </BaseStateWrapper>
    </div>

    <div v-if="totalPages > 1" class="pagination-footer">
      <GvPagination
        v-model="page"
        :total="totalFiltered"
        :page-size="10"
      />
    </div>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useLanguageStore } from '~/stores/language'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch, slicePage } from '~/composables/useSearch'
import type { CardBadge } from '~/components/common/ListItemCard.vue'
import { renderInlineMarkup } from '~/utils/renderInlineMarkup'

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
    allArticles: 'All articles',
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
    allArticles: 'Все статьи',
  },
  zh: {
    heroTitle: '文章',
    heroDesc: 'Gativus 的架构、基本原理 and 方法论。',
    searchPlaceholder: '按标题或描述搜索...',
    filters: '筛选',
    categories: '分类',
    loadingError: '加载错误',
    refreshHint: '请尝试刷新页面。',
    notFound: '未找到内容',
    resetFilters: '重置筛选',
    allArticles: '所有文章',
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

const { data: allArticles, pending, error, refresh: refreshArticles } = await useFetch<any[]>(
  '/api/articles/all',
  { query: computed(() => ({ lang: langStore.currentLang })) }
)
const { data: categories, refresh: refreshCategories } = await useFetch<any[]>('/api/categories', {
  query: computed(() => ({ lang: langStore.currentLang })),
})

const categoriesList = computed(() => categories.value || [])

const activeFilterCount = computed(() => (activeCategory.value !== null ? 1 : 0))

const filteredArticles = computed(() => {
  const list = allArticles.value || []
  let result = list
  if (activeCategory.value !== null) {
    result = result.filter((a: any) => a.category_id === activeCategory.value)
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'excerpt'])
  return result
})

const totalFiltered = computed(() => filteredArticles.value.length)
const totalPages = computed(() => Math.ceil(totalFiltered.value / 10))

const paginatedArticles = computed(() =>
  filteredArticles.value.slice(0, page.value * 10)
)

const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined' && sentinelRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (page.value < totalPages.value) {
            page.value++
          }
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(sentinelRef.value)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

function onSelectCategory(id: number | null) {
  activeCategory.value = id
  page.value = 1
}

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

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = null
  page.value = 1
}

watch(() => langStore.currentLang, () => {
  refreshArticles()
  refreshCategories()
})

watch([debouncedQuery, activeCategory], () => {
  page.value = 1
})

watch([page, totalPages], () => {
  if (page.value > 1 && totalPages.value > 0 && page.value > totalPages.value) {
    page.value = totalPages.value
  }
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

watch(
  () => route.query,
  (newQuery) => {
    const p = parseInt(newQuery.page as string) || 1
    if (page.value !== p) page.value = p

    const s = (newQuery.search as string) || ''
    if (searchQuery.value !== s) searchQuery.value = s

    const cat = newQuery.category_id ? parseInt(newQuery.category_id as string) : null
    if (activeCategory.value !== cat) activeCategory.value = cat
  },
  { deep: true }
)

useMainNavSeo('articles')
</script>
