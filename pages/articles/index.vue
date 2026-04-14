<template>
  <div class="articles-index-page min-h-screen">
    <!-- Page Header Container -->
    <div class="page-container">
      <header class="articles-hero w-full">
        <div class="hero-content flex flex-col items-center text-center">
          <h1 class="hero-title uppercase">{{ t.heroTitle }}</h1>
          <p class="hero-description mt-8">
            {{ t.heroDesc }}
          </p>

          <!-- Search Capsule -->
          <div class="search-section mt-12 w-full max-w-3xl mx-auto group relative">
            <div
              class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-400 group-focus-within:text-sky-500 text-gray-400 dark:text-gray-500">
              <UIcon v-if="pending || isTyping" name="i-heroicons-arrow-path"
                class="w-5 h-5 animate-spin text-sky-500" />
              <UIcon v-else name="i-heroicons-magnifying-glass" class="w-5 h-5" />
            </div>
            <input v-model="searchQuery" type="text" class="premium-search-input"
              :placeholder="t.searchPlaceholder" />
            <div class="absolute inset-y-0 right-0 pr-4 flex items-center">
              <button v-show="searchQuery !== ''" @click="searchQuery = ''"
                class="text-gray-300 hover:text-sky-500 transition-colors duration-300 p-2">
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5 flex" />
              </button>
            </div>
          </div>

          <!-- Category Filter -->
          <div v-if="categories && categories.length" class="categories-nav mt-6 flex flex-wrap justify-center gap-2">
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="cat-pill"
              :class="{ active: activeCategory === cat.id }"
              @click="toggleCategory(cat.id)"
              :style="activeCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}"
            >
              <UIcon :name="cat.icon || 'i-heroicons-tag'" class="mr-1" />
              {{ cat.title.split('—')[0].trim() }}
            </button>
          </div>
        </div>
      </header>

      <!-- Section Divider -->
      <div class="section-divider my-16">
        <span class="divider-text uppercase">{{ t.articlesList }}</span>
      </div>

      <!-- Main Articles List -->
      <section class="articles-section w-full">
        <!-- Error State -->
        <div v-if="error" class="error-card p-10 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-red-500 mb-4 mx-auto" />
          <h3 class="font-bold">{{ t.loadingError }}</h3>
          <p class="text-sm mt-2 opacity-60">{{ t.refreshHint }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!pending && !isTyping && articles.length === 0"
          class="empty-state py-20 text-center border-dashed border-2 border-gray-100 dark:border-zinc-800 rounded-2xl">
          <p class="text-gray-500 uppercase tracking-widest text-sm font-bold">{{ t.notFound }}</p>
        </div>

        <!-- Grid of Articles -->
        <div v-else class="articles-grid flex flex-col gap-5 transition-all duration-300"
          :class="{ 'opacity-50 blur-[2px] pointer-events-none': pending || isTyping }">
          <NuxtLink v-for="(article, index) in articles" :key="article.id" :to="`/articles/${article.slug}`"
            class="inner-card group">
            <!-- Index/Visual -->
            <div class="letter-block">
              {{ (Number(page) - 1) * 10 + Number(index) + 1 }}
            </div>

            <!-- Content -->
            <div class="flex-1">
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-if="article.book_title" class="badge">
                  {{ article.book_title }}
                </span>
                <span v-else-if="article.category_title" class="badge">
                  {{ article.category_title }}
                </span>
              </div>
              <h3 class="chapter-title">{{ article.title }}</h3>
              <p class="chapter-excerpt line-clamp-2" v-if="article.excerpt">{{ article.excerpt }}</p>
            </div>

            <!-- Arrow -->
            <UIcon name="i-heroicons-arrow-right"
              class="text-gray-300 group-hover:text-sky-500 transition-all duration-300 transform group-hover:translate-x-1 flex-shrink-0" />
          </NuxtLink>
        </div>

        <!-- Pagination Bar -->
        <div v-if="totalPages > 1" class="pagination-footer mt-16 flex justify-center">
          <UPagination v-model="page" :page-count="10" :total="totalItems" size="lg" :ui="{
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

const route = useRoute()
const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTitle: 'ARTICLES',
    heroDesc: 'Architecture, fundamental principles, and Gativus methodology. Explore the knowledge base through material titles and annotations.',
    searchPlaceholder: 'Search architecture, concepts, and articles...',
    articlesList: 'ARTICLES LIST',
    loadingError: 'LOADING ERROR',
    refreshHint: 'Please try refreshing the page.',
    notFound: 'Nothing found'
  },
  ru: {
    heroTitle: 'СТАТЬИ',
    heroDesc: 'Архитектура, фундаментальные принципы и методология Gativus. Исследуйте базу знаний по заголовкам и аннотациям материалов.',
    searchPlaceholder: 'Поиск по архитектуре, концепциям и статьям...',
    articlesList: 'СПИСОК СТАТЕЙ',
    loadingError: 'ОШИБКА ЗАГРУЗКИ',
    refreshHint: 'Пожалуйста, попробуйте обновить страницу.',
    notFound: 'Ничего не найдено'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const page = ref(parseInt(route.query.page as string) || 1)
const searchQuery = ref((route.query.search as string) || '')
const activeCategory = ref<number | null>(route.query.category_id ? parseInt(route.query.category_id as string) : null)
const debouncedSearch = ref(searchQuery.value)
const isTyping = ref(false)

// Define placeholders for data that will be loaded
const categoriesData = ref<any[] | null>(null)
const articlesData = ref<any | null>(null)
const pending = ref(true)
const error = ref<any>(null)

const categories = computed(() => categoriesData.value || [])
const articles = computed(() => articlesData.value?.items || [])
const totalItems = computed(() => articlesData.value?.total || 0)
const totalPages = computed(() => articlesData.value?.pages || 1)

let searchTimer: any
watch(searchQuery, (newVal) => {
  isTyping.value = true
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = newVal
    page.value = 1
    isTyping.value = false
  }, 600)
})

watch(page, (newPage) => {
  navigateTo({
    path: '/articles',
    query: { 
      ...route.query, 
      page: newPage.toString(), 
      search: searchQuery.value || undefined,
      category_id: activeCategory.value?.toString() || undefined
    }
  })
})

function toggleCategory(id: number) {
  activeCategory.value = activeCategory.value === id ? null : id
  page.value = 1
}

// Perform fetches
const [catRes, artRes] = await Promise.all([
  $fetch<any[]>('/api/categories', {
    query: { lang: langStore.currentLang }
  }),
  $fetch<any>('/api/articles', {
    query: {
      page: page.value,
      limit: 10,
      lang: langStore.currentLang,
      search: debouncedSearch.value || undefined,
      category_id: activeCategory.value || undefined
    }
  }).catch(e => {
    error.value = e
    return null
  })
])

categoriesData.value = catRes
articlesData.value = artRes
pending.value = false

const refresh = async () => {
  pending.value = true
  try {
    const res = await $fetch<any>('/api/articles', {
      query: {
        page: page.value,
        limit: 10,
        lang: langStore.currentLang,
        search: debouncedSearch.value || undefined,
        category_id: activeCategory.value || undefined
      }
    })
    articlesData.value = res
  } catch (e) {
    error.value = e
  } finally {
    pending.value = false
  }
}

// Reset page and refresh when language changes
watch(() => langStore.currentLang, () => {
  page.value = 1
  refresh()
})

useHead({
  title: () => `${t.value.heroTitle} — Gativus Wiki`,
})
</script>

<style scoped>
.articles-index-page {
  background-color: #fff;
}

.dark .articles-index-page {
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
  margin-bottom: 12px;
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


.hero-description {
  font-size: 17px;
  line-height: 1.7;
  color: #555;
  max-width: 700px;
}

.dark .hero-description {
  color: #aaa;
}

/* Divider (Manifest 191) */
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

/* Cards (Manifest 220) */
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
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
  transform: translateY(-2px);
  border-color: #0ea5e9;
}

/* Letter Block (Manifest 283) */
.letter-block {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .letter-block {
  background: linear-gradient(135deg, #0c4a6e, #082f49);
}

.chapter-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.dark .chapter-title {
  color: #e5e5e5;
}

.chapter-excerpt {
  font-size: 13px;
  color: #666;
}

.dark .chapter-excerpt {
  color: #999;
}

/* Badge (Premium about.vue style) */
.badge {
  background: linear-gradient(90deg, #e0f2fe, #bae6fd);
  /* sky-100 to 200 */
  color: #0c4a6e;
  /* sky-900 */
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.dark .badge {
  background: linear-gradient(90deg, #0c4a6e, #082f49);
  /* sky-900 to 950 */
  color: #e0f2fe;
}

/* Search Customization - Premium Input (Refined) */
.premium-search-input {
  width: 100%;
  height: 44px;
  padding-left: 44px;
  padding-right: 44px;
  border-radius: 9999px;
  /* Complete pill shape */
  background-color: #ffffff;
  border: 1px solid #e9e9e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  /* Subtle soft shadow */
  font-size: 14px;
  color: #333;
  transition: all 0.3s ease;
  /* Gentle, standard animation */
  outline: none;
}

.premium-search-input:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.premium-search-input:focus {
  border-color: #0ea5e9;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05);
  /* Elegant focus ring + shadow */
}

.premium-search-input::placeholder {
  color: #a3a3a3;
  font-weight: 400;
  letter-spacing: 0.5px;
}

/* Dark Mode Overrides */
.dark .premium-search-input {
  background-color: #1a1a1a;
  border: 1px solid #333;
  color: #e5e5e5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.dark .premium-search-input:hover {
  border-color: #444;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .premium-search-input:focus {
  border-color: #0ea5e9;
  background-color: #1f1f1f;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .premium-search-input::placeholder {
  color: #666;
}

/* Category Filter (Reusable styles) */
.categories-nav {
  max-width: 800px;
}
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
  background: #1a1a1d;
  border-color: #2a2a2e;
  color: #94a3b8;
}
.cat-pill:hover {
  background: #e2e8f0;
  color: #0ea5e9;
}
.dark .cat-pill:hover {
  background: #252528;
}
.cat-pill.active {
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Pagination (Manifest 380) */
:deep(.pagination-button) {
  font-weight: 700;
  min-width: 44px;
  height: 44px;
}
</style>
