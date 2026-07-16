<template>
  <UModal v-model="isOpen">
    <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-sparkles" class="text-sky-500" />
            {{ t?.guidedTours || 'Экскурсии' }}
          </h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isOpen = false" />
        </div>
      </template>

      <div class="py-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <div v-if="!stories || stories.length === 0" class="text-center py-8 text-gray-500">
          <UIcon name="i-heroicons-sparkles" class="text-4xl opacity-20 mb-2" />
          <p class="text-sm">{{ t?.noStories || 'Нет доступных экскурсий' }}</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="story in stories"
            :key="story.id"
            class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-colors bg-gray-50 dark:bg-[#161618] hover:bg-sky-50 dark:hover:bg-sky-900/20"
            @click="selectStory(story)"
          >
            <div class="font-bold text-gray-900 dark:text-white mb-1">{{ story[`title_${currentLang}`] || story.title }}</div>
            <div v-if="story[`description_${currentLang}`] || story.description" class="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {{ story[`description_${currentLang}`] || story.description }}
            </div>
            <div class="text-xs font-semibold text-sky-600 dark:text-sky-400">
              {{ story.nodes_path?.length || 0 }} {{ t?.stepsCount || 'шагов' }}
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
const currentLang = computed(() => langStore.currentLang)

const props = defineProps<{
  modelValue: boolean
  stories: any[]
  t?: Record<string, string>
}>()

const emit = defineEmits(['update:modelValue', 'play'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const selectStory = (story: any) => {
  isOpen.value = false
  emit('play', story)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--gv-border-principal) 50%, transparent);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--gv-border-principal);
}
</style>
