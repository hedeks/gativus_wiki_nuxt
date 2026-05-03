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
  <nav class="gv-breadcrumbs flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 mb-4 uppercase tracking-[0.25em]">
    <div v-for="(item, index) in items" :key="index" class="flex flex-wrap items-baseline gap-2 min-w-0">
      <NuxtLink 
        v-if="item.to" 
        :to="item.to" 
        class="min-w-0 max-w-full break-words hover:underline transition-all opacity-80 hover:opacity-100"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="min-w-0 max-w-full break-words opacity-100 cursor-default">
        {{ item.label }}
      </span>
      
      <span v-if="index < items.length - 1" class="opacity-30 flex-shrink-0">/</span>
    </div>
  </nav>
</template>

<style scoped>
.gv-breadcrumbs {
  overflow-wrap: anywhere;
}
</style>
