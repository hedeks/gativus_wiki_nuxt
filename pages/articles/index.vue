<template>
  <div class="articles-index-page min-h-screen">
    <!-- Page Header Container -->
    <div class="page-container">
      <header class="articles-hero w-full">
        <div class="hero-content flex flex-col items-center text-center">
          <h1 class="hero-title uppercase">СТАТЬИ</h1>
          <p class="hero-description mt-8">
            Архитектура, фундаментальные принципы и методология Gativus. 
            Исследуйте базу знаний по заголовкам и аннотациям материалов.
          </p>

          <!-- Search Capsule -->
          <div class="search-section mt-12 w-full max-w-3xl mx-auto group relative">
             <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-400 group-focus-within:text-sky-500 text-gray-400 dark:text-gray-500">
                <UIcon v-if="pending || isTyping" name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-sky-500" />
                <UIcon v-else name="i-heroicons-magnifying-glass" class="w-5 h-5" />
             </div>
             <input
               v-model="searchQuery"
               type="text"
               class="premium-search-input"
               placeholder="Поиск по архитектуре, концепциям и статьям..."
             />
             <div class="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button 
                  v-show="searchQuery !== ''"
                  @click="searchQuery = ''"
                  class="text-gray-300 hover:text-sky-500 transition-colors duration-300 p-2"
                >
                  <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5 flex" />
                </button>
             </div>
          </div>
        </div>
      </header>

      <!-- Section Divider -->
      <div class="section-divider my-16">
        <span class="divider-text uppercase">СПИСОК СТАТЕЙ</span>
      </div>

      <!-- Main Articles List -->
      <section class="articles-section w-full">
        <!-- Error State -->
        <div v-if="error" class="error-card p-10 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-red-500 mb-4 mx-auto" />
          <h3 class="font-bold">ОШИБКА ЗАГРУЗКИ</h3>
          <p class="text-sm mt-2 opacity-60">Пожалуйста, попробуйте обновить страницу.</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!pending && !isTyping && articles.length === 0" class="empty-state py-20 text-center border-dashed border-2 border-gray-100 dark:border-zinc-800 rounded-2xl">
          <p class="text-gray-500 uppercase tracking-widest text-sm font-bold">Ничего не найдено</p>
        </div>

        <!-- Grid of Articles -->
        <div v-else class="articles-grid flex flex-col gap-5 transition-all duration-300" :class="{ 'opacity-50 blur-[2px] pointer-events-none': pending || isTyping }">
          <NuxtLink 
            v-for="(article, index) in articles" 
            :key="article.id" 
            :to="`/articles/${article.slug}`" 
            class="inner-card group"
          >
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
            <UIcon 
              name="i-heroicons-arrow-right" 
              class="text-gray-300 group-hover:text-sky-500 transition-all duration-300 transform group-hover:translate-x-1 flex-shrink-0" 
            />
          </NuxtLink>
        </div>

        <!-- Pagination Bar -->
        <div v-if="totalPages > 1" class="pagination-footer mt-16 flex justify-center">
          <UPagination
            v-model="page"
            :page-count="10"
            :total="totalItems"
            size="lg"
            :ui="{ 
              rounded: 'rounded-xl',
              base: 'pagination-button'
            }"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const page = ref(parseInt(route.query.page as string) || 1)
const searchQuery = ref((route.query.search as string) || '')
const debouncedSearch = ref(searchQuery.value)
const isTyping = ref(false)

let searchTimer: NodeJS.Timeout
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
    query: { ...route.query, page: newPage.toString(), search: searchQuery.value || undefined }
  })
})

const { data: articlesData, pending, error } = await useFetch<any>('/api/articles', {
  query: computed(() => ({
    page: page.value,
    limit: 10,
    search: debouncedSearch.value || undefined
  }))
})

const articles = computed(() => articlesData.value?.items || [])
const totalItems = computed(() => articlesData.value?.total || 0)
const totalPages = computed(() => articlesData.value?.pages || 1)

useHead({
  title: 'Статьи — Gativus Wiki',
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
  .hero-title { font-size: 36px; letter-spacing: 6px; }
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
.dark .hero-description { color: #aaa; }

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
.dark .section-divider::before { background: #333; }
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
.dark .divider-text { background: #1a1a1a; color: #e5e5e5; }

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
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ededed, #d5d5d5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: #454545;
}
.dark .letter-block {
  background: linear-gradient(135deg, #333, #444);
  color: #dddddd;
}

.chapter-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}
.dark .chapter-title { color: #e5e5e5; }

.chapter-excerpt {
  font-size: 13px;
  color: #666;
}
.dark .chapter-excerpt { color: #999; }

/* Badge (Premium about.vue style) */
.badge {
  background: linear-gradient(90deg, #e0f2fe, #bae6fd); /* sky-100 to 200 */
  color: #0c4a6e; /* sky-900 */
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.dark .badge {
  background: linear-gradient(90deg, #0c4a6e, #082f49); /* sky-900 to 950 */
  color: #e0f2fe;
}

/* Search Customization - Premium Input (Refined) */
.premium-search-input {
  width: 100%;
  height: 44px;
  padding-left: 44px;
  padding-right: 44px;
  border-radius: 9999px; /* Complete pill shape */
  background-color: #ffffff;
  border: 1px solid #e9e9e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03); /* Subtle soft shadow */
  font-size: 14px;
  color: #333;
  transition: all 0.3s ease; /* Gentle, standard animation */
  outline: none;
}

.premium-search-input:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.premium-search-input:focus {
  border-color: #0ea5e9;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05); /* Elegant focus ring + shadow */
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

/* Pagination (Manifest 380) */
:deep(.pagination-button) {
  font-weight: 700;
  min-width: 44px;
  height: 44px;
}
</style>
