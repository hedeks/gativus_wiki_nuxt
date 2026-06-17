<template>
  <div class="p-8 text-center text-gray-500">
    Перенаправление в Workspace...
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'role'] })

onMounted(() => {
  navigateTo('/admin/workspace')
})
</script>
