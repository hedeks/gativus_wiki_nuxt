<template>
  <div class="flex flex-col gap-20 flex-wrap w-full lg:px-10">
    <div id="firstView" ref="firstView" class="view">
      <h1 :class="{'blured': isBlur}" class="ease-in-out duration-500 lg:text-6xl text-4xl font-bold text-center">
        Gativus Wiki: <span class=" text-gray-600 dark:text-gray-400 uppercase">База знаний</span>
      </h1>
      <p :class="{'blured': isBlur}" class="ease-in-out duration-300 text-center font-semibold text-md lg:text-lg text-gray-500 dark:text-gray-400">Архивы, лор и ключевые события вселенной Gativus
        <br> Ваша точка входа в глубокую историю нашего мира
      </p>
      <div @click="navigateTo('/courses')" @mouseover="isBlur = true" @mouseleave="isBlur = false" class="ease-in-out duration-500 flex hover:scale-105 hover:bg-white hover:dark:bg-black hover:border-black dark:hover:border-white hover:underline dark:border-gray-600 cursor-pointer shadow dark:shadow-darkShadow gap-5 py-3 px-5 w-sm border rounded bg-gray-100 dark:bg-stone-800 dark:border-gray-400">
        <span class="line-height">
          Приступить к изучению!
        </span>
        <UIcon :class="{'move': isBlur}" :name="'i-heroicons-arrow-right-circle'" class="ease-in-out duration-500 font flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto dark:invert" />
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">

const isBlur = ref(false)

useSeoMeta({
  ogImage: '/logo.svg',
  description: "Gativus Wiki — Официальная база знаний по вселенной Gativus. Архивы, история и персонажи.",
  ogDescription: "Gativus Wiki — Официальная база знаний по вселенной Gativus. Архивы, история и персонажи.",
  title: "Gativus Wiki - Главная",
});
useHead({
  htmlAttrs: {
    lang: 'en'
  },
  link: [
    {
      rel: 'icon',
      type: 'image/svg',
      href: '/logo.svg'
    }
  ]
});
</script>

<style scoped>
.view {
  @apply flex px-3 flex-col lg:h-[calc(100dvh_-_var(--header-height)_-_5rem)] gap-5 items-center justify-center h-[calc(100dvh_-_var(--header-height)_-_1.5rem)] col-span-10 transition ease-in-out duration-500;
}
.blured {
  @apply blur scale-95;
}
.move {
  @apply translate-x-2;
}
.line-height {
  line-height: 1;
}
</style>