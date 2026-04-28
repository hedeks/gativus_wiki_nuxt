<script setup lang="ts">
/** Меню, привязанное к триггеру: панель в Teleport + fixed, чтобы не резалась overflow и корректно работало на тач-устройствах. */
const open = ref(false)
const anchorRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

const PANEL_W = 224
const MARGIN = 8

const panelStyle = ref<Record<string, string>>({
  top: '0px',
  left: '0px',
  maxHeight: '320px',
})

function measureAndPosition () {
  const el = anchorRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  let left = r.right - PANEL_W
  left = Math.min(Math.max(MARGIN, left), window.innerWidth - PANEL_W - MARGIN)

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
        class="anchored-menu-panel fixed z-[300] w-56 overflow-y-auto rounded-md bg-white/80 shadow-lg ring-1 ring-gray-200 backdrop-blur-md dark:bg-zinc-900/80 dark:ring-zinc-800"
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
