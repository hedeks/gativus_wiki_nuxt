<script setup lang="ts">
const store = userStore();
const toast = useToast();

const signOut = () => {
  if (store.isLoggedIn) {
    store.logout();
    toast.add({
      title: "Вы вышли из аккаунта!",
      icon: 'i-heroicons-check-circle',
      color: 'sky'
    });
    navigateTo('/login');
  } else {
    navigateTo('/login');
  }
}

const items = computed(() => {
  const baseItems: any[][] = [
    [{
      label: store.isLoggedIn ? store.userInfo?.email : 'Гость',
      slot: 'account',
      disabled: true
    }],
    [{
      label: 'Статьи',
      icon: 'i-heroicons-document-text',
      to: "/courses"
    }, {
      label: 'Профиль',
      icon: 'i-heroicons-user',
      to: "/profile"
    }]
  ];

  // Anyone registered can enter admin
  if (store.isLoggedIn) {
    baseItems[1].push({
      label: 'Админ-панель',
      icon: 'i-heroicons-rectangle-group',
      to: '/admin'
    });
  }

  baseItems.push([{
    label: store.isLoggedIn ? 'Выйти' : 'Войти',
    icon: store.isLoggedIn ? 'i-heroicons-arrow-left-on-rectangle' : 'i-heroicons-arrow-right-on-rectangle',
    click: () => {
      if (store.isLoggedIn) signOut();
      else navigateTo('/login');
    }
  }]);

  return baseItems;
});
</script>

<template>
  <UDropdown :items="items" :ui="{
    width: 'w-56',
    background: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md',
    ring: 'ring-1 ring-gray-200 dark:ring-zinc-800',
    shadow: 'shadow-lg',
    item: {
      disabled: 'cursor-text select-text',
      active: 'bg-gray-100 dark:bg-zinc-800 text-sky-600 dark:text-sky-400',
      inactive: 'text-gray-700 dark:text-zinc-300',
      icon: {
        active: 'text-sky-600 dark:text-sky-400',
        inactive: 'text-gray-400 dark:text-gray-500'
      }
    }
  }" :popper="{ placement: 'bottom-end', arrow: true }">

    <button class="profile-button group">
      <UAvatar v-if="store.isLoggedIn" :alt="store.userInfo?.email" size="sm"
        class="transition-all duration-300" />
      <UAvatar v-else icon="i-heroicons-user" size="sm" class="bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400" />
      <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-all duration-300" />
    </button>

    <template #account="{ item }">
      <div class="text-left px-1 py-0.5">
        <p class="text-xs text-gray-500 dark:text-zinc-400">
          {{ store.isLoggedIn ? 'Вошли как' : 'Вы не в системе' }}
        </p>
        <p v-if="store.isLoggedIn" class="truncate font-semibold text-gray-900 dark:text-white text-sm">
          {{ item.label }}
        </p>
        <p v-else class="font-medium text-gray-900 dark:text-white text-sm">
          Гостевой доступ
        </p>
      </div>
    </template>

    <template #item="{ item }">
      <span class="truncate font-medium">{{ item.label }}</span>
      <UIcon :name="item.icon" class="flex-shrink-0 h-4 w-4 ms-auto" />
    </template>
  </UDropdown>
</template>

<style scoped>
.profile-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 9999px;
  transition: all 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
  outline: none;
}

.profile-button:hover {
  background-color: rgba(243, 244, 246, 1); /* bg-gray-100 */
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.dark .profile-button:hover {
  background-color: rgba(39, 39, 42, 1); /* bg-zinc-800 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.profile-button:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 0.1s;
}
</style>