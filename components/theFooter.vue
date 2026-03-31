<script setup>
const links = [{
    label: 'Главная',
    icon: 'i-heroicons-home',
    to: '/'
},
{
    label: 'Книги Gativus',
    icon: 'i-heroicons-book-open',
    to: '/courses'
}, {
    label: 'О проекте',
    icon: "i-heroicons-information-circle",
    to: "/about"
}];

</script>


<template>
    <footer
        class="rounded-tr rounded-tl flex flex-col py-5 gap-5 justify-center items-center border-t border-gray-200 dark:border-gray-500 dark:bg-zinc-900">
        <UHorizontalNavigation :links="links"
            :ui="{container: 'flex items-center justify-center min-w-0 flex-wrap', label: 'xl:text-lg', active: 'after:bg-gray-500 dark:after:bg-gray-500-inverted' }"
            class="text-lg flex flex-wrap w-fit justify-self-center col-span-1" />
        <div class="dark:border-gray-500 border-b w-full"></div>
        <h3 class="xl:text-lg text-center text-gray-800 dark:text-gray-300">Gativus Wiki — Официальная база знаний по вселенной Gativus
            <br> Проект по сохранению истории и лора мира Gativus <br> 2024 - 2026 </h3>
    </footer>
</template>