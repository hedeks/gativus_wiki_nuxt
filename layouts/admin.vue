<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="admin-sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <NuxtLink to="/" class="sidebar-logo">
          <img src="/images/121px-Logo.jpg" alt="Gativus" class="sidebar-logo-img" />
          <span class="sidebar-logo-text">Gativus</span>
        </NuxtLink>
        <button class="sidebar-close-btn" @click="sidebarOpen = false">
          <UIcon name="i-heroicons-x-mark" />
        </button>
      </div>

      <nav class="sidebar-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="sidebar-link"
          :class="{ 'sidebar-link--active': route.path === item.to }"
          @click="sidebarOpen = false"
        >
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
            <span class="sidebar-user-role">{{ store.userInfo?.role || 'editor' }}</span>
          </div>
        </div>
        <button class="sidebar-logout" @click="handleLogout">
          <UIcon name="i-heroicons-arrow-right-on-rectangle" />
          <span>Выйти</span>
        </button>
      </div>
    </aside>

    <!-- Overlay for mobile -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />

    <!-- Main content -->
    <div class="admin-main">
      <header class="admin-topbar">
        <button class="topbar-menu-btn" @click="sidebarOpen = true">
          <UIcon name="i-heroicons-bars-3" />
        </button>
        <h1 class="topbar-title">Панель управления</h1>
        <div class="topbar-actions">
          <NuxtLink to="/" class="topbar-link">
            <UIcon name="i-heroicons-arrow-top-right-on-square" />
            <span>На сайт</span>
          </NuxtLink>
          <theThemeChanger />
        </div>
      </header>

      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const store = userStore()
const sidebarOpen = ref(false)

const navItems = [
  { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/admin' },
  { label: 'Импорт ODT', icon: 'i-heroicons-arrow-up-tray', to: '/admin/import' },
  { label: 'Статьи', icon: 'i-heroicons-document-text', to: '/admin/articles' },
  { label: 'Глоссарий', icon: 'i-heroicons-document-magnifying-glass', to: '/admin/glossary' },
  { label: 'Категории', icon: 'i-heroicons-folder', to: '/admin/categories' },
  { label: 'Пользователи', icon: 'i-heroicons-users', to: '/admin/users' },
]

function handleLogout() {
  store.logout()
  navigateTo('/login')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f4f5f7;
}
.dark .admin-layout {
  background: #111113;
}

/* ─── Sidebar ─── */
.admin-sidebar {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.dark .admin-sidebar {
  background: #1a1a1d;
  border-right-color: #2a2a2e;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.dark .sidebar-header {
  border-bottom-color: #2a2a2e;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.sidebar-logo-img {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}
.sidebar-logo-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #1a1a1a;
}
.dark .sidebar-logo-text { color: #e5e5e5; }

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
.dark .sidebar-close-btn { color: #999; }

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
.dark .sidebar-link { color: #aaa; }
.dark .sidebar-link:hover { background: #252528; color: #e5e5e5; }

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
.dark .sidebar-badge { background: #333; color: #aaa; }

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dark .sidebar-footer { border-top-color: #2a2a2e; }

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
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
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
.dark .sidebar-user-name { color: #e5e5e5; }
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

/* ─── Overlay ─── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 35;
}

/* ─── Main Content ─── */
.admin-main {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.admin-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 20;
}
.dark .admin-topbar {
  background: #1a1a1d;
  border-bottom-color: #2a2a2e;
}

.topbar-menu-btn {
  display: none;
  padding: 8px;
  border-radius: 8px;
  background: none;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  color: #555;
  font-size: 20px;
}
.dark .topbar-menu-btn {
  border-color: #333;
  color: #aaa;
}

.topbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.dark .topbar-title { color: #e5e5e5; }

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.topbar-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  text-decoration: none;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}
.topbar-link:hover {
  background: #f3f4f6;
  color: #1a1a1a;
}
.dark .topbar-link {
  color: #aaa;
  border-color: #333;
}
.dark .topbar-link:hover {
  background: #252528;
  color: #e5e5e5;
}

.admin-content {
  flex: 1;
  padding: 24px;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .admin-sidebar {
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
  .topbar-menu-btn {
    display: flex;
  }
  .admin-content {
    padding: 16px;
  }
}
</style>
