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
const renderedScale = ref(props.scale)
const baseWidth = ref(0)
const baseHeight = ref(0)
let activeRenderTask: any = null

// CSS scaling to fill the gap between high-res renders
const canvasStyle = computed(() => {
  const s = renderedScale.value > 0 ? props.scale / renderedScale.value : 1
  return {
    transform: `scale(${s})`,
    transformOrigin: 'top left',
    opacity: loading.value ? 0.7 : 1,
    position: 'absolute' as const,
    top: 0,
    left: 0
  }
})

// Ensure the wrapper expands with the scale to keep scroll limits correct
const wrapperStyle = computed(() => {
  const s = renderedScale.value > 0 ? props.scale / renderedScale.value : 1
  return {
    width: Math.floor(baseWidth.value * s) + 'px',
    height: Math.floor(baseHeight.value * s) + 'px',
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
    const currentScale = props.scale
    const viewport = page.getViewport({ scale: currentScale })
    
    const ctx = canvas.value.getContext('2d')
    if (!ctx) return

    let outputScale = Math.min(window.devicePixelRatio || 1, 2)
    const MAX_CANVAS_DIMENSION = 2048 // WebKit safe resolution ceiling
    
    if (viewport.width * outputScale > MAX_CANVAS_DIMENSION || viewport.height * outputScale > MAX_CANVAS_DIMENSION) {
      const scaleDownWidth = MAX_CANVAS_DIMENSION / viewport.width
      const scaleDownHeight = MAX_CANVAS_DIMENSION / viewport.height
      outputScale = Math.min(outputScale, scaleDownWidth, scaleDownHeight)
    }

    const canvasWidth = Math.floor(viewport.width * outputScale)
    const canvasHeight = Math.floor(viewport.height * outputScale)

    canvas.value.width = canvasWidth
    canvas.value.height = canvasHeight
    canvas.value.style.width = Math.floor(viewport.width) + "px"
    canvas.value.style.height = Math.floor(viewport.height) + "px"

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null

    const renderContext = {
      canvasContext: ctx,
      transform,
      viewport: viewport
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
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  will-change: transform, opacity;
}
</style>
