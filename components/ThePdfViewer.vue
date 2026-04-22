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
      <UButton icon="i-heroicons-plus" size="sm" color="sky" variant="soft"
        class="rounded-full shadow-md backdrop-blur-md bg-white/50 dark:bg-zinc-900/50" @click="zoomIn" />
      <div
        class="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-1 py-0.5 rounded text-[10px] font-black text-center shadow-sm border border-gray-100 dark:border-zinc-800">
        {{ Math.round(scale * 100) }}%
      </div>
      <UButton icon="i-heroicons-minus" size="sm" color="sky" variant="soft"
        class="rounded-full shadow-md backdrop-blur-md bg-white/50 dark:bg-zinc-900/50" @click="zoomOut" />
      <UButton :icon="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" size="sm"
        color="rose" variant="soft"
        class="rounded-full shadow-md backdrop-blur-md bg-rose-50/50 dark:bg-rose-900/20 mt-2"
        @click="toggleFullscreen" />
      <UButton icon="i-heroicons-arrow-path" size="xs" color="gray" variant="ghost"
        class="rounded-full opacity-50 hover:opacity-100" @click="resetZoom" />
    </div>

    <!-- Main View Area (Panning Container) -->
    <div class="w-full flex-1 relative overflow-hidden h-full p-4 transition-all duration-300 flex" ref="container"
      :class="{ 'cursor-grab': scale > 1 && !isDragging, 'cursor-grabbing': isDragging }" @mousedown="startDragging"
      @mousemove="onDragging" @mouseup="stopDragging" @mouseleave="stopDragging" @wheel.prevent="handleWheel">
      <!-- Center Wrapper: margin auto centers it when smaller than container, scroll works when larger -->
      <div class="m-auto relative flex items-center justify-center">
        <div v-for="p in visiblePages" :key="p"
          class="page-container transition-all ease-[cubic-bezier(0.705,0.010,0.000,0.915)] duration-700 flex items-center justify-center pointer-events-none"
          :class="[
            { 'active-page relative z-10': pageNum === p },
            { 'inactive-page absolute z-0': pageNum !== p },
            { 'translate-y-[150px] scale-[1.15] opacity-0 blur-lg': pageNum < p },
            { 'translate-y-[-150px] scale-[0.85] opacity-0 blur-lg': pageNum > p },
            { 'opacity-100 blur-0 translate-y-0': pageNum === p }
          ]">
          <PdfPage :pdfDoc="pdfDoc" :pageNum="p" :scale="scale" class="shadow-2xl rounded-lg pointer-events-auto" />
        </div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-zinc-950/50 backdrop-blur-sm z-30">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-sky-600 animate-spin" />
      </div>
    </div>

    <!-- Floating Navigation Bar (Overlay) - MINIMIZED -->
    <div
      class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 dark:bg-black/5 backdrop-blur-md border border-white/10 dark:border-white/5 shadow-xl z-40 transition-all duration-500 opacity-40 hover:opacity-100 hover:bg-white/20 dark:hover:bg-black/20">
      <UButton v-if="pageNum > 1" size="md" icon="i-heroicons-chevron-left" color="sky" variant="ghost"
        class="hover:bg-sky-500/10 rounded-lg" @click="prevPage" />
      <div v-else class="w-8"></div>

      <div class="h-4 w-[1px] bg-white/10"></div>

      <UButton v-if="numPages > 0" size="md" icon="i-heroicons-chevron-right" color="sky" variant="ghost"
        class="hover:bg-sky-500/10 rounded-lg" @click="nextPage" />
      <div v-else class="w-8"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
let pdfjsLib: any = null
import PdfPage from './PdfPage.vue'

const props = defineProps<{
  src: string
}>()

const viewerRoot = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
const pdfDoc = shallowRef<any>(null)
const pageNum = ref(1)
const numPages = ref(0)
const scale = ref(1.0)
const loading = ref(true)
const isFullscreen = ref(false)

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

// Panning (Drag to Scroll)
const isDragging = ref(false)
let startX = 0
let startY = 0
let initialScrollLeft = 0
let initialScrollTop = 0

const startDragging = (e: MouseEvent) => {
  if (scale.value <= 1) return
  isDragging.value = true
  // We use client coordinates to be more stable
  startX = e.clientX
  startY = e.clientY
  initialScrollLeft = container.value?.scrollLeft || 0
  initialScrollTop = container.value?.scrollTop || 0
}

const onDragging = (e: MouseEvent) => {
  if (!isDragging.value || !container.value) return
  e.preventDefault()
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  container.value.scrollLeft = initialScrollLeft - dx
  container.value.scrollTop = initialScrollTop - dy
}

const stopDragging = () => {
  isDragging.value = false
}

// Scroll to Zoom with Smart Navigation
const handleWheel = (e: WheelEvent) => {
  const zoomStep = 0.1
  const oldScale = scale.value
  let newScale = oldScale

  // Determine direction
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
      // Zoom In -> Target Mouse position relative to viewport content
      targetX = e.clientX - rect.left
      targetY = e.clientY - rect.top
    } else {
      // Zoom Out -> Target Center of Viewport
      targetX = rect.width / 2
      targetY = rect.height / 2
    }

    const scrollLeft = container.value.scrollLeft
    const scrollTop = container.value.scrollTop

    scale.value = newScale

    // Use nextTick and a slight timeout to ensure DOM has updated sizes
    nextTick(() => {
      if (container.value) {
        container.value.scrollLeft = (scrollLeft + targetX) * ratio - targetX
        container.value.scrollTop = (scrollTop + targetY) * ratio - targetY
      }
    })
  }
}

// Fullscreen
const toggleFullscreen = () => {
  if (!viewerRoot.value) return
  if (!document.fullscreenElement) {
    viewerRoot.value.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable fullscreen: ${err.message}`)
    })
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
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
const visiblePages = computed(() => {
  const pages = []
  if (pageNum.value > 1) pages.push(pageNum.value - 1)
  pages.push(pageNum.value)
  if (pageNum.value < numPages.value) pages.push(pageNum.value + 1)
  return pages
})

onMounted(async () => {
  if (process.client) {
    try {
      // Import the main library and worker URL
      const [pdfjsModule, pdfWorkerModule] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.mjs?url')
      ])

      // Handle both default and module namespace (important for production builds)
      const pdfjs = pdfjsModule.default || pdfjsModule
      const pdfWorker = pdfWorkerModule.default || pdfWorkerModule

      if (!pdfjs || !pdfjs.GlobalWorkerOptions) {
        throw new Error('GlobalWorkerOptions not found in pdfjs-dist')
      }

      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker as any
      pdfjsLib = pdfjs

      await loadPdf()
    } catch (err) {
      console.error('Failed to initialize PDF viewer:', err)
    }
  }

  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

watch(() => props.src, async () => {
  pageNum.value = 1
  await loadPdf()
})

const loadPdf = async () => {
  if (!props.src || !pdfjsLib) return
  loading.value = true
  try {
    const loadingTask = pdfjsLib.getDocument(props.src)
    pdfDoc.value = await loadingTask.promise
    numPages.value = pdfDoc.value.numPages
  } catch (error) {
    console.error('Error loading PDF:', error)
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
