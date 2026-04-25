<template>
  <div class="glossary-index-page min-h-screen">
    <!-- Page Header Container -->
    <div class="page-container">
      <header class="glossary-hero w-full">
        <div class="hero-content flex flex-col items-center text-center">
          <div class="hero-meta uppercase mb-4">{{ t.heroMeta }}</div>
          <h1 class="hero-title uppercase">{{ t.heroTitle }}</h1>
          <p class="hero-description mt-4">
            {{ t.heroDesc }}
          </p>

          <!-- Search Capsule -->
          <BaseSearch v-model="searchQuery" :placeholder="t.searchPlaceholder" />

          <!-- Alphabet Filter -->
          <div v-if="availableLetters.length" class="alphabet-nav mt-8 flex flex-wrap justify-center gap-2">
            <button class="letter-pill" :class="{ active: !activeLetter }" @click="activeLetter = null">
              {{ t.allLetters }}
            </button>
            <button v-for="letter in availableLetters" :key="letter" class="letter-pill"
              :class="{ active: activeLetter === letter }" @click="toggleLetter(letter)">
              {{ letter }}
            </button>
          </div>

          <!-- Category Filter -->
          <div v-if="categories && categories.length" class="categories-nav mt-6 flex flex-wrap justify-center gap-2">
            <button v-for="cat in categories" :key="cat.id" class="cat-pill"
              :class="{ active: activeCategory === cat.id }" @click="toggleCategory(cat.id)"
              :style="activeCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}">
              <UIcon :name="cat.icon || 'i-heroicons-tag'" class="mr-1" />
              {{ cat.title.split('—')[0].trim() }}
            </button>
          </div>
        </div>
      </header>

      <!-- Section Divider -->
      <div class="section-divider my-16">
        <span class="divider-text uppercase">{{ t.termsList }}</span>
      </div>

      <!-- Main Terms List -->
      <section class="terms-section w-full">
        <!-- Error State -->
        <div v-if="error" class="error-card p-10 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-red-500 mb-4 mx-auto" />
          <h3 class="font-bold">{{ t.loadingError }}</h3>
          <p class="text-sm mt-2 opacity-60">{{ t.refreshHint }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!pending && !data?.items?.length"
          class="empty-state py-20 text-center border-dashed border-2 border-gray-100 dark:border-zinc-800 rounded-2xl">
          <div class="empty-icon-wrap mb-4 mx-auto">
            <UIcon name="i-heroicons-beaker" class="text-4xl text-gray-300" />
          </div>
          <p class="text-gray-500 uppercase tracking-widest text-sm font-bold">{{ t.notFound }}</p>
          <button v-if="searchQuery || activeLetter" @click="resetFilters"
            class="mt-4 text-sky-500 hover:underline text-sm font-bold uppercase tracking-wider">{{ t.resetFilters
            }}</button>
        </div>

        <!-- List of Terms -->
        <TransitionGroup name="list" tag="div" v-else class="terms-list flex flex-col gap-5 transition-all duration-300"
          :class="{ 'opacity-50 blur-[2px] pointer-events-none': pending || isTyping }">
          <NuxtLink v-for="(term, index) in data?.items" :key="term.slug" :to="`/glossary/${term.slug}`"
            class="inner-card group">
            <!-- Index/Visual -->
            <div class="letter-block uppercase font-bold text-sky-600 dark:text-sky-400">
              {{ term.title.charAt(0) }}
            </div>

            <!-- Content -->
            <div class="flex-1">
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-if="term.category_title" class="badge"
                  :style="term.category_color ? { color: term.category_color, borderColor: term.category_color } : {}">
                  <UIcon v-if="term.category_icon" :name="term.category_icon" class="mr-1" />
                  {{ term.category_title }}
                </span>
                <span v-if="term.has_article" class="badge-secondary transition-colors duration-300">
                  <UIcon name="i-heroicons-document-text" class="mr-1" />
                  {{ t.hasArticle }}
                </span>
              </div>
              <h3 class="chapter-title">{{ term.title }}</h3>
              <p class="chapter-excerpt line-clamp-2" v-if="term.definition">{{ term.definition }}</p>
            </div>

            <!-- Arrow -->
            <UIcon name="i-heroicons-arrow-right"
              class="text-gray-300 group-hover:text-sky-500 transition-all duration-300 transform group-hover:translate-x-1 flex-shrink-0" />
          </NuxtLink>
        </TransitionGroup>

        <!-- Pagination Bar -->
        <div v-if="data && data.pages > 1" class="pagination-footer mt-16 flex justify-center">
          <UPagination v-model="currentPage" :page-count="1" :total="data.pages" size="lg" :ui="{
            rounded: 'rounded-xl',
            base: 'pagination-button'
          }" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
const langStore = useLanguageStore()
const route = useRoute()

const uiDict: Record<string, any> = {
  en: {
    metaTitle: 'Glossary — Gativus',
    metaDesc: 'Gativus system terms and definitions (GTOM, GNET, GATE).',
    heroMeta: 'Glossary & Terms',
    heroTitle: 'GLOSSARY',
    heroDesc: 'Systematized body of Gativus knowledge. Definitions, theoretical foundations, and conceptual relationships.',
    searchPlaceholder: 'Search knowledge base, concepts and terms...',
    allLetters: 'ALL',
    termsList: 'TERMS LIST',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found',
    resetFilters: 'Reset filters',
    hasArticle: 'HAS ARTICLE'
  },
  ru: {
    metaTitle: 'Глоссарий — Gativus',
    metaDesc: 'Термины и определения систем Gativus (GTOM, GNET, GATE). Только английские оригиналы названий.',
    heroMeta: 'Glossary & Terms',
    heroTitle: 'ГЛОССАРИЙ',
    heroDesc: 'Систематизированный свод знаний Gativus. Определения, теоретические выкладки и взаимосвязи концепций.',
    searchPlaceholder: 'Поиск по базе знаний, концепциям и терминам...',
    allLetters: 'ВСЕ',
    termsList: 'СПИСОК ТЕРМИНОВ',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    notFound: 'Ничего не найдено',
    resetFilters: 'Сбросить фильтры',
    hasArticle: 'ЕСТЬ ОПИСАНИЕ'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

useSeoMeta({
  title: () => t.value.metaTitle,
  description: () => t.value.metaDesc,
})

const searchQuery = ref('')
const activeLetter = ref<string | null>(null)
const activeCategory = ref<number | null>(null)
const currentPage = ref(1)
const isTyping = ref(false)
const debouncedSearch = ref('')

const categoriesData = ref<any[] | null>(null)
const termsData = ref<any | null>(null)
const pending = ref(true)
const error = ref<any>(null)

const categories = computed(() => categoriesData.value || [])
const data = computed(() => termsData.value)
const availableLetters = computed(() => termsData.value?.availableLetters || [])

let searchTimer: any
watch(searchQuery, (newVal) => {
  isTyping.value = true
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = newVal
    currentPage.value = 1
    isTyping.value = false
  }, 100)
})

watch(activeLetter, () => { currentPage.value = 1 })

// Initial Fetch
const [catRes, termRes] = await Promise.all([
  $fetch<any[]>('/api/categories', {
    query: { lang: langStore.currentLang }
  }),
  $fetch<any>('/api/terms', {
    params: {
      search: debouncedSearch.value || undefined,
      letter: activeLetter.value || undefined,
      category_id: activeCategory.value || undefined,
      lang: langStore.currentLang,
      page: currentPage.value,
      limit: 20,
    }
  }).catch(e => {
    error.value = e
    return null
  })
])

categoriesData.value = catRes
termsData.value = termRes
pending.value = false

const refreshData = async () => {
  pending.value = true
  try {
    const res = await $fetch<any>('/api/terms', {
      params: {
        search: debouncedSearch.value || undefined,
        letter: activeLetter.value || undefined,
        category_id: activeCategory.value || undefined,
        lang: langStore.currentLang,
        page: currentPage.value,
        limit: 20,
      }
    })
    termsData.value = res
  } catch (e) {
    error.value = e
  } finally {
    pending.value = false
  }
}

watch([debouncedSearch, activeLetter, activeCategory, currentPage, () => langStore.currentLang], () => {
  refreshData()
})

function toggleLetter(letter: string) {
  activeLetter.value = activeLetter.value === letter ? null : letter
}

function toggleCategory(id: number) {
  activeCategory.value = activeCategory.value === id ? null : id
}

function resetFilters() {
  searchQuery.value = ''
  activeLetter.value = null
  activeCategory.value = null
}
</script>

<style scoped>
/* Transition Group Animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-move {
  transition: transform 0.4s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.glossary-index-page {
  background-color: #fff;
}

.dark .glossary-index-page {
  background-color: #1a1a1a;
}

.page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 40px 10px 80px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

/* Hero Typography */
.hero-meta {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.25em;
  color: #0ea5e9;
}

.hero-title {
  margin: 0;
  font-size: 56px;
  line-height: 1;
  letter-spacing: 12px;
  font-weight: 800;
  background: linear-gradient(135deg, #0c4a6e, #0ea5e9, #0284c7, #0c4a6e);
  background-size: 300% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding-bottom: 8px;
  animation: shine 15s linear infinite;
  user-select: none;
  display: inline-block;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
    letter-spacing: 6px;
  }
}

.dark .hero-title {
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0ea5e9, #7dd3fc);
  background-size: 300% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes shine {
  to {
    background-position: 300% center;
  }
}

.hero-description {
  font-size: 17px;
  line-height: 1.7;
  color: #555;
  max-width: 700px;
}

.dark .hero-description {
  color: #aaa;
}

/* Alphabet Filter */
.letter-pill {
  min-width: 40px;
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .letter-pill {
  background: #111113;
  border-color: #27272a;
  color: #94a3b8;
}

.letter-pill:hover {
  background: #f1f5f9;
  color: #0ea5e9;
  border-color: #0ea5e9;
  transform: translateY(-2px);
}

.dark .letter-pill:hover {
  background: #1c1c1f;
  color: #7dd3fc;
  border-color: #0ea5e9;
}

.letter-pill.active {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  border-color: #0ea5e9;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

/* Category Filter */
.cat-pill {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
}

.dark .cat-pill {
  background: #111113;
  border-color: #27272a;
  color: #94a3b8;
}

.cat-pill:hover {
  background: #e2e8f0;
  color: #0ea5e9;
}

.dark .cat-pill:hover {
  background: #1c1c1f;
}

.cat-pill.active {
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Divider */
.section-divider {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.section-divider::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #bababa;
  z-index: 0;
}

.dark .section-divider::before {
  background: #333;
}

.divider-text {
  position: relative;
  z-index: 1;
  background: #fff;
  padding: 0 24px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #333;
}

.dark .divider-text {
  background: #1a1a1a;
  color: #e5e5e5;
}

/* Cards */
.inner-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 0 2px rgba(34, 60, 80, 0.1);
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
  text-decoration: none !important;
}

.dark .inner-card {
  background: #1a1a1a;
  border-color: #3a3a3a;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.inner-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
  border-color: #0ea5e9;
}

.dark .inner-card:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

/* Letter Block */
.letter-block {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.dark .letter-block {
  background: linear-gradient(135deg, #0c4a6e, #082f49);
}

.chapter-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.dark .chapter-title {
  color: #f1f5f9;
}

.chapter-excerpt {
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}

.dark .chapter-excerpt {
  color: #94a3b8;
}

/* Badge System */
.badge {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid #e2e8f0;
  display: inline-flex;
  align-items: center;
}

.dark .badge {
  background: #111113;
  color: #94a3b8;
  border-color: #27272a;
}

.badge-secondary {
  background: #f0fdf4;
  color: #166534;
  padding: 2px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: 1px solid #dcfce7;
  display: inline-flex;
  align-items: center;
}

.dark .badge-secondary {
  background: rgba(22, 101, 52, 0.1);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.2);
}

.group:hover .badge-secondary {
  background: #166534;
  color: #fff;
}

.dark .group:hover .badge-secondary {
  background: #4ade80;
  color: #064e3b;
}

/* Search Input */
.premium-search-input {
  width: 100%;
  height: 44px;
  padding-left: 44px;
  padding-right: 44px;
  border-radius: 9999px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  font-size: 14px;
  color: #1e293b;
  transition: all 0.3s ease;
  outline: none;
}

.premium-search-input:hover {
  border-color: #cbd5e1;
}

.premium-search-input:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
}

.dark .premium-search-input {
  background-color: #111113;
  border: 1px solid #27272a;
  color: #f1f5f9;
}

/* Pagination */
:deep(.pagination-button) {
  font-weight: 700;
  min-width: 44px;
  height: 44px;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .empty-icon-wrap {
  background: #111113;
}
</style>
