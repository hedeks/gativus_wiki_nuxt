<!-- Parent owns debounce; pass isDebouncing while waiting before request -->
<template>
  <div
    class="search-shell w-full group relative"
    :class="[
      noMaxWidth ? '' : 'max-w-3xl mx-auto',
      size === 'lg' ? 'search-shell--lg' : '',
    ]"
  >
    <div
      class="search-icon absolute inset-y-0 left-0 flex items-center pointer-events-none transition-colors duration-300"
      :class="[
        size === 'lg' ? 'pl-3.5' : 'pl-3',
        showActivity ? 'text-[var(--gv-primary)]' : 'text-[var(--gv-text-secondary)]',
        isFocused && !showActivity ? 'text-[var(--gv-primary)]' : '',
      ]"
    >
      <UIcon
        v-if="showActivity"
        name="i-heroicons-arrow-path"
        class="animate-spin"
        :class="size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]'"
      />
      <UIcon
        v-else
        name="i-heroicons-magnifying-glass"
        :class="size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]'"
      />
    </div>

    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      class="premium-search-input"
      :placeholder="placeholder"
      :autofocus="autofocus"
      @input="onInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <div
      class="absolute inset-y-0 flex items-center"
      :class="size === 'lg' ? 'right-0 pr-2' : 'right-0 pr-2.5'"
    >
      <GvButton
        v-show="showClear && modelValue !== ''"
        type="button"
        unstyled
        chromeless
        square
        class="search-clear-btn"
        :class="size === 'lg' ? 'search-clear-btn--lg' : ''"
        icon="i-heroicons-x-mark-20-solid"
        :aria-label="clearLabel"
        @click="clear"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    /** Initial data load / refetch */
    isPending?: boolean
    /** Parent debounce: user is typing, request not yet sent */
    isDebouncing?: boolean
    /** `md` ≈ 36px высота; `lg` ≈ 44px — модалка поиска */
    size?: 'md' | 'lg'
    /** Убрать max-width, если поле в toolbar / модалке */
    noMaxWidth?: boolean
    autofocus?: boolean
    showClear?: boolean
    clearLabel?: string
  }>(),
  {
    placeholder: 'Search...',
    isPending: false,
    isDebouncing: false,
    size: 'md',
    noMaxWidth: false,
    autofocus: false,
    showClear: true,
    clearLabel: 'Clear search',
  }
)

const inputRef = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  clear: []
}>()

const isFocused = ref(false)

const showActivity = computed(
  () => props.isPending || props.isDebouncing
)

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

function clear() {
  emit('update:modelValue', '')
  emit('clear')
}

watch(
  () => props.autofocus,
  (v) => {
    if (v && typeof document !== 'undefined') {
      nextTick(() => inputRef.value?.focus())
    }
  },
)

onMounted(() => {
  if (props.autofocus && typeof document !== 'undefined') {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style scoped>
.search-shell {
  position: relative;
  border-radius: var(--gv-radius-control, 12px);
}

.premium-search-input {
  width: 100%;
  height: 36px;
  padding-left: 34px;
  padding-right: 38px;
  border-radius: var(--gv-radius-control, 12px);
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 82%, var(--gv-primary) 18%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 88%, transparent) inset,
    var(--gv-shadow-md);
  font-size: 13px;
  color: var(--gv-text-primary);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
  outline: none;
}

.premium-search-input:hover {
  border-color: color-mix(in srgb, var(--gv-border-principal) 62%, var(--gv-primary) 22%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 90%, transparent) inset,
    var(--gv-shadow-lg);
}

.premium-search-input:focus {
  border-color: var(--gv-primary);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 24%, transparent),
    0 12px 28px color-mix(in srgb, var(--gv-primary) 14%, rgba(0, 0, 0, 0.12));
}

.premium-search-input::placeholder {
  color: var(--gv-text-secondary);
  letter-spacing: 0.2px;
  opacity: 0.92;
}

.search-icon {
  z-index: 2;
}

:deep(.search-clear-btn) {
  width: 26px;
  height: 26px;
  min-width: 26px;
  min-height: 26px;
  padding: 0 !important;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--gv-text-secondary);
  background: transparent;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

:deep(.search-clear-btn:hover) {
  color: var(--gv-primary);
  border-color: color-mix(in srgb, var(--gv-primary) 30%, transparent);
  background: color-mix(in srgb, var(--gv-primary) 12%, transparent);
}

.dark .premium-search-input:focus {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 34%, transparent),
    0 14px 32px rgba(0, 0, 0, 0.45);
}

.search-shell--lg .premium-search-input {
  height: 44px;
  padding-left: 40px;
  padding-right: 42px;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
}

:deep(.search-clear-btn--lg) {
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
}
</style>
