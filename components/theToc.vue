<template>
    <div :class="[
        'flex flex-col z-30 transition-all duration-500 overflow-x-hidden',
        'lg:sticky lg:top-[--header-height] lg:bg-transparent lg:border-none lg:shadow-none lg:p-0 lg:h-fit lg:w-full',
        'fixed top-[calc(var(--header-height)+0.75rem)] right-4 w-[240px] max-w-[85vw] sm:w-[320px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-3 pl-3 pr-5 lg:static lg:z-auto lg:max-w-none'
    ]" class="toc-container">
        <!-- Overlay для мобилок -->
        <div v-if="!isDesktop && isMobileOpen" 
             class="fixed inset-0 bg-transparent backdrop-blur-sm z-[-1] rounded-xl transition-opacity duration-500"
             style="transition-timing-function: cubic-bezier(0.705, 0.010, 0.000, 0.915);"
             @click="isMobileOpen = false"></div>

        <div class="flex items-center justify-between cursor-pointer select-none px-3 py-1 lg:sticky lg:top-0 lg:z-20 lg:bg-white/50 lg:dark:bg-zinc-900/50 lg:backdrop-blur-md" @click="toggleMobile">
            <p class="lg:text-sm text-[10px] tracking-widest font-bold text-black dark:text-white uppercase transition-all duration-500 mr-4 flex-shrink-0"
                style="transition-timing-function: cubic-bezier(0.705, 0.010, 0.000, 0.915);">
                {{ title }}
            </p>
            <div class="flex items-center gap-2 min-w-0">
                <span v-if="!isDesktop && !isMobileOpen" class="text-[9px] text-black dark:text-white/80 font-medium truncate min-w-0 max-w-[100px] transition-all duration-500"
                    style="transition-timing-function: cubic-bezier(0.705, 0.010, 0.000, 0.915);">
                    {{ activeText }}
                </span>
                <svg 
                    :class="{'rotate-180': isMobileOpen}" 
                    class="w-3 h-3 text-gray-400 flex-shrink-0 transition-all duration-500 lg:hidden" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    style="transition-timing-function: cubic-bezier(0.705, 0.010, 0.000, 0.915);"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
        
        <Transition name="expand">
            <div v-show="isDesktop || isMobileOpen" 
                :class="[
                    'flex flex-col dark:text-gray-300 mt-2 overflow-y-auto overflow-x-hidden scrollable-toc lg:pr-2 lg:pb-5',
                    !isDesktop && isMobileOpen ? 'max-h-[60vh] pt-2 pb-1' : 'lg:max-h-[calc(100dvh-var(--header-height)-10rem)] lg:mt-1'
                ]">
                <theTocItem
                    v-for="item in links"
                    :key="item.id"
                    :link="item"
                    :level="0"
                    :activeID="activeID"
                    :activeRootId="activeRootId"
                    :manualState="manualStates[item.id]"
                    @scroll="handleLinkClick"
                    @toggle="handleToggle"
                />
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

const props = defineProps<{
    links: any;
    activeID: string;
    title: string;
}>();

const emit = defineEmits(['updateActiveID']);

const isMobileOpen = ref(false);
const isDesktop = ref(true);

const activeText = computed(() => {
    const findText = (id: string, items: any[]): string | null => {
        for (const item of items) {
            if (item.id === id) return item.text;
            if (item.children) {
                const found = findText(id, item.children);
                if (found) return found;
            }
        }
        return null;
    }
    return findText(props.activeID, props.links) || 'Начало';
});

const handleLinkClick = (id: string) => {
    customScroll(id);
    if (!isDesktop.value) {
        isMobileOpen.value = false;
    }
}

const findRootId = (id: string, links: any[]): string | null => {
    for (const item of links) {
        if (item.id === id) return item.id;
        if (item.children) {
            const foundInChildren = (node: any, target: string): boolean => {
                if (node.id === target) return true;
                if (node.children) return node.children.some((child: any) => foundInChildren(child, target));
                return false;
            }
            if (item.children.some((child: any) => foundInChildren(child, id))) {
                return item.id;
            }
        }
    }
    return null;
}

const activeRootId = computed(() => {
    if (!props.activeID || !props.links) return null;
    return findRootId(props.activeID, props.links);
});

// Состояния ручного переключения { [id]: boolean }
const manualStates = ref<Record<string, boolean>>({});

// При смене главы через скролл - сбрасываем ручное состояние для новой главы, 
// чтобы она гарантированно раскрылась
watch(activeRootId, (newId) => {
    if (newId && manualStates.value[newId] !== undefined) {
        delete manualStates.value[newId];
    }
});

const handleToggle = (id: string) => {
    const currentState = manualStates.value[id] !== undefined 
        ? manualStates.value[id] 
        : (id === activeRootId.value);
    
    manualStates.value[id] = !currentState;
}

const toggleMobile = () => {
    if (!isDesktop.value) {
        isMobileOpen.value = !isMobileOpen.value;
    }
};

const checkSize = () => {
    isDesktop.value = window.innerWidth >= 1024;
};

onMounted(() => {
    checkSize();
    window.addEventListener('resize', checkSize);
    console.log(props.links);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkSize);
});

const customScroll = (id: string) => {
    emit('updateActiveID', id); // сразу подсвечиваем нужный пункт
    const elem: HTMLElement = document.getElementById(id) as HTMLElement;
    if (elem) {
        if (!isDesktop.value) isMobileOpen.value = false;
        
        const headerHeight = document.getElementById('header')?.clientHeight || 80;
        // На мобильных добавляем смещение на высоту плавающего оглавления (~50px) + запас 20px
        const mobileExtraOffset = !isDesktop.value ? 70 : 10;
        
        const offset = elem.getBoundingClientRect().top + window.scrollY - headerHeight - mobileExtraOffset;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    }
}
</script>

<style scoped>


/* Animations for Mobile Accordion */
.expand-enter-active,
.expand-leave-active {
    transition: max-height 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915), opacity 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915);
    overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
    /* На мобильных ограничиваем высоту сразу */
    max-height: 60vh; 
    opacity: 1;
}

.scrollable-toc {
    /* Поддержка Firefox (светлая тема) */
    scrollbar-width: thin;
    scrollbar-color: #000000 transparent;
}

/* Custom slim scrollbar для Chrome, Safari, Edge (светлая) */
.scrollable-toc::-webkit-scrollbar {
    width: 4px;
}
.scrollable-toc::-webkit-scrollbar-track {
    background: transparent;
}
.scrollable-toc::-webkit-scrollbar-thumb {
    border-radius: 0px; 
    background-color: #000000; 
}
.scrollable-toc::-webkit-scrollbar-thumb:hover {
    background-color: #374151; 
}
</style>

<style>
/* Глобальный перехват состояния темной темы Tailwind для ползунков */
html.dark .scrollable-toc, 
.dark .scrollable-toc {
    scrollbar-color: #ffffff transparent; /* Белый в темной для Firefox */
}

html.dark .scrollable-toc::-webkit-scrollbar-thumb,
.dark .scrollable-toc::-webkit-scrollbar-thumb {
    background-color: #ffffff; /* Белый в темной для Chrome/Edge */
}

html.dark .scrollable-toc::-webkit-scrollbar-thumb:hover,
.dark .scrollable-toc::-webkit-scrollbar-thumb:hover {
    background-color: #e5e7eb; /* Тонкий ховер в темной */
}
</style>