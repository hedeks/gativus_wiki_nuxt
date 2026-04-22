<template>
    <ClientOnly>
        <UToggle on-icon="i-heroicons-moon-20-solid" off-icon="i-heroicons-sun-20-solid" :ui="{
            active: 'bg-sky-700 dark:bg-sky-600',
            inactive: 'bg-zinc-200 dark:bg-zinc-800',
            icon: {
                on: 'text-sky-50 dark:text-sky-100',
                off: 'text-amber-600 dark:text-amber-400'
            }
        }" v-model="selected" />
    </ClientOnly>
</template>


<script setup lang="ts">
const colorMode = useColorMode();
const selected = computed({
    // Use colorMode.value (resolved) not colorMode.preference (raw).
    // preference can be 'system', which makes === 'dark' always false on first load,
    // causing the toggle to mismatch what's actually rendered.
    get: () => colorMode.value === 'dark',
    set: (val) => {
        colorMode.preference = val ? 'dark' : 'light';
    }
});
</script>