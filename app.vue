<template>
  <div>
    <NuxtLoadingIndicator color="#0ea5e9" :height="3" />
    <NuxtLayout>
      <NuxtPage :transition="pageTransition" />
    </NuxtLayout>
    <UNotifications color="sky" :ui="{
      progress: {
        background: 'bg-sky-600 dark:bg-sky-400',
      }
    }" />
  </div>
</template>

<script setup lang="ts">
import './assets/css/article-prose.css'
import './assets/css/admin-about-cards.css'

import { runPendingScrollAfterPageLeave } from '~/utils/pendingRouteScroll'

const pageTransition = {
  name: 'fade',
  mode: 'out-in' as const,
  onAfterLeave() {
    runPendingScrollAfterPageLeave()
  },
}
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
  /* Фон «холста» — светлая тема: читаемый мягкий градиент (холодный серый) */
  --gv-canvas-gradient: linear-gradient(
    168deg,
    #fcfcfd 0%,
    #f5f7fb 20%,
    #ecf0f6 42%,
    #e4e9f2 64%,
    #dde3ec 100%
  );
  --gv-canvas-fallback: #ecf0f6;
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
  /* Тёмный холст: едва заметный градиент без полос */
  --gv-canvas-gradient: linear-gradient(
    168deg,
    #29292b 0%,
    #28282a 28%,
    #27272a 52%,
    #262628 78%,
    #27272a 100%
  );
  --gv-canvas-fallback: #27272a;
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
  min-height: 100%;
  background-color: var(--gv-canvas-fallback);
}
body {
  min-height: 100%;
  background: transparent;
  color: var(--gv-text-primary);
  overflow-y: scroll;
  line-height: 1.35;
}

/* Ссылки без подчёркивания по умолчанию (prose / контент) */
a {
  text-decoration: none;
}

a:hover {
  text-decoration: none;
}

.prose :where(a):not(:where([class~="not-prose"], [class~="not-prose"] *)) {
  text-decoration: none;
}

/* Публичный layout: тот же градиент и скролл вместе с контентом, что у admin-main (без fixed на html) */
.gv-public-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100dvh;
  background: var(--gv-canvas-gradient);
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

/* CTA перехода к презентации (статьи / глоссарий) */
.gv-pres-cta {
  margin-top: 1.25rem;
  border-radius: var(--gv-radius-container);
  border: 1px solid color-mix(in srgb, var(--gv-primary) 32%, var(--gv-border-principal));
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card)) 0%,
    var(--gv-surface-card) 70%
  );
  box-shadow: var(--gv-shadow-sm);
  overflow: hidden;
}

.gv-pres-cta .gv-btn {
  border-radius: 0;
  width: 100%;
  min-height: 3.5rem;
  font-size: clamp(1rem, 2.2vw, 1.25rem);
  font-weight: 700;
  letter-spacing: 0.06em;
}

.dark .gv-pres-cta {
  border-color: color-mix(in srgb, var(--gv-primary) 40%, var(--gv-border-principal));
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

/* GvButton + pill: тон кнопки из компонента иначе перебивает глобальные пиллы */
.gv-filter-pill.gv-btn.gv-btn--chromeless {
  background: var(--gv-surface-card) !important;
  color: var(--gv-text-secondary) !important;
  border: 1px solid var(--gv-border-principal) !important;
  box-shadow: none !important;
  text-transform: uppercase !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: 0.08em !important;
  padding: 8px 14px !important;
  border-radius: 12px !important;
  gap: 6px !important;
  line-height: inherit !important;
  font-family: inherit !important;
}
.gv-filter-pill.gv-btn.gv-btn--chromeless:hover:not(.gv-btn--disabled) {
  border-color: var(--gv-primary) !important;
  color: var(--gv-primary) !important;
  transform: translateY(-1px);
}
.gv-filter-pill.gv-btn.gv-btn--chromeless.is-active {
  border-color: var(--gv-primary) !important;
  background: color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-card)) !important;
  color: var(--gv-primary) !important;
  box-shadow: var(--gv-shadow-sm) !important;
}

.gv-focusable:focus-visible {
  outline: 2px solid var(--gv-primary);
  outline-offset: 2px;
}

.gv-admin-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.gv-admin-surface {
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  background: var(--gv-surface-card);
  box-shadow: var(--gv-shadow-sm);
}

.gv-admin-head {
  padding: 14px 18px;
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  background: var(--gv-surface-card);
}

.gv-admin-eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--gv-text-secondary);
}

.gv-admin-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-primary);
}

.gv-admin-subtitle {
  margin: 6px 0 0;
  color: var(--gv-text-secondary);
  font-size: 14px;
}

.gv-admin-index-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.gv-admin-index-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.gv-admin-filter-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.gv-admin-search {
  position: relative;
  flex: 1;
}

.gv-admin-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--gv-text-secondary);
}

.gv-admin-search-input,
.gv-admin-filter-select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--gv-border-principal);
  border-radius: 10px;
  background: var(--gv-surface-card);
  color: var(--gv-text-primary);
  font-size: 14px;
}

.gv-admin-search-input {
  padding: 10px 12px 10px 38px;
}

.gv-admin-filter-select {
  padding: 10px 12px;
  min-width: 180px;
}

.gv-admin-search-input:focus,
.gv-admin-filter-select:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--gv-primary) 45%, var(--gv-border-principal));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gv-primary) 14%, transparent);
}

@media (max-width: 768px) {
  .gv-admin-page {
    gap: 12px;
  }

  .page-header,
  .articles-header,
  .sync-header,
  .import-header,
  .form-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start !important;
    gap: 10px;
  }

  .header-actions,
  .page-actions,
  .form-actions,
  .modal-actions,
  .import-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .table-wrap,
  .terms-table-wrap,
  .books-list {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .articles-table,
  .terms-table,
  .admin-table {
    min-width: 760px;
  }
}

@media (max-width: 480px) {
  .gv-admin-title {
    font-size: 19px;
    letter-spacing: 0.04em;
  }

  .gv-admin-subtitle {
    font-size: 13px;
  }

  .gv-admin-index-actions {
    width: 100%;
  }

  .gv-admin-index-actions > * {
    flex: 1 1 auto;
  }

  .gv-admin-filter-row {
    flex-direction: column;
  }

  .gv-admin-filter-select {
    min-width: 0;
  }

  .gv-admin-page input,
  .gv-admin-page select,
  .gv-admin-page textarea {
    font-size: 16px;
  }
}

@media (max-width: 360px) {
  .gv-admin-page {
    gap: 10px;
  }

  .gv-admin-head {
    padding: 10px 12px;
  }

  .gv-admin-eyebrow {
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  .gv-admin-title {
    font-size: 17px;
    letter-spacing: 0.03em;
  }

  .gv-admin-subtitle {
    margin-top: 4px;
    font-size: 12px;
  }

  .gv-admin-search-input,
  .gv-admin-filter-select {
    min-height: 40px;
    font-size: 16px;
  }

  .header-actions,
  .page-actions,
  .form-actions,
  .modal-actions,
  .import-actions {
    gap: 8px;
  }

  .header-actions > *,
  .page-actions > *,
  .form-actions > *,
  .modal-actions > *,
  .import-actions > * {
    width: 100%;
  }
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

