<script setup lang="ts">
/** Меню, привязанное к триггеру: панель в Teleport + fixed, чтобы не резалась overflow и корректно работало на тач-устройствах. */
const props = withDefaults(
  defineProps<{
    /** Ширина панели (px); для узких меню (напр. языки). */
    panelWidth?: number
  }>(),
  { panelWidth: 288 },
)

const open = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const MARGIN = 8

const panelStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  maxHeight: '320px',
  width: '288px',
})

function measureAndPosition () {
  const el = anchorRef.value
  if (!el) return
  const w = Math.min(props.panelWidth, window.innerWidth - MARGIN * 2)
  const r = el.getBoundingClientRect()
  let left = r.right - w
  left = Math.min(Math.max(MARGIN, left), window.innerWidth - w - MARGIN)

  let top = r.bottom + MARGIN
  let maxH = window.innerHeight - top - MARGIN
  if (maxH < 140 && r.top > window.innerHeight * 0.35) {
    maxH = Math.min(360, r.top - MARGIN * 2)
    top = r.top - maxH - MARGIN
    top = Math.max(MARGIN, top)
  } else {
    maxH = Math.max(120, maxH)
  }

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    maxHeight: `${maxH}px`,
    width: `${w}px`,
  }
}

function toggle () {
  open.value = !open.value
}

function close () {
  open.value = false
}

function onDocPointerDown (e: PointerEvent) {
  const t = e.target as Node
  if (anchorRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  close()
}

function onKeydown (e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(open, (isOpen) => {
  if (!import.meta.client) return
  if (isOpen) {
    nextTick(() => {
      measureAndPosition()
      setTimeout(() => {
        document.addEventListener('pointerdown', onDocPointerDown, true)
      }, 0)
      document.addEventListener('keydown', onKeydown)
      window.addEventListener('scroll', measureAndPosition, true)
      window.addEventListener('resize', measureAndPosition)
    })
  } else {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    document.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', measureAndPosition, true)
    window.removeEventListener('resize', measureAndPosition)
  }
})

onUnmounted(() => {
  if (!import.meta.client) return
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', measureAndPosition, true)
  window.removeEventListener('resize', measureAndPosition)
})

defineExpose({ open, toggle, close })
</script>

<template>
  <div ref="anchorRef" class="inline-flex shrink-0">
    <slot name="trigger" :toggle="toggle" :close="close" :is-open="open" />
  </div>
  <Teleport to="body">
    <Transition name="anchored-menu">
      <div
        v-if="open"
        ref="panelRef"
        class="anchored-menu-panel fixed z-[300] max-w-[calc(100vw-16px)] overflow-y-auto"
        :style="panelStyle"
        role="menu"
        @click.stop
      >
        <slot :close="close" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.anchored-menu-panel {
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 82%, var(--gv-primary) 18%);
  border-radius: var(--gv-radius-container);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 85%, transparent) inset,
    var(--gv-shadow-lg);
}

.anchored-menu-enter-active,
.anchored-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.anchored-menu-enter-from,
.anchored-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
