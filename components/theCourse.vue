<script setup lang="ts">
const props = defineProps({
    title: String,
    name: String,
    path: String,
    description: String,
    imgPath: String,
});
const isShowDesc = ref(false);
</script>

<template>
    <UCard class="lg:w-104 h-fit sm:w-sm dark:shadow-darkShadow" :ui="{ ring:'dark:ring-gray-500', divide: 'dark:divide-gray-500' ,background: 'bg-gray-50 dark:bg-stone-950', header: {base: 'dark:bg-black rounded-t-lg bg-gray-100'} }">
        <template #header>
            <h2 class="text-lg text-center font-bold flex items-center justify-center">
                {{ props.title }}
            </h2>
        </template>
        <div class="flex flex-col ">
            <img @mouseover="isShowDesc = true" @mouseleave="isShowDesc = false" v-if="props.imgPath" :src="props.imgPath" alt="" class="mx-auto rounded-lg dark:shadow-darkShadow shadow h-64 object-cover w-full saturate-50 hover:saturate-0 hover:blur-sm blur-none hover ease-linear duration-300">
            <div class="grid grid-rows-[fit,fit] overflow-hidden visible transition-template-rows ease-in-out duration-300">
                <span class="mt-5 px-2 font-semibold text-lg row-span-1">Описание:</span>
                <p class="lowercase mt-5 px-2 dark:text-gray-300 text-gray-500 row-span-1 p-1">
                    {{ props.description }}
                </p>
            </div>
        </div>
        <UButton icon="i-heroicons-document-text" trailing block :to="'/courses/'+ props.name" color="black" variant="solid" square
            type="submit" class="mt-7 shadow dark:shadow-darkShadow"
            :ui="{ base: 'focus:outline-none focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0', body: { base: 'text-center' } }"
            label="Читать"></UButton>
        <template #footer>
            <div>
                <span>Прогресс:</span>
            </div>
        </template>
    </UCard>
</template>
