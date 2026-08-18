<template>
  <div class="pdf-page-wrapper flex items-center justify-center">
    <canvas
      ref="canvas"
      class="bg-white shadow-xl rounded-sm"
      :style="canvasStyle"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  pdfDoc: any
  pageNum: number
  scale: number
  isActive?: boolean
}>(), {
  isActive: true
})

const canvas = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const isRendered = ref(false)
let observer: IntersectionObserver | null = null

// Base layout dimensions (in CSS pixels)
const renderedScale = ref(Math.max(0.1, props.scale || 1.0))
const baseWidth = ref(0)
const baseHeight = ref(0)
let activeRenderTask: any = null

const canvasStyle = computed(() => {
  if (baseWidth.value <= 0 || baseHeight.value <= 0) {
    return {
      minWidth: '100px',
      minHeight: '100px',
      display: 'block'
    }
  }
  return {
    width: `${baseWidth.value}px`,
    height: `${baseHeight.value}px`,
    display: 'block'
  }
})

onMounted(async () => {
  if (props.isActive) {
    await renderPage()
  }
  if (typeof IntersectionObserver !== 'undefined' && canvas.value) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && (!isRendered.value || baseWidth.value === 0)) {
          renderPage()
        }
      }
    }, { threshold: 0.01 })
    observer.observe(canvas.value)
  }
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (activeRenderTask) {
    try {
      activeRenderTask.cancel()
    } catch {}
    activeRenderTask = null
  }
  if (renderTimeout) {
    clearTimeout(renderTimeout)
    renderTimeout = null
  }
})

// Debounced quality sync on zoom change
let renderTimeout: any = null
watch(() => props.scale, () => {
  clearTimeout(renderTimeout)
  renderTimeout = setTimeout(async () => {
    await renderPage()
  }, 150)
})

// Re-render if doc or page number changes
watch(() => [props.pdfDoc, props.pageNum], async () => {
  isRendered.value = false
  await renderPage()
}, { deep: true })

watch(() => props.isActive, async (active) => {
  if (active && (!isRendered.value || baseWidth.value === 0)) {
    await renderPage()
  }
})

const renderPage = async () => {
  if (!props.pdfDoc || !canvas.value) return
  if (props.isActive === false) return

  const currentScale = Math.max(0.1, props.scale || 1.0)
  if (isNaN(currentScale) || currentScale <= 0) return

  if (activeRenderTask) {
    try {
      activeRenderTask.cancel()
    } catch {}
    activeRenderTask = null
  }

  loading.value = true
  try {
    const page = await props.pdfDoc.getPage(props.pageNum)
    if (!canvas.value) return

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
    let outputScale = Math.min(dpr, 2)
    const MAX_CANVAS_DIMENSION = 2048 // Safe resolution limit for WebKit GPU memory

    let scaledViewport = page.getViewport({ scale: currentScale * outputScale })
    if (scaledViewport.width <= 0 || scaledViewport.height <= 0) return

    if (scaledViewport.width > MAX_CANVAS_DIMENSION || scaledViewport.height > MAX_CANVAS_DIMENSION) {
      const maxDim = Math.max(scaledViewport.width, scaledViewport.height)
      const downFactor = MAX_CANVAS_DIMENSION / maxDim
      outputScale = outputScale * downFactor
      scaledViewport = page.getViewport({ scale: currentScale * outputScale })
    }

    const canvasWidth = Math.max(1, Math.floor(scaledViewport.width))
    const canvasHeight = Math.max(1, Math.floor(scaledViewport.height))

    const displayWidth = Math.floor(scaledViewport.width / outputScale)
    const displayHeight = Math.floor(scaledViewport.height / outputScale)

    canvas.value.width = canvasWidth
    canvas.value.height = canvasHeight
    canvas.value.style.width = `${displayWidth}px`
    canvas.value.style.height = `${displayHeight}px`

    const ctx = canvas.value.getContext('2d')
    if (!ctx) return

    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport
    }

    activeRenderTask = page.render(renderContext)
    await activeRenderTask.promise
    activeRenderTask = null

    renderedScale.value = currentScale
    baseWidth.value = displayWidth
    baseHeight.value = displayHeight
    isRendered.value = true
  } catch (error: any) {
    if (error?.name === 'RenderingCancelledException' || error?.message?.includes('cancelled')) {
      return
    }
    console.error(`Error rendering page ${props.pageNum}:`, error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.pdf-page-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

canvas {
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>
