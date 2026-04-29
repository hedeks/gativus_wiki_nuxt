<template>
  <div class="book-details-page gv-page">
    <div v-if="pending" class="book-state book-state--center">
      <UIcon name="i-heroicons-arrow-path" class="book-spinner h-10 w-10 animate-spin" />
    </div>

    <div v-else-if="error" class="book-state book-state--center book-state--narrow">
      <UIcon name="i-heroicons-exclamation-triangle" class="book-state-icon book-state-icon--warn" />
      <h2 class="book-hero-title-text">{{ t.notFound }}</h2>
      <p class="book-lead">{{ t.notFoundDesc }}</p>
      <GvButton to="/books" size="lg" color="sky" icon="i-heroicons-arrow-left" class="mt-2">
        {{ t.backToLib }}
      </GvButton>
    </div>

    <div v-else-if="book" class="book-content">
      <header class="book-hero">
        <div class="book-hero-panel gv-surface-card">
          <div class="book-hero-grid">
            <div class="book-cover">
              <img
                v-if="book.cover_image"
                :src="book.cover_image"
                :alt="book.title"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="book-cover-placeholder"
              >
                <UIcon name="i-heroicons-book-open" class="h-14 w-14 opacity-50" />
                <span class="book-cover-placeholder-label">Gativus</span>
              </div>
            </div>

            <div class="book-hero-main">
              <TheBreadcrumbs
                class="book-breadcrumbs-inner"
                :items="[
                  { label: t.library, to: '/books' },
                  { label: book.title },
                ]"
              />

              <h1 class="book-hero-title-text gv-hero-gradient uppercase">
                {{ book.title }}
              </h1>

              <div v-if="book.category_ids?.length" class="book-badges">
                <span v-for="catId in book.category_ids" :key="catId" class="book-badge">
                  {{ getCategoryTitle(catId) }}
                </span>
              </div>

              <p class="gv-hero-subtitle book-hero-tagline">{{ t.heroTagline }}</p>

              <p class="book-description">
                {{
                  book.description
                    || t.fallbackDescription
                }}
              </p>

              <div class="book-actions-row">
                <div class="book-meta-row">
                  <UIcon name="i-heroicons-document-text" class="book-meta-icon" />
                  <span>{{ book.articles?.length || 0 }} {{ t.chapters }}</span>
                </div>
                <GvButton
                  v-if="book.articles?.length"
                  :to="`/articles/${book.articles[0].slug}`"
                  color="sky"
                  size="lg"
                  icon="i-heroicons-arrow-right"
                  trailing
                  class="book-read-btn"
                >
                  {{ t.read }}
                </GvButton>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section class="book-toc-card gv-surface-card" aria-labelledby="book-toc-heading">
        <div class="book-ds-card-header">
          <span class="book-ds-card-badge">{{ t.tocBadge }}</span>
          <h2 id="book-toc-heading" class="book-ds-card-header-title">
            {{ t.toc }}
          </h2>
        </div>
        <div class="book-ds-card-body">
          <template v-if="book.articles?.length">
            <NuxtLink
              v-for="(article, index) in book.articles"
              :key="article.id"
              :to="`/articles/${article.slug}`"
              class="chapter-card gv-focusable"
            >
              <div class="chapter-index" aria-hidden="true">
                {{ Number(index) + 1 }}
              </div>
              <div class="chapter-body">
                <h3 class="chapter-title">{{ article.title }}</h3>
                <p v-if="article.excerpt" class="chapter-excerpt line-clamp-1">
                  {{ article.excerpt }}
                </p>
              </div>
              <UIcon
                name="i-heroicons-arrow-right"
                class="chapter-chevron"
              />
            </NuxtLink>
          </template>
          <div v-else class="chapter-empty">
            <UIcon name="i-heroicons-clock" class="chapter-empty-icon" />
            <p>{{ t.noChapters }}</p>
          </div>
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
  query: computed(() => ({ locale: langStore.currentLang })),
})
const { data: categories } = await useFetch<any[]>('/api/categories')

const uiDict: Record<string, any> = {
  en: {
    library: 'Library',
    read: 'Read',
    chapters: 'chapters',
    notFound: 'Book not found',
    notFoundDesc: 'It might have been deleted or the link is incorrect.',
    backToLib: 'Back to library',
    toc: 'Contents',
    tocBadge: 'TOC',
    noChapters: 'Chapters for this book have not been published in this language yet.',
    heroTagline: 'Architecture and fundamentals',
    fallbackDescription:
      'There is no detailed description yet. Browse the table of contents below for key materials.',
  },
  ru: {
    library: 'Библиотека',
    read: 'Читать',
    chapters: 'глав',
    notFound: 'Книга не найдена',
    notFoundDesc: 'Возможно, она была удалена или ссылка неверна.',
    backToLib: 'Вернуться в библиотеку',
    toc: 'Оглавление',
    tocBadge: 'ОГЛ',
    noChapters: 'Главы этой книги ещё не опубликованы на этом языке.',
    heroTagline: 'Архитектура и фундаментальные принципы',
    fallbackDescription:
      'В этой книге пока нет подробного описания. Изучите оглавление ниже, чтобы ознакомиться с ключевыми материалами.',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

watch(() => langStore.currentLang, () => {
  refresh()
})

function getCategoryTitle(id: number) {
  const cat = categories.value?.find(c => c.id === id)
  return cat ? cat.title : ''
}

useSeoMeta({
  title: () => (book.value?.title ? `${book.value.title} — Gativus` : 'Книга — Gativus'),
  ogTitle: () => book.value?.title,
  description: () => book.value?.description || 'Книга из библиотеки Gativus.',
  ogDescription: () => book.value?.description,
  ogImage: () => book.value?.cover_image || '/favicon.ico',
  twitterCard: 'summary_large_image',
})
</script>

<style scoped>
/* Акцент «book» как на knowledge-index */
.book-details-page {
  --gv-primary: #0284c7;
  --gv-primary-hover: #0369a1;
  padding-bottom: clamp(2rem, 5vw, 4rem);
}

.book-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

.book-state--center {
  min-height: 45vh;
  justify-content: center;
  padding: 2rem 0;
}

.book-state--narrow {
  max-width: 28rem;
  margin: 0 auto;
}

.book-spinner {
  color: var(--gv-primary);
}

.book-state-icon {
  width: 3.5rem;
  height: 3.5rem;
}

.book-state-icon--warn {
  color: #ef4444;
}

.dark .book-state-icon--warn {
  color: #f87171;
}

.book-lead {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--gv-text-secondary);
}

.book-content {
  display: flex;
  flex-direction: column;
  gap: clamp(1.75rem, 4vw, 2.5rem);
  width: 100%;
}

.book-hero {
  position: relative;
  width: 100%;
}

.book-hero-panel {
  padding: clamp(1.1rem, 2.8vw, 1.5rem) clamp(1.1rem, 3vw, 1.6rem);
}

.book-hero-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(1.5rem, 4vw, 2.5rem);
}

@media (min-width: 768px) {
  .book-hero-grid {
    flex-direction: row;
    align-items: flex-start;
    gap: clamp(2rem, 4vw, 3rem);
  }
}

.book-breadcrumbs-inner {
  margin-bottom: 0.85rem;
}

.book-breadcrumbs-inner :deep(nav) {
  justify-content: center;
}

@media (min-width: 768px) {
  .book-breadcrumbs-inner :deep(nav) {
    justify-content: flex-start;
  }
}

.book-hero-title-text {
  margin: 0;
  font-size: clamp(1.75rem, 4.5vw, 2.75rem);
  line-height: 1.1;
  letter-spacing: 0.12em;
  font-weight: 700;
}

.book-hero-main {
  flex: 1;
  min-width: 0;
  text-align: center;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .book-hero-main {
    text-align: left;
  }
}

.book-cover {
  width: 200px;
  height: 280px;
  flex-shrink: 0;
  border-radius: var(--gv-radius-control);
  overflow: hidden;
  border: 1px solid var(--gv-border-principal);
}

@media (min-width: 768px) {
  .book-cover {
    width: 260px;
    height: 370px;
  }
}

.book-cover-placeholder {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--gv-surface-header);
  color: var(--gv-text-secondary);
}

.book-cover-placeholder-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-align: center;
  padding: 0 1rem;
}

.book-meta-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--gv-primary);
}

.book-actions-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.book-meta-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  margin: 0;
}

@media (max-width: 767px) {
  .book-actions-row {
    width: 100%;
    max-width: 26rem;
    margin-inline: auto;
  }

  .book-read-btn {
    flex-shrink: 0;
  }
}

.book-toc-card {
  overflow: hidden;
}

.book-ds-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: var(--gv-surface-header);
  border-bottom: 1px solid var(--gv-border-principal);
}

.book-ds-card-badge {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #e0f2fe, #bae6fd);
  color: #0c4a6e;
}

.dark .book-ds-card-badge {
  background: linear-gradient(90deg, #0c4a6e, #082f49);
  color: #e0f2fe;
}

.book-ds-card-header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--gv-text-primary);
  letter-spacing: 0.5px;
}

.book-ds-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem clamp(0.75rem, 2vw, 1.25rem) 1.25rem;
}

.book-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  justify-content: center;
}

@media (min-width: 768px) {
  .book-badges {
    justify-content: flex-start;
  }
}

.book-badge {
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-header));
  color: color-mix(in srgb, var(--gv-primary) 55%, var(--gv-text-primary));
  border: 1px solid color-mix(in srgb, var(--gv-primary) 28%, var(--gv-border-principal));
}

.dark .book-badge {
  background: color-mix(in srgb, var(--gv-primary) 18%, var(--gv-surface-card));
  color: color-mix(in srgb, var(--gv-primary) 72%, #e2e8f0);
}

.book-hero-tagline {
  margin: 0 0 1rem;
}

.book-description {
  margin: 0 0 1rem;
  font-size: 1.05rem;
  line-height: 1.7;
  color: var(--gv-text-secondary);
  max-width: 40rem;
}

@media (min-width: 768px) {
  .book-description {
    margin-left: 0;
    margin-right: 0;
  }
}

.chapter-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: color-mix(in srgb, var(--gv-surface-card) 90%, var(--gv-surface-header));
  box-shadow: var(--gv-shadow-sm);
  text-decoration: none !important;
  color: inherit;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease,
    background 0.25s ease;
}

.dark .chapter-card {
  background: color-mix(in srgb, var(--gv-surface-card) 94%, var(--gv-surface-header));
}

.chapter-card:hover {
  border-color: color-mix(in srgb, var(--gv-primary) 45%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-md);
  transform: translateY(-2px);
  background: color-mix(in srgb, var(--gv-surface-card) 88%, var(--gv-surface-header));
}

.dark .chapter-card:hover {
  background: color-mix(in srgb, var(--gv-surface-card) 100%, transparent);
}

.chapter-index {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1;
  color: color-mix(in srgb, var(--gv-primary) 88%, var(--gv-text-primary));
  border: 1px solid color-mix(in srgb, var(--gv-primary) 42%, var(--gv-border-principal));
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--gv-primary) 28%, var(--gv-surface-header)) 0%,
    color-mix(in srgb, var(--gv-primary) 8%, var(--gv-surface-header)) 45%,
    var(--gv-surface-header) 100%
  );
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 55%, transparent);
}

.dark .chapter-index {
  color: color-mix(in srgb, var(--gv-primary) 75%, #e2e8f0);
  border-color: color-mix(in srgb, var(--gv-primary) 38%, var(--gv-border-principal));
  background: linear-gradient(
    155deg,
    color-mix(in srgb, var(--gv-primary) 35%, var(--gv-surface-header)) 0%,
    color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card)) 50%,
    var(--gv-surface-header) 100%
  );
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
}

.chapter-body {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.chapter-title {
  margin: 0 0 0.15rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--gv-text-primary);
}

.chapter-excerpt {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--gv-text-secondary);
}

.chapter-chevron {
  height: 1.25rem;
  width: 1.25rem;
  flex-shrink: 0;
  color: var(--gv-border-subtle);
  transition: color 0.2s ease;
}

.chapter-card:hover .chapter-chevron {
  color: var(--gv-primary);
}

.chapter-empty {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  border-radius: var(--gv-radius-control);
  border: 1px dashed var(--gv-border-principal);
  background: color-mix(in srgb, var(--gv-surface-header) 40%, transparent);
  text-align: center;
  color: var(--gv-text-secondary);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.chapter-empty-icon {
  height: 2.5rem;
  width: 2.5rem;
  opacity: 0.35;
}
</style>
