<template>
  <div />
</template>

<script setup lang="ts">
/**
 * Legacy URL: content lives on the home page under #about-detail.
 */
definePageMeta({ layout: 'default' })

await navigateTo({ path: '/', hash: '#about-detail' }, { replace: true })
</script>
