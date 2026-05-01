<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
const route = useRoute()

const isMenuOpen = ref(false)
const header = ref<HTMLElement>()
const headerHeight = ref(0)

const uiDict: Record<string, {
  home: string
  library: string
  articles: string
  glossary: string
  kg: string
  about: string
  settings: string
  menuOpen: string
  menuClose: string
}> = {
  en: {
    home: 'Home',
    library: 'Library',
    articles: 'Articles',
    glossary: 'Glossary',
    kg: 'Knowledge Graph',
    about: 'About',
    settings: 'Settings',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
  },
  ru: {
    home: 'Главная',
    library: 'Библиотека',
    articles: 'Статьи',
    glossary: 'Глоссарий',
    kg: 'Граф знаний',
    about: 'О проекте',
    settings: 'Настройки',
    menuOpen: 'Открыть меню',
    menuClose: 'Закрыть меню',
  },
  zh: {
    home: '主页',
    library: '图书馆',
    articles: '文章',
    glossary: '词汇表',
    kg: '知识图谱',
    about: '关于',
    settings: '设置',
    menuOpen: '打开菜单',
    menuClose: '关闭菜单',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.en)

interface NavLink {
  label: string
  icon: string
  to: string
}

const links = computed<NavLink[]>(() => [
  { label: t.value.home, icon: 'i-heroicons-home', to: '/' },
  { label: t.value.library, icon: 'i-heroicons-building-library', to: '/books' },
  { label: t.value.articles, icon: 'i-heroicons-document-text', to: '/articles' },
  { label: t.value.glossary, icon: 'i-heroicons-document-magnifying-glass', to: '/glossary' },
  { label: t.value.kg, icon: 'i-heroicons-share', to: '/knowledge-graph' },
  { label: t.value.about, icon: 'i-heroicons-information-circle', to: '/about' },
])

function isNavActive(to: string): boolean {
  const path = route.path
  if (to === '/') return path === '/'
  return path === to || path.startsWith(`${to}/`)
}

const updateVar = () => {
  if (header.value)
    headerHeight.value = header.value.clientHeight
  document.body.style.setProperty('--header-height', `${headerHeight.value}px`)
}

onMounted(() => {
  updateVar()
  window?.addEventListener('resize', updateVar)
})

watch(() => route.fullPath, () => {
  isMenuOpen.value = false
})

watch(isMenuOpen, () => {
  nextTick(() => {
    setTimeout(updateVar, 400)
  })
})

onUnmounted(() => {
  window?.removeEventListener('resize', updateVar)
})
</script>

<template>
  <header
    id="header"
    ref="header"
    class="gv-header gv-header--sticky gv-glass"
  >
    <div class="gv-header__inner">
      <div class="gv-header__left">
        <theSiteLogo />
        <TheSearch class="gv-header__search gv-header__search--desktop" />
      </div>

      <!-- Desktop nav: без UHorizontalNavigation — токены --gv-* -->
      <nav class="gv-header__nav" aria-label="Main navigation">
        <ul class="gv-header__nav-list">
          <li v-for="item in links" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="gv-header__nav-link gv-focusable"
              :class="{ 'gv-header__nav-link--active': isNavActive(item.to) }"
            >
              <UIcon :name="item.icon" class="gv-header__nav-icon" aria-hidden="true" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="gv-header__actions gv-header__actions--desktop">
        <LanguageSwitcher />
        <theThemeChanger />
        <theProfileIcon />
      </div>

      <div class="gv-header__actions gv-header__actions--mobile">
        <TheSearch
          class="gv-header__search gv-header__search--mobile"
          compact-trigger
          :shortcut-hotkey="false"
        />
        <LanguageSwitcher compact />
        <div class="gv-header__mobile-secondary">
          <theThemeChanger />
          <theProfileIcon />
        </div>
        <GvButton
          :icon="isMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3-bottom-right'"
          color="gray"
          variant="ghost"
          square
          class="gv-header__menu-btn"
          :class="{ 'gv-header__menu-btn--open': isMenuOpen }"
          :aria-expanded="isMenuOpen"
          aria-controls="gv-header-drawer"
          :aria-label="isMenuOpen ? t.menuClose : t.menuOpen"
          @click="isMenuOpen = !isMenuOpen"
        />
      </div>
    </div>

    <transition name="gv-header-drawer-tr">
      <div
        v-if="isMenuOpen"
        id="gv-header-drawer"
        class="gv-header-drawer"
      >
        <NuxtLink
          v-for="item in links"
          :key="item.to"
          :to="item.to"
          class="gv-header-drawer__link gv-focusable"
          :class="{ 'gv-header-drawer__link--active': isNavActive(item.to) }"
          @click="isMenuOpen = false"
        >
          <div class="gv-header-drawer__link-main">
            <UIcon :name="item.icon" class="gv-header-drawer__icon" aria-hidden="true" />
            <span class="gv-header-drawer__label">{{ item.label }}</span>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="gv-header-drawer__chev" aria-hidden="true" />
        </NuxtLink>

        <div class="gv-header-drawer__footer">
          <span class="gv-header-drawer__footer-hint">{{ t.settings }}</span>
          <div class="gv-header-drawer__footer-actions">
            <theThemeChanger />
            <theProfileIcon />
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>

<style scoped>
:root {
  --header-height: 65px;
}

.gv-header {
  width: 100%;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--gv-border-principal);
  box-shadow: var(--gv-shadow-sm);
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.gv-header--sticky {
  position: sticky;
  top: 0;
  z-index: 50;
}

.gv-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0.5rem 0.75rem;
}

@media (min-width: 640px) {
  .gv-header__inner {
    gap: 1rem;
    padding: 0.5rem 1rem;
  }
}

@media (min-width: 1024px) {
  .gv-header__inner {
    display: grid;
    grid-template-columns: 1fr max-content 1fr;
    align-items: center;
    gap: 1rem;
  }
}

.gv-header__left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

@media (min-width: 640px) {
  .gv-header__left {
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .gv-header__left {
    flex: initial;
    justify-self: start;
  }
}

.gv-header__search--desktop {
  display: none;
}

@media (min-width: 768px) {
  .gv-header__search--desktop {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    max-width: 28rem;
  }
}

@media (min-width: 1024px) {
  .gv-header__search--desktop {
    max-width: none;
  }
}

.gv-header__nav {
  display: none;
}

@media (min-width: 1024px) {
  .gv-header__nav {
    display: flex;
    justify-self: center;
    min-width: 0;
    max-width: 100%;
    padding: 0 4px;
  }
}

.gv-header__nav-list {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  flex-wrap: nowrap;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
}

@media (min-width: 1280px) {
  .gv-header__nav-list {
    gap: 0.5rem;
  }
}

.gv-header__nav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--gv-radius-control);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--gv-text-secondary);
  text-decoration: none;
  white-space: nowrap;
  transition:
    color 0.18s cubic-bezier(0.705, 0.01, 0, 0.915),
    background 0.18s cubic-bezier(0.705, 0.01, 0, 0.915);
}

@media (min-width: 1280px) {
  .gv-header__nav-link {
    font-size: 14px;
    padding: 9px 14px;
  }
}

.gv-header__nav-link:hover {
  color: var(--gv-text-primary);
  background: color-mix(in srgb, var(--gv-primary) 8%, transparent);
}

.gv-header__nav-link--active {
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 14%, transparent);
}

.gv-header__nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.88;
}

.gv-header__nav-link--active .gv-header__nav-icon {
  opacity: 1;
  color: var(--gv-primary);
}

.gv-header__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  min-width: 0;
}

@media (min-width: 640px) {
  .gv-header__actions {
    gap: 0.5rem;
  }
}

.gv-header__actions--desktop {
  display: none;
}

@media (min-width: 1024px) {
  .gv-header__actions--desktop {
    display: flex;
    gap: 0.5rem;
    justify-self: end;
    max-width: 100%;
  }
}

@media (min-width: 1280px) {
  .gv-header__actions--desktop {
    gap: 0.75rem;
  }
}

.gv-header__actions--mobile {
  justify-content: flex-end;
}

@media (min-width: 1024px) {
  .gv-header__actions--mobile {
    display: none;
  }
}

.gv-header__search--mobile {
  display: flex;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .gv-header__search--mobile {
    display: none;
  }
}

.gv-header__mobile-secondary {
  display: none;
  align-items: center;
  gap: 0.25rem;
}

@media (min-width: 640px) {
  .gv-header__mobile-secondary {
    display: flex;
  }
}

.gv-header__menu-btn {
  transition: transform 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.gv-header__menu-btn--open {
  transform: rotate(90deg);
}

.gv-header-drawer {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  overflow: hidden;
  background: color-mix(in srgb, var(--gv-surface-card) 94%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--gv-border-principal);
  box-shadow: var(--gv-shadow-md);
}

@media (min-width: 1024px) {
  .gv-header-drawer {
    display: none;
  }
}

.gv-header-drawer__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--gv-border-principal) 55%, transparent);
  text-decoration: none;
  color: inherit;
  transition:
    color 0.18s ease,
    border-color 0.18s ease;
}

.gv-header-drawer__link:last-of-type {
  border-bottom: none;
}

.gv-header-drawer__link:hover {
  border-bottom-color: color-mix(in srgb, var(--gv-primary) 35%, var(--gv-border-principal));
}

.gv-header-drawer__link-main {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.gv-header-drawer__icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: var(--gv-primary);
  opacity: 0.9;
}

.gv-header-drawer__label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.gv-header-drawer__link:hover .gv-header-drawer__label {
  color: var(--gv-text-primary);
}

.gv-header-drawer__link--active .gv-header-drawer__label {
  color: var(--gv-primary);
}

.gv-header-drawer__chev {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--gv-text-secondary);
  opacity: 0.45;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.gv-header-drawer__link:hover .gv-header-drawer__chev {
  opacity: 0.85;
  transform: translateX(4px);
}

.gv-header-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--gv-border-principal);
}

@media (min-width: 640px) {
  .gv-header-drawer__footer {
    display: none;
  }
}

.gv-header-drawer__footer-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  opacity: 0.75;
}

.gv-header-drawer__footer-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.gv-header-drawer-tr-enter-active,
.gv-header-drawer-tr-leave-active {
  transition:
    max-height 0.4s cubic-bezier(0.705, 0.01, 0, 0.915),
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.705, 0.01, 0, 0.915);
  max-height: min(90vh, 560px);
}

.gv-header-drawer-tr-enter-from,
.gv-header-drawer-tr-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-8px);
}
</style>
