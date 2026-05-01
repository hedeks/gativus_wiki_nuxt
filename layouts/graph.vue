<template>
  <div class="gv-public-layout kg-layout-root mx-auto min-h-dvh flex flex-col">
    <theHeader />
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
