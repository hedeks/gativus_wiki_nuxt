<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UNotifications color="gray" :ui="{progress: {
       background: 'bg-black dark:bg-white',
    }}"/>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});
</script>

<style>

.page-enter-active,
.page-leave-active {
  transition: all 0.4s cubic-bezier(0.705,0.010,0.000,0.915);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(1rem);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s linear;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  filter: blur(0.1rem);
}
body {
  @apply dark:bg-zinc-900;
  overflow-y: scroll;
  line-height: 1.15;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
}
::selection {
  background: rgb(216, 216, 216) !important;
  color: #2c2c2c;
}
</style>
