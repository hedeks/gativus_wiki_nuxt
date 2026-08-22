<!-- pages/glossary/index.vue -->
<template>
  <KnowledgeIndexLayout
    accent-theme="term"
    :title="t.heroTitle"
    :description="t.heroDesc"
  >
    <template #search>
      <div class="hero-search-stack">
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

        <!-- ── Alphabet Quick-Rail (Jump Bar with Wrapping Chips) ── -->
        <div v-if="availableLetters.length > 1" class="alphabet-quick-rail-container">
          <div class="alphabet-rail-header">
            <div class="alphabet-rail-label">
              <span class="alphabet-icon-wrap">
                <UIcon name="i-heroicons-bars-arrow-down" class="w-3.5 h-3.5" />
              </span>
              <span class="alphabet-label-text">{{ t.quickJump }}</span>
            </div>
          </div>
          <div class="alphabet-chips-wrap">
            <button
              type="button"
              class="rail-chip gv-focusable"
              :class="{ 'is-active': activeLetter === null }"
              @click="onSelectLetter(null)"
            >
              {{ t.allLetters }}
            </button>
            <button
              v-for="letter in availableLetters"
              :key="letter"
              type="button"
              class="rail-chip gv-focusable"
              :class="{
                'is-active': activeLetter === letter,
                'has-matches': letterMatchesCount(letter) > 0,
                'no-matches': letterMatchesCount(letter) === 0
              }"
              :disabled="letterMatchesCount(letter) === 0"
              @click="onSelectLetter(letter)"
            >
              {{ letter }}
            </button>
          </div>
        </div>
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

        <!-- Terms Summary bar -->
        <div v-if="filteredTerms.length > 0" class="glossary-summary-bar">
          <div class="glossary-count-badge">
            <UIcon name="i-heroicons-bookmark" class="w-4 h-4 text-emerald-500" />
            <span>{{ t.totalTerms }}: <strong>{{ filteredTerms.length }}</strong></span>
          </div>
          <span v-if="activeLetter" class="active-letter-pill">
            {{ t.byLetter }}: <strong>{{ activeLetter }}</strong>
          </span>
        </div>

        <!-- Alphabetical Sections List -->
        <div class="alphabet-sections-stack">
          <section
            v-for="group in groupedTermsByLetter"
            :key="group.letter"
            :id="`letter-section-${group.letter}`"
            class="letter-section-group"
          >
            <!-- Stylized Letter Header -->
            <div class="letter-section-header">
              <div class="letter-badge-wrap">
                <span class="letter-badge">{{ group.letter }}</span>
              </div>
              <span class="letter-terms-count">{{ group.terms.length }} {{ t.termsCount }}</span>
              <div class="letter-section-line" />
            </div>

            <!-- List of Terms for this letter -->
            <KnowledgeListTransition class="cards-list">
              <ListItemCard
                v-for="term in group.terms"
                :key="term.slug"
                variant="term"
                :category-link-kind="term.has_article ? 'structural' : 'virtual'"
                :to="`/glossary/${term.slug}`"
                :icon="term.has_article ? 'i-heroicons-document-text' : 'i-heroicons-bookmark'"
                :title="term.title"
                :description-html="renderInlineMarkup(term.definition)"
                :badges="termBadges(term)"
              />
            </KnowledgeListTransition>
          </section>
        </div>
      </BaseStateWrapper>
    </div>
  </KnowledgeIndexLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useLanguageStore } from '~/stores/language'
import { renderInlineMarkup } from '~/utils/renderInlineMarkup'
import { useDebounce } from '~/composables/useDebounce'
import { filterBySearch, countActiveFilters } from '~/composables/useSearch'
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
    byLetter: 'Letter',
    categories: 'Categories',
    allCategories: 'All categories',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found',
    resetFilters: 'Reset filters',
    hasArticle: 'Article',
    totalTerms: 'Total terms',
    termsCount: 'terms',
    quickJump: 'Alphabet Jump',
  },
  ru: {
    heroTitle: 'ГЛОССАРИЙ',
    heroDesc: 'Систематизированный свод знаний Gativus.',
    searchPlaceholder: 'Поиск по термину или определению...',
    allLetters: 'ВСЕ',
    termsList: 'Термины',
    filters: 'Фильтры',
    byLetter: 'Буква',
    categories: 'Категории',
    allCategories: 'Все категории',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    notFound: 'Ничего не найдено',
    resetFilters: 'Сбросить фильтры',
    hasArticle: 'Статья',
    totalTerms: 'Всего терминов',
    termsCount: 'терминов',
    quickJump: 'Быстрый переход',
  },
  zh: {
    heroTitle: '术语表',
    heroDesc: '系统化的 Gativus 知识体系。',
    searchPlaceholder: '按术语或定义搜索...',
    allLetters: '全部',
    termsList: '术语',
    filters: '筛选',
    byLetter: '字母',
    categories: '分类',
    allCategories: '所有分类',
    loadingError: '加载错误',
    refreshHint: '请尝试刷新页面。',
    notFound: '未找到内容',
    resetFilters: '重置筛选',
    hasArticle: '文章',
    totalTerms: '术语总数',
    termsCount: '词条',
    quickJump: '字母跳转',
  },
}
const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const { searchQuery, debouncedQuery, isTyping } = useDebounce(
  (route.query.search as string) || '',
  300
)

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
    const char = (term.title || '').trim().charAt(0).toUpperCase()
    if (/[A-ZА-ЯЁ0-9]/.test(char)) letters.add(char)
  }
  return Array.from(letters).sort((a, b) => a.localeCompare(b, langStore.currentLang))
})

const activeFilterCount = computed(() =>
  countActiveFilters({
    category: activeCategory.value,
  })
)

const filteredTerms = computed(() => {
  let result = allTerms.value || []
  if (activeCategory.value !== null) {
    result = result.filter((x) => x.category_id === activeCategory.value)
  }
  result = filterBySearch(result, debouncedQuery.value, ['title', 'definition'])
  return result
})

function letterMatchesCount(letter: string): number {
  return filteredTerms.value.filter(
    (x) => (x.title || '').trim().charAt(0).toUpperCase() === letter
  ).length
}

interface LetterGroup {
  letter: string
  terms: any[]
}

const groupedTermsByLetter = computed<LetterGroup[]>(() => {
  const list = filteredTerms.value || []
  const groupsMap = new Map<string, any[]>()

  for (const term of list) {
    const char = (term.title || '').trim().charAt(0).toUpperCase() || '#'
    if (activeLetter.value && char !== activeLetter.value) {
      continue
    }
    if (!groupsMap.has(char)) {
      groupsMap.set(char, [])
    }
    groupsMap.get(char)!.push(term)
  }

  // Sort groups by letter localeCompare
  return Array.from(groupsMap.entries())
    .map(([letter, terms]) => ({
      letter,
      terms: terms.sort((a, b) => (a.title || '').localeCompare(b.title || '', langStore.currentLang)),
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter, langStore.currentLang))
})

function onSelectLetter(letter: string | null) {
  activeLetter.value = letter
  if (letter && import.meta.client) {
    nextTick(() => {
      const el = document.getElementById(`letter-section-${letter}`)
      if (el) {
        const header = document.querySelector('header')
        const headerHeight = header?.clientHeight || 65
        const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16
        window.scrollTo({ top, behavior: 'smooth' })
      }
    })
  }
}

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
}

watch([searchQuery, activeLetter, activeCategory], () => {
  navigateTo(
    {
      path: '/glossary',
      query: {
        search: searchQuery.value || undefined,
        letter: activeLetter.value || undefined,
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

    const letter = (newQuery.letter as string) || null
    if (activeLetter.value !== letter) activeLetter.value = letter

    const cat = newQuery.category_id ? parseInt(newQuery.category_id as string) : null
    if (activeCategory.value !== cat) activeCategory.value = cat
  },
  { deep: true }
)

watch(() => langStore.currentLang, () => {
  refreshTerms()
  refreshCategories()
})

useMainNavSeo('glossary')
</script>

<style scoped>
/* ── Search + Quick Rail Stack ── */
.hero-search-stack {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
}

.search-filters-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* ── Alphabet Quick-Rail (Wrapping Chips) ── */
.alphabet-quick-rail-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border-radius: var(--gv-radius-control, 12px);
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 78%, var(--gv-primary) 22%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 85%, transparent) inset,
    var(--gv-shadow-md);
  user-select: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.alphabet-rail-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.alphabet-rail-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--gv-text-secondary) 82%, var(--gv-primary) 18%);
}

.alphabet-icon-wrap {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card));
  flex-shrink: 0;
}

.alphabet-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.rail-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 5px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 60%, transparent);
  background: color-mix(in srgb, var(--gv-surface-header) 70%, transparent);
  color: var(--gv-text-secondary);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  flex-shrink: 0;
  outline: none;
}

.rail-chip:hover:not(:disabled) {
  background: color-mix(in srgb, var(--gv-primary) 10%, var(--gv-surface-card));
  color: var(--gv-primary);
  border-color: color-mix(in srgb, var(--gv-primary) 25%, transparent);
}

/* Single crisp border - no double border */
.rail-chip.is-active {
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-card));
  color: var(--gv-primary);
  border: 1px solid var(--gv-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.dark .rail-chip.is-active {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border-color: #34d399;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.rail-chip.no-matches {
  opacity: 0.3;
  cursor: default;
}

/* ── Glossary Summary Bar ── */
.glossary-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 12px;
  width: 100%;
}

.glossary-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gv-text-secondary);
}

.active-letter-pill {
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  background: #ecfdf5;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.dark .active-letter-pill {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.25);
}

/* ── Alphabetical Sections Stack ── */
.alphabet-sections-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.letter-section-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-margin-top: 100px;
}

.letter-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 2px;
}

.letter-badge-wrap {
  flex-shrink: 0;
}

.letter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: var(--gv-shadow-sm);
}

.dark .letter-badge {
  background: rgba(16, 185, 129, 0.14);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.3);
}

.letter-terms-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--gv-text-secondary);
}

.letter-section-line {
  flex: 1;
  height: 1px;
  background: var(--gv-border-principal);
}

/* ── Mobile & Tablet Responsive (< 800px) ── */
@media (max-width: 800px) {
  .hero-search-stack {
    gap: 8px;
    width: 100%;
    max-width: 100%;
  }

  .search-filters-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    width: 100%;
    max-width: 100%;
  }

  .alphabet-quick-rail-container {
    padding: 8px 8px;
    gap: 6px;
    width: 100%;
    max-width: 100%;
  }

  .alphabet-chips-wrap {
    gap: 3px;
  }

  .rail-chip {
    min-width: 25px;
    height: 25px;
    font-size: 10.5px;
    padding: 0 4px;
    border-radius: 5px;
  }

  .letter-badge {
    width: 28px;
    height: 28px;
    font-size: 13px;
    border-radius: 6px;
  }

  .letter-section-group {
    scroll-margin-top: 110px;
  }
}
</style>
