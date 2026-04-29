<script setup lang="ts">
import type { User } from '~/types'

definePageMeta({
  layout: 'default',
})

const store = userStore()
store.checkAuth()
if (store.isLoggedIn) {
  await navigateTo('/profile')
}

const toast = useToast()

const email = ref('')
const password = ref('')
const loginName = ref('')
const isSignup = ref(false)
const errorMain = ref<string | null>(null)
const isLoading = ref(false)

const pageTitle = computed(() => (isSignup.value ? 'Регистрация' : 'Вход'))
useHead({
  title: pageTitle,
})

watch(isSignup, () => {
  errorMain.value = null
})

watch([email, password, loginName], () => {
  errorMain.value = null
})

async function signUp(): Promise<void> {
  isLoading.value = true
  errorMain.value = null
  try {
    const data = await $fetch<{ res: { user: User, access_token: string } }>('/api/auth/register', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value,
        login: loginName.value.trim(),
      },
    })
    const user = data.res.user
    if (user) {
      store.setUser(user, data.res.access_token)
      toast.add({
        title: `Аккаунт создан! Добро пожаловать, ${user.login}`,
        ui: {
          background: 'bg-white dark:bg-zinc-900',
          progress: { background: 'bg-sky-600 dark:bg-sky-400' },
        },
      })
      await navigateTo('/profile')
    }
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'data' in err
      ? (err as { data?: { message?: string } }).data?.message
      : undefined
    errorMain.value = msg || 'Ошибка регистрации'
  } finally {
    isLoading.value = false
  }
}

async function loginFunc(): Promise<void> {
  isLoading.value = true
  errorMain.value = null
  try {
    const data = await $fetch<{ res: { user: User, access_token: string } }>('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value,
      },
    })
    const user = data.res.user
    if (user) {
      store.setUser(user, data.res.access_token)
      toast.add({
        title: `Вы вошли: ${user.email}`,
        ui: {
          background: 'bg-white dark:bg-zinc-900',
          progress: { background: 'bg-sky-600 dark:bg-sky-400' },
        },
      })
      await navigateTo('/profile')
    }
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'data' in err
      ? (err as { data?: { message?: string } }).data?.message
      : undefined
    errorMain.value = msg || 'Ошибка входа'
  } finally {
    isLoading.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (isSignup.value)
    await signUp()
  else
    await loginFunc()
}

function toggleSignup(): void {
  isSignup.value = !isSignup.value
}
</script>

<template>
  <div class="auth-page gv-page flex flex-col items-center justify-center py-12 px-4">
    <div
      class="auth-card w-full max-w-md rounded-2xl border border-zinc-200/80 bg-[var(--gv-surface-card)] shadow-[var(--gv-shadow-md)] dark:border-zinc-800/80 overflow-hidden"
    >
      <div class="auth-card-head border-b border-zinc-200/70 dark:border-zinc-800 px-6 py-5 bg-[var(--gv-surface-header)]">
        <h1 class="text-xl font-bold tracking-tight text-[var(--gv-text-primary)]">
          {{ isSignup ? 'Регистрация' : 'Вход' }}
        </h1>
        <p class="text-sm text-[var(--gv-text-secondary)] mt-1">
          {{ isSignup ? 'Создайте аккаунт для доступа к материалам.' : 'Войдите, чтобы открыть профиль и закрытые разделы.' }}
        </p>
      </div>

      <form class="auth-card-body px-6 py-6 flex flex-col gap-4" @submit.prevent="onSubmit">
        <label class="auth-field">
          <span class="auth-label">Электронная почта</span>
          <input
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            required
            class="auth-input"
            placeholder="you@example.com"
          >
        </label>

        <label v-if="isSignup" class="auth-field">
          <span class="auth-label">Логин</span>
          <input
            v-model="loginName"
            type="text"
            name="login"
            autocomplete="username"
            required
            class="auth-input"
            placeholder="Уникальное имя"
          >
        </label>

        <label class="auth-field">
          <span class="auth-label">Пароль</span>
          <input
            v-model="password"
            type="password"
            name="password"
            :autocomplete="isSignup ? 'new-password' : 'current-password'"
            required
            class="auth-input"
            placeholder="••••••••"
          >
        </label>

        <p
          v-if="errorMain"
          class="auth-error"
          role="alert"
        >
          {{ errorMain }}
        </p>

        <GvButton
          type="submit"
          block
          color="sky"
          variant="solid"
          trailing
          icon="i-heroicons-arrow-right"
          class="mt-2 shadow-lg shadow-sky-500/15"
          :loading="isLoading"
        >
          {{ isSignup ? 'Зарегистрироваться' : 'Войти' }}
        </GvButton>
      </form>

      <div class="auth-card-foot px-6 py-4 border-t border-zinc-200/70 dark:border-zinc-800">
        <button
          type="button"
          class="auth-toggle"
          @click="toggleSignup"
        >
          {{ isSignup ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться' }}
        </button>
      </div>
    </div>

    <p
      v-if="!store.isLoggedIn"
      class="mt-6 text-center text-sm text-[var(--gv-text-secondary)] max-w-md"
    >
      Просмотр части контента и личного кабинета доступен после входа.
    </p>
  </div>
</template>

<style scoped>
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.auth-input {
  width: 100%;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface);
  color: var(--gv-text-primary);
  padding: 10px 14px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-input::placeholder {
  color: var(--gv-text-secondary);
  opacity: 0.7;
}

.auth-input:focus {
  border-color: var(--gv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gv-primary) 22%, transparent);
}

.auth-error {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--gv-radius-control);
  font-size: 14px;
  line-height: 1.4;
  color: #b91c1c;
  background: color-mix(in srgb, #fecaca 35%, transparent);
  border: 1px solid color-mix(in srgb, #ef4444 45%, transparent);
}

.dark .auth-error {
  color: #fca5a5;
  background: color-mix(in srgb, #7f1d1d 45%, transparent);
  border-color: color-mix(in srgb, #b91c1c 50%, transparent);
}

.auth-toggle {
  width: 100%;
  background: none;
  border: none;
  padding: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--gv-primary);
  cursor: pointer;
  border-radius: var(--gv-radius-control);
  transition: background 0.15s ease;
}

.auth-toggle:hover {
  background: color-mix(in srgb, var(--gv-primary) 12%, transparent);
}

.auth-card-foot {
  background: color-mix(in srgb, var(--gv-surface-header) 88%, transparent);
}
</style>
