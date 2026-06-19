<template>
  <div class="p-8 text-center text-gray-500">
    Перенаправление в Workspace...
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'role'] })

const route = useRoute()

onMounted(() => {
  navigateTo(`/admin/glossary?term_id=${route.params.id}`)
})
</script>
