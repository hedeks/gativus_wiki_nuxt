<!-- components/common/PageHero.vue -->
<template>
  <header
    class="page-hero gv-surface-card w-full p-6 md:p-10"
    :class="{ 'page-hero--crisp': crisp }"
  >
    <div class="hero-content flex flex-col items-center text-center">
      <h1 class="hero-title gv-hero-gradient uppercase">{{ title }}</h1>
      <p class="hero-description mt-8">{{ description }}</p>

      <div v-if="$slots.search" class="hero-actions mt-10 w-full max-w-3xl mx-auto">
        <slot name="search" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    /** Tighter edge, subtle inner highlight (knowledge index) */
    crisp?: boolean
  }>(),
  { crisp: false }
)
</script>

<style scoped>
.page-hero {
  position: relative;
  overflow: visible;
}

.page-hero--crisp {
  box-shadow:
    var(--gv-shadow-sm),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -1px 0 rgba(0, 0, 0, 0.04);
  border-color: var(--gv-border-principal);
}

.dark .page-hero--crisp {
  box-shadow:
    var(--gv-shadow-sm),
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35);
}

.page-hero--crisp::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.22;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  mix-blend-mode: multiply;
}

.dark .page-hero--crisp::after {
  mix-blend-mode: overlay;
  opacity: 0.14;
}

.hero-title {
  margin: 0;
  font-size: 48px;
  line-height: 1;
  letter-spacing: 6px;
  font-weight: 700;
  color: #18181b;
  padding-bottom: 8px;
  margin-bottom: 12px;
  user-select: none;
  display: inline-block;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 36px;
    letter-spacing: 4px;
  }
}

.dark .hero-title {
  color: #e5e5e5;
}

.hero-description {
  font-size: 17px;
  line-height: 1.7;
  color: #555;
  max-width: 700px;
}

.dark .hero-description {
  color: #aaa;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 40;
}

@media (max-width: 640px) {
  .hero-actions {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
