<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="admin-sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <NuxtLink to="/" class="sidebar-logo">
          <img src="/images/121px-Logo.jpg" alt="Gativus" class="sidebar-logo-img" />
          <span class="sidebar-logo-text">Gativus</span>
        </NuxtLink>
        <GvButton
          type="button"
          chromeless
          square
          variant="ghost"
          color="gray"
          class="sidebar-close-btn"
          @click="sidebarOpen = false"
        >
          <UIcon name="i-heroicons-x-mark" />
        </GvButton>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="sidebar-link"
          :class="{ 'sidebar-link--active': route.path === item.to }" @click="sidebarOpen = false">
          <UIcon :name="item.icon" class="sidebar-link-icon" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="sidebar-badge">{{ item.badge }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">
            {{ store.userInfo?.login?.charAt(0).toUpperCase() || '?' }}
          </div>
          <div class="sidebar-user-info">
            <span class="sidebar-user-name">{{ store.userInfo?.login || 'Unknown' }}</span>
            <span class="sidebar-user-role">{{ sidebarRoleLabel }}</span>
          </div>
        </div>
        <GvButton type="button" chromeless variant="ghost" color="gray" class="sidebar-logout" @click="handleLogout">
          <UIcon name="i-heroicons-arrow-right-on-rectangle" />
          <span>Выйти</span>
        </GvButton>
      </div>
    </aside>

    <!-- Overlay for mobile -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

    <!-- Main content -->
    <div class="admin-main">
      <header
        class="admin-topbar gv-glass sticky top-0 z-20 shrink-0 border-b border-gray-100 shadow-sm dark:border-zinc-800"
      >
        <div
          class="admin-topbar-inner mx-auto flex min-h-[65px] w-full max-w-[1920px] items-center gap-3 px-3 py-2 box-border sm:gap-4 sm:px-4"
        >
          <div class="admin-topbar-start flex shrink-0 items-center gap-2">
            <GvButton
              type="button"
              chromeless
              square
              variant="ghost"
              color="gray"
              size="md"
              class="topbar-icon-btn md:hidden"
              aria-label="Открыть меню"
              @click="sidebarOpen = true"
            >
              <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
            </GvButton>
            <GvButton
              v-if="canGoBack"
              type="button"
              chromeless
              square
              variant="ghost"
              color="gray"
              size="md"
              class="topbar-icon-btn"
              title="Назад"
              @click="goBack"
            >
              <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
            </GvButton>
          </div>
          <div class="topbar-title-wrap min-w-0 flex-1">
            <p class="topbar-eyebrow">{{ pageEyebrow }}</p>
            <h1 class="topbar-title">{{ pageTitle }}</h1>
          </div>
          <div class="topbar-actions flex shrink-0 items-center gap-2 sm:gap-3">
            <GvButton
              to="/"
              variant="outline"
              color="gray"
              size="sm"
              class="topbar-site-link"
            >
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
              <span class="hidden sm:inline">На сайт</span>
            </GvButton>
            <theThemeChanger />
          </div>
        </div>
      </header>

      <main class="admin-content">
        <div class="admin-content-inner gv-admin-page admin-gv-skin">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const store = userStore()
const sidebarOpen = ref(false)

const sidebarRoleLabel = computed(() => {
  const r = store.userInfo?.role
  if (r === 'admin') return 'Админ'
  if (r === 'editor') return 'Редактор'
  if (r === 'user') return 'Пользователь'
  return 'editor'
})

const { pushRoute, goBack, canGoBack } = useAdminHistory()

watch(
  () => route.fullPath,
  (fullPath) => {
    if (fullPath.startsWith('/admin')) {
      pushRoute(fullPath)
    }
  },
  { immediate: true },
)

interface NavItem {
  label: string
  icon: string
  to: string
  badge?: string | number
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/admin' },
  { label: 'Лендинг', icon: 'i-heroicons-computer-desktop', to: '/admin/landing' },
  { label: 'Книги', icon: 'i-heroicons-book-open', to: '/admin/books' },
  { label: 'Статьи', icon: 'i-heroicons-document-text', to: '/admin/articles' },
  { label: 'Импорт ODT', icon: 'i-heroicons-arrow-up-tray', to: '/admin/import' },
  { label: 'Импорт ODM', icon: 'i-heroicons-document-duplicate', to: '/admin/import-odm' },
  { label: 'Глоссарий', icon: 'i-heroicons-document-magnifying-glass', to: '/admin/glossary' },
  { label: 'Категории', icon: 'i-heroicons-folder', to: '/admin/categories' },
  { label: 'Пользователи', icon: 'i-heroicons-users', to: '/admin/users' },
  { label: 'Синхронизация', icon: 'i-heroicons-cloud', to: '/admin/sync' },
]

const pageTitle = computed(() => {
  if (route.path === '/admin') return 'Панель управления'
  const item = navItems.find(it => it.to !== '/admin' && route.path.startsWith(it.to))
  return item ? item.label : 'Панель управления'
})

const pageEyebrow = computed(() => {
  if (route.path.startsWith('/admin/landing')) return 'CMS · Лендинг'
  if (route.path.startsWith('/admin/books')) return 'Library · Книги'
  if (route.path.startsWith('/admin/articles')) return 'Knowledge · Статьи'
  if (route.path.startsWith('/admin/glossary')) return 'Ontology · Глоссарий'
  return 'Admin'
})

function handleLogout() {
  store.logout()
  navigateTo('/login')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: transparent;
}

.dark .admin-layout {
  background: transparent;
}

/* ─── Sidebar ─── */
.admin-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #f3f4f6;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  transition: transform 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.dark .admin-sidebar {
  background: #18181b;
  border-right-color: #27272a;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  min-height: 65px;
  padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.dark .sidebar-header {
  border-bottom-color: #27272a;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.sidebar-logo-img {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.sidebar-logo-text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #18181b;
}

.dark .sidebar-logo-text {
  color: #f4f4f5;
}

.sidebar-close-btn {
  display: none;
  padding: 6px;
  border-radius: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 20px;
}

.dark .sidebar-close-btn {
  color: #999;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
  text-decoration: none;
  transition: all 0.2s ease;
}

.sidebar-link:hover {
  background: #f3f4f6;
  color: #1a1a1a;
}

.dark .sidebar-link {
  color: #aaa;
}

.dark .sidebar-link:hover {
  background: #252528;
  color: #e5e5e5;
}

.sidebar-link--active {
  background: #f0f0f2;
  color: #1a1a1a;
  font-weight: 600;
}

.dark .sidebar-link--active {
  background: #2a2a2e;
  color: #e5e5e5;
}

.sidebar-link-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-badge {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 10px;
  background: #e5e7eb;
  color: #555;
  font-weight: 600;
}

.dark .sidebar-badge {
  background: #333;
  color: #aaa;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dark .sidebar-footer {
  border-top-color: #2a2a2e;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
}

.sidebar-user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0ea5e9, #22d3ee);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.sidebar-user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .sidebar-user-name {
  color: #e5e5e5;
}

.sidebar-user-role {
  font-size: 11px;
  color: #888;
  text-transform: capitalize;
}

.sidebar-logout {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  color: #888;
  font-size: 13px;
  transition: all 0.2s;
}

.sidebar-logout:hover {
  background: #fef2f2;
  color: #ef4444;
}

.dark .sidebar-logout:hover {
  background: #2a1a1a;
  color: #f87171;
}

/* GvButton: сохраняем прежний hover поверх ghost */
.sidebar-logout.gv-btn--ghost:hover:not(.gv-btn--disabled) {
  background: #fef2f2;
  color: #ef4444;
}
.dark .sidebar-logout.gv-btn--ghost:hover:not(.gv-btn--disabled) {
  background: #2a1a1a;
  color: #f87171;
}

/* ─── Overlay ─── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  z-index: 35;
}

/* ─── Main Content ─── */
.admin-main {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--gv-canvas-gradient);
  box-shadow: inset 1px 0 0 rgba(15, 23, 42, 0.06);
}

.dark .admin-main {
  background: var(--gv-canvas-gradient);
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.22);
}

/* Топбар: стекло над фоном рабочей области */
.dark .admin-topbar {
  background: color-mix(in srgb, rgb(39 39 42) 92%, transparent);
}

.topbar-title-wrap {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  line-height: 1.2;
}

.topbar-eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.dark .topbar-eyebrow {
  color: #94a3b8;
}

.topbar-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #18181b;
  text-transform: uppercase;
  letter-spacing: 0.18em;
}

@media (min-width: 640px) {
  .topbar-title {
    font-size: 14px;
    letter-spacing: 0.2em;
  }
}

.dark .topbar-title {
  color: #f4f4f5;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
}

.topbar-site-link {
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.topbar-actions {
  margin-left: 0;
}

:deep(.topbar-icon-btn.gv-btn--chromeless.gv-btn--ghost) {
  border-radius: var(--gv-radius-control, 12px);
  color: #52525b;
}

.dark :deep(.topbar-icon-btn.gv-btn--chromeless.gv-btn--ghost) {
  color: #a1a1aa;
}

:deep(.topbar-icon-btn.gv-btn--chromeless.gv-btn--ghost:hover:not(.gv-btn--disabled)) {
  background: rgb(244 244 245);
  color: #18181b;
}

.dark :deep(.topbar-icon-btn.gv-btn--chromeless.gv-btn--ghost:hover:not(.gv-btn--disabled)) {
  background: rgb(39 39 42);
  color: #fafafa;
}

.admin-content {
  flex: 1;
  padding: 20px 20px 28px;
}

.admin-content-inner {
  width: 100%;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .admin-sidebar {
    width: min(320px, 86vw);
    transform: translateX(-100%);
  }

  .admin-sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: block;
  }

  .sidebar-overlay {
    display: block;
  }

  .admin-main {
    margin-left: 0;
  }

  .admin-content {
    padding: 16px;
  }

  .topbar-title {
    font-size: 12px;
    letter-spacing: 0.12em;
  }

  .topbar-eyebrow {
    font-size: 9px;
    letter-spacing: 0.12em;
  }

  .topbar-actions {
    gap: 6px;
  }
}

@media (max-width: 480px) {
  .admin-content {
    padding: 12px;
  }
}

@media (max-width: 360px) {
  .admin-sidebar {
    width: min(300px, 92vw);
  }

  .topbar-title {
    font-size: 11px;
    letter-spacing: 0.1em;
  }

  .topbar-actions {
    gap: 4px;
  }

  .admin-content {
    padding: 10px;
  }
}
</style>
