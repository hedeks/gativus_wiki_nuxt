<template>
  <div class="flex flex-col w-full">
    <div
      :data-title="link.id"
      lang="ru"
      :class="[
        'toc py-1 pr-3 cursor-pointer transition-colors ease duration-300 hover:bg-gray-50 dark:hover:bg-zinc-800/20 break-words hyphens-auto',
        isActive ? 'selectedToc text-black dark:text-white font-medium' : 'text-gray-900 dark:text-gray-200',
        paddingClass
      ]"
      style="transition-timing-function: cubic-bezier(0.705, 0.010, 0.000, 0.915);"
      @click="handleClick"
    >
      <span v-if="level > 0" class="mr-1 opacity-50">{{ levelMarker }}</span><span>{{ link.text }}</span>
    </div>
    
    <Transition name="expand">
      <div v-if="link.children && link.children.length && isOpen" class="flex flex-col">
        <theTocItem
          v-for="child in link.children"
          :key="child.id"
          :link="child"
          :level="level + 1"
          :activeID="activeID"
          :activeRootId="activeRootId"
          :manualState="undefined"
          @scroll="$emit('scroll', $event)"
          @toggle="$emit('toggle', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  link: any;
  level: number;
  activeID?: string;
  activeRootId?: string | null;
  manualState?: boolean;
}>();

const emit = defineEmits(['scroll', 'toggle']);

const isOpen = computed(() => {
  // На уровне Главы (0) проверяем либо ручное состояние, либо активный ли это корень
  if (props.level === 0) {
    if (props.manualState !== undefined) return props.manualState;
    return props.link.id === props.activeRootId;
  }
  // Вложенные уровни всегда открыты, если их Глава раскрыта
  return true;
});

const isActive = computed(() => {
    // Стандартная подсветка
    if (props.activeID === props.link.id) return true;
    
    // Спец-кейс: если это Глава, она активна (скролл внутри), но её дети СКРЫТЫ - подсвечиваем саму главу
    if (props.level === 0 && props.link.id === props.activeRootId && !isOpen.value) {
        return true;
    }
    
    return false;
});

const handleClick = () => {
    if (props.level === 0 && props.link.children && props.link.children.length > 0) {
        emit('toggle', props.link.id);
    } else {
        emit('scroll', props.link.id);
    }
}

const paddingClass = computed(() => {
  switch (props.level) {
    case 0: return 'pl-3 lg:text-[14px] text-[10px] border-l-2 border-transparent';
    case 1: return 'pl-6 lg:text-[13px] text-[9px] border-l-2 border-transparent';
    case 2: return 'pl-10 lg:text-[12px] text-[9px] border-l-2 border-transparent';
    default: return `pl-14 lg:text-[11px] text-[9px] border-l-2 border-transparent`;
  }
});

const levelMarker = computed(() => {
  if (props.level === 1) return '';
  if (props.level === 2) return '•';
  if (props.level >= 3) return '—';
  return '';
});
</script>

<style scoped>
.selectedToc {
    @apply border-l-2 border-gray-950 dark:border-gray-200 bg-gray-200 dark:bg-zinc-800;
}

/* Animations for Accordion */
.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915), opacity 0.5s cubic-bezier(0.705, 0.010, 0.000, 0.915);
    max-height: 500px;
    overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
    transform: translateY(-10px);
}
</style>
