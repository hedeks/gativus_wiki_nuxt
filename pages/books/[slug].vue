<template>
  <div class="book-page gv-page">
    <div v-if="pending" class="book-state">
      <UIcon name="i-heroicons-arrow-path" class="book-spinner h-10 w-10 animate-spin" />
    </div>

    <div v-else-if="error" class="book-state book-state--narrow">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-14 h-14 text-red-400" />
      <h2 class="book-error-title">{{ t.notFound }}</h2>
      <p class="book-error-lead">{{ t.notFoundDesc }}</p>
      <GvButton to="/books" size="lg" color="sky" icon="i-heroicons-arrow-left" class="mt-2">
        {{ t.backToLib }}
      </GvButton>
    </div>

    <div v-else-if="book" class="book-content">
      <TheBreadcrumbs
        :items="[
          { label: t.library, to: '/books' },
          { label: book.title },
        ]"
      />

      <!-- ── Unified card ── -->
      <article class="book-card gv-surface-card">
        <!-- Hero body -->
        <div class="book-hero-body">
          <!-- Cover -->
          <div class="book-cover">
            <img
              v-if="book.cover_image"
              :src="book.cover_image"
              :alt="book.title"
              class="cover-img"
            />
            <div v-else class="cover-placeholder">
              <UIcon name="i-heroicons-book-open" class="h-12 w-12 opacity-40" />
            </div>
          </div>

          <!-- Info -->
          <div class="book-info">
            <div v-if="book.category_ids?.length" class="book-badges">
              <span v-for="catId in book.category_ids" :key="catId" class="book-badge">
                {{ getCategoryTitle(catId) }}
              </span>
            </div>

            <h1 class="book-title gv-hero-gradient uppercase">
              {{ book.title }}
            </h1>

            <p
              class="book-description"
              v-html="renderInlineMarkup(book.description || t.fallbackDescription)"
            />

            <div class="book-footer">
              <span class="book-chapter-count">
                <UIcon name="i-heroicons-document-text" class="book-meta-icon" />
                {{ book.articles?.length || 0 }} {{ t.chapters }}
              </span>
              <GvButton
                v-if="book.articles?.length"
                :to="`/articles/${book.articles[0].slug}`"
                color="sky"
                size="lg"
                icon="i-heroicons-arrow-right"
                trailing
              >
                {{ t.read }}
              </GvButton>
            </div>
          </div>
        </div>

        <!-- TOC divider + list -->
        <div class="gv-card-header" aria-labelledby="toc-heading">
          <h2 id="toc-heading" class="toc-title">{{ t.toc }}</h2>
        </div>
        <div class="toc-body">
          <template v-if="book.articles?.length">
            <NuxtLink
              v-for="(article, index) in book.articles"
              :key="article.id"
              :to="`/articles/${article.slug}`"
              class="chapter-card gv-focusable"
            >
              <div class="chapter-index" aria-hidden="true">{{ Number(index) + 1 }}</div>
              <div class="chapter-body">
                <h3 class="chapter-title">{{ article.title }}</h3>
                <p
                  v-if="article.excerpt"
                  class="chapter-excerpt line-clamp-1"
                  v-html="renderInlineMarkup(article.excerpt)"
                />
              </div>
              <UIcon name="i-heroicons-arrow-right" class="chapter-chevron" />
            </NuxtLink>
          </template>
          <div v-else class="chapter-empty">
            <UIcon name="i-heroicons-clock" class="w-10 h-10 opacity-30" />
            <p>{{ t.noChapters }}</p>
          </div>
        </div>
      </article>
    </div>

    <TheScrollToTop />
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
import { renderInlineMarkup } from '~/utils/renderInlineMarkup'

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
    noChapters: 'Chapters for this book have not been published in this language yet.',
    fallbackDescription:
      'There is no detailed description yet. Browse the table of contents below for key materials.',
    seoFallback: 'Book — Gativus',
    seoDescFallback: 'A book from the Gativus library.',
  },
  ru: {
    library: 'Библиотека',
    read: 'Читать',
    chapters: 'глав',
    notFound: 'Книга не найдена',
    notFoundDesc: 'Возможно, она была удалена или ссылка неверна.',
    backToLib: 'Вернуться в библиотеку',
    toc: 'Оглавление',
    noChapters: 'Главы этой книги ещё не опубликованы на этом языке.',
    fallbackDescription:
      'В этой книге пока нет подробного описания. Изучите оглавление ниже, чтобы ознакомиться с ключевыми материалами.',
    seoFallback: 'Книга — Gativus',
    seoDescFallback: 'Книга из библиотеки Gativus.',
  },
  zh: {
    library: '图书馆',
    read: '阅读',
    chapters: '章',
    notFound: '未找到书籍',
    notFoundDesc: '该书可能已被删除或链接不正确。',
    backToLib: '返回图书馆',
    toc: '目录',
    noChapters: '该书的章节尚未以此语言发布。',
    fallbackDescription: '暂无详细描述。请浏览下方目录查看关键内容。',
    seoFallback: '书籍 — Gativus',
    seoDescFallback: 'Gativus 图书馆中的一本书。',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

watch(() => langStore.currentLang, () => {
  refresh()
})

function getCategoryTitle(id: number) {
  const cat = categories.value?.find((c: any) => c.id === id)
  return cat ? cat.title : ''
}

useSeoMeta({
  title: () => (book.value?.title ? `${book.value.title} — Gativus` : t.value.seoFallback),
  ogTitle: () => book.value?.title,
  description: () => book.value?.description || t.value.seoDescFallback,
  ogDescription: () => book.value?.description,
  ogImage: () => book.value?.cover_image || '/favicon.ico',
  twitterCard: 'summary_large_image',
})
</script>

<style scoped>
.book-page {
  --accent: #0ea5e9;
  --accent-soft: #f0f9ff;
  --accent-soft-dark: rgba(14, 165, 233, 0.08);
  --gv-primary: #0ea5e9;
  --gv-primary-hover: #0284c7;
  padding-bottom: clamp(2rem, 5vw, 4rem);
}

/* ── States ── */
.book-state {
  min-height: 45vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  text-align: center;
  padding: 2rem 0;
}

.book-state--narrow {
  max-width: 28rem;
  margin: 0 auto;
}

.book-spinner { color: var(--accent); }

.book-error-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.book-error-lead {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--gv-text-secondary);
}

/* ── Content wrapper ── */
.book-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

/* ── Unified card ── */
.book-card {
  overflow: hidden;
}

.book-hero-body {
  display: flex;
  align-items: flex-start;
  gap: clamp(1.25rem, 3vw, 2.25rem);
  padding: clamp(1.1rem, 2.8vw, 1.5rem) clamp(1.1rem, 3vw, 1.6rem);
}

/* ── Cover ── */
.book-cover {
  flex-shrink: 0;
  width: 130px;
  height: 182px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--accent-soft);
  box-shadow:
    4px 6px 18px rgba(0, 0, 0, 0.14),
    inset -1px 0 0 rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dark .book-cover {
  background: var(--accent-soft-dark);
  box-shadow:
    4px 6px 20px rgba(0, 0, 0, 0.4),
    inset -1px 0 0 rgba(0, 0, 0, 0.2);
}

@media (min-width: 640px) {
  .book-cover {
    width: 170px;
    height: 238px;
  }
}

@media (min-width: 900px) {
  .book-cover {
    width: 210px;
    height: 294px;
  }
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

/* ── Book info ── */
.book-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-top: 2px;
}

.book-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.book-badge {
  display: inline-flex;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.35px;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 6px;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
}

.dark .book-badge {
  background: var(--accent-soft-dark);
  filter: brightness(1.15);
}

.book-title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.4rem, 4vw, 2.4rem);
  line-height: 1.1;
  letter-spacing: 0.1em;
  font-weight: 700;
  word-break: break-word;
}

.book-description {
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--gv-text-secondary);
  max-width: 38rem;
}

.book-description :deep(strong) { font-weight: 700; }
.book-description :deep(em) { font-style: italic; }

.book-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: auto;
}

.book-chapter-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.book-meta-icon {
  width: 1rem;
  height: 1rem;
  color: var(--accent);
  flex-shrink: 0;
}

.book-card :deep(.gv-card-header) {
  border-top: 1px solid var(--gv-border-principal);
}

.toc-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--gv-text-primary);
  letter-spacing: 0.3px;
}

.toc-body {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem clamp(0.75rem, 2vw, 1.25rem) 1.25rem;
}

/* ── Chapter cards ── */
.chapter-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.125rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface-header);
  box-shadow: none;
  text-decoration: none !important;
  color: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.25s ease,
    transform 0.25s cubic-bezier(0.705, 0.01, 0, 0.915),
    background 0.2s ease;
}

.chapter-card:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-sm);
  transform: translateY(-1px);
  background: var(--gv-surface-card);
}

.dark .chapter-card:hover {
  background: #1e1e1e;
}

.chapter-index {
  display: flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 800;
  line-height: 1;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--gv-border-principal));
  background: var(--accent-soft);
}

.dark .chapter-index {
  background: var(--accent-soft-dark);
  filter: brightness(1.15);
}

.chapter-body {
  flex: 1;
  min-width: 0;
}

.chapter-title {
  margin: 0 0 0.125rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--gv-text-primary);
  transition: color 0.2s ease;
}

.chapter-card:hover .chapter-title {
  color: var(--accent);
}

.chapter-excerpt {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--gv-text-secondary);
}

.chapter-excerpt :deep(strong) { font-weight: 700; }
.chapter-excerpt :deep(em) { font-style: italic; }

.chapter-chevron {
  height: 1.125rem;
  width: 1.125rem;
  flex-shrink: 0;
  color: var(--gv-border-principal);
  transition: color 0.2s ease, transform 0.2s ease;
}

.chapter-card:hover .chapter-chevron {
  color: var(--accent);
  transform: translateX(2px);
}

.chapter-empty {
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
  font-size: 0.9rem;
}
</style>
