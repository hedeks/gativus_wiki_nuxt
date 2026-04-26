<!-- Wraps list rows with light motion (no absolute leave — avoids filter jank) -->
<template>
  <TransitionGroup
    name="knowledge-list"
    tag="div"
    class="knowledge-list-transition"
  >
    <slot />
  </TransitionGroup>
</template>

<style scoped>
.knowledge-list-transition {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.knowledge-list-enter-active,
.knowledge-list-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.knowledge-list-leave-active {
  position: static;
}

.knowledge-list-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.knowledge-list-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.knowledge-list-move {
  transition: transform 0.28s cubic-bezier(0.705, 0.01, 0, 0.915);
}
</style>
