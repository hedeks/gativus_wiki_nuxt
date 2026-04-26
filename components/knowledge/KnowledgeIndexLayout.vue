<template>
  <div
    class="gv-index-page knowledge-index min-h-screen"
    :data-accent="accentTheme"
  >
    <div class="page-container">
      <div class="hero-zone">
        <PageHero :title="title" :description="description" crisp>
          <template #search>
            <slot name="search" />
          </template>
        </PageHero>
      </div>
      <slot />
    </div>
    <TheScrollToTop />
  </div>
</template>

<script setup lang="ts">
import type { KnowledgeIndexAccent } from '~/utils/ontologyVisual'

const props = defineProps<{
  title: string
  description: string
  accentTheme: KnowledgeIndexAccent
}>()

</script>

<style scoped>
.gv-index-page {
  background-color: #fff;
}
.dark .gv-index-page {
  background-color: #1a1a1a;
}

.page-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  padding: 24px 10px 56px;
  width: 100%;
  margin: 0 auto;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.hero-zone {
  position: relative;
  width: 100%;
}

.hero-zone::before {
  content: none;
}

.dark .hero-zone::before {
  content: none;
}

.hero-zone::after {
  content: none;
}

.dark .hero-zone::after {
  content: none;
}

.hero-zone :deep(.page-hero) {
  position: relative;
  z-index: 1;
}

@media (min-width: 941px) {
  .page-container {
    width: 900px;
    max-width: none;
    padding: 32px 0 60px;
  }
}
</style>

<style>
.knowledge-index[data-accent='book'] {
  --gv-primary: #0284c7;
  --gv-primary-hover: #0369a1;
}
.knowledge-index[data-accent='article'] {
  --gv-primary: #4f46e5;
  --gv-primary-hover: #4338ca;
}
.knowledge-index[data-accent='term'] {
  --gv-primary: #059669;
  --gv-primary-hover: #047857;
}

.knowledge-index .search-filters-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

@media (max-width: 640px) {
  .knowledge-index .search-filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .knowledge-index .expandable-filters {
    width: 100%;
  }

  .knowledge-index .expandable-filters .filters-row {
    width: 100%;
  }

  .knowledge-index .expandable-filters .filters-trigger {
    width: 100%;
    justify-content: space-between;
  }
}

.knowledge-index .filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--gv-primary) 18%, var(--gv-border-principal));
  background: var(--gv-surface-card);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.dark .knowledge-index .filter-group {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.knowledge-index .filter-group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--gv-primary) 45%, var(--gv-text-secondary));
}

.knowledge-index .filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.knowledge-index .search-shell {
  padding: 0;
  border-radius: 12px;
  border: none;
  background: transparent;
  box-shadow: none;
  box-sizing: border-box;
}

.dark .knowledge-index .search-shell {
  box-shadow: none;
}

.knowledge-index .search-clear-btn:hover {
  color: var(--gv-primary) !important;
}

.knowledge-index .expandable-filters .filters-trigger:hover {
  color: var(--gv-primary);
  border-color: color-mix(in srgb, var(--gv-primary) 32%, var(--gv-border-principal));
}

.dark .knowledge-index .expandable-filters .filters-trigger:hover {
  color: color-mix(in srgb, var(--gv-primary) 85%, #fff);
}

.knowledge-index .expandable-filters .filters-trigger.is-open {
  border-color: var(--gv-primary);
  color: var(--gv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gv-primary) 22%, transparent);
}

.dark .knowledge-index .expandable-filters .filters-trigger.is-open {
  color: color-mix(in srgb, var(--gv-primary) 88%, #fff);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gv-primary) 32%, transparent);
}

.knowledge-index .expandable-filters .filters-trigger.has-active {
  border-color: var(--gv-primary);
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 10%, var(--gv-surface-card));
}

.dark .knowledge-index .expandable-filters .filters-trigger.has-active {
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-card));
  color: color-mix(in srgb, var(--gv-primary) 88%, #fff);
}

.knowledge-index .expandable-filters .filters-dot {
  background: var(--gv-primary);
}

.knowledge-index .text-sky-500 {
  color: var(--gv-primary) !important;
}

.knowledge-index input.premium-search-input:focus {
  border-color: var(--gv-primary) !important;
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 22%, transparent),
    0 4px 12px rgba(0, 0, 0, 0.06) !important;
}

.dark .knowledge-index input.premium-search-input:focus {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--gv-primary) 35%, transparent),
    0 4px 12px rgba(0, 0, 0, 0.35) !important;
}

.knowledge-index .content-wrapper {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.knowledge-index .cards-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 12px;
}

.knowledge-index .pagination-footer {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.knowledge-index .pagination-button {
  font-weight: 700;
  min-width: 44px;
  height: 44px;
}

.knowledge-index .empty-state {
  width: 100%;
  text-align: center;
  padding: 48px 24px;
  box-sizing: border-box;
}


.knowledge-index .empty-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--gv-surface-header);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--gv-primary);
}

.dark .knowledge-index .empty-icon-wrap {
  background: #1e1e1e;
  color: color-mix(in srgb, var(--gv-primary) 70%, #e5e5e5);
}

.knowledge-index {
  scrollbar-gutter: stable;
}

.knowledge-index .empty-state p {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
}

.knowledge-index .reset-btn {
  margin-top: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gv-primary);
  background: none;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.knowledge-index .reset-btn:hover {
  text-decoration: underline;
  color: var(--gv-primary-hover);
}

</style>
