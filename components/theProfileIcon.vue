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
          class="profile-avatar-guest"
        />
        <UIcon
          name="i-heroicons-chevron-down"
          class="profile-trigger-chevron h-4 w-4"
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
            class="profile-menu-row profile-menu-link flex w-full items-center gap-3"
            @click="close"
          >
            <span class="truncate">{{ item.label }}</span>
            <UIcon
              :name="item.icon"
              class="profile-menu-icon ms-auto h-[18px] w-[18px] flex-shrink-0"
            />
          </GvButton>

          <GvButton
            type="button"
            role="menuitem"
            unstyled
            chromeless
            block
            class="profile-menu-row profile-menu-auth flex w-full items-center gap-3 text-left"
            @click="onAuth(close)"
          >
            <span class="truncate">{{ authRow.label }}</span>
            <UIcon
              :name="authRow.icon"
              class="profile-menu-icon ms-auto h-[18px] w-[18px] flex-shrink-0"
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

/* Гостевой аватар: фон/иконка в токенах (UAvatar пробрасывает class на корень) */
:deep(.profile-avatar-guest),
.profile-avatar-guest {
  background: color-mix(
    in srgb,
    var(--gv-surface-header) 82%,
    var(--gv-border-principal) 18%
  ) !important;
  color: var(--gv-text-secondary) !important;
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
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.2s ease;
}

:deep(.profile-button.gv-btn--chromeless:hover) {
  background-color: color-mix(
    in srgb,
    var(--gv-surface-header) 88%,
    var(--gv-primary) 12%
  ) !important;
  transform: translateY(-1px);
  box-shadow: var(--gv-shadow-md);
}

.dark :deep(.profile-button.gv-btn--chromeless:hover) {
  background-color: color-mix(
    in srgb,
    var(--gv-surface-card) 82%,
    var(--gv-primary) 18%
  ) !important;
  box-shadow: var(--gv-shadow-lg);
}

:deep(.profile-button.gv-btn--chromeless:active) {
  transform: translateY(0);
  transition-duration: 0.1s;
}

:deep(.profile-button.gv-btn--chromeless:hover .profile-trigger-chevron) {
  transform: rotate(-180deg);
  color: var(--gv-primary);
}

.dark :deep(.profile-button.gv-btn--chromeless:hover .profile-trigger-chevron) {
  color: var(--gv-primary-hover);
}

:deep(.profile-trigger-chevron) {
  color: color-mix(in srgb, var(--gv-text-secondary) 92%, var(--gv-primary) 8%);
  transition:
    transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1),
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
  padding: 14px 16px 14px;
  border-bottom: 1px solid var(--gv-border-principal);
}

.profile-menu-kicker {
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  margin: 0 0 6px;
}

.profile-menu-email {
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--gv-text-primary);
  margin: 0;
  line-height: 1.45;
  word-break: break-word;
}

.profile-menu-guest {
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  color: var(--gv-text-primary);
  margin: 0;
  line-height: 1.45;
}

.profile-menu-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

/* Пункты меню */
:deep(.profile-menu-row.gv-btn--chromeless) {
  padding: 11px 12px !important;
  min-height: 44px;
  justify-content: flex-start;
  text-align: left;
  border-radius: var(--gv-radius-control);
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--gv-text-primary);
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

:deep(.profile-menu-auth.gv-btn--chromeless) {
  margin-top: 4px;
  padding-top: 12px !important;
  border-top: 1px solid var(--gv-border-principal);
}

:deep(.profile-menu-link.gv-btn--chromeless:hover),
:deep(.profile-menu-auth.gv-btn--chromeless:hover),
:deep(a.profile-menu-link.gv-btn--chromeless:hover) {
  background-color: color-mix(
    in srgb,
    var(--gv-primary) 9%,
    var(--gv-surface-card)
  ) !important;
  color: var(--gv-text-primary) !important;
  box-shadow: inset 3px 0 0 0 var(--gv-primary);
  transform: translateX(1px);
}

.dark :deep(.profile-menu-link.gv-btn--chromeless:hover),
.dark :deep(.profile-menu-auth.gv-btn--chromeless:hover),
.dark :deep(a.profile-menu-link.gv-btn--chromeless:hover) {
  background-color: color-mix(
    in srgb,
    var(--gv-primary) 14%,
    var(--gv-surface-card)
  ) !important;
  box-shadow: inset 3px 0 0 0 var(--gv-primary-hover);
}

:deep(.profile-menu-icon) {
  color: var(--gv-text-secondary);
  transition: transform 0.2s ease, color 0.2s ease;
}

:deep(.profile-menu-row.gv-btn--chromeless:hover .profile-menu-icon) {
  color: var(--gv-primary) !important;
  transform: scale(1.05);
}

.dark :deep(.profile-menu-row.gv-btn--chromeless:hover .profile-menu-icon) {
  color: var(--gv-primary-hover) !important;
}

:deep(.profile-menu-row.gv-btn--chromeless:focus-visible) {
  outline: none;
  background-color: color-mix(
    in srgb,
    var(--gv-primary) 9%,
    var(--gv-surface-card)
  ) !important;
  box-shadow:
    inset 3px 0 0 0 var(--gv-primary),
    0 0 0 2px color-mix(in srgb, var(--gv-primary) 30%, transparent);
}

.dark :deep(.profile-menu-row.gv-btn--chromeless:focus-visible) {
  background-color: color-mix(
    in srgb,
    var(--gv-primary) 14%,
    var(--gv-surface-card)
  ) !important;
  box-shadow:
    inset 3px 0 0 0 var(--gv-primary-hover),
    0 0 0 2px color-mix(in srgb, var(--gv-primary-hover) 32%, transparent);
}

:deep(.profile-button.gv-btn--chromeless:focus-visible) {
  box-shadow:
    0 0 0 2px var(--gv-surface-card),
    0 0 0 4px var(--gv-primary);
}

.dark :deep(.profile-button.gv-btn--chromeless:focus-visible) {
  box-shadow:
    0 0 0 2px var(--gv-surface),
    0 0 0 4px var(--gv-primary-hover);
}
</style>
