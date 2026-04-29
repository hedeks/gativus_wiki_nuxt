<template>
  <div class="left-view-selector flex flex-col lg:sticky h-fit">
    <p class="lv-label lg:text-sm text-[10px] tracking-widest font-bold uppercase mb-2">
      {{ pack.text }}
    </p>
    <span
      class="selector-row border-l-2 lg:border-l-0 lg:border-r-2 border-transparent px-3 py-2 text-sm cursor-pointer transition-all duration-300 rounded-none lv-row"
      :class="{ selectedToc: props.isTheory }"
      @click="$emit('changeView', 'lection')"
    >
      {{ pack.article }}: {{ quizTitle }}
    </span>
    <template v-if="props.hasPresentation">
      <p class="lv-label lg:text-sm text-[10px] tracking-widest font-bold uppercase my-2">
        {{ pack.presentation }}
      </p>
      <span
        class="selector-row border-l-2 lg:border-r-2 lg:border-l-0 border-transparent px-3 py-2 text-sm cursor-pointer transition-all duration-300 rounded-none lv-row"
        :class="{ selectedToc: !props.isTheory }"
        @click="$emit('changeView', 'quiz')"
      >
        {{ pack.presentation }}: {{ quizTitle }}
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()

const pack = computed(() => {
  const dict: Record<string, { text: string; presentation: string; article: string }> = {
    en: { text: 'Text', presentation: 'Presentation', article: 'Article' },
    ru: { text: 'Текст', presentation: 'Презентация', article: 'Статья' },
    zh: { text: '正文', presentation: '演示', article: '文章' },
  }
  return dict[langStore.currentLang] || dict.ru
})

defineEmits(['changeView'])

const props = defineProps({
  title: String,
  quizTitle: String,
  meta: String,
  isTheory: Boolean,
  hasPresentation: {
    type: Boolean,
    default: true,
  },
})
</script>

<style scoped>
.lv-label {
  color: var(--gv-text-primary);
}

.lv-row {
  color: var(--gv-text-primary);
}

.lv-row:hover {
  color: var(--gv-primary);
}

.selectedToc {
  border-color: var(--gv-primary);
  border-radius: 0;
  background: transparent;
  color: var(--gv-primary);
  font-weight: 600;
}

.left-view-selector .selector-row:not(.selectedToc) {
  border-color: transparent;
}

.selector-row {
  background: transparent;
  border-radius: 0;
}
</style>
