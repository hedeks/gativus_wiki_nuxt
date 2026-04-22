<template>
  <div
    class="flex flex-col p-3 lg:p-10 flex-wrap-reverse lg:grid lg:grid-cols-12 lg:flex-nowrap gap-10 prose max-w-none prose-pre:text-black dark:prose-pre:text-white xl:prose-lg md:prose-md prose-sky dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-zinc-800 dark:prose-pre:bg-zinc-900 prose-h1:font-semibold"
    v-if="term">
    <!-- Left Sidebar (Symmetry) -->
    <div
      class="lg:col-span-2 xl:col-span-3 lg:flex lg:sticky top-[--header-height] xl:justify-self-end xl:w-full xl:max-w-[320px] 2xl:max-w-[360px] hidden">
      <!-- Empty space for symmetry as requested -->
    </div>

    <!-- Main Content Area -->
    <div :class="[{ 'active': isTheory, 'inactive': !isTheory && term.presentation_path }]" ref="contentArea"
      class="flex flex-col lg:grid lg:grid-cols-10 xl:grid-cols-10 gap-10 w-full lg:col-span-10 xl:col-span-9 view-transition">
      <div
        class="w-full max-w-[900px] 2xl:max-w-[1100px] mx-auto lg:col-span-8 xl:col-span-7 flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 lg:p-10 p-5 rounded-2xl shadow-sm">

        <!-- Header Section -->
        <div class="flex flex-col pb-8 mb-10 border-b border-gray-100 dark:border-zinc-800">
          <TheBreadcrumbs
            :items="[
              { label: t.glossary, to: '/glossary' },
              { label: term.title }
            ]"
          />

          <h1
            class="text-3xl lg:text-4xl mb-0 font-bold text-[#233a4d] dark:text-gray-100 uppercase tracking-widest leading-tight m-0">
            {{ term.title }}
          </h1>

          <div v-if="term.category_title" class="flex items-center gap-3 mt-4 flex-wrap">
            <div class="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider"
              :style="{ color: term.category_color }">
              <UIcon v-if="term.category_icon" :name="term.category_icon" />
              {{ term.category_title }}
            </div>
            <div v-if="term.aliases?.length" class="flex gap-2">
              <span v-for="alias in term.aliases" :key="alias"
                class="px-2 py-0.5 bg-gray-50 dark:bg-zinc-800 rounded text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{{
                  alias }}</span>
            </div>
          </div>
        </div>

        <!-- Term Media Section -->
        <div v-if="term.image_url || term.video_url" class="mb-10 rounded-2xl overflow-hidden shadow-soft border dark:border-zinc-800">
           <img v-if="term.image_url" :src="term.image_url" class="w-full h-auto object-cover max-h-[500px] cursor-zoom-in" @click="handleMediaClick(term.image_url)" />
           <video v-else-if="term.video_url" :src="term.video_url" class="w-full h-auto max-h-[500px]" controls playsinline />
        </div>

        <!-- Article Content -->
        <div v-if="contentHtml" class="parent w-full lg:col-span-8 xl:col-span-7 flex-col glossary-prose"
          v-html="contentHtml" @click="handleArticleClick" />
        <div v-else class="text-gray-400 py-10 text-center">
          {{ t.noContent }}
        </div>

        <!-- Presentation Toggle -->
        <UButton v-if="term.presentation_path" @click="changeView('quiz')" variant="solid" block color="black"
          class="rounded-none lg:text-xl sm:text-lg mt-10 h-20 not-prose" :label="t.presentation" />

        <!-- Actions -->
        <div class="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800 flex justify-between gap-4 not-prose">
          <NuxtLink to="/glossary"
            class="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-sky-600 transition-colors">
            <UIcon name="i-heroicons-arrow-left" /> {{ t.back }}
          </NuxtLink>
          <button @click="copyLink"
            :class="['flex items-center gap-2 text-sm font-bold transition-colors', copied ? 'text-green-500' : 'text-gray-500 hover:text-sky-600']">
            <UIcon :name="copied ? 'i-heroicons-check' : 'i-heroicons-link'" />
            {{ copied ? t.copied : t.share }}
          </button>
        </div>
      </div>

      <!-- Table of Contents -->
      <theToc v-if="tocLinks.length && isTheory" :links="tocLinks" :activeID="activeID" :title="t.toc"
        @updateActiveID="handleTocClick"
        class="lg:w-auto lg:col-span-2 xl:col-span-3 xl:justify-self-start xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]" />
    </div>

    <!-- Presentation View -->
    <div v-if="term.presentation_path" :class="[{ 'active': !isTheory }, { 'inactive': isTheory }]"
      class="flex w-full lg:h-[calc(100dvh_-_var(--header-height)_-_5rem)] dark:bg-zinc-950 bg-gray-50 items-center justify-center h-[calc(100dvh_-_var(--header-height)_-_1.5rem)] lg:col-span-10 xl:col-span-9 view-transition">
      <div class="absolute top-4 left-4 z-50">
        <UButton icon="i-heroicons-chevron-left" variant="ghost" color="gray" @click="changeView('theory')">{{ t.theory }}</UButton>
      </div>
      <thePresentationView :presentationPath="term.presentation_path" :articleTitle="term.title" />
    </div>

    <!-- Lightbox Overlay -->
    <Transition name="fade">
      <div v-if="isLightboxOpen" class="lightbox-overlay" @click="closeLightbox">
        <div class="lightbox-content">
          <img :src="lightboxImage" class="lightbox-image" :class="{ 'is-zoomed': isZoomed }"
            @click.stop="toggleZoom" />
          <button class="lightbox-close" @click="closeLightbox">&times;</button>
        </div>
      </div>
    </Transition>

    <theScrollToTop @scrolled="resetToFirstHeading" />
  </div>

  <!-- Loading / Not Found -->
  <div v-else-if="pending" class="min-h-[60vh] flex items-center justify-center">
    <div class="w-12 h-12 border-4 border-gray-100 border-top-sky-500 rounded-full animate-spin"></div>
  </div>
  <div v-else class="text-center py-24">
    <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-rose-500 mb-4" />
    <h2 class="text-xl font-bold">{{ t.notFound }}</h2>
    <NuxtLink to="/glossary" class="mt-4 inline-block text-sky-600 font-bold hover:underline">{{ t.back }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, computed, watch, nextTick, onMounted } from 'vue'
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
const route = useRoute()
const slug = route.params.slug as string

const uiDict: Record<string, any> = {
  en: {
    back: 'Back to Glossary',
    share: 'Share',
    copied: 'Link copied',
    theory: 'Back to text',
    presentation: 'Open Presentation',
    notFound: 'Term not found',
    noContent: 'No content available',
    toc: 'Contents',
    glossary: 'GLOSSARY'
  },
  ru: {
    back: 'Назад в глоссарий',
    share: 'Поделиться',
    copied: 'Ссылка скопирована',
    theory: 'Вернуться к тексту',
    presentation: 'Открыть презентацию',
    notFound: 'Термин не найден',
    noContent: 'Контент отсутствует',
    toc: 'Содержание',
    glossary: 'ГЛОССАРИЙ'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

// Declared placeholders before await to avoid ReferenceError in template during suspension
const termData = ref<any | null>(null)
const pending = ref(true)
const error = ref<any>(null)

const term = computed(() => termData.value)
const isTheory = ref(true)
const activeID = ref('')
const contentHtml = computed(() => term.value?.article_html || term.value?.definition || '')

const refresh = async () => {
  pending.value = true
  try {
    const res = await $fetch<any>(`/api/terms/${slug}`, {
      params: { lang: langStore.currentLang }
    })
    termData.value = res
  } catch (e) {
    error.value = e
  } finally {
    pending.value = false
  }
}

// Initial Fetch
const initialData = await $fetch<any>(`/api/terms/${slug}`, {
  params: { lang: langStore.currentLang }
}).catch(e => {
  error.value = e
  return null
})

termData.value = initialData
pending.value = false

if (error.value && !termData.value) {
  throw createError({
    statusCode: error.value.statusCode || 404,
    statusMessage: 'Термин не найден',
    fatal: true,
  })
}

useSeoMeta({
  title: computed(() => term.value?.title ? `${term.value.title} — Gativus Wiki` : 'Термин — Gativus Wiki'),
  ogTitle: computed(() => term.value?.title),
  description: computed(() => term.value?.definition || ''),
  ogDescription: computed(() => term.value?.definition || ''),
  ogImage: computed(() => term.value?.image_url || '/logo.svg'),
  twitterCard: 'summary_large_image',
})

watch(() => langStore.currentLang, () => {
  refresh()
})

// ─── TOC generation (Tree as expected by theToc) ───

interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

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
  const s = transliterate(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || Math.random().toString(36).substring(2, 7)
}

const tocLinks = computed<TocLink[]>(() => {
  const html = term.value?.article_html || ''
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

// ─── Scroling & Interactivity ───

let isFirstObsCall = true
let isScrollingManually = false
let scrollTimeout: NodeJS.Timeout

const handleTocClick = (id: string) => {
  activeID.value = id
  isScrollingManually = true
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(() => { isScrollingManually = false }, 1000)
}

const resetToFirstHeading = () => {
  const first = tocLinks.value?.[0]; if (!first) return
  activeID.value = first.id
  isScrollingManually = true
  clearTimeout(scrollTimeout)
  scrollTimeout = setTimeout(() => { isScrollingManually = false }, 1000)
}

const updateHeadingsAndObserve = () => {
  if (!process.client) return
  nextTick(() => {
    const container = document.querySelector('.parent')
    if (container) {
      const headings = container.querySelectorAll('h2, h3, h4, h5')
      headings.forEach((h) => { if (!h.id) h.id = generateId(h.textContent || '') })
      const filtered = Array.from(headings).filter(el => el.id !== '')
      if (obs.value) obs.value.disconnect()
      obs.value = observe(filtered)
    }
  })
}

const observe = (elements: Element[]) => {
  const callback: IntersectionObserverCallback = (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && entry.boundingClientRect.y > 0 && !isFirstObsCall) {
        let idx = elements.indexOf(entry.target)
        if (idx > 0 && !isScrollingManually) activeID.value = elements[idx - 1].id
      }
      if (entry.isIntersecting && entry.target.id && !isScrollingManually) {
        activeID.value = entry.target.id
      }
    })
    isFirstObsCall = false
  }
  const observer = new IntersectionObserver(callback, { root: null, rootMargin: '0px 0px -80% 0px' })
  elements.forEach(el => observer.observe(el))
  return observer
}

const obs = ref<IntersectionObserver>()
const currentPosition = ref<number>(0)

const changeView = (name: string) => {
  if (name === 'quiz') isTheory.value = false
  else isTheory.value = true

  if (isTheory.value && currentPosition.value) {
    nextTick(() => { window.scrollTo({ top: currentPosition.value }) })
  } else {
    window.scrollTo({ top: 0 })
  }
}

// ─── Lightbox ───
const isLightboxOpen = ref(false)
const isZoomed = ref(false)
const lightboxImage = ref('')
const handleArticleClick = (e: MouseEvent) => {
  const t = e.target as HTMLElement
  if (t.tagName === 'IMG') {
    lightboxImage.value = (t as HTMLImageElement).src
    isLightboxOpen.value = true
    isZoomed.value = false
    document.body.style.overflow = 'hidden'
  }
}
const toggleZoom = () => { isZoomed.value = !isZoomed.value }
const closeLightbox = () => { isLightboxOpen.value = false; document.body.style.overflow = '' }

// ─── Term Media ───
const handleMediaClick = (url: string) => {
  lightboxImage.value = url
  isLightboxOpen.value = true
  isZoomed.value = false
  document.body.style.overflow = 'hidden'
}

// ─── Others ───
const copied = ref(false)
async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

watch(() => term.value?.article_html, updateHeadingsAndObserve, { immediate: true })

onMounted(() => {
  window.addEventListener('scroll', () => { if (isTheory.value) currentPosition.value = window.scrollY })
  window.addEventListener('keydown', (e) => e.key === 'Escape' && isLightboxOpen.value && closeLightbox())
  updateHeadingsAndObserve()
})
onUnmounted(() => { if (obs.value) obs.value.disconnect() })

</script>

<style scoped>
.view-transition {
  transition: opacity 0.7s cubic-bezier(0.705, 0.01, 0, 0.915);
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-image {
  max-width: 100%;
  max-height: 90vh;
  border-radius: 8px;
  cursor: zoom-in;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lightbox-image.is-zoomed {
  transform: scale(1.5);
  cursor: zoom-out;
}

.lightbox-close {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 24px;
  cursor: pointer;
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
