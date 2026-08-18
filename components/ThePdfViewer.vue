<template>
  <div
    class="w-full h-full relative overflow-hidden bg-gray-50 dark:bg-zinc-950 flex flex-col items-center group/viewer"
    ref="viewerRoot" @keydown="handleKeyDown" tabindex="0">
    <!-- Top Page Pill (Floating) - MINIMIZED -->
    <div v-if="numPages > 0"
      class="absolute top-5 z-20 flex justify-center items-center px-3 py-1.5 rounded-full h-fit bg-sky-600/80 backdrop-blur-md text-white shadow-lg transition-all duration-300 hover:scale-105 opacity-60 hover:opacity-100">
      <div class="flex items-center gap-1">
        <div class="relative flex items-center group">
          <input v-model.number="jumpPage" type="number" min="1" :max="numPages"
            class="w-10 bg-white/20 border-none text-center rounded-md font-bold text-xs focus:ring-1 focus:ring-white/50 outline-none p-0 transition-all"
            @input="handleJumpInput" />
        </div>
        <span class="opacity-70 text-xs">/</span>
        <span class="font-bold text-xs mr-1">{{ numPages }}</span>
      </div>
    </div>

    <!-- Right Control Panel (Zoom & Fullscreen) - MINIMIZED -->
    <div
      class="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 opacity-50 hover:opacity-100 transition-opacity">
      <GvButton icon="i-heroicons-plus" size="sm" color="sky" variant="soft"
        class="rounded-full shadow-md backdrop-blur-md bg-white/50 dark:bg-zinc-900/50" @click="zoomIn" />
      <div
        class="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-1 py-0.5 rounded text-[10px] font-black text-center shadow-sm border border-gray-100 dark:border-zinc-800">
        {{ Math.round(scale * 100) }}%
      </div>
      <GvButton icon="i-heroicons-minus" size="sm" color="sky" variant="soft"
        class="rounded-full shadow-md backdrop-blur-md bg-white/50 dark:bg-zinc-900/50" @click="zoomOut" />
      <GvButton :icon="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" size="sm"
        color="rose" variant="soft"
        class="rounded-full shadow-md backdrop-blur-md bg-rose-50/50 dark:bg-rose-900/20 mt-2"
        @click="toggleFullscreen" />
      <GvButton icon="i-heroicons-arrow-path" size="xs" color="gray" variant="ghost"
        class="rounded-full opacity-50 hover:opacity-100" @click="resetZoom" />
    </div>

    <!-- Main View Area (Panning Container) -->
    <div class="w-full flex-1 relative overflow-hidden h-full p-4 transition-all duration-300 flex" ref="container"
      style="touch-action: none;"
      :class="{ 'cursor-grab': scale > 1 && !isDragging, 'cursor-grabbing': isDragging }" 
      @mousedown="startDragging" @mousemove="onDragging" @mouseup="stopDragging" @mouseleave="stopDragging" 
      @touchstart="startDragging" @touchend="stopDragging" @touchcancel="stopDragging">
      <!-- Center Wrapper: margin auto centers it when smaller than container, scroll works when larger -->
      <div class="m-auto relative flex items-center justify-center">
        <div v-for="p in visiblePages" :key="p"
          class="page-container transition-all ease-[cubic-bezier(0.705,0.010,0.000,0.915)] duration-500 flex items-center justify-center pointer-events-none"
          :class="[
            { 'active-page relative z-10': pageNum === p },
            { 'inactive-page absolute z-0': pageNum !== p },
            { 'translate-y-[80px] scale-[0.96] opacity-0': pageNum < p },
            { 'translate-y-[-80px] scale-[0.96] opacity-0': pageNum > p },
            { 'opacity-100 translate-y-0': pageNum === p }
          ]">
          <PdfPage :pdfDoc="pdfDoc" :pageNum="p" :scale="Math.max(0.1, scale * baseScale)" :is-active="isActive" class="shadow-2xl rounded-lg pointer-events-auto" />
        </div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950/50 backdrop-blur-sm z-30">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-sky-600 animate-spin" />
      </div>

      <!-- Error / Fallback Overlay -->
      <div v-if="error && !pdfDoc"
        class="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 z-40 p-10 text-center">
        <div class="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-6">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-rose-500" />
        </div>
        <h3 class="text-xl font-bold mb-2">Не удалось загрузить PDF</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Возможно, ваш браузер или сервер блокирует компоненты рендеринга. Попробуйте переключиться на встроенный просмотрщик.
        </p>
        <div class="flex gap-4">
          <GvButton label="Встроенный просмотрщик" color="sky" variant="solid" icon="i-heroicons-window" @click="useNativeViewer = true" />
          <GvButton label="Повторить" color="gray" variant="ghost" icon="i-heroicons-arrow-path" @click="initViewer" />
        </div>
      </div>

      <!-- Native Fallback (iOS: object tag; others: iframe) -->
      <template v-if="useNativeViewer">
        <object
          v-if="isIosBrowser()"
          :data="src"
          type="application/pdf"
          class="absolute inset-0 w-full h-full border-none z-10 bg-white"
        >
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-zinc-950 p-8 text-center">
            <UIcon name="i-heroicons-document" class="w-12 h-12 text-sky-500" />
            <p class="text-gray-600 dark:text-gray-400">Ваш браузер не поддерживает встроенный просмотр PDF.</p>
            <a :href="src" target="_blank" rel="noopener" class="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold text-sm hover:bg-sky-700 transition-colors">
              Открыть PDF
            </a>
          </div>
        </object>
        <iframe v-else :src="src" class="absolute inset-0 w-full h-full border-none z-10 bg-white" />
      </template>
    </div>

    <!-- Floating Navigation Bar (Overlay) - MINIMIZED -->
    <div
      class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-xl z-40 transition-all duration-500 opacity-40 hover:opacity-100 hover:bg-white/20 dark:hover:bg-black/20">
      <GvButton v-if="pageNum > 1" size="md" icon="i-heroicons-chevron-left" color="sky" variant="ghost"
        class="hover:bg-sky-500/10 rounded-lg" @click="prevPage" />
      <div v-else class="w-8"></div>

      <div class="h-4 w-[1px] bg-white/10"></div>

      <GvButton v-if="numPages > 0" size="md" icon="i-heroicons-chevron-right" color="sky" variant="ghost"
        class="hover:bg-sky-500/10 rounded-lg" @click="nextPage" />
      <div v-else class="w-8"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

let pdfjsLib: any = null
import PdfPage from './PdfPage.vue'

const props = withDefaults(defineProps<{
  src: string
  isActive?: boolean
}>(), {
  isActive: true
})

const viewerRoot = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
const pdfDoc = shallowRef<any>(null)
const pageNum = ref(1)
const numPages = ref(0)
const scale = ref(1.0)
const baseScale = ref(1.0)
const loading = ref(true)
const isFullscreen = ref(false)
const error = ref(false)
const useNativeViewer = ref(false)
let resizeObserver: ResizeObserver | null = null

// Page Jump Logic
const jumpPage = ref(1)
let jumpTimeout: any = null

watch(pageNum, (newVal) => {
  jumpPage.value = newVal
})

const handleJumpInput = () => {
  clearTimeout(jumpTimeout)
  jumpTimeout = setTimeout(() => {
    doJump()
  }, 300)
}

const doJump = () => {
  if (!jumpPage.value) {
    jumpPage.value = pageNum.value
    return
  }
  if (jumpPage.value >= 1 && jumpPage.value <= numPages.value && jumpPage.value !== pageNum.value) {
    navQueue.value = []
    pageNum.value = jumpPage.value
  } else {
    jumpPage.value = pageNum.value
  }
}

// Navigation Queue
const navQueue = ref<('next' | 'prev')[]>([])
const isTransitioning = ref(false)

const triggerNav = (direction: 'next' | 'prev') => {
  if (navQueue.value.length >= 3) return
  navQueue.value.push(direction)
  processQueue()
}

const processQueue = () => {
  if (isTransitioning.value || navQueue.value.length === 0) return
  const direction = navQueue.value.shift()
  if (!direction) return
  if (direction === 'next' && pageNum.value >= numPages.value) { processQueue(); return }
  if (direction === 'prev' && pageNum.value <= 1) { processQueue(); return }

  isTransitioning.value = true
  if (direction === 'next') pageNum.value++
  else pageNum.value--

  setTimeout(() => {
    isTransitioning.value = false
    processQueue()
  }, 750)
}

const nextPage = () => triggerNav('next')
const prevPage = () => triggerNav('prev')

// Touch and Panning state
const isDragging = ref(false)
let startX = 0
let startY = 0
let initialScrollLeft = 0
let initialScrollTop = 0
let initialPinchDistance = 0
let initialScale = 1.0
let swipeStartX = 0
const SWIPE_THRESHOLD = 50

const getClientX = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
const getClientY = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

const getPinchDistance = (e: TouchEvent) => {
  if (e.touches.length < 2) return 0
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

const startDragging = (e: MouseEvent | TouchEvent) => {
  if ('touches' in e && e.touches.length === 2) {
    initialPinchDistance = getPinchDistance(e)
    initialScale = scale.value
    isDragging.value = false
    return
  }

  startX = getClientX(e)
  startY = getClientY(e)

  if (scale.value <= 1) {
    if ('touches' in e && e.touches.length === 1) {
      swipeStartX = startX
    }
    return
  }
  
  isDragging.value = true
  initialScrollLeft = container.value?.scrollLeft || 0
  initialScrollTop = container.value?.scrollTop || 0
}

const onDragging = (e: MouseEvent | TouchEvent) => {
  if ('touches' in e && e.touches.length === 2) {
    if (e.cancelable) e.preventDefault()
    const currentDistance = getPinchDistance(e)
    if (initialPinchDistance > 0) {
      const ratio = currentDistance / initialPinchDistance
      let newScale = initialScale * ratio
      if (newScale < 0.2) newScale = 0.2
      if (newScale > 6.0) newScale = 6.0
      scale.value = newScale
    }
    return
  }

  if (!isDragging.value || !container.value) return
  if (e.cancelable) e.preventDefault()
  
  const dx = getClientX(e) - startX
  const dy = getClientY(e) - startY
  container.value.scrollLeft = initialScrollLeft - dx
  container.value.scrollTop = initialScrollTop - dy
}

const stopDragging = (e: MouseEvent | TouchEvent) => {
  if (scale.value <= 1 && 'changedTouches' in e && swipeStartX > 0) {
    const swipeEndX = e.changedTouches[0].clientX
    const dx = swipeStartX - swipeEndX
    if (dx > SWIPE_THRESHOLD) {
      nextPage()
    } else if (dx < -SWIPE_THRESHOLD) {
      prevPage()
    }
  }
  
  swipeStartX = 0
  isDragging.value = false
  initialPinchDistance = 0
}

// Scroll to Zoom with Smart Navigation
let wheelTimeout: any = null
const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const zoomStep = 0.1
    const oldScale = scale.value
    let newScale = oldScale

    const isZoomIn = e.deltaY < 0
    if (isZoomIn) {
      if (oldScale < 6.0) newScale = oldScale + zoomStep
    } else {
      if (oldScale > 0.2) newScale = oldScale - zoomStep
    }

    if (newScale !== oldScale && container.value) {
      const ratio = newScale / oldScale
      const rect = container.value.getBoundingClientRect()
      
      let targetX, targetY
      if (isZoomIn) {
        targetX = e.clientX - rect.left
        targetY = e.clientY - rect.top
      } else {
        targetX = rect.width / 2
        targetY = rect.height / 2
      }

      const scrollLeft = container.value.scrollLeft
      const scrollTop = container.value.scrollTop
      scale.value = newScale

      nextTick(() => {
        if (container.value) {
          container.value.scrollLeft = (scrollLeft + targetX) * ratio - targetX
          container.value.scrollTop = (scrollTop + targetY) * ratio - targetY
        }
      })
    }
  } else {
    // Not zooming, so pan or page turn
    if (scale.value > 1 && container.value) {
      e.preventDefault()
      container.value.scrollLeft += e.deltaX
      container.value.scrollTop += e.deltaY
    } else if (scale.value === 1) {
      // Turn pages on wheel if significant delta
      if (Math.abs(e.deltaY) > 20) {
        if (!wheelTimeout) {
          if (e.deltaY > 0) nextPage()
          else prevPage()
          
          wheelTimeout = setTimeout(() => {
            wheelTimeout = null
          }, 800)
        }
      }
    }
  }
}

// Fullscreen (with Safari webkit-prefix support)
function isFullscreenActive(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement
  )
}

const toggleFullscreen = () => {
  if (!viewerRoot.value) return
  if (!isFullscreenActive()) {
    const el = viewerRoot.value as any
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (req) {
      req.call(el).catch((err: Error) => {
        console.warn(`Fullscreen request failed: ${err.message}`)
      })
    }
    isFullscreen.value = true
  } else {
    const exit = (document as any).exitFullscreen || (document as any).webkitExitFullscreen
    if (exit) exit.call(document)
    isFullscreen.value = false
  }
}

// Keyboard Support
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault()
    nextPage()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prevPage()
  } else if (e.key === 'f') {
    toggleFullscreen()
  }
}

// Lifecycle & Data
const isIos = computed(() => isIosBrowser())

const visiblePages = computed(() => {
  // On iOS devices (Safari/WebKit), strictly render only the active page to avoid memory limits and canvas dropping
  if (isIos.value) {
    return [pageNum.value]
  }
  const pages = []
  if (pageNum.value > 1) pages.push(pageNum.value - 1)
  pages.push(pageNum.value)
  if (pageNum.value < numPages.value) pages.push(pageNum.value + 1)
  return pages
})

function isIosBrowser(): boolean {
  if (!import.meta.client) return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const updateBaseScale = async () => {
  if (!container.value || !pdfDoc.value) return
  const h = container.value.clientHeight
  const w = container.value.clientWidth
  // If container is hidden (e.g. parent has height 0 or display:none), wait for visibility
  if (h <= 50 || w <= 50) return

  try {
    const page = await pdfDoc.value.getPage(pageNum.value || 1)
    const vp = page.getViewport({ scale: 1.0 })
    const paddingY = 40
    const paddingX = isIos.value ? 16 : 40
    const availableHeight = Math.max(0, h - paddingY)
    const availableWidth = Math.max(0, w - paddingX)
    
    if (vp.height > 0 && vp.width > 0 && availableHeight > 50) {
      const scaleH = availableHeight / vp.height
      const scaleW = availableWidth > 0 ? availableWidth / vp.width : scaleH
      const fitScale = Math.min(scaleH, scaleW)
      if (fitScale > 0.05 && !isNaN(fitScale)) {
        baseScale.value = fitScale
      }
    }
  } catch (err) {
    console.warn('Failed to update baseScale:', err)
  }
}

const initViewer = async () => {
  if (!import.meta.client) return

  loading.value = true
  error.value = false
  try {
    const pdfjsModule = await import('pdfjs-dist')
    const pdfjs = pdfjsModule.default || pdfjsModule

    if (!pdfjs || !pdfjs.GlobalWorkerOptions) {
      throw new Error('GlobalWorkerOptions not found in pdfjs-dist')
    }

    pdfjs.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.js'
    pdfjsLib = pdfjs
    await loadPdf()
  } catch (err) {
    console.error('Failed to initialize PDF viewer:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function onFullscreenChange() {
  isFullscreen.value = isFullscreenActive()
}

onMounted(async () => {
  await initViewer()

  if (container.value) {
    container.value.addEventListener('wheel', handleWheel, { passive: false })
    container.value.addEventListener('touchmove', onDragging, { passive: false })
  }

  if (import.meta.client && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateBaseScale()
    })
    if (container.value) {
      resizeObserver.observe(container.value)
    }
  }

  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  if (container.value) {
    container.value.removeEventListener('wheel', handleWheel)
    container.value.removeEventListener('touchmove', onDragging)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
})

watch(() => props.isActive, async (active) => {
  if (active) {
    await nextTick()
    await updateBaseScale()
  }
})

watch(() => props.src, async () => {
  pageNum.value = 1
  await loadPdf()
})

watch(pageNum, async () => {
  if (isIos.value) {
    await updateBaseScale()
  }
})

const loadPdf = async () => {
  if (!props.src || !pdfjsLib) return
  loading.value = true
  error.value = false
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const cMapUrl = `${origin}/pdfjs/cmaps/`
    const standardFontDataUrl = `${origin}/pdfjs/standard_fonts/`

    // Загружаем документ со стандартными шрифтами и cMap для поддержки всех символов
    const loadingTask = pdfjsLib.getDocument({
      url: props.src,
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      enableXfa: false
    })
    pdfDoc.value = await loadingTask.promise
    numPages.value = pdfDoc.value.numPages
    
    await updateBaseScale()
  } catch (error) {
    console.error('Error loading PDF:', error)
    error.value = true
  } finally {
    loading.value = false
  }
}

const zoomIn = () => { scale.value += 0.25 }
const zoomOut = () => { if (scale.value > 0.5) scale.value -= 0.25 }
const resetZoom = () => { scale.value = 1.0 }
</script>

<style scoped>
.active-page {
  transform: scale(1.02);
  z-index: 10;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.cursor-grab {
  cursor: grab;
}

.cursor-grabbing {
  cursor: grabbing;
}
</style>
