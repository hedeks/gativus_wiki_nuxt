<template>
  <div
    class="flex flex-col p-3 lg:p-10 flex-wrap-reverse lg:grid lg:grid-cols-12 lg:flex-nowrap gap-10 prose max-w-none prose-pre:text-black dark:prose-pre:text-white xl:prose-lg md:prose-md prose-sky dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-zinc-800 dark:prose-pre:bg-zinc-900 prose-h1:font-semibold">
    <theLeftQuizSelector @changeView="changeView" :is-theory="isTheory" :title="article?.title"
      :quizTitle="article?.title" :hasPresentation="hasPresentation"
      class="lg:col-span-2 xl:col-span-3 lg:flex lg:sticky top-[--header-height] xl:justify-self-end xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]" />
    <div :class="[{ 'active': !hasPresentation || isTheory, 'inactive': hasPresentation && !isTheory }]" ref="lection"
      class="flex flex-col-reverse lg:grid lg:grid-cols-10 xl:grid-cols-10 gap-10 w-full lg:col-span-10 xl:col-span-9 view-transition">
      <div
        class="w-full max-w-[900px] 2xl:max-w-[1100px] mx-auto lg:col-span-8 xl:col-span-7 flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 lg:p-10 p-5 rounded-2xl shadow-sm">
        <!-- Article Header -->
        <div v-if="article" class="flex flex-col pb-8 mb-10 border-b border-gray-100 dark:border-zinc-800">
          <!-- Dynamic Breadcrumbs -->
          <div
            class="flex items-center gap-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-4 uppercase tracking-[0.25em]">
            <template v-if="article.book_id">
              <NuxtLink to="/books" class="hover:underline transition-all whitespace-nowrap">БИБЛИОТЕКА</NuxtLink>
              <span class="opacity-30">/</span>
              <NuxtLink :to="`/books/${article.book_slug}`"
                class="hover:underline transition-all max-w-[200px] truncate">
                {{ article.book_title }}
              </NuxtLink>
              <span class="opacity-30">/</span>
              <span class="whitespace-nowrap">ГЛАВА {{ article.sort_order }}</span>
            </template>
            <template v-else>
              <NuxtLink to="/articles" class="hover:underline transition-all">СТАТЬИ</NuxtLink>
              <span class="opacity-30">/</span>
              <span class="truncate">{{ article.title }}</span>
            </template>
          </div>

          <h1
            class="text-3xl lg:text-4xl mb-0 font-bold text-[#233a4d] dark:text-gray-100 uppercase tracking-widest leading-tight m-0 mb-0">
            {{ article.title }}
          </h1>
        </div>
        <!-- Article HTML Content -->
        <div v-if="article?.html_content" class="parent w-full lg:col-span-8 xl:col-span-7 flex-col article-prose"
          v-html="article.html_content" @click="handleArticleClick" />
        <div v-else class="text-gray-400 py-10 text-center">
          <p>Контент не найден</p>
        </div>

        <!-- Lightbox Overlay -->
        <Transition name="fade">
          <div v-if="isLightboxOpen" class="lightbox-overlay" @click="closeLightbox">
            <div class="lightbox-content">
              <img :src="lightboxImage" class="lightbox-image" :class="{ 'is-zoomed': isZoomed }"
                alt="Full screen preview" @click.stop="toggleZoom" />
              <button class="lightbox-close" @click="closeLightbox">&times;</button>
            </div>
          </div>
        </Transition>
        <!-- Button to switch to presentation (only if presentation exists) -->
        <UButton v-if="hasPresentation" @click="changeView('quiz')" variant="solid" block color="black"
          class="rounded-none lg:text-xl sm:text-lg mt-5 h-20 not-prose" label="Перейти к презентации" />

        <!-- Book Navigation -->
        <div v-if="article.book_id && (article.prev || article.next)"
          class="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 not-prose">
          <NuxtLink v-if="article.prev" :to="`/articles/${article.prev.slug}`" class="nav-card nav-card--prev">
            <div class="nav-card-label uppercase">ПРЕДЫДУЩАЯ ГЛАВА {{ article.prev.sort_order != null ?
              `№${article.prev.sort_order}` :
              '' }}</div>
            <div class="nav-card-title">{{ article.prev.title }}</div>
          </NuxtLink>
          <div v-else class="flex-1" />

          <NuxtLink v-if="article.next" :to="`/articles/${article.next.slug}`"
            class="nav-card nav-card--next text-right">
            <div class="nav-card-label uppercase">СЛЕДУЮЩАЯ ГЛАВА {{ article.next.sort_order != null ?
              `№${article.next.sort_order}` :
              '' }}</div>
            <div class="nav-card-title">{{ article.next.title }}</div>
          </NuxtLink>
          <div v-else class="flex-1" />
        </div>
      </div>
      <theToc :activeID="activeID" @updateActiveID="handleTocClick" v-if="tocLinks.length"
        class="lg:w-auto lg:col-span-2 xl:col-span-3 xl:justify-self-start xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
        title="Содержание" :links="tocLinks" />
    </div>
    <div v-if="hasPresentation" :class="[{ 'active': !isTheory }, { 'inactive': isTheory }]"
      class="flex w-full lg:h-[calc(100dvh_-_var(--header-height)_-_5rem)] dark:bg-zinc-950 bg-gray-50 items-center justify-center h-[calc(100dvh_-_var(--header-height)_-_1.5rem)] lg:col-span-10 xl:col-span-9 view-transition">
      <thePresentationView :presentationPath="article?.presentation_path" :articleTitle="article?.title" />
    </div>
    <theScrollToTop @scrolled="resetToFirstHeading" />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
const route = useRoute()
const slug = route.params.slug as string

const { data: article, error } = await useFetch<any>(`/api/articles/${slug}`)

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Статья не найдена',
    fatal: true,
  })
}

const hasPresentation = computed(() => !!article.value?.presentation_path)

useSeoMeta({
  title: article.value?.title ? `${article.value.title} — Gativus Wiki` : 'Gativus Wiki',
  ogTitle: article.value?.title,
  description: article.value?.excerpt || '',
  ogDescription: article.value?.excerpt || '',
})

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

const tocLinks = computed<TocLink[]>(() => {
  const html = article.value?.html_content || ''
  const regex = /<h([2-5])[^>]*?(?:id="([^"]*)")?[^>]*>(.*?)<\/h\1>/gi
  const flat: { id: string; text: string; depth: number }[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const depth = parseInt(match[1])
    const text = match[3].replace(/<[^>]*>/g, '').trim()
    if (!text) continue

    const id = match[2] || generateId(text)

    flat.push({ id, text, depth })
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


const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isLightboxOpen.value) {
    closeLightbox()
  }
}

let isFirstObsCall = true
let isScrollingManually = false
let scrollTimeout: NodeJS.Timeout

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

const updateHeadingsAndObserve = () => {
  nextTick(() => {
    const container = document.querySelector('.parent')
    if (container) {
      const headings = container.querySelectorAll('h2, h3, h4, h5')
      headings.forEach((heading) => {
        if (!heading.id) {
          heading.id = generateId(heading.textContent || '')
        }
      })

      const filteredElements = Array.from(headings).filter(el => el.id !== '')
      if (obs.value) obs.value.disconnect()
      obs.value = observe(filteredElements)
    }
  })
}

const observe = (filteredElements: Element[]) => {
  const callback: IntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry: IntersectionObserverEntry) => {
      if (!entry.isIntersecting && entry.boundingClientRect.y > 0 && !isFirstObsCall) {
        let index = filteredElements.indexOf(entry.target)
        if (index > 0 && !isScrollingManually) {
          activeID.value = filteredElements[index - 1].id
        }
      }
      if (entry.isIntersecting) {
        if (entry.target.id !== '' && !isScrollingManually) {
          activeID.value = entry.target.id
        }
      }
    })
    isFirstObsCall = false
  }
  const observer = new IntersectionObserver(callback, {
    root: null,
    rootMargin: '0px 0px -80% 0px'
  })
  filteredElements.forEach((item: Element) => {
    observer.observe(item)
  })
  return observer
}

const obs = ref<IntersectionObserver>()
const currentPosition = ref<number>()

const changeView = (name: string) => {
  if (name === 'quiz') {
    isTheory.value = false
  } else {
    isTheory.value = true
  }
  if (isTheory.value && currentPosition.value) {
    nextTick(() => {
      scrollTo({ top: currentPosition.value })
    })
  } else {
    scrollTo({ top: 0 })
  }
}

// Watch for content changes to re-process headings
watch(() => article.value?.html_content, () => {
  updateHeadingsAndObserve()
}, { immediate: true })

onMounted(() => {
  window?.addEventListener('scroll', () => {
    if (isTheory.value) {
      currentPosition.value = scrollY
    }
  })
  updateHeadingsAndObserve()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
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
</style>
