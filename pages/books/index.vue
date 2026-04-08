<template>
  <div class="library-page min-h-screen">
    <div class="page-container">
      <section class="library-hero flex flex-col items-center text-center pt-20 pb-12 w-full">
        <h1 class="hero-title uppercase">БИБЛИОТЕКА</h1>
        <p class="hero-description mt-8">
          Собрание теоретических материалов, структурированных в виде интерактивных книг. 
          Изучайте архитектуру GATE, систему GTOM и сетевые протоколы GNET в удобном формате.
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
             placeholder="Поиск по книгам и аннотациям..."
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
      </section>

      <!-- Category Filter -->
      <div class="flex flex-wrap items-center justify-center gap-3 mb-12">
        <button 
          class="tag" 
          :class="{ active: activeCategory === null }"
          @click="activeCategory = null"
        >
          Все книги
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          class="tag"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          {{ cat.title }}
        </button>
      </div>

      <!-- Books Grid -->
      <div v-if="pending" class="grid-concepts">
        <div v-for="i in 4" :key="i" class="section-card animate-pulse h-64 bg-gray-50 dark:bg-zinc-800" />
      </div>

      <div v-else-if="!pending && !isTyping && filteredBooks.length === 0" class="section-card w-full text-center py-20 bg-white dark:bg-zinc-900 border border-dashed border-gray-300 dark:border-zinc-800">
        <UIcon name="i-heroicons-book-open" class="text-5xl text-gray-400 dark:text-zinc-600 mb-4 mx-auto" />
        <h3 class="card-header-text text-gray-500">Ничего не найдено</h3>
      </div>

      <div v-else class="grid-concepts transition-all duration-300" :class="{ 'opacity-50 blur-[2px] pointer-events-none': pending || isTyping }">
        <NuxtLink 
          v-for="book in filteredBooks" 
          :key="book.id" 
          :to="`/books/${book.slug}`"
          class="section-card group"
        >
          <div class="card-header bg-[#f9f9f9] dark:bg-[#222]">
            <h2 class="card-header-text truncate">{{ book.title }}</h2>
          </div>
          <div class="card-body flex flex-col sm:flex-row gap-6">
            <div class="icon-wrapper book-cover-wrapper">
              <img v-if="book.cover_image" :src="book.cover_image" :alt="book.title" class="book-cover-img" />
              <UIcon v-else name="i-heroicons-book-open" class="text-2xl text-gray-500" />
            </div>

            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex gap-2 mb-3">
                  <span v-for="catId in book.category_ids" :key="catId" class="badge">
                    {{ getCategoryTitle(catId) }}
                  </span>
                </div>
                <p class="concept-description line-clamp-3">
                  {{ book.description || 'Краткое описание системы и содержимого книги.' }}
                </p>
              </div>

              <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <span class="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
                  {{ book.article_count }} глав
                </span>
                <span class="text-[12px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                  ЧИТАТЬ →
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
const { data: books, pending, refresh } = await useFetch<any[]>('/api/books', {
  query: computed(() => ({ locale: langStore.currentLang }))
})
const { data: categories } = await useFetch<any[]>('/api/categories', {
  query: computed(() => ({ locale: langStore.currentLang }))
})

// Refresh data when language changes
watch(() => langStore.currentLang, () => {
  refresh()
})

const activeCategory = ref<number | null>(null)
const searchQuery = ref('')
const debouncedSearch = ref('')
const isTyping = ref(false)

let searchTimer: any
watch(searchQuery, (newVal) => {
  isTyping.value = true
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = newVal
    isTyping.value = false
  }, 600)
})

const filteredBooks = computed(() => {
  if (!books.value) return []
  let result = books.value
  
  if (activeCategory.value !== null) {
    result = result.filter(b => b.category_ids?.includes(activeCategory.value))
  }
  
  if (debouncedSearch.value) {
    const q = debouncedSearch.value.toLowerCase()
    result = result.filter(b => 
      b.title?.toLowerCase().includes(q) || 
      b.description?.toLowerCase().includes(q)
    )
  }
  
  return result
})

function getCategoryTitle(id: number) {
  const cat = categories.value?.find(c => c.id === id)
  return cat ? cat.title : ''
}

useSeoMeta({
  title: 'Библиотека — Gativus Wiki',
  description: 'Фундаментальные статьи и книги о технологиях Gativus, GTOM и GNET.'
})
</script>

<style scoped>
.library-page {
  background-color: #fff;
}

.dark .library-page {
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

.dark .hero-description {
  color: #aaa;
}

/* Grid */
.grid-concepts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
}

@media (max-width: 768px) {
  .grid-concepts {
    grid-template-columns: 1fr;
  }
}

/* Card System */
.section-card {
  width: 100%;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 0 1px 1px rgba(119, 119, 119, 0.1);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
  text-decoration: none !important;
}

.dark .section-card {
  background: #1a1a1a;
  border-color: #333;
}

.section-card:hover {
  box-shadow: 0 4px 16px rgba(119, 119, 119, 0.15);
  transform: translateY(-2px);
  border-color: #0ea5e9;
}

.card-header {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #c8c8c8;
}

.dark .card-header {
  border-bottom-color: #333;
}

.card-header-text {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #333;
  margin: 0;
}

.dark .card-header-text {
  color: #e5e5e5;
}

.card-body {
  padding: 24px;
}

/* Icon / Cover Wrapper */
.icon-wrapper {
  flex-shrink: 0;
  width: 100px;
  height: 140px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0f0f0, #dedede);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e9e9e9;
}

.dark .icon-wrapper {
  background: linear-gradient(135deg, #333, #444);
  border-color: #3a3a3a;
}

.book-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.section-card:hover .book-cover-img {
  transform: scale(1.05);
}

/* Tags & Badges */
.tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border: 1px solid #c8c8c8;
  border-radius: 99px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.dark .tag {
  background: #1a1a1a;
  border-color: #333;
  color: #aaa;
}

.tag:hover {
  background: #f9f9f9;
  border-color: #0ea5e9;
  transform: translateY(-1px);
}

.tag.active {
  background: #454545;
  color: #fff;
  border-color: #333;
}

.dark .tag.active {
  background: #0ea5e9;
  color: #fff;
  border-color: #0ea5e9;
}

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

.concept-description {
  font-size: 14px;
  line-height: 1.6;
  color: #666;
}

.dark .concept-description {
  color: #999;
}

/* Search Customization - Premium Input */
.premium-search-input {
  width: 100%;
  height: 44px;
  padding-left: 44px;
  padding-right: 44px;
  border-radius: 9999px;
  background-color: #ffffff;
  border: 1px solid #e9e9e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  font-size: 14px;
  color: #333;
  transition: all 0.3s ease;
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
}

.premium-search-input::placeholder {
  color: #a3a3a3;
  font-weight: 400;
  letter-spacing: 0.5px;
}

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

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}
</style>
