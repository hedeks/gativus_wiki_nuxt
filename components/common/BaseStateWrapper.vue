<!-- components/common/BaseStateWrapper.vue -->
<template>
  <div class="state-wrapper" v-bind="$attrs">
    <!-- Error -->
    <div v-if="error" class="state-card error-card">
      <div class="error-icon">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8" />
      </div>
      <h3>{{ errorTitle }}</h3>
      <p>{{ errorHint }}</p>
    </div>

    <!-- Skeleton / Pending -->
    <div v-else-if="pending" class="skeleton-list">
      <slot name="skeleton">
        <div
          v-for="i in skeletonCount"
          :key="i"
          class="skeleton-row"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <div class="skeleton-icon" />
          <div class="skeleton-content">
            <div class="skeleton-line skeleton-line-short" />
            <div class="skeleton-line skeleton-line-long" />
            <div class="skeleton-line skeleton-line-medium" />
          </div>
        </div>
      </slot>
    </div>

    <!-- Empty -->
    <div v-else-if="empty" class="state-card empty-card">
      <slot name="empty">
        <div class="empty-icon-wrap">
          <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8" />
        </div>
        <p>{{ emptyText }}</p>
      </slot>
    </div>

    <!-- Content -->
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    pending: boolean
    error?: any
    empty: boolean
    errorTitle?: string
    errorHint?: string
    emptyText?: string
    skeletonCount?: number
  }>(),
  {
    errorTitle: 'Loading Error',
    errorHint: 'Please try refreshing the page.',
    emptyText: 'Nothing found',
    skeletonCount: 5,
  }
)
</script>

<style scoped>
.state-wrapper {
  width: 100%;
  min-width: 0;
}

/* ======== SKELETON ======== */
.skeleton-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  animation: skeleton-fade 1.6s ease-in-out infinite;
}

.dark .skeleton-row {
  border-bottom-color: #262626;
}

.skeleton-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f1f5f9;
  flex-shrink: 0;
}

.dark .skeleton-icon {
  background: #262626;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: #f1f5f9;
}

.dark .skeleton-line {
  background: #262626;
}

.skeleton-line-short {
  width: 30%;
}

.skeleton-line-long {
  width: 70%;
}

.skeleton-line-medium {
  width: 45%;
}

@keyframes skeleton-fade {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ======== STATES ======== */
.state-card {
  width: 100% !important;
  text-align: center;
  padding: 48px 24px;
  border-radius: 16px;
  border: 1px dashed #e5e7eb;
}

.dark .state-card {
  border-color: #333;
}

.error-icon {
  color: #ef4444;
  margin-bottom: 12px;
}

.state-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 6px;
}

.dark .state-card h3 {
  color: #e5e5e5;
}

.state-card p {
  font-size: 13px;
  color: #94a3b8;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: #cbd5e1;
}

.dark .empty-icon-wrap {
  background: #1e1e1e;
  color: #4a4a4a;
}

.empty-card p {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #94a3b8;
}
/* Уже есть .state-card с width: 100% — добавь обёртке */
.skeleton-list {
  width: 100%;
}
.state-card {
  width: 100%;
}
</style>