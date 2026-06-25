<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  navigateTo('/admin/books?book_id=new')
})
</script>

<template>
  <div class="p-8 flex items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-3xl text-sky-500" />
    <span class="ml-2 text-sm text-gray-500">Перенаправление в Workspace...</span>
  </div>
</template>
