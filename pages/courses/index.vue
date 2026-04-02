<template>
    <UCard class="w-full min-h-full dark:shadow-darkShadow"
        :ui="{ ring: 'dark:ring-zinc-700', divide: 'dark:divide-zinc-700', background: 'bg-white dark:bg-zinc-900', header: { base: 'dark:bg-zinc-950 rounded-xl bg-gray-50' } }">
        <template #header>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-0">
                Доступные статьи в Гативус
            </h1>
        </template>
        <div class="flex flex-col flex-wrap gap-5 items-center justify-center">
            <div class="flex flex-wrap gap-8 items-start justify-center h-fit pt-4">
                <theCourse v-for="article in articles" :key="article.data.courseID" :title="article.data.metaTitle"
                    :meta="article.data.meta" :description="article.data.description" :name="article.data.name"
                    :imgPath="article.data.imgPath" />
            </div>
            <hr class="w-full border-gray-100 dark:border-zinc-800 my-8">
            <h2
                class="text-2xl font-bold w-full text-start text-gray-900 dark:text-gray-100 uppercase tracking-widest opacity-50">
                В прошлый раз вы остановились здесь
            </h2>
        </div>
    </UCard>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'default',
});
useHead({
    title: "Курсы"
})
const { data: lections, error } = await useAsyncData("lections", () => $fetch('/api/lection/'))
let ast = [];
if (lections.value) {
    for (let lection of lections.value) {
        ast.push(await parseMarkdown(lection as string))
    }
}
const articles = ast.sort((a, b) => a.data.course_id - b.data.course_id);
</script>