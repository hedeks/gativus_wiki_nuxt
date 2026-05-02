<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'

defineProps<{ block: LandingBlockResolved }>()
</script>

<template>
  <article class="home-manifest home-anim-target">
    <header class="home-manifest-header">
      <span v-if="block.kicker" class="home-kicker">{{ block.kicker }}</span>
      <h2 v-if="block.title" class="home-h2">
        {{ block.title }}
      </h2>
    </header>
    <div class="home-manifest-body">
      <p v-if="block.body" class="home-manifest-text">
        {{ block.body }}
      </p>
      <p v-if="block.footnote" class="home-manifest-note">
        {{ block.footnote }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.home-manifest {
  background: var(--gv-surface-card);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-container);
  overflow: hidden;
}

.home-manifest-header {
  padding: 1.75rem 1.75rem 0;
}

.home-manifest-body {
  padding: 1.25rem 1.75rem 2rem;
}

.home-manifest-text {
  font-size: 16px;
  line-height: 1.7;
  color: var(--gv-text-primary);
}

.home-manifest-note {
  margin-top: 1.25rem;
  font-size: 14px;
  color: var(--gv-text-secondary);
  font-style: italic;
  opacity: 0.8;
}
</style>
