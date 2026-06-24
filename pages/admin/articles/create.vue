<template>
  <div class="p-8 text-center text-gray-500">
    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
    <p>Перенаправление в Workspace...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

const route = useRoute()

onMounted(() => {
  navigateTo({
    path: '/admin/articles',
    query: { ...route.query, article_id: 'new' }
  }, { replace: true })
})
</script>
