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

// CSS scaling to fill the gap between high-res renders
const canvasStyle = computed(() => {
  const s = props.scale / renderedScale.value
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
  const s = props.scale / renderedScale.value
  return {
    width: Math.floor(baseWidth.value * s) + 'px',
    height: Math.floor(baseHeight.value * s) + 'px',
    position: 'relative' as const
  }
})

onMounted(async () => {
  await renderPage()
})

// Debounced quality sync
let renderTimeout: NodeJS.Timeout
watch(() => props.scale, (newScale) => {
  // If the difference is huge (e.g. 50%), render immediately or more frequently
  const diff = Math.abs(newScale - renderedScale.value)
  
  clearTimeout(renderTimeout)
  
  // High quality sync after zoom settles
  renderTimeout = setTimeout(async () => {
    await renderPage()
  }, 250)
})

// Re-render if doc or page number changes
watch(() => [props.pdfDoc, props.pageNum], async () => {
  await renderPage()
}, { deep: true })

const renderPage = async () => {
  if (!props.pdfDoc || !canvas.value) return
  
  loading.value = true
  try {
    const page = await props.pdfDoc.getPage(props.pageNum)
    const currentScale = props.scale
    const viewport = page.getViewport({ scale: currentScale })
    
    const ctx = canvas.value.getContext('2d', { alpha: false })
    if (!ctx) return

    const outputScale = window.devicePixelRatio || 1
    canvas.value.width = Math.floor(viewport.width * outputScale)
    canvas.value.height = Math.floor(viewport.height * outputScale)
    canvas.value.style.width = Math.floor(viewport.width) + "px"
    canvas.value.style.height = Math.floor(viewport.height) + "px"

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null

    const renderContext = {
      canvasContext: ctx,
      transform,
      viewport: viewport
    }
    
    await page.render(renderContext).promise
    renderedScale.value = currentScale
    baseWidth.value = viewport.width
    baseHeight.value = viewport.height
  } catch (error) {
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
  /* Use a fixed container but allow content to overflow during CSS scale */
  overflow: visible;
}
</style>
