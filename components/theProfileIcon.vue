<script setup lang="ts">
const store = userStore();
const toast = useToast();
const user = store.userInfo;
import type { DropdownItem } from '../node_modules/@nuxt/ui/dist/runtime/types';
onMounted(() => {
  if (user) {
    store.isLoggedIn = true;
    store.userInfo = user;
  } else {
    store.isLoggedIn = false;
  }
})
const signOut = () => {
  if (store.isLoggedIn) {
    toast.add({ title: "Вы вышли из аккаунта!" })
    store.$state.isLoggedIn = false;
    store.$state.userInfo = {
      id: 0,
      login: "anonymous",
      email: "anonymous",
      created_at: "0",
      encrypted_password: "",
      uuid: ""
    };
    navigateTo('/login');
  } else {
    toast.add({ title: "Перенаправление к авторизации!" });
    navigateTo('/login');
  }
}
const labelForDropDown = computed(() => {
  if (store.isLoggedIn) {
    return `Выйти`
  } else {
    return `Войти`
  }
})
const items =
  computed(() => {
    return ([
      [{
        label: store.userInfo.email,
        slot: 'account',
        disabled: true
      }], [{
        label: 'Курсы',
        icon: 'i-heroicons-book-open',
        to: "/courses"
      }, {
        label: 'Профиль',
        icon: 'i-heroicons-user',
        to: "/profile"
      }], [{
        label: labelForDropDown.value,
        icon: 'i-heroicons-arrow-left-on-rectangle',
        click: () => {
          signOut();
        }
      }]
    ])
  })
</script>

<template>
  <UDropdown :items="items as DropdownItem[][]" :ui="{ item: { disabled: 'cursor-text select-text' } }"
    :popper="{ placement: 'bottom-start', arrow: true }">
    <UAvatar v-if='store.isLoggedIn' :alt="store.userInfo.email" />
    <UAvatar v-else icon="i-heroicons-exclamation-circle" size="sm" />

    <template #account="{ item }">
      <div class="text-left">
        <p v-if="store.isLoggedIn">
          Вошли как
        </p>
        <p v-if="store.isLoggedIn" class="truncate font-medium text-gray-900 dark:text-white">
          {{ item.label }}
        </p>
        <p v-else>
          Вы не вошли в аккаунт
        </p>
      </div>
    </template>

    <template #item="{ item }">
      <span class="truncate">{{ item.label }}</span>

      <UIcon :name="item.icon" class="font flex-shrink-0 h-4 w-4 text-gray-400 dark:text-gray-500 ms-auto" />
    </template>
  </UDropdown>
</template>