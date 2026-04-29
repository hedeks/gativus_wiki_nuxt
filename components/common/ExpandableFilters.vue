<!-- components/common/ExpandableFilters.vue -->
<template>
  <div ref="rootRef" class="expandable-filters">
    <div class="filters-row">
      <GvButton
        type="button"
        unstyled
        chromeless
        class="filters-trigger gv-focusable"
        :class="{ 'is-open': isOpen, 'has-active': hasActiveFilters }"
        @click="isOpen = !isOpen"
      >
        <span class="filters-icon-wrap">
          <UIcon
            name="i-heroicons-adjustments-horizontal"
            class="w-4 h-4"
          />
        </span>

        <span class="filters-label">{{ label }}</span>

        <span v-if="activeCount > 0" class="filters-dot">
          {{ activeCount }}
        </span>

        <UIcon
          :name="isOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-4 h-4 chevron"
        />
      </GvButton>
    </div>

    <Teleport to="body">
      <Transition name="filters-drop">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          class="filters-dropdown filters-dropdown--portal"
          :style="dropdownStyle"
        >
          <div class="filters-dropdown-inner">
            <slot />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    activeCount?: number
    hasActiveFilters?: boolean
  }>(),
  {
    label: 'Filters',
    activeCount: 0,
    hasActiveFilters: false,
  }
)

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const dropdownStyle = ref<Record<string, string>>({})

function computeDropdownStyle() {
  const el = rootRef.value
  if (!el || !isOpen.value) return

  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const pad = 12
  const gap = 8

  if (vw <= 640) {
    dropdownStyle.value = {
      position: 'fixed',
      top: `${rect.bottom + gap}px`,
      left: `${pad}px`,
      right: `${pad}px`,
      width: 'auto',
      zIndex: '1000',
      minWidth: '0',
      maxWidth: 'none',
    }
    return
  }

  const maxW = Math.min(560, vw - 2 * pad)
  const minW = 340
  const width = Math.min(maxW, Math.max(minW, rect.width))
  let left = rect.right - width
  left = Math.max(pad, Math.min(left, vw - pad - width))

  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + gap}px`,
    left: `${left}px`,
    width: `${width}px`,
    right: 'auto',
    zIndex: '1000',
    minWidth: '',
    maxWidth: '',
  }
}

function onReposition() {
  if (isOpen.value) computeDropdownStyle()
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    requestAnimationFrame(() => computeDropdownStyle())
  }
  else {
    dropdownStyle.value = {}
  }
})

function onDocPointerDown(e: Event) {
  const target = e.target as Node | null
  if (!isOpen.value || !target) return
  if (rootRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return
  isOpen.value = false
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onEsc)
  window.addEventListener('resize', onReposition)
  window.addEventListener('scroll', onReposition, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onEsc)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, true)
})
</script>

<style scoped>
.expandable-filters {
  position: relative;
  flex-shrink: 0;
}

.filters-row {
  display: flex;
  align-items: center;
}

:deep(.filters-trigger .gv-btn__label) {
  display: contents;
}

/* chromeless в GvButton задаёт padding: 0 !important — дублируем отступы здесь с !important */
:deep(.filters-trigger.gv-btn--chromeless) {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  height: 42px;
  min-height: 42px !important;
  padding: 0 18px !important;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #dde6f2;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  user-select: none;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.86) inset,
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.filters-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.1);
}

:deep(.filters-trigger.gv-btn--chromeless:hover) {
  border-color: #c8d7ea;
  color: #0369a1;
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 12px 22px rgba(15, 23, 42, 0.1);
}

:deep(.filters-trigger.gv-btn--chromeless.is-open) {
  border-color: #0ea5e9;
  color: #0369a1;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.14),
    0 14px 24px rgba(2, 132, 199, 0.14);
}

:deep(.filters-trigger.gv-btn--chromeless.has-active) {
  border-color: #0ea5e9;
  background: #eff9ff;
}

.filters-label {
  font-weight: 700;
}

.filters-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #0284c7;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 6px 12px rgba(2, 132, 199, 0.3);
}

.chevron {
  transition: transform 0.25s ease;
}

:deep(.filters-trigger.gv-btn--chromeless.is-open .chevron) {
  transform: rotate(180deg);
}

.filters-dropdown--portal {
  box-sizing: border-box;
  pointer-events: auto;
}

.filters-dropdown-inner {
  padding: 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #dbe5f2;
  box-shadow:
    0 24px 40px rgba(15, 23, 42, 0.12),
    0 1px 0 rgba(255, 255, 255, 0.82) inset;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dark :deep(.filters-trigger.gv-btn--chromeless) {
  background: #1a1c22;
  border-color: #3a4352;
  color: #aab9cf;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 10px 22px rgba(0, 0, 0, 0.34);
}

.dark .filters-icon-wrap {
  color: #7dd3fc;
  background: rgba(14, 165, 233, 0.16);
}

.dark :deep(.filters-trigger.gv-btn--chromeless:hover) {
  border-color: #4b5a6f;
  color: #bae6fd;
}

.dark :deep(.filters-trigger.gv-btn--chromeless.is-open) {
  border-color: #0ea5e9;
  color: #bae6fd;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.22),
    0 14px 26px rgba(0, 0, 0, 0.45);
}

.dark :deep(.filters-trigger.gv-btn--chromeless.has-active) {
  background: rgba(14, 165, 233, 0.12);
}

.dark .filters-dropdown-inner {
  background: #191b21;
  border-color: #333c49;
  box-shadow:
    0 26px 44px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.05) inset;
}

.filters-drop-enter-active,
.filters-drop-leave-active {
  transition: all 0.22s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.filters-drop-enter-from,
.filters-drop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.97);
}

@media (max-width: 640px) {
  .expandable-filters {
    width: 100%;
    min-width: 0;
  }

  .filters-row {
    width: 100%;
  }

  :deep(.filters-trigger.gv-btn--chromeless) {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
