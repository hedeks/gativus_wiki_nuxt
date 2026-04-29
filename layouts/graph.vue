<template>
  <div class="gv-public-layout kg-layout-root mx-auto min-h-dvh flex flex-col">
    <theHeader
      class="flex w-full flex-wrap sticky top-0 z-20 shrink-0 gv-glass border-b border-zinc-200 dark:border-zinc-800"
    />
    <main class="main flex w-full flex-1 flex-col min-h-0 min-w-0 z-[3]">
      <slot />
    </main>
    <theTermPopover />
  </div>
</template>

<style>
/* Под графом — ровная подложка; сам градиент холста только на .graph-container (frameless) */
.kg-layout-root {
  background: var(--gv-surface);
}
</style>
