<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [
    function (to) {
      return navigateTo({
        path: '/categories',
        query: { slug: to.params.slug }
      }, { redirectCode: 301 })
    }
  ]
})
</script>

<style scoped>
/* placeholder */
</style>
