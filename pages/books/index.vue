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

        <KnowledgeListTransition class="books-grid">
          <BookCard
            v-for="book in paginatedBooks"
            :key="book.id"
            :to="`/books/${book.slug}`"
            :title="book.title"
            :cover-image="book.cover_image || undefined"
            :description-html="renderInlineMarkup(book.description || '')"
            :badges="bookBadges(book)"
            :chapters="book.article_count || 0"
            :chapters-label="t.chapters"
            :preview-label="t.previewLabel"
            @preview="previewBook = book"
          />
        </KnowledgeListTransition>
        <!-- Sentinel for infinite scroll -->
        <div v-if="page < totalBookPages" ref="sentinelRef" class="h-4 w-full" />
      </BaseStateWrapper>
    </div>

    <div v-if="totalBookPages > 1" class="pagination-footer">
      <GvPagination
        v-model="page"
        :total="filteredBooks.length"
        :page-size="BOOKS_PAGE_SIZE"
      />
    </div>

    <!-- Book preview modal — inside layout so page stays single-root -->
    <UModal v-model="previewOpen" :ui="{ width: 'sm:max-w-lg' }">
    <div v-if="previewBook" class="book-preview-modal">
      <div class="preview-header">
        <div class="preview-cover">
          <img v-if="previewBook.cover_image" :src="previewBook.cover_image" :alt="previewBook.title" class="preview-cover-img" />
          <div v-else class="preview-cover-placeholder">
            <UIcon name="i-heroicons-book-open" class="w-10 h-10" />
          </div>
        </div>
        <div class="preview-header-info">
          <div class="preview-badges">
            <span
              v-for="badge in bookBadges(previewBook)"
              :key="badge.label"
              class="preview-badge"
              :class="badge.class"
              :style="badge.style"
            >{{ badge.label }}</span>
          </div>
          <h2 class="preview-title">{{ previewBook.title }}</h2>
          <p class="preview-chapters">{{ previewBook.article_count || 0 }} {{ t.chapters }}</p>
        </div>
      </div>

      <div v-if="previewBook.description" class="preview-description">
        <p v-html="renderInlineMarkup(previewBook.description)" />
      </div>

      <div class="preview-actions">
        <GvButton
          :to="`/books/${previewBook.slug}`"
          color="sky"
          variant="solid"
          icon="i-heroicons-book-open"
          @click="previewBook = null"
        >
          {{ t.openBook }}
        </GvButton>
        <GvButton color="gray" variant="ghost" @click="previewBook = null">
          {{ t.close }}
        </GvButton>
      </div>
    </div>
    </UModal>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useLanguageStore } from '~/stores/language'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch, slicePage, totalPagesFor } from '~/composables/useSearch'
import type { CardBadge } from '~/components/common/ListItemCard.vue'
import { renderInlineMarkup } from '~/utils/renderInlineMarkup'

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
    previewLabel: 'Quick preview',
    openBook: 'Open book',
    close: 'Close',
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
    previewLabel: 'Быстрый просмотр',
    openBook: 'Открыть книгу',
    close: 'Закрыть',
  },
  zh: {
    heroTitle: '图书馆',
    heroDesc: '以互动书籍形式结构化的理论材料合集。',
    searchPlaceholder: '按标题或描述搜索...',
    booksList: '图书',
    filters: '筛选',
    categories: '分类',
    loadingError: '加载错误',
    refreshHint: '请尝试刷新页面。',
    notFound: '未找到内容',
    resetFilters: '重置筛选',
    chapters: '章',
    allBooks: '所有图书',
    previewLabel: '快速预览',
    openBook: '打开书籍',
    close: '关闭',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const BOOKS_PAGE_SIZE = 12

const previewBook = ref<any>(null)
const previewOpen = computed({
  get: () => previewBook.value !== null,
  set: (v) => { if (!v) previewBook.value = null },
})

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

function getSubcategoryIds(catId: number, flatCategories: any[]): number[] {
  const ids = [catId]
  const children = flatCategories.filter((c: any) => c.parent_id === catId)
  for (const child of children) {
    ids.push(...getSubcategoryIds(child.id, flatCategories))
  }
  return ids
}

const activeCategoryIds = computed(() => {
  if (activeCategory.value === null) return []
  return getSubcategoryIds(activeCategory.value, categories.value || [])
})

const filteredBooks = computed(() => {
  if (!allBooks.value) return []
  let result = allBooks.value
  if (activeCategory.value !== null) {
    const allowedIds = activeCategoryIds.value
    result = result.filter((b: any) => b.category_ids?.some((id: number) => allowedIds.includes(id)))
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'description'])
  return result
})

const totalBookPages = computed(() => totalPagesFor(filteredBooks.value.length, BOOKS_PAGE_SIZE))

const paginatedBooks = computed(() =>
  filteredBooks.value.slice(0, page.value * BOOKS_PAGE_SIZE)
)

const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver !== 'undefined' && sentinelRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (page.value < totalBookPages.value) {
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

useMainNavSeo('library')
</script>

<style scoped>
.books-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
}

@media (max-width: 860px) {
  .books-grid {
    grid-template-columns: 1fr;
  }
}

/* Book preview modal */
.book-preview-modal {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.preview-cover {
  flex-shrink: 0;
  width: 110px;
  height: 154px;
  border-radius: 10px;
  overflow: hidden;
  background: #f0f9ff;
  box-shadow: 3px 4px 14px rgba(0, 0, 0, 0.14), inset -1px 0 0 rgba(0, 0, 0, 0.06);
}

.dark .preview-cover {
  background: rgba(14, 165, 233, 0.08);
  box-shadow: 3px 4px 14px rgba(0, 0, 0, 0.4), inset -1px 0 0 rgba(0, 0, 0, 0.2);
}

.preview-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0ea5e9;
  opacity: 0.6;
}

.preview-header-info {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

.preview-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.preview-badge {
  display: inline-flex;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.35px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 5px;
  color: #0ea5e9;
  background: #f0f9ff;
}

.dark .preview-badge {
  background: rgba(14, 165, 233, 0.1);
  filter: brightness(1.1);
}

.preview-badge.category-badge {
  color: inherit;
  background: transparent;
  border: 1px solid currentColor;
}

.preview-badge.ontology-category {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(254, 242, 242, 0.85);
}

.dark .preview-badge.ontology-category {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
  border-color: rgba(252, 165, 165, 0.3);
}

.preview-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 8px;
  line-height: 1.35;
  word-break: break-word;
}

.dark .preview-title { color: #e5e5e5; }

.preview-chapters {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  margin: 0;
}

.dark .preview-chapters { color: #71717a; }

.preview-description {
  font-size: 14px;
  line-height: 1.65;
  color: #374151;
  border-top: 1px solid var(--gv-border-subtle, #f4f4f5);
  padding-top: 16px;
}

.dark .preview-description {
  color: #d1d5db;
  border-top-color: #2a2a2e;
}

.preview-description :deep(strong) { font-weight: 700; }
.preview-description :deep(em) { font-style: italic; }

.preview-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .book-preview-modal { padding: 16px; gap: 16px; }
  .preview-cover { width: 80px; height: 112px; }
  .preview-title { font-size: 15px; }
}
</style>
