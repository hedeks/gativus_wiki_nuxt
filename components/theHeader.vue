<script setup lang="ts">
const isMenuOpen = ref(false);
const header = ref<HTMLElement>();
const headerHeight = ref(0);
const route = useRoute();

const updateVar = () => {
  if (header.value) {
    headerHeight.value = header.value.clientHeight;
  }
  document.body.style.setProperty('--header-height', `${headerHeight.value}px`)
}

onMounted(() => {
  updateVar();
  window?.addEventListener("resize", updateVar);
});

// Watch for route changes to close mobile menu
watch(() => route.fullPath, () => {
  isMenuOpen.value = false;
});

// Update height when menu toggles
watch(isMenuOpen, () => {
  nextTick(() => {
    setTimeout(updateVar, 400); // Wait for transition
  });
});

const links = [{
  label: 'Главная',
  icon: 'i-heroicons-home',
  to: '/'
}, {
  label: 'Статьи',
  icon: 'i-heroicons-document-text',
  to: '/articles'
}, {
  label: 'Библиотека',
  icon: 'i-heroicons-building-library',
  to: '/books'
}, {
  label: 'Глоссарий',
  icon: 'i-heroicons-document-magnifying-glass',
  to: '/glossary'
}, {
  label: 'Граф знаний',
  icon: 'i-heroicons-share',
  to: '/knowledge-graph'
}, {
  label: 'О проекте',
  icon: "i-heroicons-information-circle",
  to: "/about"
}]
</script>

<template>
  <div id="header" ref="header"
    class="header-container sticky top-0 z-50 shadow-sm border-b dark:border-zinc-800 border-gray-100 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md transition-all duration-300">
    
    <!-- Top Bar / Desktop Header -->
    <div class="px-4 py-2 flex items-center justify-between lg:grid lg:grid-cols-4 gap-4 max-w-[1920px] mx-auto">
      <theSiteLogo class="col-span-1" />

      <!-- Desktop Navigation (Center) -->
      <UHorizontalNavigation :links="links" :ui="{
        container: 'flex items-center justify-center min-w-0 flex-wrap gap-2',
        label: 'xl:text-base font-bold',
        active: 'after:bg-sky-600 dark:after:bg-sky-500 text-sky-600 dark:text-sky-500',
        inactive: 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
      }" class="hidden lg:flex w-fit justify-self-center col-span-2" />

      <!-- Desktop Actions (Right) -->
      <div class="hidden lg:flex items-center w-fit gap-4 col-span-1 justify-self-end">
        <theThemeChanger />
        <theProfileIcon />
      </div>

      <!-- Mobile Controls (Right) -->
      <div class="flex lg:hidden items-center gap-2">
        <theThemeChanger />
        <theProfileIcon />
        <UButton
          :icon="isMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3-bottom-right'"
          color="gray"
          variant="ghost"
          @click="isMenuOpen = !isMenuOpen"
          class="transition-transform duration-300"
          :class="{ 'rotate-90': isMenuOpen }"
        />
      </div>
    </div>

    <!-- Mobile Drawer (Slide Down) -->
    <transition name="drawer">
      <div v-if="isMenuOpen" 
        class="lg:hidden absolute top-full left-0 w-full overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b dark:border-zinc-800 flex flex-col p-6 gap-6 shadow-xl">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to"
          class="nav-link-mobile group"
          @click="isMenuOpen = false">
          <div class="flex items-center gap-4">
            <UIcon :name="link.icon" class="w-6 h-6 text-sky-600 dark:text-sky-400 opacity-80 group-hover:opacity-100 transition-opacity" />
            <span class="text-sm tracking-[0.2em] font-bold uppercase text-gray-700 dark:text-zinc-300 group-hover:text-gray-950 dark:group-hover:text-white transition-colors">
              {{ link.label }}
            </span>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 dark:text-zinc-700 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
      </div>
    </transition>
  </div>
</template>

<style scoped>
:root {
  --header-height: 65px;
}

.nav-link-mobile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0,0,0,0.03);
}

.dark .nav-link-mobile {
  border-bottom-color: rgba(255,255,255,0.03);
}

.nav-link-mobile:last-child {
  border-bottom: none;
}

/* Custom Design System Transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
  max-height: 500px;
}

.drawer-enter-from,
.drawer-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}
</style>