<template>
  <div>
    <NuxtLoadingIndicator color="#0ea5e9" :height="3" />
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
@font-face {
  font-family: "Gill Sans";
  src: url("/fonts/GillSansC.woff2") format("woff2"),
       url("/fonts/GillSansC.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Gill Sans";
  src: url("/fonts/GillSansLightBold.woff2") format("woff2"),
       url("/fonts/GillSansLightBold.woff") format("woff");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

:root {
  --gv-surface: #ffffff;
  --gv-surface-card: #ffffff;
  --gv-surface-header: #f9f9f9;
  --gv-text-primary: #18181b;
  --gv-text-secondary: #52525b;
  --gv-border-principal: #e4e4e7;
  --gv-border-subtle: #f4f4f5;
  --gv-primary: #0284c7;
  --gv-primary-hover: #0369a1;
  --gv-radius-container: 15px;
  --gv-radius-control: 12px;
  --gv-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --gv-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --gv-shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.dark {
  --gv-surface: #18181b;
  --gv-surface-card: #1a1a1a;
  --gv-surface-header: #222222;
  --gv-text-primary: #e5e5e5;
  --gv-text-secondary: #a1a1aa;
  --gv-border-principal: #27272a;
  --gv-border-subtle: #3f3f46;
  --gv-primary: #0ea5e9;
  --gv-primary-hover: #38bdf8;
  --gv-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.35);
  --gv-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --gv-shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
}

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
html {
  font-family: Arial, sans-serif;
}
body {
  background: var(--gv-surface);
  color: var(--gv-text-primary);
  overflow-y: scroll;
  line-height: 1.35;
}

.gv-page {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.gv-hero-title {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gv-text-primary);
}

.gv-hero-gradient {
  background: linear-gradient(135deg, #0c4a6e, #0ea5e9, #0284c7, #0c4a6e);
  background-size: 300% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gv-shine 15s linear infinite;
}

.dark .gv-hero-gradient {
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0ea5e9, #7dd3fc);
  background-size: 300% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes gv-shine {
  to {
    background-position: 300% center;
  }
}

.gv-hero-subtitle {
  margin: 0;
  color: var(--gv-text-secondary);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
}

.gv-surface-card {
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  background: var(--gv-surface-card);
  box-shadow: var(--gv-shadow-sm);
}

.gv-card-header {
  background: var(--gv-surface-header);
  border-bottom: 1px solid var(--gv-border-principal);
  padding: 14px 20px;
}

.gv-btn-primary {
  background: var(--gv-primary);
  color: #fff;
  border-radius: var(--gv-radius-control);
  transition: all 0.3s ease;
}

.gv-btn-primary:hover {
  background: var(--gv-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--gv-shadow-md);
}

.gv-glass {
  background: color-mix(in srgb, var(--gv-surface) 80%, transparent);
  backdrop-filter: blur(12px);
}

.gv-focus:focus-visible {
  outline: 2px solid var(--gv-primary);
  outline-offset: 2px;
}

.gv-muted {
  color: var(--gv-text-secondary);
}

.gv-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.gv-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 12px;
  border: 1px solid var(--gv-border-principal);
  color: var(--gv-text-secondary);
  background: var(--gv-surface-card);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: all 0.3s ease;
}

.gv-filter-pill:hover {
  border-color: var(--gv-primary);
  color: var(--gv-primary);
  transform: translateY(-1px);
}

.gv-filter-pill.is-active {
  border-color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card));
  color: var(--gv-primary);
  box-shadow: var(--gv-shadow-sm);
}

.gv-focusable:focus-visible {
  outline: 2px solid var(--gv-primary);
  outline-offset: 2px;
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

