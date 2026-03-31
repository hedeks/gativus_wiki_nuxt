<template>
    <div class="w-full mx-auto flex flex-col">
        <theHeader class="flex w-full flex-wrap p-1 sticky top-0 bg-white dark:bg-zinc-900 z-10" />
        <main class="main flex flex-col w-full p-3 lg:p-10 items-center justify-items-center dark:bg-zinc-900 z-3">
            <slot />
        </main>
        <theFooter class="flex w-full p-1" />
    </div>
</template>

<script setup lang="ts">

const links = [{
    label: 'Home',
    icon: 'i-heroicons-home',
    to: '/'
}, {
    label: 'Navigation',
    icon: 'i-heroicons-square-3-stack-3d'
}, {
    label: 'Breadcrumb',
    icon: 'i-heroicons-link'
}]
const route = useRoute();
</script>

<style>
:root {
    --footer-height: 93px;
}
.main {
    min-height: calc(100dvh - var(--header-height) - var(--footer-height));
}
.head {
    backdrop-filter: blur(10px);
}
</style>