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

        <!-- Minimal Meta Toolbar -->
        <div v-if="filteredArticles.length > 0" class="articles-meta-bar">
          <span class="articles-count-text">
            {{ t.totalArticles }}: <strong>{{ filteredArticles.length }}</strong>
          </span>
          <GvButton
            v-if="groupedArticles.books.length > 1"
            type="button"
            size="xs"
            variant="ghost"
            color="gray"
            class="toggle-all-btn"
            :icon="allExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            @click="toggleAllBooks"
          >
            {{ allExpanded ? t.collapseAll : t.expandAll }}
          </GvButton>
        </div>

        <div class="articles-groups-stack">
          <!-- ── Section 1: Books & Chapter Series ── -->
          <div v-if="groupedArticles.books.length > 0" class="books-accordion-group">
            <div
              v-for="book in groupedArticles.books"
              :key="book.book_id"
              class="book-accordion-card"
            >
              <!-- Accordion Header Bar -->
              <div
                class="book-accordion-header gv-focusable"
                tabindex="0"
                role="button"
                :aria-expanded="isBookOpen(book.book_id)"
                @click="toggleBookGroup(book.book_id)"
                @keydown.enter.prevent="toggleBookGroup(book.book_id)"
                @keydown.space.prevent="toggleBookGroup(book.book_id)"
              >
                <div class="book-header-left">
                  <div class="book-mini-icon">
                    <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-sky-500" />
                  </div>
                  <div class="book-titles-wrap">
                    <div class="book-meta-inline">
                      <span class="book-label-pill">{{ t.bookLabel }}</span>
                      <span class="chapters-count-text">{{ book.articles.length }} {{ t.chaptersCount }}</span>
                    </div>
                    <h2 class="book-main-title">{{ book.book_title }}</h2>
                  </div>
                </div>

                <div class="book-header-right">
                  <NuxtLink
                    v-if="book.book_slug"
                    :to="`/books/${book.book_slug}`"
                    class="book-link-action gv-focusable"
                    :title="t.openBook"
                    @click.stop
                  >
                    <span class="book-link-label">{{ t.openBook }}</span>
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="book-link-icon w-3.5 h-3.5" />
                  </NuxtLink>
                  <div
                    class="book-chevron-box"
                    :class="{ 'is-open': isBookOpen(book.book_id) }"
                    aria-hidden="true"
                  >
                    <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-200" />
                  </div>
                </div>
              </div>

              <!-- Accordion Body (Chapters List) -->
              <transition name="expand">
                <div v-show="isBookOpen(book.book_id)" class="book-accordion-body">
                  <KnowledgeListTransition class="cards-list">
                    <ListItemCard
                      v-for="(article, index) in book.articles"
                      :key="article.id"
                      variant="article"
                      category-link-kind="structural"
                      :to="`/articles/${article.slug}`"
                      icon="i-heroicons-document-text"
                      :title="article.title"
                      :description-html="renderInlineMarkup(article.excerpt || '')"
                      :badges="getArticleBadges(article, false)"
                      :index="`#${article.sort_order || index + 1}`"
                      :preview-label="t.previewLabel"
                      @preview="previewArticle = article"
                    />
                  </KnowledgeListTransition>
                </div>
              </transition>
            </div>
          </div>

          <!-- ── Section 2: Standalone Articles ── -->
          <div v-if="groupedArticles.standalone.length > 0" class="standalone-group">
            <div class="standalone-header-row">
              <div class="standalone-title-badge">
                <UIcon name="i-heroicons-document-duplicate" class="w-4 h-4 text-indigo-500" />
                <span>{{ t.standaloneSection }}</span>
              </div>
              <span class="standalone-count-badge">{{ groupedArticles.standalone.length }}</span>
              <div class="standalone-line" />
            </div>

            <KnowledgeListTransition class="cards-list">
              <ListItemCard
                v-for="(article, index) in groupedArticles.standalone"
                :key="article.id"
                variant="article"
                category-link-kind="virtual"
                :to="`/articles/${article.slug}`"
                icon="i-heroicons-document-text"
                :title="article.title"
                :description-html="renderInlineMarkup(article.excerpt || '')"
                :badges="getArticleBadges(article, true)"
                :index="`#${index + 1}`"
                :preview-label="t.previewLabel"
                @preview="previewArticle = article"
              />
            </KnowledgeListTransition>
          </div>
        </div>
      </BaseStateWrapper>
    </div>

    <!-- Article preview modal -->
    <UModal v-model="previewOpen" :ui="{ width: 'sm:max-w-lg' }">
      <div v-if="previewArticle" class="article-preview-modal">
        <div class="preview-header">
          <div class="preview-cover-placeholder">
            <UIcon name="i-heroicons-document-text" class="w-10 h-10" />
          </div>
          <div class="preview-header-info">
            <div class="preview-badges">
              <span
                v-for="badge in getArticleBadges(previewArticle, true)"
                :key="badge.label"
                class="preview-badge"
                :class="badge.class"
                :style="badge.style"
              >
                <UIcon v-if="badge.icon" :name="badge.icon" class="w-3 h-3 mr-1" />
                {{ badge.label }}
              </span>
            </div>
            <h2 class="preview-title">{{ previewArticle.title }}</h2>
          </div>
        </div>

        <div v-if="previewArticle.excerpt" class="preview-description">
          <p v-html="renderInlineMarkup(previewArticle.excerpt)" />
        </div>

        <div class="preview-actions">
          <GvButton
            :to="`/articles/${previewArticle.slug}`"
            color="indigo"
            variant="solid"
            icon="i-heroicons-document-text"
            @click="previewArticle = null"
          >
            {{ t.openArticle }}
          </GvButton>
          <GvButton color="gray" variant="ghost" @click="previewArticle = null">
            {{ t.close }}
          </GvButton>
        </div>
      </div>
    </UModal>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLanguageStore } from '~/stores/language'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch } from '~/composables/useSearch'
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
    previewLabel: 'Quick preview',
    openArticle: 'Open article',
    close: 'Close',
    booksSection: 'Books & Series',
    standaloneSection: 'Standalone Articles',
    bookLabel: 'Book',
    chaptersCount: 'chapters',
    openBook: 'To book',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    totalArticles: 'Total articles',
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
    previewLabel: 'Быстрый просмотр',
    openArticle: 'Открыть статью',
    close: 'Закрыть',
    booksSection: 'Книги и серии статей',
    standaloneSection: 'Отдельные публикации',
    bookLabel: 'Книга',
    chaptersCount: 'глав',
    openBook: 'К книге',
    expandAll: 'Развернуть все',
    collapseAll: 'Свернуть все',
    totalArticles: 'Всего статей',
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
    previewLabel: '快速预览',
    openArticle: '打开文章',
    close: '关闭',
    booksSection: '图书与系列',
    standaloneSection: '独立文章',
    bookLabel: '图书',
    chaptersCount: '章',
    openBook: '前往图书',
    expandAll: '全部展开',
    collapseAll: '全部折叠',
    totalArticles: '文章总数',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const previewArticle = ref<any>(null)
const previewOpen = computed({
  get: () => previewArticle.value !== null,
  set: (v) => { if (!v) previewArticle.value = null },
})

const { searchQuery, debouncedQuery, isTyping } = useDebounce(
  (route.query.search as string) || '',
  300
)

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
  return getSubcategoryIds(activeCategory.value, categoriesList.value || [])
})

const filteredArticles = computed(() => {
  const list = allArticles.value || []
  let result = list
  if (activeCategory.value !== null) {
    const allowedIds = activeCategoryIds.value
    result = result.filter((a: any) => a.category_id !== null && allowedIds.includes(a.category_id))
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'excerpt'])
  return result
})

interface BookGroup {
  book_id: number
  book_title: string
  book_slug: string
  book_cover_image?: string | null
  articles: any[]
}

const groupedArticles = computed<{ books: BookGroup[]; standalone: any[] }>(() => {
  const list = filteredArticles.value || []
  const booksMap = new Map<number, BookGroup>()
  const standalone: any[] = []

  for (const article of list) {
    if (article.book_id) {
      if (!booksMap.has(article.book_id)) {
        booksMap.set(article.book_id, {
          book_id: article.book_id,
          book_title: article.book_title || 'Untitled Book',
          book_slug: article.book_slug || '',
          book_cover_image: article.book_cover_image || null,
          articles: [],
        })
      }
      booksMap.get(article.book_id)!.articles.push(article)
    } else {
      standalone.push(article)
    }
  }

  // Sort chapters in each book by sort_order
  const books = Array.from(booksMap.values()).map(bg => ({
    ...bg,
    articles: bg.articles.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }))

  return { books, standalone }
})

// Accordion states: undefined or true -> open, false -> collapsed
const bookOpenStates = ref<Record<number, boolean>>({})

function isBookOpen(bookId: number): boolean {
  return bookOpenStates.value[bookId] !== false
}

function toggleBookGroup(bookId: number) {
  bookOpenStates.value[bookId] = !isBookOpen(bookId)
}

const allExpanded = computed(() => {
  if (!groupedArticles.value.books.length) return true
  return groupedArticles.value.books.every(b => isBookOpen(b.book_id))
})

function toggleAllBooks() {
  const nextState = !allExpanded.value
  for (const b of groupedArticles.value.books) {
    bookOpenStates.value[b.book_id] = nextState
  }
}

function onSelectCategory(id: number | null) {
  activeCategory.value = id
}

function getArticleBadges(article: any, showBookBridge = false): CardBadge[] {
  const badges: CardBadge[] = []
  if (article.is_published === 0 || article.is_published === false) {
    badges.push({
      label: 'Неопубликованное',
      class: '!bg-amber-500/10 !text-amber-600 !border-amber-500/20'
    })
  }
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
  if (showBookBridge && article.book_title) {
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
}

watch(() => langStore.currentLang, () => {
  refreshArticles()
  refreshCategories()
})

watch([searchQuery, activeCategory], () => {
  navigateTo(
    {
      path: '/articles',
      query: {
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
    const s = (newQuery.search as string) || ''
    if (searchQuery.value !== s) searchQuery.value = s

    const cat = newQuery.category_id ? parseInt(newQuery.category_id as string) : null
    if (activeCategory.value !== cat) activeCategory.value = cat
  },
  { deep: true }
)

useMainNavSeo('articles')
</script>

<style scoped>
/* Meta Bar */
.articles-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 12px;
  width: 100%;
}

.articles-count-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--gv-text-secondary);
}

.articles-groups-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.books-accordion-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Book Accordion Card ── */
.book-accordion-card {
  border-radius: var(--gv-radius-control, 12px);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface-card);
  overflow: hidden;
  box-shadow: var(--gv-shadow-sm);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.book-accordion-card:hover {
  border-color: color-mix(in srgb, var(--gv-primary, #0ea5e9) 30%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-md);
}

.book-accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--gv-surface-header);
  cursor: pointer;
  user-select: none;
  border-left: 3px solid #0ea5e9;
  transition: background 0.2s ease;
}

.book-accordion-header:hover {
  background: color-mix(in srgb, #0ea5e9 4%, var(--gv-surface-header));
}

.book-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.book-mini-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f0f9ff;
  border: 1px solid rgba(14, 165, 233, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .book-mini-icon {
  background: rgba(14, 165, 233, 0.12);
  border-color: rgba(14, 165, 233, 0.25);
}

.book-titles-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.book-meta-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.book-label-pill {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #0ea5e9;
}

.chapters-count-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--gv-text-secondary);
}

.book-main-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--gv-text-primary);
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.book-link-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #0ea5e9;
  background: #f0f9ff;
  border: 1px solid rgba(14, 165, 233, 0.25);
  border-radius: 6px;
  text-decoration: none !important;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.book-link-action:hover {
  background: #e0f2fe;
  border-color: #0ea5e9;
}

.dark .book-link-action {
  background: rgba(14, 165, 233, 0.1);
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.25);
}

.dark .book-link-action:hover {
  background: rgba(14, 165, 233, 0.2);
}

.book-link-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.book-chevron-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: transform 0.2s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.book-chevron-box.is-open {
  transform: rotate(180deg);
}

.book-accordion-body {
  padding: 12px 14px;
  background: color-mix(in srgb, var(--gv-surface-header) 25%, transparent);
  border-top: 1px solid var(--gv-border-principal);
}

/* ── Section 2: Standalone Articles ── */
.standalone-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.standalone-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px;
}

.standalone-title-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.standalone-count-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: #eef2ff;
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.25);
}

.dark .standalone-count-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}

.standalone-line {
  flex: 1;
  height: 1px;
  background: var(--gv-border-principal);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.25s cubic-bezier(0.705, 0.01, 0, 0.915), opacity 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 3000px;
  opacity: 1;
}

/* Mobile & Tablet responsive (< 800px) */
@media (max-width: 800px) {
  .book-accordion-header {
    padding: 10px 12px;
    gap: 8px;
  }
  .book-main-title {
    font-size: 13px;
  }
  .book-link-action .book-link-label {
    display: none;
  }
  .book-link-action {
    width: 28px;
    height: 28px;
    padding: 0;
  }
  .book-accordion-body {
    padding: 10px;
  }
}

/* Article preview modal */
.article-preview-modal {
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

.preview-cover-placeholder {
  flex-shrink: 0;
  width: 90px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  background: #eef2ff;
  box-shadow: 3px 4px 14px rgba(0, 0, 0, 0.14), inset -1px 0 0 rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  opacity: 0.8;
}

.dark .preview-cover-placeholder {
  background: rgba(99, 102, 241, 0.1);
  box-shadow: 3px 4px 14px rgba(0, 0, 0, 0.4), inset -1px 0 0 rgba(0, 0, 0, 0.2);
  color: #818cf8;
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
  align-items: center;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.35px;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 5px;
  color: #6366f1;
  background: #eef2ff;
}

.dark .preview-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
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

.preview-badge.ontology-book-bridge {
  color: #0ea5e9;
  background: #f0f9ff;
  border: 1px solid rgba(14, 165, 233, 0.25);
}

.dark .preview-badge.ontology-book-bridge {
  background: rgba(14, 165, 233, 0.12);
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.25);
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
  .article-preview-modal { padding: 16px; gap: 16px; }
  .preview-cover-placeholder { width: 70px; height: 96px; }
  .preview-title { font-size: 15px; }
}
</style>
