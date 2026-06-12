<script setup lang="ts">
import { totalPagesFor } from '~/composables/useSearch'

const props = withDefaults(
  defineProps<{
    /** Текущая страница (с 1) */
    modelValue: number
    /** Всего элементов в списке */
    total: number
    /** Элементов на странице */
    pageSize: number
    /** Соседей вокруг текущей страницы (каждая сторона) */
    siblingCount?: number
  }>(),
  { siblingCount: 1 },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const totalPages = computed(() => totalPagesFor(props.total, props.pageSize))

const current = computed(() =>
  Math.min(Math.max(1, props.modelValue), Math.max(1, totalPages.value)),
)

const pageItems = computed(() => {
  const t = totalPages.value
  const c = current.value
  const s = props.siblingCount
  if (t <= 0) return [] as (number | 'gap')[]
  if (t <= 7) {
    return Array.from({ length: t }, (_, i) => i + 1) as (number | 'gap')[]
  }
  const set = new Set<number>([1, t])
  for (let i = c - s; i <= c + s; i++) {
    if (i >= 1 && i <= t) set.add(i)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const curN = sorted[i]!
    if (i > 0 && curN - sorted[i - 1]! > 1) out.push('gap')
    out.push(curN)
  }
  return out
})

function go(p: number): void {
  const next = Math.min(Math.max(1, p), totalPages.value)
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>
<template>
  <nav
    v-if="totalPages > 1"
    class="gv-pagination"
    aria-label="Навигация по страницам"
  >
    <GvButton
      type="button"
      variant="outline"
      color="gray"
      size="sm"
      square
      class="gv-pagination__step"
      :disabled="current <= 1"
      icon="i-heroicons-chevron-left"
      aria-label="Предыдущая страница"
      @click="go(current - 1)"
    />
    <div class="gv-pagination__pages">
      <template v-for="(item, idx) in pageItems" :key="`gv-p-${idx}-${item}`">
        <span
          v-if="item === 'gap'"
          class="gv-pagination__ellipsis"
          aria-hidden="true"
        >…</span>
        <GvButton
          v-else
          type="button"
          :variant="item === current ? 'solid' : 'outline'"
          :color="item === current ? 'primary' : 'gray'"
          size="sm"
          class="gv-pagination__num"
          :class="{ 'gv-pagination__num--active': item === current }"
          :aria-current="item === current ? 'page' : undefined"
          :aria-label="`Страница ${item}`"
          @click="go(item)"
        >
          {{ item }}
        </GvButton>
      </template>
    </div>
    <GvButton
      type="button"
      variant="outline"
      color="gray"
      size="sm"
      square
      class="gv-pagination__step"
      :disabled="current >= totalPages"
      icon="i-heroicons-chevron-right"
      aria-label="Следующая страница"
      @click="go(current + 1)"
    />
  </nav>
</template>

<style scoped>
.gv-pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.gv-pagination__pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.gv-pagination__step {
  min-width: 34px !important;
  min-height: 34px !important;
  height: 34px !important;
}

.gv-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  font-size: 14px;
  font-weight: 700;
  color: var(--gv-text-secondary);
  user-select: none;
  padding: 0 4px;
}

.gv-pagination__num {
  min-width: 34px !important;
  min-height: 34px !important;
  height: 34px !important;
  padding: 0 6px !important;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* Hover effect override for entity accent color consistency */
.gv-pagination__num:hover:not(.gv-btn--disabled):not(.gv-pagination__num--active) {
  border-color: var(--gv-primary) !important;
  color: var(--gv-primary) !important;
}

/* Active page overrides for entity colors */
.gv-pagination__num--active {
  background: var(--gv-primary) !important;
  border-color: var(--gv-primary-hover) !important;
  color: #fff !important;
  box-shadow: var(--gv-shadow-sm) !important;
}

.gv-pagination__num--active:hover:not(.gv-btn--disabled) {
  background: var(--gv-primary-hover) !important;
  border-color: var(--gv-primary-hover) !important;
  color: #fff !important;
}

@media (max-width: 640px) {
  .gv-pagination__step,
  .gv-pagination__num {
    min-width: 32px !important;
    min-height: 32px !important;
    height: 32px !important;
  }
}
</style>
