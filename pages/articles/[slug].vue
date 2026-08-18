<template>
  <div
    class="flex flex-col p-3 lg:p-10 flex-wrap-reverse lg:grid lg:grid-cols-10 lg:flex-nowrap gap-10 prose max-w-none prose-pre:text-black dark:prose-pre:text-white xl:prose-lg md:prose-md prose-sky dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-zinc-800 dark:prose-pre:bg-zinc-900 prose-h1:font-semibold">
    <div class="fixed top-0 lg:top-[var(--header-height)] left-0 h-1 bg-[var(--gv-primary)] z-40 transition-all duration-150 ease-out" :style="{ width: scrollProgress + '%' }"></div>
    <theLeftQuizSelector
      @changeView="changeView"
      :is-theory="isTheory"
      :title="article?.title"
      :quiz-title="article?.title"
      :has-presentation="hasPresentation"
      :book-title="article?.book_id ? article?.book_title : null"
      :book-slug="article?.book_slug ?? null"
      :book-chapters="article?.book_chapters ?? null"
      :current-article-slug="slug"
      class="hidden lg:flex lg:col-span-2 xl:col-span-2 lg:sticky top-[--header-height] xl:justify-self-end xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
    />
    <div :class="[{ 'active': !hasPresentation || isTheory, 'inactive': hasPresentation && !isTheory }]" ref="lection"
      class="flex flex-col-reverse lg:grid lg:grid-cols-8 xl:grid-cols-8 gap-10 w-full lg:col-span-8 xl:col-span-8 view-transition">
      <div
        ref="articleMainCardRef"
        :class="[
          'w-full max-w-[1040px] 2xl:max-w-[1140px] mx-auto lg:col-span-6 xl:col-span-6 flex-col min-w-0 overflow-x-hidden bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 lg:p-10 p-5 rounded-2xl shadow-sm',
          tocLinks?.length ? 'max-lg:mt-[3rem]' : '',
        ]"
      >
        <!-- Article Header -->
        <div v-if="article" class="flex flex-col pb-8 mb-10 border-b border-gray-100 dark:border-zinc-800 min-w-0">
          <!-- Dynamic Breadcrumbs -->
          <TheBreadcrumbs
            v-if="article"
            :items="[
              article.book_id 
                ? { label: t?.library || 'БИБЛИОТЕКА', to: '/books' } 
                : { label: t?.articles || 'СТАТЬИ', to: '/articles' },
              article.book_id 
                ? { label: article.book_title, to: `/books/${article.book_slug}` } 
                : null,
              { 
                label: article.book_id 
                  ? `${t?.chapter || 'ГЛАВА'} ${article.chapter_number ?? article.sort_order}` 
                  : article.title 
              }
            ].filter(Boolean) as any[]"
          />

          <!-- Reading Meta Stats -->
          <div v-if="readingStats && readingStats.words > 0" class="gv-article-reading-meta flex items-center gap-2.5 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mt-2.5 mb-1 not-prose select-none">
            <span class="inline-flex items-center gap-1 text-sky-600/90 dark:text-sky-400/90">
              <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
              <span>~{{ readingStats.minutes }} {{ t?.minRead || 'мин' }}</span>
            </span>
            <span class="opacity-40">•</span>
            <span>{{ readingStats.words }} {{ t?.words || 'слов' }}</span>
            <template v-if="readingStats.termsCount > 0">
              <span class="opacity-40">•</span>
              <span class="text-emerald-600/90 dark:text-emerald-400/90 inline-flex items-center gap-0.5">
                <UIcon name="i-heroicons-bookmark" class="w-3.5 h-3.5" />
                {{ readingStats.termsCount }} {{ t?.terms || 'терминов' }}
              </span>
            </template>
          </div>

          <div
            v-if="hasSearchQueryBanner"
            class="gv-article-search-context-row mb-2 mt-1 flex items-start gap-2"
          >
            <p
              class="min-w-0 flex-1 text-[11px] font-bold uppercase leading-snug tracking-[0.18em] text-red-900/75 dark:text-red-300/85"
            >
              {{ t?.searchFrom || 'Поиск' }}: «{{ searchBannerQuote }}»
            </p>
            <button
              type="button"
              class="gv-article-search-dismiss gv-focusable shrink-0 rounded-md p-1 text-red-800/80 opacity-80 transition hover:bg-red-100/80 hover:opacity-100 dark:text-red-300/90 dark:hover:bg-red-950/50"
              :aria-label="t?.dismissSearchHighlight || 'Убрать подсветку поиска'"
              @click="clearSearchHighlightFromRoute"
            >
              <UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div class="flex items-start justify-between gap-4">
            <h1
              class="gv-article-title text-3xl lg:text-4xl mb-0 font-bold text-[#233a4d] dark:text-gray-100 uppercase tracking-widest leading-snug m-0 mb-0 min-w-0 break-words hyphens-auto">
              <span v-if="articleTitleHighlightHtml !== null" v-html="articleTitleHighlightHtml" />
              <template v-else>{{ article.title }}</template>
            </h1>
            <div class="flex items-center gap-2 mt-1 shrink-0 not-prose">
              <GvButton 
                v-if="store.isLoggedIn"
                @click="toggleBookmark" 
                :color="isBookmarked ? 'sky' : 'gray'" 
                :variant="isBookmarked ? 'solid' : 'soft'" 
                size="xs" 
                :icon="isBookmarked ? 'i-heroicons-bookmark-solid' : 'i-heroicons-bookmark'"
              >
                <span class="hidden md:inline">{{ isBookmarked ? (t?.bookmarked || 'В закладках') : (t?.bookmark || 'В закладки') }}</span>
              </GvButton>
              <div v-if="canEdit" class="hidden md:block">
                <GvButton 
                  v-if="!isEditingInPlace" 
                  @click="isEditingInPlace = true" 
                  color="sky" 
                  variant="soft" 
                  size="xs" 
                  icon="i-heroicons-pencil-square"
                >
                  Редактировать
                </GvButton>
              </div>
            </div>
          </div>
        </div>
        <!-- Article HTML Content -->
        <template v-if="isEditingInPlace">
          <!-- Seamless wrapper -->
          <div class="gv-seamless-editor-wrapper">
            <Suspense>
              <AdminArticleForm 
                :article-id="article.id" 
                :inline-mode="true" 
                :seamless-mode="true"
                :initial-html="article.html_content"
                @cancel-inline="isEditingInPlace = false" 
                @article-saved="onInlineSaved" 
              />
              <template #fallback>
                <div class="flex flex-col items-center justify-center min-h-[400px] w-full rounded-2xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-gray-100 dark:border-zinc-800 animate-pulse my-4">
                  <div class="relative flex h-16 w-16 items-center justify-center mb-6">
                    <div class="absolute inset-0 rounded-full border-t-2 border-sky-400 animate-[spin_1.5s_linear_infinite]"></div>
                    <div class="absolute inset-2 rounded-full border-r-2 border-indigo-400 animate-[spin_2s_linear_infinite_reverse]"></div>
                    <UIcon name="i-heroicons-pencil-square" class="h-6 w-6 text-sky-500/80" />
                  </div>
                  <p class="text-[11px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500 uppercase">Подготовка редактора</p>
                </div>
              </template>
            </Suspense>
          </div>
        </template>
        <template v-else>
          <div
            v-if="article?.html_content"
            class="parent w-full flex-col article-prose"
            v-html="articleBodyHighlightHtml"
            @click="handleArticleClick"
          />
          <div v-else class="text-gray-400 py-10 text-center">
            <p>{{ t?.noContent || 'Контент не найден' }}</p>
          </div>
        </template>

        <!-- Lightbox Overlay -->
        <TheImageViewer :src="lightboxImage" :visible="isLightboxOpen" @close="closeLightbox" />
        <div v-if="hasPresentation" class="gv-pres-cta not-prose">
          <GvButton
            variant="solid"
            block
            color="sky"
            icon="i-heroicons-presentation-chart-bar"
            trailing
            :label="t?.presentation || 'Презентация'"
            @click="changeView('quiz')"
          />
        </div>

        <!-- Book Navigation -->
        <div v-if="article?.book_id && (article?.prev || article?.next)"
          class="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 not-prose">
          <NuxtLink v-if="article?.prev" :to="`/articles/${article.prev.slug}`" class="nav-card nav-card--prev">
            <div class="nav-card-label uppercase">{{ t?.prevChapter || 'ПРЕДЫДУЩАЯ ГЛАВА' }} {{ displayChapterNo(article.prev) !=
              null ?
              `№${displayChapterNo(article.prev)}` :
              '' }}</div>
            <div class="nav-card-title">{{ article.prev.title }}</div>
          </NuxtLink>
          <div v-else class="flex-1" />

          <NuxtLink v-if="article?.next" :to="`/articles/${article.next.slug}`"
            class="nav-card nav-card--next text-right">
            <div class="nav-card-label uppercase">{{ t?.nextChapter || 'СЛЕДУЮЩАЯ ГЛАВА' }} {{ displayChapterNo(article.next) !=
              null ?
              `№${displayChapterNo(article.next)}` :
              '' }}</div>
            <div class="nav-card-title">{{ article.next.title }}</div>
          </NuxtLink>
          <div v-else class="flex-1" />
        </div>
      </div>
      <theToc
        :key="tocKey"
        v-if="tocLinks?.length"
        :activeID="activeID"
        :has-presentation="hasPresentation"
        :is-theory="isTheory"
        :chapters="article?.book_chapters ?? null"
        :current-article-slug="slug"
        :chapters-title="article?.book_title ? `${article.book_title}: ${t?.chapters || 'Главы'}` : (t?.chapters || 'Главы')"
        :text-title="t?.text || 'Текст'"
        :presentation-title="t?.presentation || 'Презентация'"
        @updateActiveID="handleTocClick"
        @changeView="changeView"
        class="lg:w-auto lg:col-span-2 xl:col-span-2 xl:justify-self-start xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
        :title="t?.toc || 'Содержание'"
        :links="tocLinks || []"
      />
    </div>
    <div v-if="hasPresentation" :class="[{ 'active': !isTheory }, { 'inactive': isTheory }]"
      class="lg:grid lg:grid-cols-8 xl:grid-cols-8 gap-10 w-full lg:col-span-8 xl:col-span-8 view-transition">

      <!-- Main Presentation Column -->
      <div
        :class="[
          'w-full max-w-[1040px] 2xl:max-w-[1140px] mx-auto lg:col-span-6 xl:col-span-6 h-[calc(100dvh_-_var(--header-height)_-_5rem)] flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden',
          'max-lg:mt-[2.75rem]',
        ]">
        <thePresentationView :presentationPath="article?.presentation_path" :articleTitle="article?.title" :is-active="!isTheory" />
      </div>

      <!-- Right Side Info Panel (Symmetry with TOC) -->
      <aside :class="[
        'flex flex-col z-30 transition-all duration-500 overflow-x-hidden',
        'lg:sticky lg:top-[--header-height] lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:h-fit lg:w-full lg:col-span-2 xl:col-span-2',
        'fixed inset-x-0 top-[var(--header-height)] w-full max-w-none',
        'max-lg:bg-white/80 max-lg:dark:bg-zinc-900/80 max-lg:backdrop-blur-md max-lg:border-b max-lg:border-gray-100 max-lg:dark:border-zinc-800 max-lg:shadow-lg max-lg:py-1 max-lg:px-3',
        'lg:static lg:z-auto lg:max-w-none'
      ]" class="presentation-sidebar">

        <!-- Mobile Toggle (Matching TOC Style) -->
        <div
          class="flex items-center justify-between cursor-pointer select-none px-2 py-0.5 lg:sticky lg:top-0 lg:z-20 lg:bg-transparent lg:dark:bg-transparent"
          @click="isPresSidebarOpen = !isPresSidebarOpen">
          <p
            class="lg:text-sm text-[10px] tracking-widest font-bold text-black dark:text-white uppercase transition-all duration-500 mr-4 flex-shrink-0">
            {{ t?.info || 'Инфо' }}
          </p>
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="!isDesktop && !isPresSidebarOpen"
              class="text-[9px] text-black dark:text-white/80 font-medium truncate min-w-0 max-w-[100px]">
              {{ t?.mobileControls || 'Клавиши и PDF' }}
            </span>
            <svg :class="{ 'rotate-180': isPresSidebarOpen }"
              class="w-3 h-3 text-gray-400 flex-shrink-0 transition-all duration-500 lg:hidden" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <Transition name="expand-pres">
          <div v-show="isDesktop || isPresSidebarOpen" class="flex flex-col gap-4 mt-1 lg:mt-2">
            <div class="flex flex-col gap-2 px-1 pb-1">
              <GvButton
                variant="outline"
                color="gray"
                size="xs"
                icon="i-heroicons-document-text"
                class="justify-start"
                @click="changeView('lection')"
              >
                {{ t?.backToText || 'Вернуться к тексту' }}
              </GvButton>

              <h3 class="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 mt-1">
                {{ t?.controls || 'Управление' }}
              </h3>

              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between border-l-2 border-transparent py-1 pl-3 pr-2 text-[10px] text-gray-900 dark:text-gray-200">
                  <span>{{ t?.next || 'Далее' }}</span>
                  <span class="font-semibold text-sky-700 dark:text-sky-300">SPACE / →</span>
                </div>
                <div class="flex items-center justify-between border-l-2 border-transparent py-1 pl-3 pr-2 text-[10px] text-gray-900 dark:text-gray-200">
                  <span>{{ t?.back || 'Назад' }}</span>
                  <span class="font-semibold text-sky-700 dark:text-sky-300">←</span>
                </div>
                <div class="flex items-center justify-between border-l-2 border-transparent py-1 pl-3 pr-2 text-[10px] text-gray-900 dark:text-gray-200">
                  <span>{{ t?.zoom || 'Zoom' }}</span>
                  <span class="font-semibold text-sky-700 dark:text-sky-300">Wheel / ±</span>
                </div>
              </div>

              <a
                v-if="article?.presentation_path"
                :href="`/api/uploads/${article.presentation_path}`"
                download
                class="mt-1 flex items-center gap-2 border-l-2 border-transparent py-1 pl-3 pr-2 text-[10px] text-gray-900 transition hover:text-sky-700 dark:text-gray-200 dark:hover:text-sky-300"
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="h-3.5 w-3.5" />
                <span>{{ t?.download || 'Скачать' }}</span>
              </a>
            </div>
          </div>
        </Transition>
      </aside>
    </div>
    <theScrollToTop @scrolled="resetToFirstHeading" />
    <InPlaceEditor 
      v-if="article?.id" 
      type="article" 
      :id="article.id" 
      @saved="onInlineSaved" 
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, onBeforeUnmount, ref, computed, watch, nextTick, onMounted } from 'vue'
import { useLanguageStore } from '~/stores/language'
import { wrapArticleTables } from '~/utils/wrapArticleTables'
import { useNavHistoryStore } from '~/stores/navHistory'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { userStore } from '~/stores/userStore'
import AdminArticleForm from '~/components/admin/AdminArticleForm.vue'

const langStore = useLanguageStore()
const store = userStore()
const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.params.slug ?? ''))
const navHistory = useNavHistoryStore()

const uiDict: Record<string, any> = {
  en: {
    library: 'LIBRARY',
    chapter: 'CHAPTER',
    articles: 'ARTICLES',
    searchFrom: 'Search',
    noContent: 'Content not found',
    presentation: 'Go to Presentation',
    prevChapter: 'PREVIOUS CHAPTER',
    nextChapter: 'NEXT CHAPTER',
    toc: 'Contents',
    chapters: 'Chapters',
    text: 'Text',
    info: 'Info',
    mobileControls: 'Keys & PDF',
    controls: 'Controls',
    next: 'Next',
    back: 'Back',
    zoom: 'Zoom',
    download: 'Download Original',
    backToText: 'Back to Text',
    dismissSearchHighlight: 'Clear search highlights',
    bookmark: 'Add to bookmarks',
    bookmarked: 'Bookmarked',
    minRead: 'min read',
    words: 'words',
    terms: 'terms',
  },
  ru: {
    library: 'БИБЛИОТЕКА',
    chapter: 'ГЛАВА',
    articles: 'СТАТЬИ',
    searchFrom: 'Поиск',
    noContent: 'Контент не найден',
    presentation: 'Перейти к презентации',
    prevChapter: 'ПРЕДЫДУЩАЯ ГЛАВА',
    nextChapter: 'СЛЕДУЮЩАЯ ГЛАВА',
    toc: 'Содержание',
    chapters: 'Главы',
    text: 'Текст',
    info: 'Инфо',
    mobileControls: 'Клавиши и PDF',
    controls: 'Управление',
    next: 'Далее',
    back: 'Назад',
    zoom: 'Zoom',
    download: 'Скачать оригинал',
    backToText: 'Вернуться к тексту',
    dismissSearchHighlight: 'Убрать подсветку поиска',
    bookmark: 'В закладки',
    bookmarked: 'В закладках',
    minRead: 'мин чтения',
    words: 'слов',
    terms: 'терминов',
  },
  zh: {
    library: '图书馆',
    chapter: '章节',
    articles: '文章',
    searchFrom: '搜索',
    noContent: '未找到内容',
    presentation: '转到演示文稿',
    prevChapter: '上一章',
    nextChapter: '下一章',
    toc: '目录',
    chapters: '章节',
    text: '正文',
    info: '信息',
    mobileControls: '键盘与PDF',
    controls: '控制',
    next: '下一步',
    back: '返回',
    zoom: '缩放',
    download: '下载原件',
    backToText: '返回正文',
    dismissSearchHighlight: '清除搜索高亮',
    bookmark: '添加到书签',
    bookmarked: '已收藏',
    minRead: '分钟阅读',
    words: '字',
    terms: '个术语',
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru || uiDict.en)

const isEditingInPlace = ref(false)
const tocKey = ref(0)
const scrollProgress = ref(0)
const canEdit = computed(() => {
  if (!store.isLoggedIn || !store.userInfo) return false
  const role = store.userInfo.role
  return role === 'editor' || role === 'admin'
})

const { data: bookmarkedIds, refresh: refreshBookmarks } = useFetch<number[]>('/api/user/bookmarks', {
  headers: useRequestHeaders(['cookie', 'authorization']),
  server: false,
})

const isBookmarked = computed(() => !!(bookmarkedIds.value && article.value?.id && bookmarkedIds.value.includes(article.value.id)))

const toggleBookmark = async () => {
  if (!store.isLoggedIn) return navigateTo('/login')
  const action = isBookmarked.value ? 'remove' : 'add'
  await $fetch('/api/user/bookmarks', {
    method: 'POST',
    body: { articleId: article.value.id, action },
    headers: store.token ? { Authorization: `Bearer ${store.token}` } : {}
  })
  await refreshBookmarks()
}

async function onInlineSaved() {
  // Clear all Nuxt internal payload cache for this article across locales
  clearNuxtData((key) => typeof key === 'string' && key.startsWith(`article-${slug.value}`))
  
  // Await the fetch so that the DOM updates with fresh data BEFORE we close the editor
  await nuxtRefresh()
  
  // Now close the editor, revealing the freshly fetched content seamlessly
  isEditingInPlace.value = false
  tocKey.value++
}

// ─── Article view state persistence ───
function lsKey() { return `gv:article-state:${route.path}` }

const articleMainCardRef = ref<HTMLElement | null>(null)

function escapeHtmlPlain(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Регистронезависимое вхождение подстроки (в т.ч. внутри слова); `u` — корректнее для кириллицы и юникода. */
function highlightNeedleRegex(needle: string): RegExp | null {
  const n = needle.normalize('NFKC').trim()
  if (!n)
    return null
  const pattern = escapeRegExp(n)
  try {
    return new RegExp(pattern, 'giu')
  }
  catch {
    return new RegExp(pattern, 'gi')
  }
}

/** Подсветка в plain-text заголовке (совпадение — любая подстрока, без границ слова). */
function highlightPlainInTitle(text: string, needle: string): string {
  const esc = escapeHtmlPlain(text)
  const re = highlightNeedleRegex(needle)
  if (!re)
    return esc
  return esc.replace(re, m => `<mark class="gv-article-search-hl">${m}</mark>`)
}

function maskProtectedHtmlRegions(html: string, stash: string[]): string {
  return html.replace(
    /<(script|style|textarea)(\s[^>]*)?>[\s\S]*?<\/\1>|<pre(\s[^>]*)?>[\s\S]*?<\/pre>/gi,
    (full) => {
      stash.push(full)
      return `\x00BLK${stash.length - 1}\x00`
    },
  )
}

function unmaskProtectedHtmlRegions(html: string, stash: string[]): string {
  return html.replace(/\x00BLK(\d+)\x00/g, (_, idx) => stash[Number(idx)] ?? '')
}

/** Подсветка в HTML статьи: только текст между тегами; подстрока может быть частью слова. */
function highlightSearchInArticleHtml(html: string, needle: string): string {
  const re = highlightNeedleRegex(needle)
  if (!re || !html)
    return html
  const stash: string[] = []
  const masked = maskProtectedHtmlRegions(html, stash)
  const highlighted = masked.split(/(<[^>]+>)/).map((chunk) => {
    if (!chunk || chunk.startsWith('<'))
      return chunk
    return chunk.replace(re, m => `<mark class="gv-article-search-hl">${m}</mark>`)
  }).join('')
  return unmaskProtectedHtmlRegions(highlighted, stash)
}

const searchQueryFromLink = computed(() => {
  const sq = route.query.sq
  const raw = Array.isArray(sq) ? sq[0] : sq
  return typeof raw === 'string' ? raw.normalize('NFKC').trim() : ''
})

/** Подсветка по ссылке из поиска: сначала `hl`, иначе весь запрос `sq`. */
const highlightNeedleFromRoute = computed((): string => {
  const hlRaw = route.query.hl
  const hl = typeof hlRaw === 'string'
    ? hlRaw.normalize('NFKC').trim()
    : Array.isArray(hlRaw) && typeof hlRaw[0] === 'string'
      ? hlRaw[0].normalize('NFKC').trim()
      : ''
  if (hl)
    return hl
  return searchQueryFromLink.value
})

const hasSearchQueryBanner = computed(() => !!(route.query.sq || route.query.hl))

const searchBannerQuote = computed(() => {
  if (searchQueryFromLink.value)
    return searchQueryFromLink.value
  const hlRaw = route.query.hl
  if (typeof hlRaw === 'string')
    return hlRaw.normalize('NFKC').trim()
  if (Array.isArray(hlRaw) && typeof hlRaw[0] === 'string')
    return hlRaw[0].normalize('NFKC').trim()
  return ''
})

function clearSearchHighlightFromRoute() {
  const q = { ...route.query }
  delete q.sq
  delete q.hl
  void router.replace({ query: q })
}

const articleTitleHighlightHtml = computed((): string | null => {
  const needle = highlightNeedleFromRoute.value
  if (!needle)
    return null
  const title = article.value?.title || ''
  return highlightPlainInTitle(title, needle)
})

const { data: articleData, pending, error, refresh: nuxtRefresh } = await useAsyncData(
  `article-${slug.value}`,
  () => $fetch<any>(`/api/articles/${slug.value}`, {
    params: { 
      lang: langStore.currentLang,
    },
    headers: store.getAuthHeader()
  }),
  {
    watch: [() => langStore.currentLang, () => slug.value]
  }
)

const article = computed(() => articleData.value)
const hasPresentation = computed(() => !!article.value?.presentation_path)

const readingStats = computed(() => {
  const raw = article.value?.html_content || ''
  if (!raw) return { minutes: 1, words: 0, termsCount: 0 }
  
  // Strip HTML tags for clean word/character counting
  const plainText = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const isZh = langStore.currentLang === 'zh'
  
  let wordCount = 0
  let minutes = 1
  
  if (isZh) {
    wordCount = plainText.replace(/\s+/g, '').length
    minutes = Math.max(1, Math.ceil(wordCount / 300))
  } else {
    wordCount = plainText.split(/\s+/).filter(Boolean).length
    minutes = Math.max(1, Math.ceil(wordCount / 200))
  }
  
  const termsCount = (raw.match(/class=["'][^"']*wiki-term[^"']*["']/g) || []).length
  return { minutes, words: wordCount, termsCount }
})

function displayChapterNo(nav: { chapter_number?: number | null; sort_order?: number | null } | null | undefined): number | null {
  if (!nav)
    return null
  if (nav.chapter_number != null && Number.isFinite(Number(nav.chapter_number)))
    return Number(nav.chapter_number)
  if (nav.sort_order != null && Number.isFinite(Number(nav.sort_order)))
    return Number(nav.sort_order)
  return null
}

const articleBodyHighlightHtml = computed(() => {
  const raw = article.value?.html_content
  if (!raw || typeof raw !== 'string')
    return ''
  const needle = highlightNeedleFromRoute.value
  const body = needle ? highlightSearchInArticleHtml(raw, needle) : raw
  return wrapArticleTables(body)
})

let searchHlScrollTimer: ReturnType<typeof setTimeout> | null = null

function scrollToFirstSearchHighlight() {
  if (!import.meta.client)
    return
  nextTick(() => {
    requestAnimationFrame(() => {
      const root = articleMainCardRef.value
      const mark = root?.querySelector('.gv-article-search-hl')
      mark?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
  })
}

watch(
  () =>
    [
      highlightNeedleFromRoute.value,
      slug.value,
      article.value?.html_content ?? '',
      articleTitleHighlightHtml.value,
    ] as const,
  ([needle]) => {
    if (!import.meta.client) {
      return
    }
    if (!needle) {
      if (searchHlScrollTimer != null) {
        clearTimeout(searchHlScrollTimer)
        searchHlScrollTimer = null
      }
      return
    }
    if (searchHlScrollTimer != null)
      clearTimeout(searchHlScrollTimer)
    searchHlScrollTimer = setTimeout(() => {
      scrollToFirstSearchHighlight()
      searchHlScrollTimer = null
    }, 180)
  },
  { flush: 'post' },
)

const refresh = async () => {
  await nuxtRefresh()
}

if (error.value && !articleData.value) {
  throw createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage: 'Статья не найдена',
    fatal: true,
  })
}

/** Канонический URL — основной slug (англ. / articles.slug), даже если открыли slug_ru или slug_zh */
if (
  articleData.value?.slug
  && String(route.params.slug) !== String(articleData.value.slug)
) {
  await navigateTo(
    { path: `/articles/${articleData.value.slug}`, query: { ...route.query } },
    { replace: true, redirectCode: 301 },
  )
}

const seoTitle = computed(() =>
  article.value?.title ? `${article.value.title} — Gativus` : 'Gativus',
)
const seoOgTitle = computed(() => article.value?.title ?? '')
const seoDescription = computed(() => article.value?.excerpt || '')

useSeoMeta({
  title: seoTitle,
  ogTitle: seoOgTitle,
  description: seoDescription,
  ogDescription: seoDescription,
  ogImage: '/favicon.ico',
})

// Watch for language changes to refresh
watch(() => langStore.currentLang, () => {
  refresh()
})

const { saveProgress } = useReadingProgress()

watch(
  () => article.value,
  (a) => {
    if (a && store.isLoggedIn) {
      saveProgress({
        book_slug: (a.book_slug as string) || a.slug,
        book_title: (a.book_title as string) || a.title,
        article_slug: a.slug,
        article_title: a.title,
        sort_order: a.chapter_number ?? a.sort_order ?? 0,
        progress_percent: 0,
        updated_at: new Date().toISOString()
      })
    }
  },
  { immediate: true },
)

// ─── TOC generation from HTML headings ───

interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

// ─── Helpers ───

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}

function transliterate(str: string): string {
  return str.split('').map(char => {
    const lower = char.toLowerCase()
    return CYRILLIC_MAP[lower] !== undefined ? CYRILLIC_MAP[lower] : char
  }).join('')
}

const generateId = (text: string) => {
  const slug = transliterate(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || Math.random().toString(36).substring(2, 7) || 'id'
}

function stripInnerHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

/** Маркер нумерации ODT — slug/id на сервере считаются по тексту без него */
function stripOdtHeadingMarkers(html: string): string {
  return html.replace(/<span[^>]*\bodt-heading-marker\b[^>]*>[\s\S]*?<\/span>/gi, '').trim()
}

function extractHeadingIdFromAttrs(attrPart: string): string | undefined {
  const m = attrPart.match(/\bid\s*=\s*(["'])([^"']*)\1/i)
  const raw = m?.[2]?.trim()
  return raw && raw.length > 0 ? raw : undefined
}

/** Текст заголовка без маркера — как для autoslug при отсутствии id в DOM */
function headingPlainTextForSlug(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.odt-heading-marker').forEach(n => n.remove())
  return (clone.textContent || '').trim()
}

const tocLinks = computed<TocLink[]>(() => {
  const html = article.value?.html_content || ''
  /** [\s\S] — допускаем переносы строк внутри заголовка; id ищем в атрибутах в любом порядке */
  const regex = /<h([2-5])([^>]*)>([\s\S]*?)<\/h\1>/gi
  const flat: { id: string; text: string; depth: number }[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const depth = Number.parseInt(match[1], 10)
    const innerRaw = match[3]
    /** В оглавлении — как на странице: с префиксом `.odt-heading-marker`. Якорь — без маркера, как в парсере. */
    const textDisplay = stripInnerHtmlTags(innerRaw).trim()
    const textForSlug = stripInnerHtmlTags(stripOdtHeadingMarkers(innerRaw)).trim()
    if (!textDisplay) continue

    const fromAttr = extractHeadingIdFromAttrs(match[2] || '')
    const id = (fromAttr ?? generateId(textForSlug || textDisplay)).trim()

    flat.push({ id, text: textDisplay, depth })
  }

  // Build tree structure compatible with theToc component
  const buildTree = (items: typeof flat): TocLink[] => {
    const result: TocLink[] = []
    const stack: { node: TocLink; depth: number }[] = []

    for (const item of items) {
      const node: TocLink = { id: item.id, text: item.text, depth: item.depth }

      while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
        stack.pop()
      }

      if (stack.length === 0) {
        result.push(node)
      } else {
        const parent = stack[stack.length - 1].node
        if (!parent.children) parent.children = []
        parent.children.push(node)
      }

      stack.push({ node, depth: item.depth })
    }

    return result
  }

  return buildTree(flat)
})

// ─── View switching (article ↔ presentation) ───

const activeID = ref('')
const isTheory = ref(true)

function saveArticleState() {
  if (!import.meta.client) return
  const state = { scroll: window.scrollY, isPresentation: !isTheory.value }
  try { localStorage.setItem(lsKey(), JSON.stringify(state)) } catch {}
  try {
    window.history.replaceState({ ...window.history.state, gv_article: state }, '')
  } catch {}
  navHistory.record(route.path, state.scroll, state.isPresentation)

  const a = article.value
  if (store.isLoggedIn && a) {
    saveProgress({
      book_slug: (a.book_slug as string) || a.slug,
      book_title: (a.book_title as string) || a.title,
      article_slug: a.slug,
      article_title: a.title,
      sort_order: a.chapter_number ?? a.sort_order ?? 0,
      progress_percent: Math.round(scrollProgress.value),
      anchor: activeID.value || null,
      updated_at: new Date().toISOString()
    })
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _lastSaveTime = 0
function throttledSave() {
  const now = Date.now()
  if (now - _lastSaveTime >= 300) {
    _lastSaveTime = now
    saveArticleState()
  } else {
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(() => {
      _lastSaveTime = Date.now()
      saveArticleState()
    }, 300)
  }
}

const lection = ref<HTMLElement | undefined>()

// Presentation Sidebar State (Symmetry with TOC)
const isPresSidebarOpen = ref(false)
const isDesktop = ref(true)

const checkSize = () => {
  isDesktop.value = window.innerWidth >= 1024
  scheduleScrollSpy()
}

// ─── Lightbox logic ───
const isLightboxOpen = ref(false)
const lightboxImage = ref('')

const handleArticleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'IMG') {
    lightboxImage.value = (target as HTMLImageElement).src
    isLightboxOpen.value = true
  }
}

const closeLightbox = () => {
  isLightboxOpen.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isLightboxOpen.value) {
    closeLightbox()
  }
}

let isScrollingManually = false
let scrollTimeout: ReturnType<typeof setTimeout>

/** Heading nodes in document order (for scroll-spy; avoids IntersectionObserver races). */
const headingElements = ref<Element[]>([])

const handleTocClick = (id: string) => {
  activeID.value = id
  isScrollingManually = true
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(() => {
    isScrollingManually = false
  }, 1000)
}

const resetToFirstHeading = () => {
  const firstLink = tocLinks.value?.[0]
  if (firstLink) {
    activeID.value = firstLink.id
  } else {
    activeID.value = ''
  }
  isScrollingManually = true
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(() => {
    isScrollingManually = false
  }, 1000)
}

/** Last heading whose top is at or above the “reading line” (under fixed header). */
function updateActiveHeadingFromScroll() {
  if (!process.client || !isTheory.value || isScrollingManually)
    return
  const els = headingElements.value
  if (!els.length)
    return
  const headerH = document.getElementById('header')?.clientHeight ?? 80
  const line = headerH + 16
  let currentId = (els[0] as HTMLElement).id
  for (const el of els) {
    const top = el.getBoundingClientRect().top
    if (top <= line && el.id)
      currentId = el.id
    else if (top > line)
      break
  }
  if (currentId && activeID.value !== currentId)
    activeID.value = currentId
}

let hasScrolledToHash = false
let scrollSpyRaf: number | null = null
function scheduleScrollSpy() {
  if (!process.client)
    return
  if (scrollSpyRaf != null)
    return
  scrollSpyRaf = requestAnimationFrame(() => {
    scrollSpyRaf = null
    updateActiveHeadingFromScroll()
  })
}

const updateHeadingsAndObserve = () => {
  if (!process.client) return
  nextTick(() => {
    const container = document.querySelector('.parent.article-prose')
      || document.querySelector('.article-prose.parent')
    if (container) {
      const headings = container.querySelectorAll('h2, h3, h4, h5')
      headings.forEach((heading) => {
        const h = heading as HTMLElement
        if (h.id) h.id = h.id.trim()
        if (!h.id) {
          h.id = generateId(headingPlainTextForSlug(h))
        }
      })

      headingElements.value = Array.from(headings).filter(el => el.id !== '')
      
      if (route.hash && !hasScrolledToHash) {
        hasScrolledToHash = true
        const targetId = route.hash.substring(1)
        const tryScroll = (attempts = 3) => {
          const targetEl = document.getElementById(targetId)
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'instant', block: 'start' })
            const headerH = document.getElementById('header')?.clientHeight ?? 80
            window.scrollBy(0, -headerH - 24)
            activeID.value = targetId
          } else if (attempts > 0) {
            setTimeout(() => tryScroll(attempts - 1), 100)
          }
        }
        tryScroll()
      }

      scheduleScrollSpy()
    }
  })
}
const currentPosition = ref<number>()

const changeView = (name: string) => {
  if (name === 'quiz') {
    currentPosition.value = window.scrollY
    isTheory.value = false
    nextTick(() => {
      window.scrollTo({ top: 0 })
      saveArticleState()
    })
  } else {
    isTheory.value = true
    if (currentPosition.value) {
      nextTick(() => {
        window.scrollTo({ top: currentPosition.value })
        scheduleScrollSpy()
        saveArticleState()
      })
    }
    else {
      nextTick(() => { scheduleScrollSpy(); saveArticleState() })
    }
  }
}

// Watch for content changes to re-process headings
watch(() => article.value?.html_content, () => {
  updateHeadingsAndObserve()
}, { immediate: false }) // Disable immediate to prevent SSR crash

const scrollRestoreWithRetry = (targetScroll: number, retries = 5) => {
  if (!import.meta.client) return
  window.scrollTo({ top: targetScroll, behavior: 'instant' })
  if (Math.abs(window.scrollY - targetScroll) > 4 && retries > 0) {
    setTimeout(() => {
      scrollRestoreWithRetry(targetScroll, retries - 1)
    }, 60)
  }
}

// Watch for chapter slug changes to reset scroll/TOC highlight (in case of component reuse)
watch(slug, (newSlug, oldSlug) => {
  if (newSlug && newSlug !== oldSlug) {
    activeID.value = ''
    hasScrolledToHash = false
    const gvState = window.history.state?.gv_article
    if (gvState) {
      if (gvState.isPresentation) {
        isTheory.value = false
      }
      currentPosition.value = gvState.scroll ?? 0
      const targetScroll = gvState.scroll ?? 0
      if (targetScroll > 0) {
        scrollRestoreWithRetry(targetScroll)
      }
    } else if (!route.hash) {
      isTheory.value = true
      currentPosition.value = 0
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }
})

const onScrollProgress = () => {
  const winScroll = document.body.scrollTop || document.documentElement.scrollTop
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
  scrollProgress.value = height > 0 ? (winScroll / height) * 100 : 0
}

let isNavigatingAway = false

onMounted(() => {
  checkSize()
  window.addEventListener('resize', checkSize)
  window?.addEventListener('scroll', () => {
    if (isNavigatingAway) return
    if (isTheory.value) {
      currentPosition.value = scrollY
      scheduleScrollSpy()
    }
    throttledSave()
    onScrollProgress()
  }, { passive: true })
  updateHeadingsAndObserve()
  window.addEventListener('keydown', handleKeydown)
  if (highlightNeedleFromRoute.value) {
    setTimeout(() => {
      scrollToFirstSearchHighlight()
    }, 260)
  }

  // Restore state on back navigation
  const gvState = window.history.state?.gv_article
  if (gvState) {
    if (gvState.isPresentation) {
      isTheory.value = false
    }
    currentPosition.value = gvState.scroll ?? 0
    const targetScroll = gvState.scroll ?? 0
    if (targetScroll > 0) {
      scrollRestoreWithRetry(targetScroll)
    }
  } else if (!route.hash) {
    // Normal navigation without hash -> scroll to top immediately
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
})

onBeforeRouteLeave(() => {
  isNavigatingAway = true
  saveArticleState()
})

onBeforeRouteUpdate(() => {
  saveArticleState()
})

onBeforeUnmount(() => {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
  isNavigatingAway = true
  saveArticleState()
})

onUnmounted(() => {
  if (searchHlScrollTimer != null) {
    clearTimeout(searchHlScrollTimer)
    searchHlScrollTimer = null
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', checkSize)
  if (scrollSpyRaf != null) {
    cancelAnimationFrame(scrollSpyRaf)
    scrollSpyRaf = null
  }
})
</script>

<style scoped>
.view-transition {
  transition: opacity 0.7s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.active {
  opacity: 1;
  position: relative;
  pointer-events: auto;
}

.inactive {
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Lightbox Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Book Navigation Cards */
.nav-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 0 2px rgba(34, 60, 80, 0.1);
  transition: all 0.2s cubic-bezier(0.705, 0.01, 0, 0.915);
  text-decoration: none !important;
  position: relative;
}

.dark .nav-card {
  background: #1a1a1a;
  border-color: #3a3a3a;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.nav-card:hover {
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
  transform: translateY(-2px);
  border-color: #0ea5e9;
}

.nav-card-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.nav-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
}

.dark .nav-card-title {
  color: #e5e5e5;
}

.nav-card--prev::before {
  content: "←";
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #0ea5e9;
  opacity: 0;
  transition: all 0.2s ease;
}

.nav-card--prev:hover {
  padding-left: 32px;
}

.nav-card--prev:hover::before {
  opacity: 1;
}

.nav-card--next::after {
  content: "→";
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #0ea5e9;
  opacity: 0;
  transition: all 0.2s ease;
}

.nav-card--next:hover {
  padding-right: 32px;
}

.nav-card--next:hover::after {
  opacity: 1;
}

/* Animations for Presentation Info Accordion (Matching TOC) */
.expand-pres-enter-active,
.expand-pres-leave-active {
  transition: max-height 0.2s cubic-bezier(0.705, 0.010, 0.000, 0.915), opacity 0.2s cubic-bezier(0.705, 0.010, 0.000, 0.915);
  overflow: hidden;
}

.expand-pres-enter-from,
.expand-pres-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-pres-enter-to,
.expand-pres-leave-from {
  max-height: 60vh;
  opacity: 1;
}

/* Подсветка из глобального поиска (?hl=), контент из v-html — только :deep */
h1 :deep(.gv-article-search-hl) {
  scroll-margin-top: calc(var(--header-height, 65px) + 12px);
  background: color-mix(in srgb, #ef4444 26%, transparent);
  color: inherit;
  padding: 0 4px;
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.dark h1 :deep(.gv-article-search-hl) {
  background: color-mix(in srgb, #f87171 22%, transparent);
}

.article-prose :deep(.gv-article-search-hl) {
  scroll-margin-top: calc(var(--header-height, 65px) + 12px);
  background: color-mix(in srgb, #ef4444 26%, transparent);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.dark .article-prose :deep(.gv-article-search-hl) {
  background: color-mix(in srgb, #f87171 22%, transparent);
}
</style>
