<!-- pages/books/index.vue -->
<template>
  <KnowledgeIndexLayout
    accent-theme="book"
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
                @click="activeCategory = null"
              >
                {{ t.allBooks }}
              </GvButton>
              <GvButton
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                chromeless
                variant="ghost"
                color="gray"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeCategory === cat.id }"
                @click="activeCategory = activeCategory === cat.id ? null : cat.id"
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
        :empty="!pending && !filteredBooks.length"
        :error-title="t.loadingError"
        :error-hint="t.refreshHint"
        class="w-full"
      >
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <UIcon name="i-heroicons-book-open" class="w-6 h-6" />
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
            v-for="book in paginatedBooks"
            :key="book.id"
            variant="book"
            category-link-kind="virtual"
            :to="`/books/${book.slug}`"
            icon="i-heroicons-book-open"
            :title="book.title"
            :description="book.description"
            :badges="bookBadges(book)"
            :index="`${book.article_count || 0} ${t.chapters}`"
          />
        </KnowledgeListTransition>
      </BaseStateWrapper>
    </div>

    <div v-if="totalBookPages > 1" class="pagination-footer">
      <GvPagination
        v-model="page"
        :total="filteredBooks.length"
        :page-size="BOOKS_PAGE_SIZE"
      />
    </div>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch, slicePage, totalPagesFor } from '~/composables/useSearch'
import type { CardBadge } from '~/components/common/ListItemCard.vue'

const route = useRoute()
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTitle: 'LIBRARY',
    heroDesc:
      'A collection of theoretical materials structured as interactive books.',
    searchPlaceholder: 'Search by title or description...',
    booksList: 'Books',
    filters: 'Filters',
    categories: 'Categories',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found',
    resetFilters: 'Reset filters',
    chapters: 'chapters',
    allBooks: 'All Books',
  },
  ru: {
    heroTitle: 'БИБЛИОТЕКА',
    heroDesc:
      'Собрание теоретических материалов, структурированных в виде интерактивных книг.',
    searchPlaceholder: 'Поиск по названию или описанию...',
    booksList: 'Книги',
    filters: 'Фильтры',
    categories: 'Категории',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    notFound: 'Ничего не найдено',
    resetFilters: 'Сбросить фильтры',
    chapters: 'глав',
    allBooks: 'Все книги',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const BOOKS_PAGE_SIZE = 12

const page = ref(parseInt(route.query.page as string) || 1)

const { searchQuery, debouncedQuery, isTyping } = useDebounce(
  (route.query.search as string) || '',
  300
)

const activeCategory = ref<number | null>(
  route.query.category_id ? parseInt(route.query.category_id as string) : null
)
const activeFilterCount = computed(() => (activeCategory.value !== null ? 1 : 0))

const { data: allBooks, pending, error, refresh } = await useFetch<any[]>('/api/books/all', {
  query: computed(() => ({ lang: langStore.currentLang })),
})
const { data: categories } = await useFetch<any[]>('/api/categories', {
  query: computed(() => ({ lang: langStore.currentLang })),
})

const filteredBooks = computed(() => {
  if (!allBooks.value) return []
  let result = allBooks.value
  if (activeCategory.value !== null) {
    result = result.filter((b: any) => b.category_ids?.includes(activeCategory.value))
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'description'])
  return result
})

const totalBookPages = computed(() => totalPagesFor(filteredBooks.value.length, BOOKS_PAGE_SIZE))

const paginatedBooks = computed(() =>
  slicePage(filteredBooks.value, page.value, BOOKS_PAGE_SIZE),
)

function bookBadges(book: any): CardBadge[] {
  const badges: CardBadge[] = []
  if (book.category_ids) {
    for (const catId of book.category_ids) {
      const cat = (categories.value as any[])?.find((c: any) => c.id === catId)
      if (cat) {
        badges.push({
          label: cat.title,
          class: cat.color ? 'category-badge' : 'category-badge ontology-category',
          style: cat.color
            ? { color: cat.color, borderColor: cat.color }
            : undefined,
        })
      }
    }
  }
  return badges
}

function resetFilters() {
  searchQuery.value = ''
  activeCategory.value = null
  page.value = 1
}

watch(() => langStore.currentLang, () => {
  refresh()
})

watch([debouncedQuery, activeCategory], () => {
  page.value = 1
})

watch([page, totalBookPages], () => {
  if (page.value > 1 && totalBookPages.value > 0 && page.value > totalBookPages.value) {
    page.value = totalBookPages.value
  }
})

watch([page, searchQuery, activeCategory], () => {
  navigateTo(
    {
      path: '/books',
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

useSeoMeta({
  title: () => `${t.value.heroTitle} — Gativus`,
  description: () => t.value.heroDesc,
})
</script>
