<template>
    <div class="gv-public-layout mx-auto">
        <theHeader class="flex w-full flex-wrap sticky top-0 z-20 gv-glass border-b border-zinc-200 dark:border-zinc-800" />
        <main class="main flex flex-col w-full flex-1 items-center justify-items-center z-3">
            <slot />
        </main>
        <theFooter class="flex w-full p-1" />
        <!-- Global term popover — handles all .wiki-term clicks -->
        <theTermPopover />
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
.head {
    backdrop-filter: blur(10px);
}
</style>