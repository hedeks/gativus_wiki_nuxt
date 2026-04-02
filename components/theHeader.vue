<script setup lang="ts">
let header = ref<HTMLElement>();
let headerHeight = ref<Number>(0);
const updateVar = () => {
  if (header.value) {
    headerHeight.value = header.value.clientHeight;
  }
  document.body.style.setProperty('--header-height', `${headerHeight.value}px`)
}
onMounted(() => {
  updateVar();
});
window?.addEventListener("resize", updateVar);
const links = [{
  label: 'Главная',
  icon: 'i-heroicons-home',
  to: '/'
}, {
  label: 'Книги Gativus',
  icon: 'i-heroicons-book-open',
  to: '/books'
}, {
  label: 'Глоссарий',
  icon: 'i-heroicons-document-magnifying-glass',
  to: '/glossary'
}, {
  label: 'Граф знаний',
  icon: 'i-heroicons-share',
  to: '/knowledge-graph'
}, {
  label: 'О проекте',
  icon: "i-heroicons-information-circle",
  to: "/about"
}]
</script>

<template>
  <div id="header" ref="header"
    class="flex flex-wrap px-4 py-2 lg:grid lg:grid-cols-4 gap-4 items-center justify-between border-b dark:border-zinc-800 border-gray-100 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
    <theSiteLogo class="col-span-1" />
    <UHorizontalNavigation :links="links"
      :ui="{ 
        container: 'flex items-center justify-center min-w-0 flex-wrap gap-2', 
        label: 'xl:text-base font-bold', 
        active: 'after:bg-sky-600 dark:after:bg-sky-400 text-sky-600 dark:text-sky-400',
        inactive: 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
      }"
      class="flex flex-wrap w-fit justify-self-center col-span-2" />
    <div class="flex items-center w-fit gap-4 col-span-1 justify-self-end">
      <theThemeChanger />
    </div>
  </div>
</template>

<style>
:root {
  --header-height: 65px;
}
</style>