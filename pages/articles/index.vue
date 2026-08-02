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
            :preview-label="t.previewLabel"
            @preview="previewArticle = article"
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
                v-for="badge in getArticleBadges(previewArticle)"
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
    previewLabel: 'Quick preview',
    openArticle: 'Open article',
    close: 'Close',
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

<style scoped>
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
