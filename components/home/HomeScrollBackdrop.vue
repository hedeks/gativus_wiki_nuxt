<template>
  <div
    class="home-scroll-backdrop"
    :class="`home-scroll-backdrop--f${clamped}`"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    focusIndex?: number
  }>(),
  { focusIndex: 0 },
)

const clamped = computed(() => Math.max(0, Math.min(4, props.focusIndex ?? 0)))
</script>

<style scoped>
@property --home-spot-y {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 18%;
}

.home-scroll-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  --home-spot-y: 18%;
}

.home-scroll-backdrop--f0 {
  --home-spot-y: 8%;
}
.home-scroll-backdrop--f1 {
  --home-spot-y: 28%;
}
.home-scroll-backdrop--f2 {
  --home-spot-y: 48%;
}
.home-scroll-backdrop--f3 {
  --home-spot-y: 68%;
}
.home-scroll-backdrop--f4 {
  --home-spot-y: 86%;
}

.home-scroll-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 120% 70% at 50% var(--home-spot-y),
    color-mix(in srgb, var(--gv-primary) 13%, transparent),
    transparent 58%
  );
  opacity: 0.65;
  transition:
    --home-spot-y 1.05s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .home-scroll-backdrop::after {
  opacity: 0.42;
}

@media (prefers-reduced-motion: reduce) {
  .home-scroll-backdrop::after {
    transition: none;
  }
}
</style>
