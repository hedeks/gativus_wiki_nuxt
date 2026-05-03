<!-- components/common/ListItemCard.vue -->
<template>
  <NuxtLink
    :to="to"
    class="list-item-card group"
    :data-variant="variant"
    :data-category-link="categoryLinkKind"
  >
    <div class="card-accent" aria-hidden="true" />

    <div class="card-icon">
      <UIcon
        :name="icon || 'i-heroicons-document-text'"
        class="w-5 h-5"
        :class="iconClass"
      />
    </div>

    <div class="card-content">
      <div class="card-meta">
        <span
          v-for="(badge, i) in badges"
          :key="i"
          class="card-badge"
          :class="badge.class"
          :style="badge.style"
        >
          <UIcon v-if="badge.icon" :name="badge.icon" class="w-3 h-3" />
          {{ badge.label }}
        </span>
        <span v-if="index !== undefined" class="card-index">{{ index }}</span>
      </div>

      <h3 class="card-title">{{ title }}</h3>

      <p v-if="description" class="card-description line-clamp-2">
        {{ description }}
      </p>
    </div>

    <div class="card-arrow">
      <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type {
  CategoryLinkKind,
  KnowledgeEntityVariant,
} from '~/utils/ontologyVisual'

export interface CardBadge {
  label: string
  icon?: string
  class?: string
  style?: Record<string, string>
}

withDefaults(
  defineProps<{
    to: string
    icon?: string
    iconClass?: string
    title: string
    description?: string
    badges?: CardBadge[]
    index?: string | number
    variant?: KnowledgeEntityVariant
    categoryLinkKind?: CategoryLinkKind
  }>(),
  {
    variant: 'book',
    categoryLinkKind: 'virtual',
  }
)
</script>

<style scoped>
.list-item-card {
  --accent: #0ea5e9;
  --accent-soft: #f0f9ff;
  --accent-soft-dark: rgba(14, 165, 233, 0.08);
  --accent-hover-title: #0ea5e9;
  --accent-arrow-bg: #f0f9ff;
  --accent-arrow-bg-dark: rgba(14, 165, 233, 0.12);

  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--gv-border-principal));
  border-radius: 14px;
  background: var(--gv-surface-card);
  box-shadow: var(--gv-shadow-sm);
  text-decoration: none !important;
  position: relative;
  transition:
    background 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.3s ease,
    transform 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.list-item-card:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 40%, var(--gv-border-principal));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent), var(--gv-shadow-md);
}

.list-item-card[data-variant='article'] {
  --accent: #6366f1;
  --accent-soft: #eef2ff;
  --accent-soft-dark: rgba(99, 102, 241, 0.1);
  --accent-hover-title: #6366f1;
  --accent-arrow-bg: #eef2ff;
  --accent-arrow-bg-dark: rgba(99, 102, 241, 0.14);
}

.list-item-card[data-variant='term'] {
  --accent: #10b981;
  --accent-soft: #ecfdf5;
  --accent-soft-dark: rgba(16, 185, 129, 0.1);
  --accent-hover-title: #10b981;
  --accent-arrow-bg: #ecfdf5;
  --accent-arrow-bg-dark: rgba(16, 185, 129, 0.14);
}

.dark .list-item-card {
  border-color: color-mix(in srgb, var(--accent) 12%, var(--gv-border-principal));
}

.list-item-card:hover {
  background: var(--gv-surface-header);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-md);
  transform: translateY(-1px);
}

.dark .list-item-card:hover {
  background: #222222;
}

.card-accent {
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 0;
  border-left: 2px solid var(--accent);
  border-radius: 0 3px 3px 0;
  opacity: 0.75;
}

.list-item-card[data-category-link='virtual'] .card-accent {
  border-left-style: dashed;
  opacity: 0.65;
}

.list-item-card[data-category-link='structural'] .card-accent {
  border-left-style: solid;
  opacity: 0.92;
}

.card-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  margin-left: 6px;
  margin-top: 2px;
  border-radius: 9px;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease, background 0.25s ease;
  color: var(--accent);
}

.dark .card-icon {
  background: var(--accent-soft-dark);
  color: var(--accent);
  filter: brightness(1.15);
}

.list-item-card:hover .card-icon {
  transform: scale(1.05);
}

.dark .list-item-card:hover .card-icon {
  filter: brightness(1.25);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.35px;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 7px;
  border-radius: 5px;
}

.dark .card-badge {
  background: var(--accent-soft-dark);
  color: var(--accent);
  filter: brightness(1.1);
}

.card-badge.secondary {
  color: #6366f1;
  background: #eef2ff;
}

.dark .card-badge.secondary {
  background: rgba(99, 102, 241, 0.18);
  color: #a5b4fc;
}

.card-badge.category-badge {
  color: inherit;
  background: transparent;
  border: 1px solid currentColor;
}

.card-badge.ontology-category {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(254, 242, 242, 0.85);
}

.dark .card-badge.ontology-category {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
  border-color: rgba(252, 165, 165, 0.35);
}

.card-badge.ontology-book-bridge {
  color: #0ea5e9;
  background: #f0f9ff;
  border: 1px solid rgba(14, 165, 233, 0.25);
}

.dark .card-badge.ontology-book-bridge {
  background: rgba(14, 165, 233, 0.12);
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.25);
}

.card-badge.ontology-article-bridge {
  color: #6366f1;
  background: #eef2ff;
  border: 1px solid rgba(99, 102, 241, 0.25);
}

.dark .card-badge.ontology-article-bridge {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}

.card-index {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

.dark .card-index {
  color: #71717a;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  line-height: 1.4;
  transition: color 0.2s ease;
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
}

.dark .card-title {
  color: #e5e5e5;
}

.list-item-card:hover .card-title {
  color: var(--accent-hover-title);
}

.card-description {
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  margin-top: 4px;
  margin-bottom: 0;
}

.dark .card-description {
  color: #a1a1aa;
}

.card-arrow {
  flex-shrink: 0;
  align-self: center;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  transition: all 0.25s ease;
  opacity: 0;
  transform: translateX(-8px);
}

.list-item-card:hover .card-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--accent);
  background: var(--accent-arrow-bg);
}

.dark .list-item-card:hover .card-arrow {
  background: var(--accent-arrow-bg-dark);
}

@media (max-width: 640px) {
  .list-item-card {
    padding: 12px 14px;
    gap: 10px;
  }

  .card-icon {
    width: 32px;
    height: 32px;
    margin-left: 4px;
  }

  .card-title {
    font-size: 13px;
  }

  .card-description {
    font-size: 12px;
    line-height: 1.45;
  }
}
</style>
