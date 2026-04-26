<!-- components/common/ExpandableFilters.vue -->
<template>
  <div ref="rootRef" class="expandable-filters">
    <div class="filters-row">
      <button
        type="button"
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
      </button>
    </div>

    <Transition name="filters-drop">
      <div v-if="isOpen" class="filters-dropdown">
        <div class="filters-dropdown-inner">
          <slot />
        </div>
      </div>
    </Transition>
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

function onDocPointerDown(e: Event) {
  const target = e.target as Node | null
  if (!isOpen.value || !rootRef.value || !target) return
  if (!rootRef.value.contains(target)) {
    isOpen.value = false
  }
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
  document.addEventListener('keydown', onEsc)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
  document.removeEventListener('keydown', onEsc)
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

.filters-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
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

.filters-trigger:hover {
  border-color: #c8d7ea;
  color: #0369a1;
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 12px 22px rgba(15, 23, 42, 0.1);
}

.filters-trigger.is-open {
  border-color: #0ea5e9;
  color: #0369a1;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.14),
    0 14px 24px rgba(2, 132, 199, 0.14);
}

.filters-trigger.has-active {
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

.filters-trigger.is-open .chevron {
  transform: rotate(180deg);
}

.filters-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 200;
  min-width: 340px;
  max-width: min(94vw, 560px);
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

.dark .filters-trigger {
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

.dark .filters-trigger:hover {
  border-color: #4b5a6f;
  color: #bae6fd;
}

.dark .filters-trigger.is-open {
  border-color: #0ea5e9;
  color: #bae6fd;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.22),
    0 14px 26px rgba(0, 0, 0, 0.45);
}

.dark .filters-trigger.has-active {
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

  .filters-trigger {
    width: 100%;
    justify-content: space-between;
  }

  .filters-dropdown {
    left: 0;
    right: 0;
    min-width: 0;
    max-width: 100%;
  }
}
</style>