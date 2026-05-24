<template>
  <div class="book-card">
    <!-- Full-card link overlay -->
    <NuxtLink :to="to" class="card-link-overlay" :aria-label="title" tabindex="0" />

    <div class="card-accent" aria-hidden="true" />

    <div class="book-cover">
      <img v-if="coverImage" :src="coverImage" :alt="title" class="cover-img" />
      <div v-else class="cover-placeholder">
        <UIcon name="i-heroicons-book-open" class="w-7 h-7" />
      </div>
    </div>

    <div class="card-content">
      <div class="card-meta">
        <span
          v-for="(badge, i) in badges"
          :key="i"
          class="card-badge"
          :class="badge.class"
          :style="badge.style"
        >{{ badge.label }}</span>
        <span v-if="chapters !== undefined" class="card-index">
          {{ chapters }} {{ chaptersLabel }}
        </span>
      </div>

      <h3 class="card-title">{{ title }}</h3>

      <p v-if="descriptionHtml" class="card-description" v-html="descriptionHtml" />
      <p v-else-if="description" class="card-description">{{ description }}</p>
    </div>

    <!-- Preview button — z-index above the overlay link -->
    <button
      v-if="descriptionHtml || description"
      class="preview-btn"
      :title="previewLabel"
      @click.stop="$emit('preview')"
    >
      <UIcon name="i-heroicons-ellipsis-horizontal" class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CardBadge } from '~/components/common/ListItemCard.vue'

defineProps<{
  to: string
  title: string
  coverImage?: string
  description?: string
  descriptionHtml?: string
  badges?: CardBadge[]
  chapters?: number
  chaptersLabel?: string
  previewLabel?: string
}>()

defineEmits<{
  preview: []
}>()
</script>

<style scoped>
.book-card {
  --accent: #0ea5e9;
  --accent-soft: #f0f9ff;
  --accent-soft-dark: rgba(14, 165, 233, 0.08);
  --accent-hover-title: #0ea5e9;
  --accent-arrow-bg: #f0f9ff;
  --accent-arrow-bg-dark: rgba(14, 165, 233, 0.12);

  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 14px 14px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--gv-border-principal));
  border-radius: 14px;
  background: var(--gv-surface-card);
  box-shadow: var(--gv-shadow-sm);
  position: relative;
  transition:
    background 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.3s ease,
    transform 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.book-card:hover {
  background: var(--gv-surface-header);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-md);
  transform: translateY(-2px);
}

.dark .book-card:hover { background: #222222; }

/* Full-card link overlay */
.card-link-overlay {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  z-index: 1;
  outline-offset: 2px;
}

.card-link-overlay:focus-visible {
  outline: 2px solid var(--accent);
}

/* Left accent bar */
.card-accent {
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 0;
  border-left: 2px dashed var(--accent);
  border-radius: 0 3px 3px 0;
  opacity: 0.65;
}

/* Book cover */
.book-cover {
  flex-shrink: 0;
  width: 76px;
  height: 108px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--accent-soft);
  margin-left: 6px;
  box-shadow:
    2px 3px 8px rgba(0, 0, 0, 0.12),
    inset -1px 0 0 rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  position: relative;
  z-index: 2;
}

.dark .book-cover {
  background: var(--accent-soft-dark);
  box-shadow: 2px 3px 10px rgba(0, 0, 0, 0.35), inset -1px 0 0 rgba(0, 0, 0, 0.2);
}

.book-card:hover .book-cover {
  transform: scale(1.03) rotate(-0.5deg);
  box-shadow: 4px 6px 16px rgba(0, 0, 0, 0.18), inset -1px 0 0 rgba(0, 0, 0, 0.06);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  opacity: 0.7;
}

/* Content */
.card-content {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
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
  filter: brightness(1.1);
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

.card-index {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  margin-left: auto;
}

.dark .card-index { color: #71717a; }

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 6px;
  line-height: 1.4;
  transition: color 0.2s ease;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.dark .card-title { color: #e5e5e5; }
.book-card:hover .card-title { color: var(--accent-hover-title); }

.card-description {
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description :deep(strong) { font-weight: 700; }
.card-description :deep(em) { font-style: italic; }
.dark .card-description { color: #a1a1aa; }

/* Preview button */
.preview-btn {
  flex-shrink: 0;
  align-self: flex-end;
  position: relative;
  z-index: 2;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
  margin-bottom: 2px;
}

.book-card:hover .preview-btn,
.preview-btn:focus-visible {
  opacity: 1;
  color: var(--accent);
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 20%, transparent);
}

.dark .book-card:hover .preview-btn,
.dark .preview-btn:focus-visible {
  background: var(--accent-soft-dark);
}

.preview-btn:hover {
  transform: scale(1.1);
}

@media (max-width: 640px) {
  .book-card { padding: 12px 10px 12px 14px; gap: 12px; }
  .book-cover { width: 60px; height: 84px; margin-left: 2px; }
  .card-title { font-size: 13px; }
  .card-description { -webkit-line-clamp: 2; }

  /* Always show preview button on mobile (no hover) */
  .preview-btn {
    opacity: 0.5;
  }
}
</style>
