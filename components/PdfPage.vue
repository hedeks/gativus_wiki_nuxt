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

const props = defineProps<{
  pdfDoc: any
  pageNum: number
  scale: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)

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
  await renderPage()
})

onBeforeUnmount(() => {
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

const renderPage = async () => {
  if (!props.pdfDoc || !canvas.value) return
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

    const viewport = page.getViewport({ scale: currentScale })
    if (viewport.width <= 0 || viewport.height <= 0) return

    const ctx = canvas.value.getContext('2d', { alpha: false }) || canvas.value.getContext('2d')
    if (!ctx) return

    let outputScale = Math.min(window.devicePixelRatio || 1, 2)
    const MAX_CANVAS_DIMENSION = 2048 // WebKit safe resolution ceiling
    
    if (viewport.width * outputScale > MAX_CANVAS_DIMENSION || viewport.height * outputScale > MAX_CANVAS_DIMENSION) {
      const scaleDownWidth = MAX_CANVAS_DIMENSION / viewport.width
      const scaleDownHeight = MAX_CANVAS_DIMENSION / viewport.height
      outputScale = Math.min(outputScale, scaleDownWidth, scaleDownHeight)
    }

    const canvasWidth = Math.max(1, Math.floor(viewport.width * outputScale))
    const canvasHeight = Math.max(1, Math.floor(viewport.height * outputScale))

    if (canvas.value.width !== canvasWidth || canvas.value.height !== canvasHeight) {
      canvas.value.width = canvasWidth
      canvas.value.height = canvasHeight
    }
    canvas.value.style.width = Math.floor(viewport.width) + "px"
    canvas.value.style.height = Math.floor(viewport.height) + "px"

    // Fill with white background before rendering PDF elements
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null

    const renderContext = {
      canvasContext: ctx,
      transform,
      viewport: viewport,
      background: 'rgb(255,255,255)'
    }
    
    activeRenderTask = page.render(renderContext)
    await activeRenderTask.promise
    activeRenderTask = null

    renderedScale.value = currentScale
    baseWidth.value = viewport.width
    baseHeight.value = viewport.height
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
