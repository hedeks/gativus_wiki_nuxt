<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UNotifications color="sky" :ui="{
      progress: {
        background: 'bg-sky-600 dark:bg-sky-400',
      }
    }" />
  </div>
</template>

<script setup lang="ts">
// userStore recovers session automatically via useCookie
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
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
  background: #bae6fd !important; /* sky-200 */
  color: #0c4a6e; /* sky-900 */
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9; /* slate-100 */
}

.dark ::-webkit-scrollbar-track {
  background: #18181b; /* zinc-900 */
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* slate-300 */
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.dark ::-webkit-scrollbar-thumb {
  background: #3f3f46; /* zinc-700 */
}

::-webkit-scrollbar-thumb:hover {
  background: #0ea5e9; /* sky-500 */
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #0284c7; /* sky-600 */
}
</style>

