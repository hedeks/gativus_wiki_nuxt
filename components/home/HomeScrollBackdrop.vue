<template>
  <div
    class="home-scroll-backdrop"
    :style="{ 
      '--home-spot-y': spotYPercent,
      '--home-hue-shift': hueShift
    }"
    aria-hidden="true"
  >
    <div class="home-glow home-glow--1" />
    <div class="home-glow home-glow--2" />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    focusIndex?: number
    sectionCount?: number
  }>(),
  { focusIndex: 0, sectionCount: 6 },
)

const spotYPercent = computed(() => {
  const n = Math.max(1, props.sectionCount || 1)
  const idx = Math.max(0, Math.min(n - 1, props.focusIndex ?? 0))
  if (n <= 1)
    return '42%'
  const pct = 10 + (idx / (n - 1)) * 80
  return `${pct}%`
})

const hueShift = computed(() => {
  const n = Math.max(1, props.sectionCount || 1)
  const idx = Math.max(0, Math.min(n - 1, props.focusIndex ?? 0))
  return `${(idx / (n - 1)) * 60}deg`
})
</script>

<style scoped>
@property --home-spot-y {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 20%;
}

.home-scroll-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  --home-spot-y: 20%;
  --home-hue-shift: 0deg;
  filter: hue-rotate(var(--home-hue-shift));
  transition: filter 1.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.home-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.4;
  transition: opacity 1s ease;
}

.home-glow--1 {
  background: radial-gradient(
    ellipse 100% 60% at 50% var(--home-spot-y),
    color-mix(in srgb, var(--gv-primary) 12%, transparent),
    transparent 60%
  );
  transition: --home-spot-y 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.home-glow--2 {
  background: 
    radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--gv-primary) 5%, transparent) 0%, transparent 40%),
    radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--gv-primary) 5%, transparent) 0%, transparent 40%);
}

.dark .home-glow {
  opacity: 0.25;
}

.home-scroll-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 50% var(--home-spot-y), color-mix(in srgb, var(--gv-primary) 8%, transparent) 0%, transparent 50%);
  filter: blur(80px);
  opacity: 0.6;
  transition: transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dark .home-scroll-backdrop::after {
  opacity: 0.35;
}

@media (prefers-reduced-motion: reduce) {
  .home-glow--1,
  .home-scroll-backdrop::after {
    transition: none;
  }
}
</style>
