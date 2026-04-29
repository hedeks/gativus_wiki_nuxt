<script setup lang="ts">
const store = userStore()
const toast = useToast()

const signOut = () => {
  if (store.isLoggedIn) {
    store.logout()
    toast.add({
      title: 'Вы вышли из аккаунта!',
      icon: 'i-heroicons-check-circle',
      color: 'sky',
    })
    navigateTo('/login')
  } else {
    navigateTo('/login')
  }
}

const linkItems = computed(() => {
  const links: { label: string; icon: string; to: string }[] = [
    { label: 'Статьи', icon: 'i-heroicons-document-text', to: '/articles' },
  ]
  if (store.isLoggedIn) {
    links.push({ label: 'Профиль', icon: 'i-heroicons-user', to: '/profile' })
  }
  if (store.userInfo?.role === 'admin' || store.userInfo?.role === 'editor') {
    links.push({
      label: 'Админ-панель',
      icon: 'i-heroicons-rectangle-group',
      to: '/admin',
    })
  }
  return links
})

const authRow = computed(() => ({
  label: store.isLoggedIn ? 'Выйти' : 'Войти',
  icon: store.isLoggedIn
    ? 'i-heroicons-arrow-left-on-rectangle'
    : 'i-heroicons-arrow-right-on-rectangle',
  loggedIn: store.isLoggedIn,
}))

function onAuth (close: () => void) {
  close()
  if (store.isLoggedIn) signOut()
  else navigateTo('/login')
}
</script>

<template>
  <AnchoredMenuDropdown>
    <template #trigger="{ toggle, isOpen }">
      <GvButton
        type="button"
        unstyled
        chromeless
        class="profile-button group touch-manipulation"
        :aria-expanded="isOpen"
        aria-haspopup="menu"
        @click="toggle"
      >
        <UAvatar
          v-if="store.isLoggedIn"
          :alt="store.userInfo?.email"
          size="sm"
          class="transition-all duration-300"
        />
        <UAvatar
          v-else
          icon="i-heroicons-user"
          size="sm"
          class="bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400"
        />
        <UIcon
          name="i-heroicons-chevron-down"
          class="profile-trigger-chevron w-4 h-4 text-gray-400 group-hover:text-sky-600 dark:text-zinc-500 dark:group-hover:text-sky-400"
        />
      </GvButton>
    </template>

    <template #default="{ close }">
      <div class="profile-menu-stack">
        <div class="profile-menu-header" role="none">
          <p class="profile-menu-kicker">
            {{ store.isLoggedIn ? 'Вошли как' : 'Вы не в системе' }}
          </p>
          <p
            v-if="store.isLoggedIn"
            class="profile-menu-email"
          >
            {{ store.userInfo?.email }}
          </p>
          <p v-else class="profile-menu-guest">
            Гостевой доступ
          </p>
        </div>

        <div class="profile-menu-actions" role="none">
          <GvButton
            v-for="item in linkItems"
            :key="item.to"
            :to="item.to"
            role="menuitem"
            unstyled
            chromeless
            block
            class="profile-menu-row profile-menu-link flex w-full items-center gap-3 text-base font-medium text-gray-700 dark:text-zinc-200"
            @click="close"
          >
            <span class="truncate">{{ item.label }}</span>
            <UIcon
              :name="item.icon"
              class="profile-menu-icon ms-auto h-5 w-5 flex-shrink-0 text-gray-400 dark:text-zinc-500"
            />
          </GvButton>

          <GvButton
            type="button"
            role="menuitem"
            unstyled
            chromeless
            block
            class="profile-menu-row profile-menu-auth flex w-full items-center gap-3 border-t border-gray-200 text-left text-base font-medium text-gray-700 dark:border-zinc-700 dark:text-zinc-200"
            @click="onAuth(close)"
          >
            <span class="truncate">{{ authRow.label }}</span>
            <UIcon
              :name="authRow.icon"
              class="profile-menu-icon ms-auto h-5 w-5 flex-shrink-0 text-gray-400 dark:text-zinc-500"
            />
          </GvButton>
        </div>
      </div>
    </template>
  </AnchoredMenuDropdown>
</template>

<style scoped>
.profile-menu-row :deep(.gv-btn__label) {
  display: contents;
}

:deep(.profile-button .gv-btn__label) {
  display: contents;
}

/*
 * chromeless задаёт padding: 0 !important — без .gv-btn--chromeless отступы не применяются.
 */
:deep(.profile-button.gv-btn--chromeless) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px !important;
  border-radius: 9999px;
  outline: none;
  transition:
    transform 0.28s cubic-bezier(0.34, 1.35, 0.64, 1),
    box-shadow 0.28s ease,
    background-color 0.22s ease;
}

:deep(.profile-button.gv-btn--chromeless:hover) {
  background-color: rgb(243 244 246) !important;
  transform: translateY(-2px) scale(1.03);
  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.1),
    0 0 0 1px rgba(148, 163, 184, 0.25);
}

.dark :deep(.profile-button.gv-btn--chromeless:hover) {
  background-color: rgb(39 39 42) !important;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(82, 82, 91, 0.5);
}

:deep(.profile-button.gv-btn--chromeless:active) {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.12s;
}

:deep(.profile-button.gv-btn--chromeless:hover .profile-trigger-chevron) {
  transform: rotate(-180deg);
}

:deep(.profile-trigger-chevron) {
  transition:
    transform 0.35s cubic-bezier(0.34, 1.35, 0.64, 1),
    color 0.2s ease;
}

.profile-menu-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-menu-header {
  cursor: default;
  user-select: text;
  padding: 18px 20px 16px;
  border-bottom: 2px solid #e2e8f0;
  margin: 0 12px;
}

.dark .profile-menu-header {
  border-bottom-color: #3f3f46;
}

.profile-menu-kicker {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  margin: 0 0 8px;
}

.dark .profile-menu-kicker {
  color: #94a3b8;
}

.profile-menu-email {
  text-align: left;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

.dark .profile-menu-email {
  color: #f8fafc;
}

.profile-menu-guest {
  text-align: left;
  font-size: 15px;
  font-weight: 500;
  color: #0f172a;
  margin: 0;
}

.dark .profile-menu-guest {
  color: #f8fafc;
}

.profile-menu-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 10px 12px;
}

/* Пункты меню */
:deep(.profile-menu-row.gv-btn--chromeless) {
  padding: 14px 16px !important;
  min-height: 48px;
  justify-content: flex-start;
  text-align: left;
  border-radius: 10px;
  margin: 0 2px;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

:deep(.profile-menu-link.gv-btn--chromeless:hover),
:deep(.profile-menu-auth.gv-btn--chromeless:hover),
:deep(a.profile-menu-link.gv-btn--chromeless:hover) {
  background-color: rgb(241 245 249) !important;
  color: rgb(15 23 42) !important;
  box-shadow: inset 4px 0 0 0 #0ea5e9;
  transform: translateX(2px);
}

.dark :deep(.profile-menu-link.gv-btn--chromeless:hover),
.dark :deep(.profile-menu-auth.gv-btn--chromeless:hover),
.dark :deep(a.profile-menu-link.gv-btn--chromeless:hover) {
  background-color: rgb(51 65 85 / 0.35) !important;
  color: rgb(248 250 252) !important;
  box-shadow: inset 4px 0 0 0 #38bdf8;
}

:deep(.profile-menu-icon) {
  transition: transform 0.2s ease, color 0.2s ease;
}

:deep(.profile-menu-row.gv-btn--chromeless:hover .profile-menu-icon) {
  color: #0ea5e9 !important;
  transform: scale(1.08);
}

.dark :deep(.profile-menu-row.gv-btn--chromeless:hover .profile-menu-icon) {
  color: #38bdf8 !important;
}

:deep(.profile-menu-row.gv-btn--chromeless:focus-visible) {
  outline: none;
  background-color: rgb(241 245 249) !important;
  box-shadow:
    inset 4px 0 0 0 #0ea5e9,
    0 0 0 2px rgba(14, 165, 233, 0.35);
}

.dark :deep(.profile-menu-row.gv-btn--chromeless:focus-visible) {
  background-color: rgb(51 65 85 / 0.35) !important;
  box-shadow:
    inset 4px 0 0 0 #38bdf8,
    0 0 0 2px rgba(56, 189, 248, 0.35);
}

:deep(.profile-button.gv-btn--chromeless:focus-visible) {
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px #0ea5e9;
}

.dark :deep(.profile-button.gv-btn--chromeless:focus-visible) {
  box-shadow:
    0 0 0 2px #18181b,
    0 0 0 4px #38bdf8;
}
</style>
