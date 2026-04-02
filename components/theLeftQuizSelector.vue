<template>
    <div class="flex flex-col dark:border-zinc-800 lg:sticky h-fit">
        <p class="lg:text-sm text-[10px] tracking-widest font-bold text-black dark:text-white uppercase mb-2">Текст</p>
        <span @click="$emit('changeView', 'lection')" :class="{ 'selectedToc': props.isTheory }"
            class="dark:border-zinc-800 border-l-2 lg:border-l-0 lg:border-r-2 px-3 py-2 text-sm cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300 text-gray-900 dark:text-gray-100">
            {{ "Статья: ".concat(props.quizTitle as string) }}
        </span>
        <p class="lg:text-sm text-[10px] tracking-widest font-bold text-black dark:text-white uppercase my-2">Слайды</p>
        <span @click="$emit('changeView', 'quiz')" :class="{ 'selectedToc': !props.isTheory }"
            class="dark:border-zinc-800 lg:border-r-2 lg:border-l-0 border-l-2 px-3 py-2 text-sm cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-all duration-300 text-gray-900 dark:text-gray-100">
            {{ "Презентация: ".concat(props.quizTitle as string) }}
        </span>
    </div>
</template>

<script setup lang="ts">
const props = defineProps({
    title: String,
    quizTitle: String,
    meta: String,
    isTheory: Boolean
})
</script>

<style scoped>
.selectedToc {
    @apply lg:border-r-2 lg:border-l-0 border-l-2 border-sky-600 dark:border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300;
}
</style>