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
              <button
                type="button"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeLetter === null }"
                @click="activeLetter = null"
              >
                {{ t.allLetters }}
              </button>
              <button
                v-for="letter in availableLetters"
                :key="letter"
                type="button"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeLetter === letter }"
                @click="activeLetter = activeLetter === letter ? null : letter"
              >
                {{ letter }}
              </button>
            </div>
          </div>

          <div v-if="categories.length" class="filter-group">
            <span class="filter-group-label">{{ t.categories }}</span>
            <div class="filter-pills">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                class="gv-filter-pill gv-focusable"
                :class="{ 'is-active': activeCategory === cat.id }"
                @click="activeCategory = activeCategory === cat.id ? null : cat.id"
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
        :empty="!pending && !paginatedTerms.length"
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
            <button
              v-if="searchQuery || activeLetter || activeCategory"
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
      <UPagination
        v-model="page"
        :page-count="20"
        :total="filteredTerms.length"
        size="lg"
        :ui="{ rounded: 'rounded-xl', base: 'pagination-button' }"
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
    metaTitle: 'Glossary — Gativus',
    metaDesc: 'Gativus system terms and definitions.',
    heroTitle: 'GLOSSARY',
    heroDesc: 'Systematized body of Gativus knowledge.',
    searchPlaceholder: 'Search by term or definition...',
    allLetters: 'ALL',
    termsList: 'Terms',
    filters: 'Filters',
    byLetter: 'By Letter',
    categories: 'Categories',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found',
    resetFilters: 'Reset filters',
    hasArticle: 'Article',
  },
  ru: {
    metaTitle: 'Глоссарий — Gativus',
    metaDesc: 'Термины и определения систем Gativus.',
    heroTitle: 'ГЛОССАРИЙ',
    heroDesc: 'Систематизированный свод знаний Gativus.',
    searchPlaceholder: 'Поиск по термину или определению...',
    allLetters: 'ВСЕ',
    termsList: 'Термины',
    filters: 'Фильтры',
    byLetter: 'По букве',
    categories: 'Категории',
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

const categories = ref<any[]>([])
const allTerms = ref<any[]>([])
const availableLetters = ref<string[]>([])
const pending = ref(true)
const error = ref<any>(null)

const activeFilterCount = computed(() =>
  countActiveFilters({
    letter: activeLetter.value,
    category: activeCategory.value,
  })
)

const filteredTerms = computed(() => {
  let result = allTerms.value
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

watchEffect(() => {
  const letters = new Set<string>()
  for (const term of allTerms.value) {
    const char = term.title.charAt(0).toUpperCase()
    if (/[A-ZА-Я]/.test(char)) letters.add(char)
  }
  availableLetters.value = Array.from(letters).sort()
})

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

async function loadAllTerms() {
  pending.value = true
  error.value = null
  try {
    const res = await $fetch<any[]>('/api/terms/all', {
      query: { lang: langStore.currentLang },
    })
    allTerms.value = res || []
  } catch (e) {
    error.value = e
    allTerms.value = []
  } finally {
    pending.value = false
  }
}

async function fetchCategories() {
  try {
    const res = await $fetch<any[]>('/api/categories', {
      query: { lang: langStore.currentLang },
    })
    categories.value = res || []
  } catch {
    categories.value = []
  }
}

await Promise.all([loadAllTerms(), fetchCategories()])

watch(() => langStore.currentLang, () => {
  loadAllTerms()
  fetchCategories()
})

useSeoMeta({
  title: () => t.value.metaTitle,
  description: () => t.value.metaDesc,
})
</script>
