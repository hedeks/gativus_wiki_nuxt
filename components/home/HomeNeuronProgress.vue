<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    sectionCount: number
    activeIndex: number
    labels: (string | null | undefined)[]
    reducedMotion?: boolean
  }>(),
  { reducedMotion: false },
)

const emit = defineEmits<{ scrollTo: [index: number] }>()

function stateFor(i: number): 'past' | 'current' | 'future' {
  if (i < props.activeIndex)
    return 'past'
  if (i === props.activeIndex)
    return 'current'
  return 'future'
}

function go(idx: number) {
  emit('scrollTo', idx)
}

function ariaLabel(i: number) {
  const L = props.labels[i]
  return L || `Section ${i + 1}`
}
</script>

<template>
  <nav
    class="home-neuron-rail"
    aria-label="Reading progress"
  >
    <ol class="home-neuron-list">
      <li
        v-for="n in sectionCount"
        :key="n"
        class="home-neuron-item"
      >
        <button
          type="button"
          class="home-neuron-btn gv-focusable"
          :class="[
            `home-neuron-btn--${stateFor(n - 1)}`,
            { 'home-neuron-btn--motion': !reducedMotion && stateFor(n - 1) === 'current' },
          ]"
          :aria-current="stateFor(n - 1) === 'current' ? 'step' : undefined"
          :aria-label="ariaLabel(n - 1)"
          @click="go(n - 1)"
        >
          <span class="home-neuron-core" aria-hidden="true" />
          <span class="home-neuron-glow" aria-hidden="true" />
          <span v-if="labels[n - 1]" class="home-neuron-label">{{ labels[n - 1] }}</span>
        </button>
        <span v-if="n < sectionCount" class="home-neuron-axon" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.home-neuron-rail {
  position: fixed;
  left: max(0.5rem, calc(50% - min(570px, 50vw) - 9rem));
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  pointer-events: auto;
  background: var(--gv-glass-bg);
  backdrop-filter: blur(16px);
  padding: 1.5rem 0.75rem;
  border-radius: 99px;
  border: 1px solid var(--gv-glass-border);
  box-shadow: var(--gv-shadow-lg);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (max-width: 1240px) {
  .home-neuron-rail {
    left: 0.5rem;
  }
}

@media (max-width: 860px) {
  .home-neuron-rail {
    left: 50%;
    right: auto;
    top: auto;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
    transform: translateX(-50%);
    padding: 0.75rem 1.5rem;
    display: flex;
    justify-content: center;
    border-radius: 20px;
  }
}

.home-neuron-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

@media (max-width: 860px) {
  .home-neuron-list {
    flex-direction: row;
    gap: 0.5rem;
  }
}

.home-neuron-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 860px) {
  .home-neuron-item {
    flex-direction: row;
  }
}

.home-neuron-btn {
  position: relative;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-neuron-core {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gv-border-principal);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2;
}

.home-neuron-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--gv-primary);
  opacity: 0;
  filter: blur(6px);
  transform: scale(0.5);
  transition: all 0.4s ease;
  z-index: 1;
}

.home-neuron-btn--past .home-neuron-core {
  background: var(--gv-primary);
  transform: scale(0.8);
}

.home-neuron-btn--current .home-neuron-core {
  background: var(--gv-primary);
  transform: scale(1.4);
  box-shadow: 0 0 10px color-mix(in srgb, var(--gv-primary) 50%, transparent);
}

.home-neuron-btn--current .home-neuron-glow {
  opacity: 0.6;
  transform: scale(1.2);
}

.home-neuron-btn--motion.home-neuron-btn--current .home-neuron-glow {
  animation: neuron-glow-pulse 2s infinite ease-in-out;
}

@keyframes neuron-glow-pulse {
  0%, 100% { transform: scale(1.2); opacity: 0.4; }
  50% { transform: scale(1.8); opacity: 0.7; }
}

.home-neuron-axon {
  display: block;
  width: 2px;
  height: 16px;
  background: linear-gradient(180deg, var(--gv-primary), var(--gv-border-subtle));
  opacity: 0.3;
  margin: 2px 0;
}

@media (max-width: 860px) {
  .home-neuron-axon {
    width: 12px;
    height: 2px;
    background: linear-gradient(90deg, var(--gv-primary), var(--gv-border-subtle));
    margin: 0 2px;
  }
}

.home-neuron-btn:hover .home-neuron-core {
  background: var(--gv-primary);
  transform: scale(1.2);
}

.home-neuron-label {
  position: absolute;
  left: 2.5rem;
  top: 50%;
  transform: translateY(-50%) translateX(-10px);
  background: var(--gv-surface-card);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--gv-text-primary);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: var(--gv-shadow-md);
  border: 1px solid var(--gv-border-subtle);
}

.home-neuron-btn:hover .home-neuron-label,
.home-neuron-btn:focus-visible .home-neuron-label {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

@media (max-width: 860px) {
  .home-neuron-label {
    display: none; /* Hide labels on mobile to avoid screen edge issues */
  }
}
</style>
