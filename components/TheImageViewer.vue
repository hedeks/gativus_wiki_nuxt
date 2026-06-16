<template>
  <Teleport to="body">
    <Transition name="fade" @after-leave="onAfterLeave">
      <div
        v-if="visible"
        class="image-viewer-overlay"
        role="dialog"
        aria-modal="true"
        @click="handleOverlayClick"
        @keydown="handleKeyDown"
        tabindex="0"
        ref="overlayRef"
        :style="{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }"
      >
        <!-- Top Toolbar -->
        <div class="viewer-top-bar" @click.stop>
          <GvButton
            icon="i-heroicons-x-mark"
            size="md"
            color="white"
            variant="ghost"
            class="viewer-close-btn"
            aria-label="Close"
            @click="close"
          />
        </div>

        <!-- Main Content (Panning Area) -->
        <div
          class="viewer-content"
          ref="contentRef"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @wheel.prevent="onWheel"
          :class="{ 'cursor-grab': scale > 1 && !isDragging, 'cursor-grabbing': isDragging }"
        >
          <div
            class="image-wrapper"
            :style="wrapperStyle"
            @dblclick="toggleZoom"
          >
            <img
              ref="imgRef"
              :src="src"
              class="viewer-image"
              :class="{ 'is-zoomed': scale > 1 }"
              alt="Image preview"
              draggable="false"
            />
          </div>
        </div>

        <!-- Bottom Controls Toolbar -->
        <div class="viewer-bottom-bar" @click.stop>
          <div class="viewer-controls-glass">
            <GvButton
              icon="i-heroicons-minus"
              size="sm"
              color="white"
              variant="ghost"
              :disabled="scale <= 1"
              @click="zoomOut"
            />
            <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
            <GvButton
              icon="i-heroicons-plus"
              size="sm"
              color="white"
              variant="ghost"
              :disabled="scale >= 6"
              @click="zoomIn"
            />
            <div class="controls-divider"></div>
            <GvButton
              icon="i-heroicons-arrows-pointing-in"
              size="sm"
              color="white"
              variant="ghost"
              :disabled="scale === 1 && offsetX === 0 && offsetY === 0"
              @click="reset"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  src: string
  visible: boolean
}>()

const emit = defineEmits(['close'])

const overlayRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

// Position & Zoom state
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)

// Swipe to close states (mobile)
const swipeY = ref(0)
const isSwiping = ref(false)

// Pointer tracking
let startX = 0
let startY = 0
let initialOffsetX = 0
let initialOffsetY = 0

// Touch gestures tracking
let initialPinchDist = 0
let initialPinchScale = 1
let isPinchZooming = false

// Smooth transition for returning wrapper back to position
const isAnimating = ref(false)

// Visual feedback when swiping down to close
const overlayOpacity = computed(() => {
  if (isSwiping.value) {
    const ratio = Math.max(0, 1 - Math.abs(swipeY.value) / 300)
    return 0.9 * ratio
  }
  return 0.92
})

const wrapperStyle = computed(() => {
  const tx = offsetX.value
  // Include swipe vertical movement if swiping
  const ty = offsetY.value + (isSwiping.value ? swipeY.value : 0)
  
  return {
    transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale.value})`,
    transition: isAnimating.value ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
  }
})

// Lifecycle and watchers
watch(() => props.visible, (newVal) => {
  if (newVal) {
    reset()
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      overlayRef.value?.focus()
    })
  } else {
    document.body.style.overflow = ''
  }
})

const close = () => {
  emit('close')
}

const reset = () => {
  isAnimating.value = true
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  swipeY.value = 0
  isSwiping.value = false
  setTimeout(() => {
    isAnimating.value = false
  }, 250)
}

// Zoom methods
const zoomIn = () => {
  isAnimating.value = true
  scale.value = Math.min(scale.value + 0.5, 6)
  setTimeout(() => { isAnimating.value = false }, 250)
}

const zoomOut = () => {
  isAnimating.value = true
  scale.value = Math.max(scale.value - 0.5, 1)
  if (scale.value === 1) {
    offsetX.value = 0
    offsetY.value = 0
  }
  setTimeout(() => { isAnimating.value = false }, 250)
}

const toggleZoom = (e: MouseEvent) => {
  isAnimating.value = true
  if (scale.value > 1) {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
  } else {
    scale.value = 2.5
    // Optionally focus zoom to pointer
    if (contentRef.value) {
      const rect = contentRef.value.getBoundingClientRect()
      const clickX = e.clientX - rect.left - rect.width / 2
      const clickY = e.clientY - rect.top - rect.height / 2
      offsetX.value = -clickX * 1.5
      offsetY.value = -clickY * 1.5
    }
  }
  setTimeout(() => { isAnimating.value = false }, 250)
}

// Mouse dragging / Panning logic
const startDrag = (e: MouseEvent) => {
  if (scale.value <= 1) return
  isDragging.value = true
  startX = e.clientX
  startY = e.clientY
  initialOffsetX = offsetX.value
  initialOffsetY = offsetY.value
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  offsetX.value = initialOffsetX + dx
  offsetY.value = initialOffsetY + dy
}

const stopDrag = () => {
  isDragging.value = false
  constrainOffsets()
}

// Constrain dragging offsets so image doesn't slide completely off-screen
const constrainOffsets = () => {
  if (scale.value <= 1) {
    offsetX.value = 0
    offsetY.value = 0
    return
  }
  if (!imgRef.value || !contentRef.value) return
  
  const viewportW = contentRef.value.clientWidth
  const viewportH = contentRef.value.clientHeight
  const imgW = imgRef.value.clientWidth * scale.value
  const imgH = imgRef.value.clientHeight * scale.value

  // Max bounds allowed
  const maxX = Math.max(0, (imgW - viewportW) / 2 + 100)
  const maxY = Math.max(0, (imgH - viewportH) / 2 + 100)

  offsetX.value = Math.max(-maxX, Math.min(maxX, offsetX.value))
  offsetY.value = Math.max(-maxY, Math.min(maxY, offsetY.value))
}

// Wheel zoom
const onWheel = (e: WheelEvent) => {
  const factor = e.deltaY < 0 ? 1.2 : 0.8
  const prevScale = scale.value
  scale.value = Math.max(1, Math.min(6, scale.value * factor))

  if (scale.value === 1) {
    offsetX.value = 0
    offsetY.value = 0
  } else if (contentRef.value) {
    // Zoom toward pointer
    const rect = contentRef.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2
    const ratio = scale.value / prevScale - 1
    
    offsetX.value -= mouseX * ratio
    offsetY.value -= mouseY * ratio
    constrainOffsets()
  }
}

// Touch events for mobile
const onTouchStart = (e: TouchEvent) => {
  isAnimating.value = false
  if (e.touches.length === 2) {
    // Pinch setup
    isPinchZooming = true
    initialPinchDist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    )
    initialPinchScale = scale.value
  } else if (e.touches.length === 1) {
    // Drag or swipe-to-close setup
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    initialOffsetX = offsetX.value
    initialOffsetY = offsetY.value
    
    if (scale.value === 1) {
      isSwiping.value = true
      swipeY.value = 0
    } else {
      isDragging.value = true
    }
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (isPinchZooming && e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY
    )
    const factor = dist / initialPinchDist
    scale.value = Math.max(1, Math.min(6, initialPinchScale * factor))
    
    if (scale.value === 1) {
      offsetX.value = 0
      offsetY.value = 0
    }
  } else if (isDragging.value && e.touches.length === 1) {
    const dx = e.touches[0].clientX - startX
    const dy = e.touches[0].clientY - startY
    offsetX.value = initialOffsetX + dx
    offsetY.value = initialOffsetY + dy
  } else if (isSwiping.value && e.touches.length === 1) {
    // Swipe to close tracking (vertical only)
    const dy = e.touches[0].clientY - startY
    swipeY.value = dy
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (isPinchZooming) {
    isPinchZooming = false
    constrainOffsets()
  } else if (isDragging.value) {
    isDragging.value = false
    constrainOffsets()
  } else if (isSwiping.value) {
    isSwiping.value = false
    // If swiped far enough, close, otherwise reset with animation
    if (Math.abs(swipeY.value) > 120) {
      close()
    } else {
      isAnimating.value = true
      swipeY.value = 0
      setTimeout(() => {
        isAnimating.value = false
      }, 250)
    }
  }
}

// Overlay click
const handleOverlayClick = (e: MouseEvent) => {
  // Close only if clicking content container directly, not controls or elements
  if (e.target === contentRef.value) {
    close()
  }
}

// Key events
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    close()
  }
}

const onAfterLeave = () => {
  document.body.style.overflow = ''
}

// Cleanup body scroll if unmounted while visible
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.image-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  outline: none;
  touch-action: none;
  user-select: none;
  transition: background-color 0.15s linear;
}

.viewer-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 16px;
  z-index: 10010;
  pointer-events: none;
}

.viewer-close-btn {
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50% !important;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.viewer-close-btn:hover {
  background: rgba(255, 255, 255, 0.15) !important;
}

.viewer-content {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
}

.image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 95vw;
  max-height: 85vh;
  will-change: transform;
}

.viewer-image {
  max-width: 95vw;
  max-height: 85vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.2s ease;
  user-select: none;
  -webkit-user-drag: none;
}

.viewer-image.is-zoomed {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
}

.viewer-bottom-bar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10010;
}

.viewer-controls-glass {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px;
  background: rgba(30, 30, 30, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: white;
}

.zoom-level {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  min-width: 36px;
  text-align: center;
  font-family: monospace;
}

.controls-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.15);
}

/* Cursor style rules */
.cursor-grab {
  cursor: grab;
}
.cursor-grabbing {
  cursor: grabbing;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .image-wrapper {
  animation: zoom-in-bounce 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.fade-leave-active .image-wrapper {
  animation: zoom-out-shrink 0.2s ease forwards;
}

@keyframes zoom-in-bounce {
  from {
    transform: scale(0.9) translateY(10px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes zoom-out-shrink {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.95);
    opacity: 0;
  }
}
</style>
