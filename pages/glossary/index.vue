<!-- pages/glossary/index.vue -->
<template>
  <KnowledgeIndexLayout
    accent-theme="term"
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
          <div v-if="availableLetters.length" class="filter-group">
            <span class="filter-group-label">{{ t.byLetter }}</span>
            <div class="filter-pills">
              <GvButton
                type="button"
                chromeless
                variant="ghost"
                color="gray"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeLetter === null }"
                @click="activeLetter = null"
              >
                {{ t.allLetters }}
              </GvButton>
              <GvButton
                v-for="letter in availableLetters"
                :key="letter"
                type="button"
                chromeless
                variant="ghost"
                color="gray"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeLetter === letter }"
                @click="activeLetter = activeLetter === letter ? null : letter"
              >
                {{ letter }}
              </GvButton>
            </div>
          </div>

          <div v-if="categoriesList.length" class="filter-group">
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
                {{ t.allCategories }}
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
        :empty="!pending && !error && filteredTerms.length === 0"
        :error-title="t.loadingError"
        :error-hint="t.refreshHint"
        class="w-full"
      >
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <UIcon name="i-heroicons-beaker" class="w-6 h-6" />
            </div>
            <p>{{ t.notFound }}</p>
            <GvButton
              v-if="searchQuery || activeLetter || activeCategory !== null"
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
            v-for="term in paginatedTerms"
            :key="term.slug"
            variant="term"
            :category-link-kind="term.has_article ? 'structural' : 'virtual'"
            :to="`/glossary/${term.slug}`"
            :icon="term.has_article ? 'i-heroicons-document-text' : 'i-heroicons-bookmark'"
            :title="term.title"
            :description="term.definition"
            :badges="termBadges(term)"
          />
        </KnowledgeListTransition>
      </BaseStateWrapper>
    </div>

    <div v-if="totalPageButtons > 1" class="pagination-footer">
      <GvPagination
        v-model="page"
        :total="filteredTerms.length"
        :page-size="20"
      />
    </div>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch, countActiveFilters, slicePage, totalPagesFor } from '~/composables/useSearch'
import type { CardBadge } from '~/components/common/ListItemCard.vue'

const route = useRoute()
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTitle: 'GLOSSARY',
    heroDesc: 'Systematized body of Gativus knowledge.',
    searchPlaceholder: 'Search by term or definition...',
    allLetters: 'ALL',
    termsList: 'Terms',
    filters: 'Filters',
    byLetter: 'By letter',
    categories: 'Categories',
    allCategories: 'All categories',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found',
    resetFilters: 'Reset filters',
    hasArticle: 'Article',
  },
  ru: {
    heroTitle: 'ГЛОССАРИЙ',
    heroDesc: 'Систематизированный свод знаний Gativus.',
    searchPlaceholder: 'Поиск по термину или определению...',
    allLetters: 'ВСЕ',
    termsList: 'Термины',
    filters: 'Фильтры',
    byLetter: 'По букве',
    categories: 'Категории',
    allCategories: 'Все категории',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    notFound: 'Ничего не найдено',
    resetFilters: 'Сбросить фильтры',
    hasArticle: 'Статья',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const { searchQuery, debouncedQuery, isTyping } = useDebounce(
  (route.query.search as string) || '',
  300
)

const page = ref(parseInt(route.query.page as string) || 1)
const activeLetter = ref<string | null>(
  (route.query.letter as string) || null
)
const activeCategory = ref<number | null>(
  route.query.category_id ? parseInt(route.query.category_id as string) : null
)

const { data: allTerms, pending, error, refresh: refreshTerms } = await useFetch<any[]>(
  '/api/terms/all',
  { query: computed(() => ({ lang: langStore.currentLang })) }
)
const { data: categories, refresh: refreshCategories } = await useFetch<any[]>('/api/categories', {
  query: computed(() => ({ lang: langStore.currentLang })),
})

const categoriesList = computed(() => categories.value || [])

const availableLetters = computed(() => {
  const letters = new Set<string>()
  for (const term of allTerms.value || []) {
    const char = term.title.charAt(0).toUpperCase()
    if (/[A-ZА-ЯЁ]/.test(char)) letters.add(char)
  }
  return Array.from(letters).sort((a, b) => a.localeCompare(b, langStore.currentLang))
})

const activeFilterCount = computed(() =>
  countActiveFilters({
    letter: activeLetter.value,
    category: activeCategory.value,
  })
)

const filteredTerms = computed(() => {
  let result = allTerms.value || []
  if (activeLetter.value) {
    result = result.filter(
      (x) => x.title.charAt(0).toUpperCase() === activeLetter.value
    )
  }
  if (activeCategory.value !== null) {
    result = result.filter((x) => x.category_id === activeCategory.value)
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'definition'])
  return result
})

const totalPageButtons = computed(() =>
  totalPagesFor(filteredTerms.value.length, 20)
)

const paginatedTerms = computed(() =>
  slicePage(filteredTerms.value, page.value, 20)
)

function termBadges(term: any): CardBadge[] {
  const badges: CardBadge[] = []
  if (term.category_title) {
    badges.push({
      label: term.category_title,
      class: term.category_color ? 'category-badge' : 'category-badge ontology-category',
      icon: term.category_icon,
      style: term.category_color
        ? { color: term.category_color, borderColor: term.category_color }
        : undefined,
    })
  }
  if (term.has_article) {
    badges.push({
      label: t.value.hasArticle,
      class: 'ontology-article-bridge',
      icon: 'i-heroicons-document-text',
    })
  }
  return badges
}

function resetFilters() {
  searchQuery.value = ''
  activeLetter.value = null
  activeCategory.value = null
  page.value = 1
}

watch([debouncedQuery, activeLetter, activeCategory], () => {
  page.value = 1
})

watch([page, totalPageButtons], () => {
  if (page.value > 1 && totalPageButtons.value > 0 && page.value > totalPageButtons.value) {
    page.value = totalPageButtons.value
  }
})

watch([page, searchQuery, activeLetter, activeCategory], () => {
  navigateTo(
    {
      path: '/glossary',
      query: {
        page: page.value > 1 ? String(page.value) : undefined,
        search: searchQuery.value || undefined,
        letter: activeLetter.value || undefined,
        category_id:
          activeCategory.value != null ? String(activeCategory.value) : undefined,
      },
    },
    { replace: true }
  )
})

watch(() => langStore.currentLang, () => {
  refreshTerms()
  refreshCategories()
})

useMainNavSeo('glossary')
</script>
