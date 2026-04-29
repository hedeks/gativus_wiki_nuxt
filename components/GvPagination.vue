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
        <button
          v-else
          type="button"
          class="gv-pagination__num gv-focus"
          :class="{ 'gv-pagination__num--active': item === current }"
          :aria-current="item === current ? 'page' : undefined"
          :aria-label="`Страница ${item}`"
          @click="go(item)"
        >
          {{ item }}
        </button>
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
  min-width: 44px;
  min-height: 44px;
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
  box-sizing: border-box;
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface-card);
  color: var(--gv-text-secondary);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.gv-pagination__num:hover:not(:disabled) {
  border-color: var(--gv-primary);
  color: var(--gv-primary);
}

.gv-pagination__num:focus-visible {
  outline: 2px solid var(--gv-primary);
  outline-offset: 2px;
}

.gv-pagination__num--active {
  background: var(--gv-primary);
  border-color: var(--gv-primary-hover);
  color: #fff;
  box-shadow: var(--gv-shadow-sm);
}

.gv-pagination__num--active:hover {
  background: var(--gv-primary-hover);
  border-color: var(--gv-primary-hover);
  color: #fff;
}

@media (max-width: 640px) {
  .gv-pagination__step {
    min-width: 40px;
    min-height: 40px;
  }

  .gv-pagination__num {
    min-width: 40px;
    height: 40px;
    font-size: 13px;
  }
}
</style>
