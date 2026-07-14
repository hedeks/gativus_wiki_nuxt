<template>
  <transition name="story-slide">
    <div v-if="isOpen" class="storytelling-panel kg-glass-surface" @wheel.stop @mousewheel.stop @mousedown.stop>
      <div class="story-header">
        <UIcon name="i-heroicons-sparkles" class="story-icon" />
        <span>{{ headerText }}</span>
        <GvButton
          type="button"
          unstyled
          chromeless
          square
          class="action-btn story-close-btn"
          icon="i-heroicons-x-mark"
          title="Exit Story Mode"
          aria-label="Exit Story Mode"
          @click="$emit('close')"
        />
      </div>
      
      <div class="story-progress">
        <div class="story-steps">
          <div 
            v-for="(node, idx) in path" 
            :key="node.id"
            class="story-step"
            :class="{ 'is-active': idx === currentIndex, 'is-past': idx < currentIndex }"
          >
            <UIcon :name="getNodeIcon(node)" class="step-icon" :style="{ color: getNodeColor(node) }" />
            <span class="step-label">{{ node.title }}</span>
            <div v-if="idx < path.length - 1" class="step-line"></div>
          </div>
        </div>
      </div>

      <div class="story-content" v-if="currentNode">
        <div class="story-content-title">{{ currentNode.title }}</div>
        
        <p v-if="customMessages && customMessages[currentIndex]" class="story-content-msg">{{ customMessages[currentIndex] }}</p>
        <p v-else-if="currentNode.description" class="story-content-desc" v-html="renderInlineMarkup(currentNode.description)" />
        
        <div class="story-footer-hint">
          <kbd>Space</kbd> / <kbd>Enter</kbd> <span>{{ isLast ? 'to finish' : 'to continue' }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderInlineMarkup } from '~/utils/renderInlineMarkup'

const props = defineProps<{
  isOpen: boolean
  path: any[]
  currentIndex: number
  customMessages?: Record<number, string>
}>()

defineEmits(['close'])

const currentNode = computed(() => props.path[props.currentIndex])
const isLast = computed(() => props.currentIndex >= props.path.length - 1)

const headerText = computed(() => {
  return 'Guided Tour'
})

const getNodeIcon = (node: any) => {
  if (!node) return 'i-heroicons-document'
  if (node.type === 'category') return node.icon || 'i-heroicons-folder'
  if (node.type === 'book') return 'i-heroicons-book-open'
  if (node.type === 'article') return 'i-heroicons-document-text'
  return 'i-heroicons-document-magnifying-glass'
}

const getNodeColor = (node: any) => {
  if (!node) return '#94a3b8'
  let type = node.type || ''
  if (type === 'book') return '#0ea5e9'
  if (type === 'article') return '#6366f1'
  if (type === 'category') return '#ef4444'
  if (type === 'term') return '#10b981'
  return '#94a3b8'
}
</script>

<style scoped>
.storytelling-panel {
  position: absolute;
  top: 80px;
  right: 24px;
  width: 360px;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  z-index: 50;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 30%, transparent);
}

.story-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 12px;
  background: color-mix(in srgb, var(--gv-surface-card) 60%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--gv-border-principal) 20%, transparent);
  font-weight: 600;
  color: var(--gv-text-primary);
}

.story-icon {
  color: #f59e0b;
  font-size: 1.25rem;
}

.story-close-btn {
  margin-left: auto;
}

.story-progress {
  padding: 20px;
  background: color-mix(in srgb, var(--gv-surface-layout) 40%, transparent);
}

.story-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.story-step {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.story-step.is-active, .story-step.is-past {
  opacity: 1;
}

.step-icon {
  font-size: 1.5rem;
  z-index: 2;
  background: var(--gv-surface-card);
  border-radius: 50%;
}

.step-label {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--gv-text-secondary);
}

.is-active .step-label {
  color: var(--gv-text-primary);
  font-weight: 600;
}

.step-line {
  position: absolute;
  left: 12px;
  top: 24px;
  bottom: -16px;
  width: 2px;
  background: color-mix(in srgb, var(--gv-border-principal) 40%, transparent);
  z-index: 1;
}
.is-past .step-line {
  background: #f59e0b;
}

.story-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.story-content-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.story-content-msg, .story-content-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--gv-text-secondary);
}

.story-footer-hint {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--gv-text-tertiary);
}

kbd {
  background: var(--gv-surface-layout);
  border: 1px solid var(--gv-border-principal);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: inherit;
  font-size: 0.8rem;
  box-shadow: 0 2px 0 0 color-mix(in srgb, var(--gv-border-principal) 50%, transparent);
}

/* Animations */
.story-slide-enter-active,
.story-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}

.story-slide-enter-from,
.story-slide-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

@media (max-width: 640px) {
  .storytelling-panel {
    top: auto;
    bottom: 24px;
    right: 12px;
    left: 12px;
    width: auto;
    max-height: 50vh;
  }
}
</style>
