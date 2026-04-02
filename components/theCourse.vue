<script setup lang="ts">
const props = defineProps({
    title: String,
    name: String,
    path: String,
    description: String,
    imgPath: String,
    meta: String,
});
const isShowDesc = ref(false);
</script>

<template>
    <UCard class="lg:w-104 h-fit sm:w-sm dark:shadow-darkShadow"
        :ui="{ ring: 'dark:ring-zinc-700', divide: 'dark:divide-zinc-700', background: 'bg-white dark:bg-zinc-900', header: { base: 'dark:bg-zinc-950 rounded-t-lg bg-gray-50' } }">
        <template #header>
            <div class="flex flex-col items-center justify-center gap-1">
                <span v-if="props.meta"
                    class="text-[10px] tracking-[0.3em] uppercase font-bold text-sky-600 dark:text-sky-400 opacity-80">
                    {{ props.meta }}
                </span>
                <h2
                    class="text-sm tracking-[0.2em] uppercase text-center font-bold flex items-center justify-center text-gray-900 dark:text-gray-100">
                    {{ props.title }}
                </h2>
            </div>
        </template>
        <div class="flex flex-col">
            <img @mouseover="isShowDesc = true" @mouseleave="isShowDesc = false" v-if="props.imgPath"
                :src="props.imgPath" alt=""
                class="mx-auto rounded-lg dark:shadow-darkShadow shadow h-64 object-cover w-full saturate-50 hover:saturate-100 transition-all duration-500">
            <div
                class="grid grid-rows-[fit,fit] overflow-hidden visible transition-template-rows ease-in-out duration-300">
                <span
                    class="mt-5 px-2 font-bold text-xs uppercase tracking-widest text-sky-600 dark:text-sky-400 row-span-1">Описание:</span>
                <p class="mt-2 px-2 dark:text-zinc-400 text-gray-600 row-span-1 p-1 text-sm leading-relaxed">
                    {{ props.description }}
                </p>
            </div>
        </div>
        <UButton icon="i-heroicons-book-open" trailing block :to="'/courses/' + props.name" color="sky" variant="solid"
            square type="submit" class="mt-7 shadow-lg shadow-sky-500/20"
            :ui="{ base: 'focus:outline-none focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0', body: { base: 'text-center' } }"
            label="ПЕРЕЙТИ"></UButton>
        <template #footer>
            <div
                class="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500">
                <span>Прогресс</span>
                <span class="text-sky-600 dark:text-sky-400">0%</span>
            </div>
        </template>
    </UCard>
</template>
