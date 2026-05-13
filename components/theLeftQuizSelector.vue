<template>
  <div class="left-view-selector flex flex-col lg:sticky h-fit min-w-0 w-full max-w-full">
    <p class="lv-label lg:text-sm text-[10px] tracking-widest font-bold uppercase mb-2">
      {{ pack.article }}
    </p>
    <span
      class="selector-row border-l-2 lg:border-l-0 lg:border-r-2 border-transparent px-3 py-2 text-sm cursor-pointer transition-all duration-300 rounded-none lv-row min-w-0 max-w-full break-words [overflow-wrap:anywhere]"
      :class="{ selectedToc: props.isTheory }"
      @click="$emit('changeView', 'lection')"
    >
      {{ quizTitle || title }}
    </span>
    <GvButton
      v-if="props.hasPresentation"
      variant="outline"
      color="gray"
      size="xs"
      :icon="props.isTheory ? 'i-heroicons-presentation-chart-bar' : 'i-heroicons-document-text'"
      class="mt-2 justify-start w-full"
      @click="$emit('changeView', props.isTheory ? 'quiz' : 'lection')"
    >
      {{ props.isTheory ? pack.goToPresentation : pack.goToText }}
    </GvButton>

    <template v-if="bookSlug && bookTitle">
      <p class="lv-label lg:text-sm text-[10px] tracking-widest font-bold uppercase mt-4 mb-1">
        {{ pack.fromBook }}
      </p>
      <NuxtLink
        :to="`/books/${bookSlug}`"
        class="selector-row border-l-2 lg:border-l-0 lg:border-r-2 border-transparent px-3 py-2 text-sm cursor-pointer transition-all duration-300 rounded-none lv-row min-w-0 max-w-full break-words [overflow-wrap:anywhere] mb-1 font-semibold"
      >
        {{ bookTitle }}
      </NuxtLink>
    </template>

    <template v-if="bookChapters?.length">
      <p class="lv-label lg:text-sm text-[10px] tracking-widest font-bold uppercase mt-5 mb-2">
        {{ chaptersLabel }}
      </p>
      <nav
        class="book-chapters-nav flex flex-col max-h-[min(50vh,420px)] overflow-y-auto overflow-x-hidden pr-1"
        :aria-label="chaptersLabel"
      >
        <NuxtLink
          v-for="ch in bookChapters"
          :key="`${ch.slug}-${ch.chapter_number}`"
          :to="`/articles/${ch.slug}`"
          class="chapter-link selector-row border-l-2 lg:border-r-2 lg:border-l-0 border-transparent px-3 py-2 text-sm cursor-pointer transition-all duration-300 rounded-none lv-row min-w-0 max-w-full break-words [overflow-wrap:anywhere]"
          :class="{ 'chapter-link--current': isCurrentChapter(ch) }"
        >
          <span class="tabular-nums opacity-55 mr-1">{{ ch.chapter_number }}.</span>
          <span class="break-words [overflow-wrap:anywhere]">{{ ch.title }}</span>
        </NuxtLink>
      </nav>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()

export type BookChapterNav = { slug: string; slug_canonical?: string; title: string; chapter_number: number }

const pack = computed(() => {
  const dict: Record<string, { text: string; article: string; fromBook: string; chapters: string; goToPresentation: string; goToText: string }> = {
    en: { text: 'Text', article: 'Article', fromBook: 'Book', chapters: 'Chapters', goToPresentation: 'Go to Presentation', goToText: 'Go to Text' },
    ru: { text: 'Текст', article: 'Статья', fromBook: 'Книга', chapters: 'Главы', goToPresentation: 'Перейти к презентации', goToText: 'Перейти к тексту' },
    zh: { text: '正文', article: '文章', fromBook: '图书', chapters: '章节', goToPresentation: '转到演示文稿', goToText: '转到正文' },
  }
  return dict[langStore.currentLang] || dict.ru
})

const chaptersLabel = computed(() => {
  const chapterPart = pack.value.chapters
  const bt = (props.bookTitle || '').trim()
  if (!bt)
    return chapterPart
  return `${bt}: ${chapterPart}`
})

defineEmits(['changeView'])

const props = withDefaults(defineProps<{
  title?: string
  quizTitle?: string
  isTheory?: boolean
  hasPresentation?: boolean
  /** Локализованное название книги для подписи */
  bookTitle?: string | null
  bookSlug?: string | null
  bookChapters?: BookChapterNav[] | null
  /** Текущий slug из маршрута (может быть ru/zh) */
  currentArticleSlug?: string
}>(), {
  hasPresentation: true,
})

function isCurrentChapter(ch: BookChapterNav) {
  const cur = (props.currentArticleSlug || '').trim()
  if (!cur)
    return false
  if (ch.slug === cur)
    return true
  if (ch.slug_canonical && ch.slug_canonical === cur)
    return true
  return false
}
</script>

<style scoped>
.lv-label {
  color: var(--gv-text-primary);
}

.lv-row {
  color: var(--gv-text-primary);
}

.lv-row:hover {
  color: var(--gv-primary);
}

.selectedToc {
  @apply border-r-2 border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300;
  border-right-color: #0284c7 !important;
  border-left-color: transparent !important;
  background: rgb(240 249 255 / 0.5) !important;
  border-radius: 0;
  font-weight: 400;
}

.left-view-selector .selector-row:not(.selectedToc) {
  border-color: transparent;
}

.selector-row {
  display: block;
  width: 100%;
  background: transparent;
  border-radius: 0;
}

.chapter-link--current {
  @apply border-r-2 border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300;
  border-right-color: #0284c7 !important;
  border-left-color: transparent !important;
  background: rgb(240 249 255 / 0.5) !important;
  font-weight: 400;
}

.dark .selectedToc {
  border-right-color: #38bdf8 !important;
  background: rgb(12 74 110 / 0.2) !important;
}

.dark .chapter-link--current {
  border-right-color: #38bdf8 !important;
  background: rgb(12 74 110 / 0.2) !important;
}
</style>
