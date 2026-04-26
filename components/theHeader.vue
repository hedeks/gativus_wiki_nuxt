<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const isMenuOpen = ref(false);
const header = ref<HTMLElement>();
const headerHeight = ref(0);
const route = useRoute();

const langStore = useLanguageStore();

const selectedLang = computed({
  get: () => langStore.currentLang,
  set: (val) => {
    langStore.setLanguage(val)
    // Optional: reload nuxt data to instantly fetch new language if needed, 
    // or just rely on reactivity of APIs downstream.
  }
})

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

const uiDict: Record<string, any> = {
  en: { home: 'Home', library: 'Library', articles: 'Articles', glossary: 'Glossary', kg: 'Knowledge Graph', about: 'About' },
  ru: { home: 'Главная', library: 'Библиотека', articles: 'Статьи', glossary: 'Глоссарий', kg: 'Граф знаний', about: 'О проекте' },
  zh: { home: '主页', library: '图书馆', articles: '文章', glossary: '词汇表', kg: '知识图谱', about: '关于' }
}

const links = computed(() => {
  const t = uiDict[langStore.currentLang] || uiDict.en
  return [{
    label: t.home, icon: 'i-heroicons-home', to: '/', class: 'lg:min-w-[90px] xl:min-w-[110px] justify-center'
  }, {
    label: t.library, icon: 'i-heroicons-building-library', to: '/books', class: 'lg:min-w-[110px] xl:min-w-[130px] justify-center'
  }, {
    label: t.articles, icon: 'i-heroicons-document-text', to: '/articles', class: 'lg:min-w-[90px] xl:min-w-[110px] justify-center'
  }, {
    label: t.glossary, icon: 'i-heroicons-document-magnifying-glass', to: '/glossary', class: 'lg:min-w-[100px] xl:min-w-[120px] justify-center'
  }, {
    label: t.kg, icon: 'i-heroicons-share', to: '/knowledge-graph', class: 'lg:min-w-[170px] xl:min-w-[200px] justify-center'
  }, {
    label: t.about, icon: "i-heroicons-information-circle", to: "/about", class: 'lg:min-w-[100px] xl:min-w-[120px] justify-center'
  }]
})
</script>

<template>
  <div id="header" ref="header"
    class="header-container sticky top-0 z-50 shadow-sm border-b dark:border-zinc-800 border-gray-100 gv-glass transition-all duration-300">

    <!-- Top Bar / Desktop Header -->
    <div class="px-4 py-2 flex items-center justify-between lg:grid lg:grid-cols-[1fr_max-content_1fr] gap-4 max-w-[1920px] mx-auto">
      <div class="flex items-center gap-4 justify-self-start">
        <theSiteLogo />
        <TheSearch class="hidden md:flex" />
      </div>

      <!-- Desktop Navigation (Center) -->
      <div class="hidden lg:flex justify-self-center">
        <UHorizontalNavigation :links="links" :ui="{
          container: 'flex items-center justify-center min-w-0 flex-nowrap gap-x-1 xl:gap-x-2',
          label: 'xl:text-base font-bold whitespace-nowrap',
          active: 'after:bg-sky-600 dark:after:bg-sky-500 text-zinc-900 dark:text-zinc-100',
          inactive: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
        }" />
      </div>

      <!-- Desktop Actions (Right) -->
      <div class="hidden lg:flex items-center w-fit gap-2 justify-self-end">
        <USelect 
          v-model="selectedLang" 
          :options="[{label: '🇺🇸 EN', value: 'en'}, {label: '🇷🇺 RU', value: 'ru'}, {label: '🇨🇳 ZH', value: 'zh'}]" 
          size="sm" 
          color="gray"
          class="w-24 font-bold transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
          :ui="{
            rounded: 'rounded-xl',
            color: {
              gray: {
                outline: 'ring-1 ring-gray-200 dark:ring-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 focus:ring-2 focus:ring-sky-500 shadow-sm'
              }
            }
          }"
        />
        <theThemeChanger />
        <theProfileIcon />
      </div>

      <!-- Mobile Controls (Right) -->
      <div class="flex lg:hidden items-center gap-1 sm:gap-2">
        <TheSearch class="flex md:hidden" />
        <USelect 
          v-model="selectedLang" 
          :options="[{label: 'EN', value: 'en'}, {label: 'RU', value: 'ru'}, {label: 'ZH', value: 'zh'}]" 
          size="sm" 
          color="gray"
          class="w-[70px] sm:w-20 font-bold"
          :ui="{
            rounded: 'rounded-xl',
            color: {
              gray: {
                outline: 'ring-1 ring-gray-200 dark:ring-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 focus:ring-sky-500 shadow-sm'
              }
            }
          }"
        />
        <div class="hidden sm:flex items-center gap-1">
          <theThemeChanger />
          <theProfileIcon />
        </div>
        <UButton :icon="isMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3-bottom-right'" color="gray"
          variant="ghost" @click="isMenuOpen = !isMenuOpen" class="transition-transform duration-300"
          :class="{ 'rotate-90': isMenuOpen }" />
      </div>
    </div>

    <!-- Mobile Drawer (Slide Down) -->
    <transition name="drawer">
      <div v-if="isMenuOpen"
        class="lg:hidden absolute top-full left-0 w-full overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b dark:border-zinc-800 flex flex-col p-6 gap-6 shadow-xl">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="nav-link-mobile group"
          @click="isMenuOpen = false">
          <div class="flex items-center gap-4">
            <UIcon :name="link.icon"
              class="w-6 h-6 text-sky-600 dark:text-sky-400 opacity-80 group-hover:opacity-100 transition-opacity" />
            <span
              class="text-sm tracking-[0.2em] font-bold uppercase text-gray-700 dark:text-zinc-300 group-hover:text-gray-950 dark:group-hover:text-white transition-colors">
              {{ link.label }}
            </span>
          </div>
          <UIcon name="i-heroicons-chevron-right"
            class="w-4 h-4 text-gray-300 dark:text-zinc-700 group-hover:translate-x-1 transition-transform" />
        </NuxtLink>
        <!-- Extra Mobile Actions -->
        <div class="flex sm:hidden items-center justify-between pt-4 border-t dark:border-zinc-800">
           <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Настройки</span>
           <div class="flex items-center gap-4">
              <theThemeChanger />
              <theProfileIcon />
           </div>
        </div>
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.dark .nav-link-mobile {
  border-bottom-color: rgba(255, 255, 255, 0.03);
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