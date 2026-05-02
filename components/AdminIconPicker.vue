<template>
  <div class="admin-icon-picker flex gap-2">
    <UInput
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      class="flex-1"
      placeholder="i-heroicons-..."
    />
    <UPopover v-model:open="isOpen">
      <GvButton
        color="gray"
        variant="soft"
        square
        :icon="modelValue || 'i-heroicons-question-mark-circle'"
        type="button"
        title="Выбрать иконку"
      />
      <template #panel>
        <div class="p-3 grid grid-cols-6 gap-1 max-h-[300px] overflow-y-auto w-[240px] bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl shadow-xl">
          <button
            v-for="icon in commonIcons"
            :key="icon"
            type="button"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            :class="{ 'bg-sky-50 dark:bg-sky-900/30 text-sky-600': modelValue === icon }"
            @click="selectIcon(icon)"
          >
            <UIcon :name="icon" class="w-5 h-5" />
          </button>
        </div>
      </template>
    </UPopover>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])
const isOpen = ref(false)

const commonIcons = [
  'i-heroicons-folder', 'i-heroicons-folder-open', 'i-heroicons-book-open',
  'i-heroicons-academic-cap', 'i-heroicons-light-bulb', 'i-heroicons-briefcase',
  'i-heroicons-chart-bar', 'i-heroicons-chat-bubble-left-right', 'i-heroicons-cloud',
  'i-heroicons-code-bracket', 'i-heroicons-cog-6-tooth', 'i-heroicons-cpu-chip',
  'i-heroicons-cube', 'i-heroicons-device-tablet', 'i-heroicons-document-text',
  'i-heroicons-beaker', 'i-heroicons-globe-alt', 'i-heroicons-heart',
  'i-heroicons-home', 'i-heroicons-identification', 'i-heroicons-key',
  'i-heroicons-map', 'i-heroicons-microphone', 'i-heroicons-moon',
  'i-heroicons-newspaper', 'i-heroicons-paint-brush', 'i-heroicons-puzzle-piece',
  'i-heroicons-rocket', 'i-heroicons-shield-check', 'i-heroicons-sparkles',
  'i-heroicons-star', 'i-heroicons-user-group', 'i-heroicons-variable',
  'i-heroicons-video-camera', 'i-heroicons-wrench-screwdriver',
  'i-heroicons-command-line', 'i-heroicons-cpu-chip', 'i-heroicons-square-3-stack-3d',
  'i-heroicons-presentation-chart-line', 'i-heroicons-lifebuoy', 'i-heroicons-finger-print'
]

function selectIcon(icon: string) {
  emit('update:modelValue', icon)
  isOpen.value = false
}
</script>
