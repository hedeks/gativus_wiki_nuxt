<script setup lang="ts">
definePageMeta({
  layout: 'default',
});
const toast = useToast();
// if (user.value?.role !== "admin") {
//     navigateTo('/');
//     toast.add({ 'title': "не админам запрещено!" })
// }
useHead({
    title: "Панель управления тестами"
});
const { data: articles, error } = await useAsyncData("lection", () => $fetch('/api/lection/hunting-for-vulnerabilities-in-web-applications'))
const ast = ref();
if (articles.value !== undefined && articles.value !== null) {
    ast.value = await parseMarkdown(articles.value[0 as keyof {}] as string);
};
const isBlured = ref(false);
const changeAst = async () => {
    isBlured.value = true;
    if (articles.value !== undefined && articles.value !== null) {
        ast.value = await parseMarkdown(articles.value[0 as keyof {}] as string);
        isBlured.value = false;
    };
}
</script>

<template>
    <div class="w-full flex flex-col">
        <div class="min-w-full flex flex-col items-center justify-center my-5 prose">
            <h2>Игровая площадка до нового апдейта</h2>
            <div class="h-20 bg-gray-50 dark:bg-gray-950 w-full">
            </div>
        </div>
        <div class="flex w-full gap-2">
            <textarea v-model="articles[0]" @change="changeAst"
                class="w-1/2 lg:p-10 p-5 text-sm bg-gray-50 dark:bg-gray-950">
            </textarea>
            <div class="w-1/2">
                <ContentRendererMarkdown v-if="ast !== undefined" :value="ast" :class="{ 'blured': isBlured }"
                    class="min-w-full transition-all ease-in-out duration-300 parent lg:w-auto flex-col bg-gray-50 dark:bg-gray-950 lg:p-10 p-5 prose prose-sm prose-pre:text-black dark:prose-pre:text-white dark:prose-invert prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-gray-700 dark:prose-pre:bg-gray-800 prose-h1:font-semibold" />
            </div>
        </div>
    </div>
</template>

<style>
.blured {
    @apply blur saturate-0;
}
</style>