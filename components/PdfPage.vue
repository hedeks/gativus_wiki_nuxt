<template>
  <div class="pdf-page-wrapper">
    <div
      class="relative transition-opacity duration-300"
      :style="wrapperStyle"
    >
      <canvas
        ref="canvas"
        class="bg-white"
        :style="canvasStyle"
      ></canvas>
    </div>
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

// Base dimensions at current rendered scale
const renderedScale = ref(Math.max(0.1, props.scale || 1.0))
const baseWidth = ref(0)
const baseHeight = ref(0)
let activeRenderTask: any = null

// CSS scaling to fill the gap between high-res renders
const canvasStyle = computed(() => {
  const targetScale = Math.max(0.1, props.scale || 1.0)
  const s = renderedScale.value > 0 ? targetScale / renderedScale.value : 1
  return {
    transform: s !== 1 ? `scale(${s})` : undefined,
    transformOrigin: 'top left',
    opacity: loading.value ? 0.85 : 1,
    display: 'block'
  }
})

// Ensure the wrapper expands with the scale to keep scroll limits correct
const wrapperStyle = computed(() => {
  const targetScale = Math.max(0.1, props.scale || 1.0)
  const s = renderedScale.value > 0 ? targetScale / renderedScale.value : 1
  const w = baseWidth.value > 0 ? Math.floor(baseWidth.value * s) : undefined
  const h = baseHeight.value > 0 ? Math.floor(baseHeight.value * s) : undefined
  return {
    width: w ? `${w}px` : 'auto',
    height: h ? `${h}px` : 'auto',
    minWidth: '100px',
    minHeight: '100px',
    position: 'relative' as const
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

// Debounced quality sync
let renderTimeout: any = null
watch(() => props.scale, () => {
  clearTimeout(renderTimeout)
  renderTimeout = setTimeout(async () => {
    await renderPage()
  }, 200)
})

// Re-render if doc or page number changes
watch(() => [props.pdfDoc, props.pageNum], async () => {
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

  // Cancel previous render task if still in progress
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

    let outputScale = Math.min(window.devicePixelRatio || 1, 2)
    const MAX_CANVAS_DIMENSION = 2048 // WebKit safe resolution ceiling
    
    // Scale viewport directly by target scale and device output scale
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

    if (canvas.value.width !== canvasWidth || canvas.value.height !== canvasHeight) {
      canvas.value.width = canvasWidth
      canvas.value.height = canvasHeight
    }
    
    // CSS display dimensions
    const displayWidth = Math.floor(scaledViewport.width / outputScale)
    const displayHeight = Math.floor(scaledViewport.height / outputScale)
    canvas.value.style.width = `${displayWidth}px`
    canvas.value.style.height = `${displayHeight}px`

    const ctx = canvas.value.getContext('2d', { alpha: false }) || canvas.value.getContext('2d')
    if (!ctx) return

    // Fill with white background before rendering PDF elements
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const renderContext = {
      canvasContext: ctx,
      viewport: scaledViewport,
      background: 'rgb(255,255,255)'
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
