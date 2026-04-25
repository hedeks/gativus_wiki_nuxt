<template>
  <div class="book-details-page min-h-screen">
    <div v-if="pending" class="flex items-center justify-center min-h-[60vh]">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-sky-500" />
    </div>

    <div v-else-if="error" class="page-container text-center pt-40">
      <UIcon name="i-heroicons-exclamation-triangle" class="text-6xl text-red-500 mb-6 mx-auto" />
      <h2 class="hero-title">{{ t.notFound }}</h2>
      <p class="hero-description mx-auto mt-4 mb-8">{{ t.notFoundDesc }}</p>
      <UButton to="/books" size="lg" color="black" icon="i-heroicons-arrow-left" class="rounded-xl">{{ t.backToLib }}
      </UButton>
    </div>

    <div v-else-if="book" class="book-content pb-20">
      <header class="book-hero flex flex-col md:flex-row gap-12 items-center md:items-start w-full pt-10 pb-16">
        <TheBreadcrumbs v-if="book" class="md:absolute top-10 left-0" :items="[
          { label: t.library, to: '/books' },
          { label: book.title }
        ]" />
        <div class="book-cover-large shadow-soft hover:shadow-hover transition-all duration-500">
          <img v-if="book.cover_image" :src="book.cover_image" :alt="book.title" class="w-full h-full object-cover" />
          <div v-else
            class="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-800 text-gray-400">
            <UIcon name="i-heroicons-book-open" class="text-6xl mb-2" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-center px-4">Gativus</span>
          </div>
        </div>

        <div class="book-header-info flex-1 text-center md:text-left">
          <div class="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
            <span v-for="catId in book.category_ids" :key="catId" class="badge">
              {{ getCategoryTitle(catId) }}
            </span>
          </div>

          <h1 class="hero-title uppercase block">{{ book.title }}</h1>
          <p class="hero-subtitle mb-8">Архитектура и фундаментальные принципы</p>

          <p class="hero-description mb-10">
            {{ book.description || `В этой книге пока нет подробного описания. Изучите оглавление ниже, чтобы
            ознакомиться с ключевыми материалами.` }}
          </p>

          <div v-if="book.articles && book.articles.length > 0" class="flex justify-center md:justify-start mb-10">
            <NuxtLink :to="`/articles/${book.articles[0].slug}`" class="read-button group">
              <span>{{ t.read }}</span>
              <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </NuxtLink>
          </div>

          <div
            class="flex flex-wrap gap-8 items-center justify-center md:justify-start text-[12px] font-bold text-gray-400 uppercase tracking-widest">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" />
              <span>{{ book.articles?.length || 0 }} {{ t.chapters }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Chapters List -->
      <section class="chapters-section w-full pt-10">
        <div class="section-divider mb-12">
          <span class="divider-text">{{ t.toc }}</span>
        </div>

        <div v-if="book.articles && book.articles.length > 0" class="chapters-grid flex flex-col gap-5">
          <NuxtLink v-for="(article, index) in book.articles" :key="article.id" :to="`/articles/${article.slug}`"
            class="inner-card group">
            <div class="letter-block">
              {{ Number(index) + 1 }}
            </div>
            <div class="flex-1">
              <h3 class="chapter-title">{{ article.title }}</h3>
              <p class="chapter-excerpt line-clamp-1" v-if="article.excerpt">{{ article.excerpt }}</p>
            </div>
            <UIcon name="i-heroicons-arrow-right" class="text-gray-300 group-hover:text-sky-500 transition-colors" />
          </NuxtLink>
        </div>

        <div v-else class="inner-card w-full text-center py-20 border-dashed justify-center">
          <UIcon name="i-heroicons-clock" class="text-4xl text-gray-300 mb-4" />
          <p class="text-gray-500 font-medium tracking-wide">{{ t.noChapters }}</p>
        </div>
      </section>
    </div>
    <TheScrollToTop />
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const route = useRoute()
const slug = route.params.slug
const langStore = useLanguageStore()

const { data: book, pending, error, refresh } = await useFetch<any>(`/api/books/${slug}`, {
  query: computed(() => ({ locale: langStore.currentLang }))
})
const { data: categories } = await useFetch<any[]>('/api/categories')

const uiDict: Record<string, any> = {
  en: {
    library: 'LIBRARY',
    read: 'Read',
    chapters: 'Chapters',
    notFound: 'BOOK NOT FOUND',
    notFoundDesc: 'It might have been deleted or the link is incorrect.',
    backToLib: 'Back to Library',
    toc: 'CONTENTS',
    noChapters: 'Chapters for this book have not been published in this language yet.'
  },
  ru: {
    library: 'БИБЛИОТЕКА',
    read: 'Читать',
    chapters: 'глав',
    notFound: 'КНИГА НЕ НАЙДЕНА',
    notFoundDesc: 'Возможно, она была удалена или ссылка неверна.',
    backToLib: 'Вернуться в библиотеку',
    toc: 'ОГЛАВЛЕНИЕ',
    noChapters: 'Главы этой книги еще не опубликованы на этом языке.'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

// Watch for language changes to refresh book data (localized title/description/chapters)
watch(() => langStore.currentLang, () => {
  refresh()
})

function getCategoryTitle(id: number) {
  const cat = categories.value?.find(c => c.id === id)
  return cat ? cat.title : ''
}

useSeoMeta({
  title: () => book.value?.title ? `${book.value.title} — Gativus` : 'Книга — Gativus',
  ogTitle: () => book.value?.title,
  description: () => book.value?.description || 'Книга из библиотеки Gativus.',
  ogDescription: () => book.value?.description,
  ogImage: () => book.value?.cover_image || '/logo.jpg',
  twitterCard: 'summary_large_image',
})
</script>

<style scoped>
.book-details-page {
  background-color: #fff;
}

.dark .book-details-page {
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
  position: relative;
  /* For absolute breadcrumbs */
}

/* Hero Typography */
.hero-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 6px;
  color: #333;
  border-bottom: 1px solid #bababa;
  padding-bottom: 8px;
  margin-bottom: 12px;
  display: inline-block;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
    letter-spacing: 4px;
  }
}

.dark .hero-title {
  color: #e5e5e5;
  border-bottom-color: #333;
}

.hero-subtitle {
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 2px;
  color: #666;
  text-transform: uppercase;
}

.dark .hero-subtitle {
  color: #999;
}

.hero-description {
  font-size: 17px;
  line-height: 1.7;
  color: #555;
}

.dark .hero-description {
  color: #aaa;
}

/* Read Button */
.read-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  padding: 14px 36px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  box-shadow: 0 10px 20px -5px rgba(14, 165, 233, 0.4);
  transition: all 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.read-button:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 30px -10px rgba(14, 165, 233, 0.6);
  background: linear-gradient(135deg, #0284c7, #0369a1);
}

.read-button:active {
  transform: translateY(-2px);
}

/* Layout Parts */
.book-cover-large {
  width: 280px;
  height: 400px;
  border-radius: 15px;
  overflow: hidden;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #c8c8c8;
}

.dark .book-cover-large {
  background: #1a1a1a;
  border-color: #333;
}

@media (max-width: 768px) {
  .book-cover-large {
    width: 200px;
    height: 280px;
  }
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

/* Inner Cards (Chapters) */
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

/* Badge */
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

.shadow-soft {
  box-shadow: 0 0 1px 1px rgba(119, 119, 119, 0.1);
}

.hover\:shadow-hover:hover {
  box-shadow: 0 2px 12px rgba(119, 119, 119, 0.15);
}
</style>
