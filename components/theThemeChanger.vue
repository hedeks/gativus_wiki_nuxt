<template>
    <ClientOnly>
        <UToggle on-icon="i-heroicons-sun" off-icon="i-heroicons-moon"
            :ui="{ active: 'bg-yellow-300 dark:bg-yellow-400', icon: { on: 'text-black dark:text-white', off: 'text-black dark:text-white' } }"
            :model-value="selected" @click="changeTheme" />
    </ClientOnly>
</template>


<script setup lang="ts">
const colorMode = useColorMode();
type Theme = {
    light: boolean,
    dark: boolean,
}
const themes: Theme = {
    "light": true,
    "dark": false,
}
const getTheme = (themeName: keyof Theme) => themes[themeName];
const selected = ref(getTheme(colorMode.preference as keyof Theme));
const changeTheme = () => {
    if (getTheme(colorMode.preference as keyof Theme)) {
        colorMode.preference = "dark"
        selected.value = false;
    } else {
        colorMode.preference = "light"
        selected.value = true;
    }
}
</script>