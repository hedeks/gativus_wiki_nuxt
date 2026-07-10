<template>
  <KnowledgeIndexLayout
    accent-theme="category"
    :title="heroTitle"
    :description="heroDesc"
  >
    <template #search>
      <div class="search-filters-row">
        <ExpandableFilters
          :label="t.filters"
          :active-count="activeSlug ? 1 : 0"
          :has-active-filters="!!activeSlug"
          class="w-full"
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
                :class="{ 'is-active': !activeSlug }"
                @click="onSelectCategory(null)"
              >
                {{ t.allCategories }}
              </GvButton>
              <GvButton
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                chromeless
                variant="ghost"
                color="gray"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeSlug === cat.slug }"
                @click="onSelectCategory(activeSlug === cat.slug ? null : cat.slug)"
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
        :empty="false"
        :error-title="t.loadingError"
        :error-hint="t.refreshHint"
        class="w-full"
      >
        <transition name="fade-crisp" mode="out-in">
          <!-- Single Category View (Tabs) -->
          <div v-if="activeCategory" key="single-view">
            <UTabs :items="tabItems" class="w-full">
              <template #books="{ item }">
                <transition appear name="fade-crisp">
                  <div class="mt-4">
                    <BaseStateWrapper :pending="false" :error="null" :empty="singleBooks.length === 0" class="w-full">
                      <template #empty><div class="empty-state"><p>{{ t.notFound }}</p></div></template>
                      <div class="books-grid">
                        <BookCard
                          v-for="(book, index) in singleBooks" :key="book.id"
                          :to="`/books/${book.slug}`" :title="book.title"
                          :cover-image="book.cover_image || undefined"
                          :description-html="renderInlineMarkup(book.description || '')"
                          :badges="getBookBadges(book, activeCategory.id)"
                          :chapters="book.article_count || 0"
                          :chapters-label="t.chapters" :preview-label="t.previewLabel"
                          @preview="previewBook = book"
                        />
                      </div>
                    </BaseStateWrapper>
                  </div>
                </transition>
              </template>
              <template #articles="{ item }">
                <transition appear name="fade-crisp">
                  <div class="mt-4">
                    <BaseStateWrapper :pending="false" :error="null" :empty="singleArticles.length === 0" class="w-full">
                      <template #empty><div class="empty-state"><p>{{ t.notFound }}</p></div></template>
                      <div class="cards-list">
                        <ListItemCard
                          v-for="(article, index) in singleArticles" :key="article.id"
                          variant="article" :to="`/articles/${article.slug}`"
                          :title="article.title" :description-html="renderInlineMarkup(article.excerpt || '')"
                          :badges="getArticleBadges(article, activeCategory.id)" :index="`#${index + 1}`"
                        />
                      </div>
                    </BaseStateWrapper>
                  </div>
                </transition>
              </template>
              <template #terms="{ item }">
                <transition appear name="fade-crisp">
                  <div class="mt-4">
                    <BaseStateWrapper :pending="false" :error="null" :empty="singleTerms.length === 0" class="w-full">
                      <template #empty><div class="empty-state"><p>{{ t.notFound }}</p></div></template>
                      <div class="cards-list">
                        <ListItemCard
                          v-for="(term, index) in singleTerms" :key="term.id"
                          variant="term" :category-link-kind="'virtual'" :to="`/glossary/${term.slug}`"
                          icon="i-heroicons-light-bulb" :title="term.title"
                          :description-html="renderInlineMarkup(term.definition || '')"
                          :badges="getTermBadges(term, activeCategory.id)" :index="`#${index + 1}`"
                        />
                      </div>
                    </BaseStateWrapper>
                  </div>
                </transition>
              </template>
            </UTabs>
          </div>
  
          <!-- All Categories View (Tree) -->
          <div v-else key="all-view" class="all-categories-view">
            <div v-for="cat in topLevelCategories" :key="cat.id" class="category-block">
              <div class="category-block-header cursor-pointer group" @click="onSelectCategory(cat.slug)">
                <UIcon :name="cat.icon || 'i-heroicons-folder'" class="w-7 h-7 text-[var(--gv-primary)] group-hover:text-[var(--gv-primary-hover)] transition-colors" />
                <div class="flex flex-col">
                  <h2 class="text-2xl font-bold group-hover:text-[var(--gv-primary)] transition-colors">{{ cat.title }}</h2>
                  <p v-if="cat.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{{ cat.description }}</p>
                </div>
              </div>
              
              <div class="category-block-content space-y-6">
                <!-- Books for this block -->
                <div v-if="getItemsForCat(cat.id, 'books').length > 0">
                  <h3 class="section-title">{{ t.books }}</h3>
                  <div class="books-grid">
                    <BookCard
                      v-for="(book, index) in getItemsForCat(cat.id, 'books')" :key="book.id"
                      :to="`/books/${book.slug}`" :title="book.title"
                      :cover-image="book.cover_image || undefined"
                      :description-html="renderInlineMarkup(book.description || '')"
                      :badges="getBookBadges(book, cat.id)"
                      :chapters="book.article_count || 0"
                      :chapters-label="t.chapters" :preview-label="t.previewLabel"
                      @preview="previewBook = book"
                    />
                  </div>
                </div>
                
                <!-- Articles for this block -->
                <div v-if="getItemsForCat(cat.id, 'articles').length > 0">
                  <h3 class="section-title">{{ t.articles }}</h3>
                  <div class="cards-list">
                    <ListItemCard
                      v-for="(article, index) in getItemsForCat(cat.id, 'articles')" :key="article.id"
                      variant="article" :to="`/articles/${article.slug}`"
                      :title="article.title" :description-html="renderInlineMarkup(article.excerpt || '')"
                      :badges="getArticleBadges(article, cat.id)" :index="`#${index + 1}`"
                    />
                  </div>
                </div>
  
                <!-- Terms for this block -->
                <div v-if="getItemsForCat(cat.id, 'terms').length > 0">
                  <h3 class="section-title">{{ t.terms }}</h3>
                  <div class="cards-list">
                    <ListItemCard
                      v-for="(term, index) in getItemsForCat(cat.id, 'terms')" :key="term.id"
                      variant="term" :category-link-kind="'virtual'" :to="`/glossary/${term.slug}`"
                      icon="i-heroicons-light-bulb" :title="term.title"
                      :description-html="renderInlineMarkup(term.definition || '')"
                      :badges="getTermBadges(term, cat.id)" :index="`#${index + 1}`"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>

      </BaseStateWrapper>
    </div>

    <!-- Book preview modal -->
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
                v-for="badge in getBookBadges(previewBook, activeCategory?.id || null)"
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
import { computed, ref, watch } from 'vue'
import { useLanguageStore } from '~/stores/language'
import type { CardBadge } from '~/components/common/ListItemCard.vue'
import { renderInlineMarkup } from '~/utils/renderInlineMarkup'

const route = useRoute()
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTitle: 'CATEGORIES',
    heroDesc: 'Explore all knowledge grouped by semantic areas.',
    articles: 'Articles',
    books: 'Books',
    terms: 'Terms',
    filters: 'Filters',
    categories: 'Categories',
    allCategories: 'All Categories',
    notFound: 'Nothing found',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    chapters: 'chapters',
    previewLabel: 'Quick preview',
    openBook: 'Open book',
    close: 'Close',
  },
  ru: {
    heroTitle: 'КАТЕГОРИИ',
    heroDesc: 'Исследуйте все знания, сгруппированные по семантическим областям.',
    articles: 'Статьи',
    books: 'Книги',
    terms: 'Термины',
    filters: 'Фильтры',
    categories: 'Категории',
    allCategories: 'Все категории',
    notFound: 'Ничего не найдено',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    chapters: 'глав',
    previewLabel: 'Быстрый просмотр',
    openBook: 'Открыть книгу',
    close: 'Закрыть',
  },
  zh: {
    heroTitle: '分类',
    heroDesc: '探索按语义区域分组的所有知识。',
    articles: '文章',
    books: '书籍',
    terms: '术语',
    filters: '筛选',
    categories: '分类',
    allCategories: '所有分类',
    notFound: '未找到内容',
    loadingError: '加载错误',
    refreshHint: '请尝试刷新页面。',
    chapters: '章',
    previewLabel: '快速预览',
    openBook: '打开书籍',
    close: '关闭',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const tabItems = computed(() => [
  { label: t.value.books, slot: 'books', icon: 'i-heroicons-book-open' },
  { label: t.value.articles, slot: 'articles', icon: 'i-heroicons-document-text' },
  { label: t.value.terms, slot: 'terms', icon: 'i-heroicons-light-bulb' }
])

const activeSlug = ref<string | null>((route.query.slug as string) || null)

const previewBook = ref<any>(null)
const previewOpen = computed({
  get: () => previewBook.value !== null,
  set: (v) => { if (!v) previewBook.value = null },
})

// Fetch all categories
const { data: categories, pending: catPending, error: catError, refresh: refreshCat } = await useFetch<any[]>('/api/categories', {
  query: computed(() => ({ lang: langStore.currentLang }))
})

// Fetch all content
const { data: articles, pending: articlesPending, error: artError, refresh: refreshArt } = await useFetch<any[]>('/api/articles/all', {
  query: computed(() => ({ lang: langStore.currentLang }))
})
const { data: books, pending: booksPending, error: booError, refresh: refreshBoo } = await useFetch<any[]>('/api/books/all', {
  query: computed(() => ({ lang: langStore.currentLang }))
})
const { data: terms, pending: termsPending, error: termError, refresh: refreshTerm } = await useFetch<any[]>('/api/terms/all', {
  query: computed(() => ({ lang: langStore.currentLang }))
})

const pending = computed(() => catPending.value || articlesPending.value || booksPending.value || termsPending.value)
const error = computed(() => catError.value || artError.value || booError.value || termError.value)

const activeCategory = computed(() => {
  if (!activeSlug.value || !categories.value) return null
  return categories.value.find(c => c.slug === activeSlug.value) || null
})

const heroTitle = computed(() => activeCategory.value ? activeCategory.value.title : t.value.heroTitle)
const heroDesc = computed(() => activeCategory.value ? activeCategory.value.description : t.value.heroDesc)

// Tree Logic
const topLevelCategories = computed(() => {
  if (!categories.value) return []
  return categories.value.filter(c => !c.parent_id)
})

function getDescendantIds(catId: number): number[] {
  if (!categories.value) return []
  const ids = new Set<number>()
  function collect(id: number) {
    if (!ids.has(id)) {
      ids.add(id)
      categories.value!.filter(c => c.parent_id === id).forEach(c => collect(c.id))
    }
  }
  collect(catId)
  return Array.from(ids)
}

function getItemsForCat(catId: number, type: 'books' | 'articles' | 'terms') {
  const ids = getDescendantIds(catId)
  if (type === 'books') {
    return books.value?.filter(b => b.category_ids?.some((cid: number) => ids.includes(cid))) || []
  }
  if (type === 'articles') {
    return articles.value?.filter(a => a.category_id && ids.includes(a.category_id)) || []
  }
  if (type === 'terms') {
    return terms.value?.filter(t => t.category_id && ids.includes(t.category_id)) || []
  }
  return []
}

const singleBooks = computed(() => activeCategory.value ? getItemsForCat(activeCategory.value.id, 'books') : [])
const singleArticles = computed(() => activeCategory.value ? getItemsForCat(activeCategory.value.id, 'articles') : [])
const singleTerms = computed(() => activeCategory.value ? getItemsForCat(activeCategory.value.id, 'terms') : [])

function onSelectCategory(slug: string | null) {
  activeSlug.value = slug
}

const getCategoryById = (id: number) => categories.value?.find(c => c.id === id)

// Badge helper
const getSubcategoryBadge = (itemCatId: number | null, contextCatId: number | null): CardBadge | null => {
  if (!itemCatId || !contextCatId) return null
  if (itemCatId !== contextCatId) {
    const cat = getCategoryById(itemCatId)
    if (cat) {
      return {
        label: cat.title,
        icon: cat.icon || 'i-heroicons-folder',
        class: 'category-badge subcategory-badge',
      }
    }
  }
  return null
}

function getArticleBadges(article: any, contextCatId: number | null): CardBadge[] {
  const badges: CardBadge[] = []
  const subBadge = getSubcategoryBadge(article.category_id, contextCatId)
  if (subBadge) badges.push(subBadge)
  if (article.book_title) {
    badges.push({
      label: article.book_title,
      icon: 'i-heroicons-book-open',
      class: 'ontology-book-bridge',
    })
  }
  return badges
}

function getBookBadges(book: any, contextCatId: number | null): CardBadge[] {
  const badges: CardBadge[] = []
  if (book.category_ids && contextCatId) {
    const ids = getDescendantIds(contextCatId)
    const subCats = book.category_ids.filter((cid: number) => cid !== contextCatId && ids.includes(cid))
    if (subCats.length > 0) {
      const cat = getCategoryById(subCats[0])
      if (cat) {
        badges.push({
          label: cat.title,
          icon: cat.icon || 'i-heroicons-folder',
          class: 'category-badge subcategory-badge',
        })
      }
    }
  }
  return badges
}

function getTermBadges(term: any, contextCatId: number | null): CardBadge[] {
  const badges: CardBadge[] = []
  const subBadge = getSubcategoryBadge(term.category_id, contextCatId)
  if (subBadge) badges.push(subBadge)
  return badges
}

watch(() => langStore.currentLang, () => {
  refreshCat(); refreshArt(); refreshBoo(); refreshTerm()
})

watch(activeSlug, (newVal) => {
  navigateTo({
    path: '/categories',
    query: { slug: newVal || undefined }
  }, { replace: true })
})

watch(() => route.query.slug, (newSlug) => {
  if (activeSlug.value !== newSlug) {
    activeSlug.value = (newSlug as string) || null
  }
})

useHead({
  title: computed(() => activeCategory.value ? `${activeCategory.value.title} - Gativus` : t.value.heroTitle)
})
</script>

<style scoped>
/* Crisp and Premium Transitions */
.fade-crisp-enter-active,
.fade-crisp-leave-active {
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1), transform 0.2s cubic-bezier(0.2, 0, 0, 1);
}
.fade-crisp-enter-from,
.fade-crisp-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.cards-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 12px;
}
.empty-state {
  width: 100%;
  text-align: center;
  padding: 48px 24px;
  box-sizing: border-box;
}
.empty-state p {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
}
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

.all-categories-view {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.category-block {
  display: flex;
  flex-direction: column;
  background: var(--gv-surface-card);
  border: 1px solid var(--gv-border-subtle);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.dark .category-block {
  background: var(--gv-surface-card);
  border-color: var(--gv-border-subtle);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.category-block-header {
  padding: 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  border-bottom: 1px solid var(--gv-border-subtle);
  background: color-mix(in srgb, var(--gv-surface-card) 70%, transparent);
}

.category-block-content {
  padding: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
  margin-bottom: 16px;
}

.dark .section-title {
  color: #94a3b8;
}

/* Book preview modal styles */
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
