<template>
  <div
    class="flex flex-col p-3 lg:p-10 flex-wrap-reverse lg:grid lg:grid-cols-10 lg:flex-nowrap gap-10 prose max-w-none prose-pre:text-black dark:prose-pre:text-white xl:prose-lg md:prose-md prose-sky dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-zinc-800 dark:prose-pre:bg-zinc-900 prose-h1:font-semibold"
    v-if="term"
  >
    <theLeftQuizSelector
      @changeView="changeView"
      :is-theory="isTheory"
      :quiz-title="term.title"
      :has-presentation="hasPresentation"
      class="lg:col-span-2 xl:col-span-2 lg:sticky top-[--header-height] xl:justify-self-end xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
    />

    <div
      :class="[{ active: !hasPresentation || isTheory, inactive: hasPresentation && !isTheory }]"
      ref="contentArea"
      class="flex flex-col-reverse lg:grid lg:grid-cols-8 xl:grid-cols-8 gap-10 w-full lg:col-span-8 xl:col-span-8 view-transition"
    >
      <div
        class="w-full max-w-[1040px] 2xl:max-w-[1140px] mx-auto lg:col-span-6 xl:col-span-6 flex-col min-w-0 overflow-x-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 lg:p-10 p-5 rounded-2xl shadow-sm"
      >

        <!-- Header Section -->
        <div class="flex flex-col pb-8 mb-10 border-b border-gray-100 dark:border-zinc-800">
          <TheBreadcrumbs :items="[
            { label: t.glossary, to: '/glossary' },
            { label: term.title }
          ]" />

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
        <div v-if="term.image_url || term.video_url"
          class="mb-10 rounded-2xl overflow-hidden shadow-soft border dark:border-zinc-800">
          <img v-if="term.image_url" :src="term.image_url"
            class="w-full h-auto object-cover max-h-[500px] cursor-zoom-in" @click="handleMediaClick(term.image_url)" />
          <video v-else-if="term.video_url" :src="term.video_url" class="w-full h-auto max-h-[500px]" controls
            playsinline />
        </div>

        <div v-if="contentHtml" class="parent w-full flex-col article-prose" v-html="contentHtml" @click="handleArticleClick" />
        <div v-else class="text-gray-400 py-10 text-center">
          {{ t.noContent }}
        </div>

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

        <!-- Actions -->
        <div class="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800 flex justify-between gap-4 not-prose term-footer-actions">
          <NuxtLink to="/glossary"
            class="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-sky-600 transition-colors">
            <UIcon name="i-heroicons-arrow-left" /> {{ t.back }}
          </NuxtLink>
          <GvButton
            type="button"
            unstyled
            chromeless
            :class="['flex items-center gap-2 text-sm font-bold transition-colors', copied ? 'text-green-500' : 'text-gray-500 hover:text-sky-600']"
            @click="copyLink"
          >
            <UIcon :name="copied ? 'i-heroicons-check' : 'i-heroicons-link'" />
            {{ copied ? t.copied : t.share }}
          </GvButton>
        </div>
      </div>

      <theToc
        v-if="tocLinks.length && isTheory"
        :links="tocLinks"
        :activeID="activeID"
        :title="t.toc"
        class="lg:w-auto lg:col-span-2 xl:col-span-2 xl:justify-self-start xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
        @updateActiveID="handleTocClick"
      />
    </div>

    <div
      v-if="hasPresentation"
      :class="[{ active: !isTheory }, { inactive: isTheory }]"
      class="lg:grid lg:grid-cols-8 xl:grid-cols-8 gap-10 w-full lg:col-span-8 xl:col-span-8 view-transition"
    >
      <div
        class="w-full max-w-[1040px] 2xl:max-w-[1140px] mx-auto lg:col-span-6 xl:col-span-6 h-[calc(100dvh_-_var(--header-height)_-_5rem)] flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden"
      >
        <thePresentationView :presentationPath="term.presentation_path" :articleTitle="term.title" />
      </div>

      <aside
        :class="[
          'flex flex-col z-30 transition-all duration-500 overflow-x-hidden',
          'lg:sticky lg:top-[--header-height] lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:h-fit lg:w-full lg:col-span-2 xl:col-span-2',
          'fixed top-[calc(var(--header-height)+0.75rem)] right-4 w-[240px] max-w-[85vw] sm:w-[320px] bg-transparent dark:bg-transparent border-0 shadow-none backdrop-blur-none py-3 pl-3 pr-5 lg:static lg:z-auto lg:max-w-none',
        ]"
        class="presentation-sidebar"
      >
        <div
          class="flex items-center justify-between cursor-pointer select-none px-3 py-1 lg:sticky lg:top-0 lg:z-20 lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none"
          @click="isPresSidebarOpen = !isPresSidebarOpen"
        >
          <p class="lg:text-sm text-[10px] tracking-widest font-bold text-black dark:text-white uppercase transition-all duration-500 mr-4 flex-shrink-0">
            {{ t.info }}
          </p>
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="!isDesktop && !isPresSidebarOpen" class="text-[9px] text-black dark:text-white/80 font-medium truncate min-w-0 max-w-[100px]">
              {{ t.mobileControls }}
            </span>
            <svg
              :class="{ 'rotate-180': isPresSidebarOpen }"
              class="w-3 h-3 text-gray-400 flex-shrink-0 transition-all duration-500 lg:hidden"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <Transition name="expand-pres">
          <div v-show="isDesktop || isPresSidebarOpen" class="flex flex-col gap-4 mt-4 lg:mt-2">
            <div class="flex flex-col gap-2 p-1">
              <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{{ term?.title }}</h3>

              <div class="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-3">
                <div class="flex items-center gap-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                  <UIcon name="i-heroicons-computer-desktop" class="w-4 h-4" />
                  {{ t.controls }}
                </div>
                <div class="grid grid-cols-1 gap-3 text-[11px]">
                  <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span class="text-gray-500 uppercase font-bold text-[9px]">{{ t.next }}</span>
                    <span class="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-sky-600 dark:text-sky-400 font-black">SPACE
                      / →</span>
                  </div>
                  <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span class="text-gray-500 uppercase font-bold text-[9px]">{{ t.backPres }}</span>
                    <span class="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-sky-600 dark:text-sky-400 font-black">←</span>
                  </div>
                  <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span class="text-gray-500 uppercase font-bold text-[9px]">{{ t.zoom }}</span>
                    <span class="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded text-sky-600 dark:text-sky-400 font-black">Wheel
                      / ±</span>
                  </div>
                </div>
              </div>

              <a
                v-if="term?.presentation_path"
                :href="`/api/uploads/${term.presentation_path}`"
                download
                class="mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-black dark:bg-white text-white dark:text-black hover:bg-sky-600 dark:hover:bg-sky-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95 not-prose"
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4" />
                {{ t.download }}
              </a>
            </div>
          </div>
        </Transition>
      </aside>
    </div>

    <!-- Lightbox Overlay -->
    <Transition name="fade">
      <div v-if="isLightboxOpen" class="lightbox-overlay" @click="closeLightbox">
        <div class="lightbox-content">
          <img :src="lightboxImage" class="lightbox-image" :class="{ 'is-zoomed': isZoomed }"
            @click.stop="toggleZoom" />
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

    <theScrollToTop @scrolled="resetToFirstHeading" />
  </div>

  <!-- Loading / Not Found -->
  <div v-else-if="pending" class="min-h-[60vh] flex items-center justify-center">
    <div class="w-12 h-12 border-4 border-gray-100 border-top-sky-500 rounded-full animate-spin"></div>
  </div>
  <div v-else class="text-center py-24">
    <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-rose-500 mb-4" />
    <h2 class="text-xl font-bold">{{ t.notFound }}</h2>
    <NuxtLink to="/glossary" class="mt-4 inline-block text-sky-600 font-bold">{{ t.back }}</NuxtLink>
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
    presentation: 'Go to Presentation',
    notFound: 'Term not found',
    noContent: 'No content available',
    toc: 'Contents',
    glossary: 'GLOSSARY',
    info: 'Info',
    mobileControls: 'Keys & PDF',
    controls: 'Controls',
    next: 'Next',
    backPres: 'Back',
    zoom: 'Zoom',
    download: 'Download Original',
  },
  ru: {
    back: 'Назад в глоссарий',
    share: 'Поделиться',
    copied: 'Ссылка скопирована',
    presentation: 'Перейти к презентации',
    notFound: 'Термин не найден',
    noContent: 'Контент отсутствует',
    toc: 'Содержание',
    glossary: 'ГЛОССАРИЙ',
    info: 'Инфо',
    mobileControls: 'Клавиши и PDF',
    controls: 'Управление',
    next: 'Далее',
    backPres: 'Назад',
    zoom: 'Масштаб',
    download: 'Скачать оригинал',
  },
  zh: {
    back: '返回词汇表',
    share: '分享',
    copied: '链接已复制',
    presentation: '打开演示',
    notFound: '未找到术语',
    noContent: '暂无内容',
    toc: '目录',
    glossary: '词汇表',
    info: '信息',
    mobileControls: '快捷键与 PDF',
    controls: '操作',
    next: '下一页',
    backPres: '返回',
    zoom: '缩放',
    download: '下载原文件',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

// Declared placeholders before await to avoid ReferenceError in template during suspension
const termData = ref<any | null>(null)
const pending = ref(true)
const error = ref<any>(null)

const term = computed(() => termData.value)
const isTheory = ref(true)
const activeID = ref('')
const hasPresentation = computed(() => !!term.value?.presentation_path)
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
  title: computed(() => term.value?.title ? `${term.value.title} — Gativus` : 'Термин — Gativus'),
  ogTitle: computed(() => term.value?.title),
  description: computed(() => term.value?.definition || ''),
  ogDescription: computed(() => term.value?.definition || ''),
  ogImage: computed(() => term.value?.image_url || '/favicon.ico'),
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
    const id = (match[2]?.trim() || generateId(text)).trim()
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

// ─── Scrolling & scroll-spy (same strategy as articles/[slug]) ───

let isScrollingManually = false
let scrollTimeout: ReturnType<typeof setTimeout>

const headingElements = ref<Element[]>([])

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
      headings.forEach((h) => {
        const el = h as HTMLElement
        if (el.id) el.id = el.id.trim()
        if (!el.id) el.id = generateId(h.textContent || '')
      })
      headingElements.value = Array.from(headings).filter(el => el.id !== '')
      scheduleScrollSpy()
    }
  })
}
const currentPosition = ref<number>()

const isPresSidebarOpen = ref(false)
const isDesktop = ref(true)

const checkSize = () => {
  isDesktop.value = window.innerWidth >= 1024
  scheduleScrollSpy()
}

const changeView = (name: string) => {
  if (name === 'quiz') {
    currentPosition.value = window.scrollY
    isTheory.value = false
    nextTick(() => {
      window.scrollTo({ top: 0 })
    })
  } else {
    isTheory.value = true
    if (currentPosition.value != null) {
      nextTick(() => {
        window.scrollTo({ top: currentPosition.value! })
        scheduleScrollSpy()
      })
    }
    else {
      nextTick(() => scheduleScrollSpy())
    }
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
const closeLightbox = () => {
  isLightboxOpen.value = false
  isZoomed.value = false
  document.body.style.overflow = ''
}

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
  checkSize()
  window.addEventListener('resize', checkSize)
  window.addEventListener('scroll', () => {
    if (isTheory.value) {
      currentPosition.value = window.scrollY
      scheduleScrollSpy()
    }
  }, { passive: true })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isLightboxOpen.value) closeLightbox()
  })
  updateHeadingsAndObserve()
})
onUnmounted(() => {
  if (scrollSpyRaf != null) {
    cancelAnimationFrame(scrollSpyRaf)
    scrollSpyRaf = null
  }
  window.removeEventListener('resize', checkSize)
})

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

.expand-pres-enter-active,
.expand-pres-leave-active {
  transition: max-height 0.3s cubic-bezier(0.705, 0.01, 0, 0.915), opacity 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
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

.term-footer-actions :deep(.gv-btn__label) {
  display: contents;
}

:deep(.lightbox-close .gv-btn__label) {
  display: contents;
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

:deep(.lightbox-close) {
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
