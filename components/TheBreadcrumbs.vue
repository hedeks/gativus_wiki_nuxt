<script setup lang="ts">
interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>

<template>
  <nav class="flex items-center gap-2 text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-4 uppercase tracking-[0.25em] overflow-hidden">
    <div v-for="(item, index) in items" :key="index" class="flex items-center gap-2">
      <NuxtLink 
        v-if="item.to" 
        :to="item.to" 
        class="hover:underline transition-all whitespace-nowrap opacity-80 hover:opacity-100"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="truncate opacity-100 cursor-default">
        {{ item.label }}
      </span>
      
      <span v-if="index < items.length - 1" class="opacity-30 flex-shrink-0">/</span>
    </div>
  </nav>
</template>

<style scoped>
/* Ensure the breadcrumbs don't wrap and look messy on tiny screens */
nav {
  white-space: nowrap;
}
</style>
