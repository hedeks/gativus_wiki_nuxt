

<template>
  <div class="gv-public-layout mx-auto">
    <theHeader />
    <main class="main flex flex-col w-full flex-1 items-center justify-items-center z-3">
      <slot />
    </main>
    <theFooter class="flex w-full p-1" />
    <theTermPopover />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DefaultLayout' })
</script>