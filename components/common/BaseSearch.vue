<!-- Parent owns debounce; pass isDebouncing from useDebounce.isTyping -->
<template>
  <div class="search-shell w-full max-w-3xl mx-auto group relative">
    <div
      class="search-icon absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300"
      :class="[
        showActivity ? 'text-sky-500' : 'text-gray-400 dark:text-gray-500',
        isFocused ? 'text-sky-500' : '',
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
  background: #ffffff;
  border: 1px solid #dfe7f3;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85) inset,
    0 8px 18px rgba(15, 23, 42, 0.06);
  font-size: 14px;
  color: #1e293b;
  transition: all 0.25s ease;
  outline: none;
}

.premium-search-input:hover {
  border-color: #cdd9ea;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.92) inset,
    0 12px 20px rgba(15, 23, 42, 0.08);
}

.premium-search-input:focus {
  border-color: #0ea5e9;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.14),
    0 16px 28px rgba(2, 132, 199, 0.12);
}

.premium-search-input::placeholder {
  color: #94a3b8;
  letter-spacing: 0.2px;
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
  color: #94a3b8;
  background: transparent;
  transition: all 0.2s ease;
}

:deep(.search-clear-btn:hover) {
  color: #0ea5e9;
  border-color: rgba(14, 165, 233, 0.28);
  background: rgba(14, 165, 233, 0.08);
}

.dark .premium-search-input {
  background: #1a1a1a;
  border: 1px solid #343c49;
  color: #e2e8f0;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 10px 20px rgba(0, 0, 0, 0.3);
}

.dark .premium-search-input:hover {
  border-color: #445063;
}

.dark .premium-search-input:focus {
  border-color: #0ea5e9;
  box-shadow:
    0 0 0 4px rgba(14, 165, 233, 0.18),
    0 18px 30px rgba(2, 132, 199, 0.18);
}

.dark .premium-search-input::placeholder {
  color: #64748b;
}

.dark :deep(.search-clear-btn) {
  color: #64748b;
}

.dark :deep(.search-clear-btn:hover) {
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.28);
  background: rgba(14, 165, 233, 0.14);
}
</style>
