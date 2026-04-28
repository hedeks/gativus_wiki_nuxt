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
      <button
        type="button"
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
          class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-all duration-300"
        />
      </button>
    </template>

    <template #default="{ close }">
      <div
        class="cursor-default select-text border-b border-gray-100 px-3 py-2.5 dark:border-zinc-800"
        role="none"
      >
        <p class="text-left text-xs text-gray-500 dark:text-zinc-400">
          {{ store.isLoggedIn ? 'Вошли как' : 'Вы не в системе' }}
        </p>
        <p
          v-if="store.isLoggedIn"
          class="truncate text-left text-sm font-semibold text-gray-900 dark:text-white"
        >
          {{ store.userInfo?.email }}
        </p>
        <p v-else class="text-left text-sm font-medium text-gray-900 dark:text-white">
          Гостевой доступ
        </p>
      </div>

      <NuxtLink
        v-for="item in linkItems"
        :key="item.to"
        :to="item.to"
        role="menuitem"
        class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        @click="close"
      >
        <span class="truncate">{{ item.label }}</span>
        <UIcon :name="item.icon" class="ms-auto h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
      </NuxtLink>

      <button
        type="button"
        role="menuitem"
        class="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        @click="onAuth(close)"
      >
        <span class="truncate">{{ authRow.label }}</span>
        <UIcon :name="authRow.icon" class="ms-auto h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
      </button>
    </template>
  </AnchoredMenuDropdown>
</template>

<style scoped>
.profile-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 9999px;
  transition: all 0.4s cubic-bezier(0.705, 0.01, 0, 0.915);
  outline: none;
}

.profile-button:hover {
  background-color: rgba(243, 244, 246, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dark .profile-button:hover {
  background-color: rgba(39, 39, 42, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.profile-button:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 0.1s;
}
</style>
