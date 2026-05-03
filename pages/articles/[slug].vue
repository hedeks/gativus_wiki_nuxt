<template>
  <div
    class="flex flex-col p-3 lg:p-10 flex-wrap-reverse lg:grid lg:grid-cols-10 lg:flex-nowrap gap-10 prose max-w-none prose-pre:text-black dark:prose-pre:text-white xl:prose-lg md:prose-md prose-sky dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-zinc-800 dark:prose-pre:bg-zinc-900 prose-h1:font-semibold">
    <theLeftQuizSelector @changeView="changeView" :is-theory="isTheory" :title="article?.title"
      :quizTitle="article?.title" :hasPresentation="hasPresentation"
      class="lg:col-span-2 xl:col-span-2 lg:sticky top-[--header-height] xl:justify-self-end xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]" />
    <div :class="[{ 'active': !hasPresentation || isTheory, 'inactive': hasPresentation && !isTheory }]" ref="lection"
      class="flex flex-col-reverse lg:grid lg:grid-cols-8 xl:grid-cols-8 gap-10 w-full lg:col-span-8 xl:col-span-8 view-transition">
      <div
        ref="articleMainCardRef"
        class="w-full max-w-[1040px] 2xl:max-w-[1140px] mx-auto lg:col-span-6 xl:col-span-6 flex-col min-w-0 overflow-x-hidden bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 lg:p-10 p-5 rounded-2xl shadow-sm">
        <!-- Article Header -->
        <div v-if="article" class="flex flex-col pb-8 mb-10 border-b border-gray-100 dark:border-zinc-800 min-w-0">
          <!-- Dynamic Breadcrumbs -->
          <TheBreadcrumbs
            v-if="article"
            :items="[
              article.book_id 
                ? { label: t.library, to: '/books' } 
                : { label: t.articles, to: '/articles' },
              article.book_id 
                ? { label: article.book_title, to: `/books/${article.book_slug}` } 
                : null,
              { 
                label: article.book_id 
                  ? `${t.chapter} ${article.chapter_number ?? article.sort_order}` 
                  : article.title 
              }
            ].filter(Boolean) as any[]"
          />

          <div
            v-if="hasSearchQueryBanner"
            class="gv-article-search-context-row mb-2 mt-1 flex items-start gap-2"
          >
            <p
              class="min-w-0 flex-1 text-[11px] font-bold uppercase leading-snug tracking-[0.18em] text-red-900/75 dark:text-red-300/85"
            >
              {{ t.searchFrom }}: «{{ searchBannerQuote }}»
            </p>
            <button
              type="button"
              class="gv-article-search-dismiss gv-focusable shrink-0 rounded-md p-1 text-red-800/80 opacity-80 transition hover:bg-red-100/80 hover:opacity-100 dark:text-red-300/90 dark:hover:bg-red-950/50"
              :aria-label="t.dismissSearchHighlight"
              @click="clearSearchHighlightFromRoute"
            >
              <UIcon name="i-heroicons-x-mark-20-solid" class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <h1
            class="gv-article-title text-3xl lg:text-4xl mb-0 font-bold text-[#233a4d] dark:text-gray-100 uppercase tracking-widest leading-snug m-0 mb-0 min-w-0 break-words hyphens-auto">
            <span v-if="articleTitleHighlightHtml !== null" v-html="articleTitleHighlightHtml" />
            <template v-else>{{ article.title }}</template>
          </h1>
        </div>
        <!-- Article HTML Content -->
        <div
          v-if="article?.html_content"
          class="parent w-full flex-col article-prose"
          v-html="articleBodyHighlightHtml"
          @click="handleArticleClick"
        />
        <div v-else class="text-gray-400 py-10 text-center">
          <p>{{ t.noContent }}</p>
        </div>

        <!-- Lightbox Overlay -->
        <Transition name="fade">
          <div v-if="isLightboxOpen" class="lightbox-overlay" @click="closeLightbox">
            <div class="lightbox-content">
              <img :src="lightboxImage" class="lightbox-image" :class="{ 'is-zoomed': isZoomed }"
                alt="Full screen preview" @click.stop="toggleZoom" />
              <GvButton
                type="button"
                unstyled
                chromeless
                class="lightbox-close"
                aria-label="Close"
                @click="closeLightbox"
              >
                &times;
              </GvButton>
            </div>
          </div>
        </Transition>
        <div v-if="hasPresentation" class="gv-pres-cta not-prose">
          <GvButton
            variant="solid"
            block
            color="sky"
            icon="i-heroicons-presentation-chart-bar"
            trailing
            :label="t.presentation"
            @click="changeView('quiz')"
          />
        </div>

        <!-- Book Navigation -->
        <div v-if="article.book_id && (article.prev || article.next)"
          class="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 not-prose">
          <NuxtLink v-if="article.prev" :to="`/articles/${article.prev.slug}`" class="nav-card nav-card--prev">
            <div class="nav-card-label uppercase">{{ t.prevChapter }} {{ displayChapterNo(article.prev) !=
              null ?
              `№${displayChapterNo(article.prev)}` :
              '' }}</div>
            <div class="nav-card-title">{{ article.prev.title }}</div>
          </NuxtLink>
          <div v-else class="flex-1" />

          <NuxtLink v-if="article.next" :to="`/articles/${article.next.slug}`"
            class="nav-card nav-card--next text-right">
            <div class="nav-card-label uppercase">{{ t.nextChapter }} {{ displayChapterNo(article.next) !=
              null ?
              `№${displayChapterNo(article.next)}` :
              '' }}</div>
            <div class="nav-card-title">{{ article.next.title }}</div>
          </NuxtLink>
          <div v-else class="flex-1" />
        </div>
      </div>
      <theToc :activeID="activeID" @updateActiveID="handleTocClick" v-if="tocLinks.length"
        class="lg:w-auto lg:col-span-2 xl:col-span-2 xl:justify-self-start xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
        :title="t.toc" :links="tocLinks" />
    </div>
    <div v-if="hasPresentation" :class="[{ 'active': !isTheory }, { 'inactive': isTheory }]"
      class="lg:grid lg:grid-cols-8 xl:grid-cols-8 gap-10 w-full lg:col-span-8 xl:col-span-8 view-transition">

      <!-- Main Presentation Column -->
      <div
        class="w-full max-w-[1040px] 2xl:max-w-[1140px] mx-auto lg:col-span-6 xl:col-span-6 h-[calc(100dvh_-_var(--header-height)_-_5rem)] flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <thePresentationView :presentationPath="article?.presentation_path" :articleTitle="article?.title" />
      </div>

      <!-- Right Side Info Panel (Symmetry with TOC) -->
      <aside :class="[
        'flex flex-col z-30 transition-all duration-500 overflow-x-hidden',
        'lg:sticky lg:top-[--header-height] lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:h-fit lg:w-full lg:col-span-2 xl:col-span-2',
        'fixed top-[calc(var(--header-height)+0.75rem)] right-4 w-[240px] max-w-[85vw] sm:w-[320px] bg-transparent dark:bg-transparent border-0 shadow-none backdrop-blur-none py-3 pl-3 pr-5 lg:static lg:z-auto lg:max-w-none'
      ]" class="presentation-sidebar">

        <!-- Mobile Toggle (Matching TOC Style) -->
        <div
          class="flex items-center justify-between cursor-pointer select-none px-3 py-1 lg:sticky lg:top-0 lg:z-20 lg:bg-transparent lg:dark:bg-transparent"
          @click="isPresSidebarOpen = !isPresSidebarOpen">
          <p
            class="lg:text-sm text-[10px] tracking-widest font-bold text-black dark:text-white uppercase transition-all duration-500 mr-4 flex-shrink-0">
            {{ t.info }}
          </p>
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="!isDesktop && !isPresSidebarOpen"
              class="text-[9px] text-black dark:text-white/80 font-medium truncate min-w-0 max-w-[100px]">
              {{ t.mobileControls }}
            </span>
            <svg :class="{ 'rotate-180': isPresSidebarOpen }"
              class="w-3 h-3 text-gray-400 flex-shrink-0 transition-all duration-500 lg:hidden" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <Transition name="expand-pres">
          <div v-show="isDesktop || isPresSidebarOpen" class="flex flex-col gap-4 mt-4 lg:mt-2">
            <div class="flex flex-col gap-2 p-1">
              <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug min-w-0 break-words hyphens-auto">{{ article?.title }}</h3>

              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-3">
                <div
                  class="flex items-center gap-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                  <UIcon name="i-heroicons-computer-desktop" class="w-4 h-4" />
                  {{ t.controls }}
                </div>
                <div class="grid grid-cols-1 gap-3 text-[11px]">
                  <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span class="text-gray-500 uppercase font-bold text-[9px]">{{ t.next }}</span>
                    <span
                      class="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-sky-600 dark:text-sky-400 font-black">SPACE
                      / →</span>
                  </div>
                  <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span class="text-gray-500 uppercase font-bold text-[9px]">{{ t.back }}</span>
                    <span
                      class="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-sky-600 dark:text-sky-400 font-black">←</span>
                  </div>
                  <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span class="text-gray-500 uppercase font-bold text-[9px]">{{ t.zoom }}</span>
                    <span
                      class="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-sky-600 dark:text-sky-400 font-black">Wheel
                      / ±</span>
                  </div>
                </div>
              </div>

              <a v-if="article?.presentation_path" :href="`/api/uploads/${article.presentation_path}`" download
                class="mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-black dark:bg-white text-white dark:text-black hover:bg-sky-600 dark:hover:bg-sky-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95">
                <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
                {{ t.download }}
              </a>
            </div>
          </div>
        </Transition>
      </aside>
    </div>
    <theScrollToTop @scrolled="resetToFirstHeading" />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, computed, watch, nextTick, onMounted } from 'vue'
import { useLanguageStore } from '~/stores/language'
import { wrapArticleTables } from '~/utils/wrapArticleTables'

const langStore = useLanguageStore()
const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.params.slug ?? ''))

const articleMainCardRef = ref<HTMLElement | null>(null)

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
    info: 'Info',
    mobileControls: 'Keys & PDF',
    controls: 'Controls',
    next: 'Next',
    back: 'Back',
    zoom: 'Zoom',
    download: 'Download Original',
    backToText: 'Back to Text',
    dismissSearchHighlight: 'Clear search highlights'
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
    info: 'Инфо',
    mobileControls: 'Клавиши и PDF',
    controls: 'Управление',
    next: 'Далее',
    back: 'Назад',
    zoom: 'Zoom',
    download: 'Скачать оригинал',
    backToText: 'Вернуться к тексту',
    dismissSearchHighlight: 'Убрать подсветку поиска'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

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

// Declared placeholders before await to avoid ReferenceError in template during suspension
const articleData = ref<any | null>(null)
const pending = ref(true)
const error = ref<any>(null)

const article = computed(() => articleData.value)
const hasPresentation = computed(() => !!article.value?.presentation_path)

/** Номер главы для подписей (совпадает с порядком в оглавлении книги), не сырое поле sort_order. */
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
  pending.value = true
  try {
    const res = await $fetch<any>(`/api/articles/${slug.value}`, {
      params: { lang: langStore.currentLang }
    })
    articleData.value = res
  } catch (e) {
    error.value = e
  } finally {
    pending.value = false
  }
}

// Initial Fetch
const initialData = await $fetch<any>(`/api/articles/${slug.value}`, {
  params: { lang: langStore.currentLang },
}).catch((e) => {
  error.value = e
  return null
})

if (error.value && !initialData) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Статья не найдена',
    fatal: true,
  })
}

/** Канонический URL — основной slug (англ. / articles.slug), даже если открыли slug_ru или slug_zh */
if (
  initialData?.slug
  && String(route.params.slug) !== String(initialData.slug)
) {
  await navigateTo(
    { path: `/articles/${initialData.slug}`, query: { ...route.query } },
    { replace: true, redirectCode: 301 },
  )
}

articleData.value = initialData
pending.value = false

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

const { saveFromArticle } = useReadingProgress()

watch(
  () => article.value,
  (a) => {
    if (a?.book_id)
      saveFromArticle(a)
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
const isZoomed = ref(false)
const lightboxImage = ref('')

const handleArticleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'IMG') {
    lightboxImage.value = (target as HTMLImageElement).src
    isLightboxOpen.value = true
    isZoomed.value = false
    document.body.style.overflow = 'hidden' // Prevent scrolling
  }
}

const toggleZoom = () => {
  isZoomed.value = !isZoomed.value
}

const closeLightbox = () => {
  isLightboxOpen.value = false
  isZoomed.value = false
  document.body.style.overflow = ''
}

/** Mobile: swipe left/right between book chapters; opens page with scroll-to-top (see app/router.options + session flag). */
useMobileChapterSwipe({
  getNextSlug: () => article.value?.next?.slug ?? null,
  getPrevSlug: () => article.value?.prev?.slug ?? null,
  isEnabled: () => isTheory.value && !isLightboxOpen.value,
})


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
      scheduleScrollSpy()
    }
  })
}
const currentPosition = ref<number>()

const changeView = (name: string) => {
  if (name === 'quiz') {
    // Capture position BEFORE changing state to avoid race condition with scrollTo(0)
    currentPosition.value = window.scrollY
    isTheory.value = false
    nextTick(() => {
      window.scrollTo({ top: 0 })
    })
  } else {
    isTheory.value = true
    if (currentPosition.value) {
      nextTick(() => {
        window.scrollTo({ top: currentPosition.value })
        scheduleScrollSpy()
      })
    }
    else {
      nextTick(() => scheduleScrollSpy())
    }
  }
}

// Watch for content changes to re-process headings
watch(() => article.value?.html_content, () => {
  updateHeadingsAndObserve()
}, { immediate: false }) // Disable immediate to prevent SSR crash

onMounted(() => {
  checkSize()
  window.addEventListener('resize', checkSize)
  window?.addEventListener('scroll', () => {
    if (isTheory.value) {
      currentPosition.value = scrollY
      scheduleScrollSpy()
    }
  }, { passive: true })
  updateHeadingsAndObserve()
  window.addEventListener('keydown', handleKeydown)
  if (highlightNeedleFromRoute.value) {
    setTimeout(() => {
      scrollToFirstSearchHighlight()
    }, 260)
  }
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
  transition: opacity 0.3s ease;
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
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
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
  transition: all 0.3s ease;
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
  transition: all 0.3s ease;
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
  transition: max-height 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915), opacity 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915);
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
