<!-- components/common/ExpandableFilters.vue -->
<template>
  <div
    ref="rootRef"
    class="expandable-filters"
    :class="size === 'lg' ? 'expandable-filters--lg' : 'expandable-filters--md'"
  >
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
            :class="iconSizeClass"
          />
        </span>

        <span class="filters-label">{{ label }}</span>

        <span v-if="activeCount > 0" class="filters-dot">
          {{ activeCount }}
        </span>

        <UIcon
          :name="isOpen ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="chevron"
          :class="iconSizeClass"
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
const props = withDefaults(
  defineProps<{
    label?: string
    activeCount?: number
    hasActiveFilters?: boolean
    /** Высота как у `BaseSearch`: md ≈ 36px (индексы), lg ≈ 44px (модалка) */
    size?: 'md' | 'lg'
  }>(),
  {
    label: 'Filters',
    activeCount: 0,
    hasActiveFilters: false,
    size: 'md',
  },
)

const iconSizeClass = computed(() =>
  props.size === 'lg' ? 'w-4 h-4' : 'w-[14px] h-[14px]',
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

.expandable-filters--md :deep(.filters-trigger.gv-btn--chromeless) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  height: 36px;
  min-height: 36px !important;
  padding: 0 14px !important;
  border-radius: var(--gv-radius-control, 12px);
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 78%, var(--gv-primary) 22%);
  color: color-mix(in srgb, var(--gv-text-secondary) 82%, var(--gv-primary) 18%);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease,
    background 0.25s ease, transform 0.25s ease;
  white-space: nowrap;
  user-select: none;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 85%, transparent) inset,
    var(--gv-shadow-md);
}

.expandable-filters--lg :deep(.filters-trigger.gv-btn--chromeless) {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  height: 44px;
  min-height: 44px !important;
  padding: 0 18px !important;
  border-radius: var(--gv-radius-control, 12px);
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 78%, var(--gv-primary) 22%);
  color: color-mix(in srgb, var(--gv-text-secondary) 82%, var(--gv-primary) 18%);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease,
    background 0.25s ease, transform 0.25s ease;
  white-space: nowrap;
  user-select: none;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 85%, transparent) inset,
    var(--gv-shadow-md);
}

.expandable-filters--md .filters-icon-wrap {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card));
}

.expandable-filters--lg .filters-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card));
}

.expandable-filters--md :deep(.filters-trigger.gv-btn--chromeless:hover) {
  border-color: color-mix(in srgb, var(--gv-border-principal) 52%, var(--gv-primary) 30%);
  color: var(--gv-primary-hover);
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 88%, transparent) inset,
    var(--gv-shadow-lg);
}

.expandable-filters--lg :deep(.filters-trigger.gv-btn--chromeless:hover) {
  border-color: color-mix(in srgb, var(--gv-border-principal) 52%, var(--gv-primary) 30%);
  color: var(--gv-primary-hover);
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 88%, transparent) inset,
    var(--gv-shadow-lg);
}

.expandable-filters--md :deep(.filters-trigger.gv-btn--chromeless.is-open) {
  border-color: var(--gv-primary);
  color: var(--gv-primary);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 22%, transparent),
    0 14px 28px color-mix(in srgb, var(--gv-primary) 12%, rgba(0, 0, 0, 0.08));
}

.expandable-filters--lg :deep(.filters-trigger.gv-btn--chromeless.is-open) {
  border-color: var(--gv-primary);
  color: var(--gv-primary);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 22%, transparent),
    0 14px 28px color-mix(in srgb, var(--gv-primary) 12%, rgba(0, 0, 0, 0.08));
}

.dark :deep(.filters-trigger.gv-btn--chromeless.is-open) {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 32%, transparent),
    0 18px 40px rgba(0, 0, 0, 0.52);
}

.expandable-filters--md :deep(.filters-trigger.gv-btn--chromeless.has-active) {
  border-color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 9%, var(--gv-surface-card));
  color: var(--gv-primary);
}

.expandable-filters--lg :deep(.filters-trigger.gv-btn--chromeless.has-active) {
  border-color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 9%, var(--gv-surface-card));
  color: var(--gv-primary);
}

.filters-label {
  font-weight: 700;
}

.expandable-filters--md .filters-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--gv-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--gv-primary) 42%, transparent);
}

.expandable-filters--lg .filters-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--gv-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 6px 14px color-mix(in srgb, var(--gv-primary) 42%, transparent);
}

.dark .filters-dot {
  color: color-mix(in srgb, #fff 94%, var(--gv-surface) 6%);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--gv-primary) 38%, rgba(0, 0, 0, 0.45));
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
  padding: 20px 22px;
  border-radius: 12px;
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 80%, var(--gv-primary) 20%);
  box-shadow:
    var(--gv-shadow-lg),
    0 1px 0 color-mix(in srgb, var(--gv-surface) 75%, transparent) inset;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.dark .filters-dropdown-inner {
  border-color: color-mix(in srgb, var(--gv-border-principal) 72%, var(--gv-primary) 28%);
  box-shadow:
    0 26px 44px rgba(0, 0, 0, 0.55),
    0 1px 0 color-mix(in srgb, var(--gv-text-primary) 8%, transparent) inset;
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

  .filters-dropdown-inner {
    padding: 18px 16px;
    gap: 22px;
  }
}
</style>

<style>
/* Слот: filter-group в телепорте без scoped data-v — общий ритм для индексов и админки */
.expandable-filters .filters-dropdown-inner .filter-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--gv-primary) 18%, var(--gv-border-principal));
  background: var(--gv-surface-card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.dark .expandable-filters .filters-dropdown-inner .filter-group {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.expandable-filters .filters-dropdown-inner .filter-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--gv-primary) 45%, var(--gv-text-secondary));
  line-height: 1.45;
}

.expandable-filters .filters-dropdown-inner .filter-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 12px 14px;
}

.expandable-filters .filters-dropdown-inner .filter-select,
.expandable-filters .filters-dropdown-inner select.filter-select {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .expandable-filters .filters-dropdown-inner .filter-group {
    padding: 14px 16px;
    gap: 12px;
    border-radius: 12px;
  }

  .expandable-filters .filters-dropdown-inner .filter-pills {
    gap: 10px 12px;
  }

  .expandable-filters .filters-dropdown-inner .filter-group-label {
    letter-spacing: 0.12em;
  }
}
</style>
