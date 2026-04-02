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
    class="rounded-br rounded-bl flex flex-wrap px-2 lg:grid lg:grid-cols-4 gap-2 items-center justify-center border-b dark:border-gray-500 border-gray-200 ">
    <theSiteLogo class="col-span-1" />
    <UHorizontalNavigation :links="links"
      :ui="{ container: 'flex items-center justify-center min-w-0 flex-wrap', label: 'xl:text-lg', active: 'after:bg-gray-500 dark:after:bg-gray-500-inverted' }"
      class="text-lg flex flex-wrap w-fit justify-self-center col-span-2" />
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