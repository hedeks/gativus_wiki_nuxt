<template>
  <ClientOnly>
    <GvButton
      type="button"
      size="sm"
      square
      variant="ghost"
      color="gray"
      :icon="selected ? 'i-heroicons-moon-20-solid' : 'i-heroicons-sun-20-solid'"
      :aria-label="selected ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="selected = !selected"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const selected = computed({
  get: () => colorMode.value === 'dark',
  set: (val) => { colorMode.preference = val ? 'dark' : 'light' },
})
</script>
