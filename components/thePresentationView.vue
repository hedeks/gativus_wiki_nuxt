<script setup lang="ts">
const props = defineProps<{
  presentationPath?: string
  articleTitle?: string
}>()

const hasPresentation = computed(() => !!props.presentationPath)
const isPdf = computed(() => props.presentationPath?.toLowerCase().endsWith('.pdf'))

// Resolve the path to the API endpoint
const resolvedPath = computed(() => {
  if (!props.presentationPath) return ''
  // If it's already an absolute URL, return as is
  if (props.presentationPath.startsWith('http') || props.presentationPath.startsWith('/')) {
    return props.presentationPath
  }
  // Otherwise, prefix with the uploads API
  return `/api/uploads/${props.presentationPath}`
})
</script>

<template>
  <div class="w-full h-full select-none relative overflow-hidden bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center">

    <!-- PDF Embed -->
    <template v-if="hasPresentation && isPdf">
      <ThePdfViewer :src="resolvedPath" />
    </template>

    <!-- ODP / Other format — Download + Preview -->
    <template v-else-if="hasPresentation">
      <div class="flex flex-col items-center justify-center gap-6 p-8 max-w-lg text-center">
        <div class="w-24 h-24 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-presentation-chart-bar" class="w-12 h-12 text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-widest">
            Презентация
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ articleTitle }}
          </p>
        </div>
        <a
          :href="presentationPath"
          download
          class="flex items-center gap-3 px-6 py-3 rounded-xl bg-sky-600 text-white font-bold uppercase tracking-widest text-sm shadow-lg shadow-sky-500/20 hover:bg-sky-700 transition-all duration-300 hover:-translate-y-0.5"
        >
          <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5" />
          Скачать презентацию
        </a>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Формат: {{ presentationPath?.split('.').pop()?.toUpperCase() }}
        </p>
      </div>
    </template>

    <!-- No Presentation -->
    <template v-else>
      <div class="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div class="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
          <UIcon name="i-heroicons-presentation-chart-bar" class="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>
        <p class="text-lg font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Презентация не прикреплена
        </p>
        <p class="text-xs text-gray-300 dark:text-gray-600">
          Она появится, когда редактор загрузит файл
        </p>
      </div>
    </template>

  </div>
</template>
