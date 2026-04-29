<!-- Parent owns debounce; pass isDebouncing from useDebounce.isTyping -->
<template>
  <div class="search-shell w-full max-w-3xl mx-auto group relative">
    <div
      class="search-icon absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300"
      :class="[
        showActivity ? 'text-[var(--gv-primary)]' : 'text-[var(--gv-text-secondary)]',
        isFocused && !showActivity ? 'text-[var(--gv-primary)]' : '',
      ]"
    >
      <UIcon
        v-if="showActivity"
        name="i-heroicons-arrow-path"
        class="w-5 h-5 animate-spin"
      />
      <UIcon v-else name="i-heroicons-magnifying-glass" class="w-5 h-5" />
    </div>

    <input
      :value="modelValue"
      type="text"
      class="premium-search-input"
      :placeholder="placeholder"
      @input="onInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
      <GvButton
        v-show="modelValue !== ''"
        type="button"
        unstyled
        chromeless
        square
        class="search-clear-btn"
        icon="i-heroicons-x-mark-20-solid"
        aria-label="Clear search"
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
    /** Parent debounce: user is typing, filter not yet applied */
    isDebouncing?: boolean
  }>(),
  {
    placeholder: 'Search...',
    isPending: false,
    isDebouncing: false,
  }
)

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
</script>

<style scoped>
.search-shell {
  position: relative;
  border-radius: 12px;
}

.premium-search-input {
  width: 100%;
  height: 42px;
  padding-left: 42px;
  padding-right: 44px;
  border-radius: 12px;
  background: var(--gv-surface-card);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 82%, var(--gv-primary) 18%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--gv-surface) 88%, transparent) inset,
    var(--gv-shadow-md);
  font-size: 14px;
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
  width: 30px;
  height: 30px;
  min-width: 30px;
  min-height: 30px;
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
</style>
