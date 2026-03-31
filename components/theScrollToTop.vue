<template>
    <Transition name="fade">
        <button 
            v-if="isVisible" 
            @click="scrollToTop" 
            class="fixed bottom-8 left-1/2 -translate-x-1/2 lg:left-8 lg:translate-x-0 xl:left-12 2xl:left-20 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 focus:outline-none font-medium"
            title="Наверх"
            aria-label="Scroll to top"
        >
            <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span class="text-sm tracking-wide hidden sm:block">Наверх</span>
        </button>
    </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const isVisible = ref(false);

const checkScroll = () => {
    // Показываем кнопку, если проскроллили более 300px вниз
    isVisible.value = window.scrollY > 300;
};

const scrollToTop = () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
};

onMounted(() => {
    window.addEventListener('scroll', checkScroll);
});

onUnmounted(() => {
    window.removeEventListener('scroll', checkScroll);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: all 0.5s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    --tw-translate-y: 20px;
}
</style>

