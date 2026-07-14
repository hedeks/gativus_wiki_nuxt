<template>
  <transition name="story-slide">
    <div class="featured-stories-panel kg-glass-surface" @wheel.stop @mousewheel.stop @mousedown.stop>
      <div class="stories-header">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-sparkles" class="stories-icon" />
          <span class="font-semibold">{{ t?.guidedTours || 'Экскурсии' }}</span>
        </div>
        <GvButton
          type="button"
          unstyled
          chromeless
          square
          class="action-btn stories-toggle-btn"
          :icon="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          @click="isExpanded = !isExpanded"
        />
      </div>
      
      <div v-show="isExpanded" class="stories-content">
        <div v-if="!stories || stories.length === 0" class="empty-stories">
          {{ t?.noStories || 'Нет доступных экскурсий' }}
        </div>
        <div v-else class="stories-list">
          <button
            v-for="story in stories"
            :key="story.id"
            class="story-card"
            @click="$emit('play', story)"
          >
            <div class="story-card-title">{{ story.title }}</div>
            <div v-if="story.description" class="story-card-desc">{{ story.description }}</div>
            <div class="story-card-meta">{{ story.nodes_path?.length || 0 }} {{ t?.stepsCount || 'шагов' }}</div>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  stories: any[]
  t?: Record<string, string>
}>()

defineEmits(['play'])

const isExpanded = ref(true)
</script>

<style scoped>
.featured-stories-panel {
  position: absolute;
  top: 80px;
  left: 24px;
  width: 320px;
  z-index: 45;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--gv-shadow-lg, 0 10px 40px -10px rgba(0,0,0,0.5));
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 30%, transparent);
  background: color-mix(in srgb, var(--gv-surface-card) 85%, transparent);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
}

.stories-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--gv-surface-layout) 60%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--gv-border-principal) 20%, transparent);
  color: var(--gv-text-primary);
  cursor: pointer;
}

.stories-icon {
  color: var(--gv-primary, #0ea5e9);
  font-size: 1.25rem;
}

.stories-content {
  padding: 12px;
  max-height: 40vh;
  overflow-y: auto;
}

.empty-stories {
  text-align: center;
  color: var(--gv-text-tertiary);
  font-size: 0.85rem;
  padding: 20px 0;
}

.stories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.story-card {
  text-align: left;
  padding: 12px;
  border-radius: 8px;
  background: var(--gv-surface-layout);
  border: 1px solid var(--gv-border-principal);
  transition: all 0.2s;
  cursor: pointer;
}

.story-card:hover {
  border-color: var(--gv-primary, #0ea5e9);
  background: color-mix(in srgb, var(--gv-surface-layout) 80%, var(--gv-primary, #0ea5e9) 5%);
}

.story-card-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--gv-text-primary);
  margin-bottom: 4px;
}

.story-card-desc {
  font-size: 0.8rem;
  color: var(--gv-text-secondary);
  line-height: 1.4;
  margin-bottom: 6px;
}

.story-card-meta {
  font-size: 0.75rem;
  color: var(--gv-primary, #0ea5e9);
  font-weight: 500;
}

@media (max-width: 640px) {
  .featured-stories-panel {
    top: auto;
    bottom: 24px;
    left: 12px;
    right: 12px;
    width: auto;
    max-height: 50vh;
  }
}
</style>
