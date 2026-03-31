<template>
    <UCard class="w-full min-h-full dark:shadow-darkShadow" :ui="{ ring:'dark:ring-gray-500', divide: 'dark:divide-gray-500' ,background: 'bg-white dark:bg-neutral-900', header: {base: 'dark:bg-black rounded-xl bg-gray-50'} }">
        <template #header>
            <h1 class="text-3xl font-bold">
                Доступные темы
            </h1>
        </template>
        <div class="flex flex-col flex-wrap gap-5 items-center justify-center">
            <div class="flex flex-wrap gap-8 items-start justify-center h-fit">
                <theCourse v-for="article in articles" :key="article.data.courseID" :title="article.data.metaTitle"
                    :description="article.data.description" :name="article.data.name" :imgPath="article.data.imgPath" />
            </div>
            <hr class="w-full dark:border-gray-500">
            <h2 class="text-3xl font-bold w-full text-start">
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