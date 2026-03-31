<template>
    <div class="flex flex-col dark:border-gray-600 lg:sticky h-fit">
        <p class="text-sm tracking-widest font-bold text-black dark:text-white uppercase">От теории</p>
        <span @click="$emit('changeView', 'lection')" :class="{'selectedToc': props.isTheory}" class="dark:border-gray-600 border-l-2 lg:border-l-0 lg:border-r-2 px-3 py-1 scroll-m-40 text-sm cursor-pointer hover:text-gray-300 dark:hover:text-gray-600 transition-all:ease duration-200">{{"Лекция. ".concat(props.quizTitle as string)}}</span>
        <p class="text-sm tracking-widest font-bold text-black dark:text-white uppercase">К практике</p>
        <span @click="$emit('changeView', 'quiz')" :class="{'selectedToc': !props.isTheory}" class="dark:border-gray-600 lg:border-r-2 lg:border-l-0 border-l-2 scroll-m-40 px-3 py-1 text-sm cursor-pointer hover:text-gray-300 dark:hover:text-gray-600 transition-all:ease duration-200">{{ "Тест. ".concat(props.quizTitle as string) }}</span>
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
    @apply lg:border-r-2 lg:border-l-0 border-l-2 border-gray-950 dark:border-gray-200 bg-gray-200 dark:bg-zinc-800;
}
</style>