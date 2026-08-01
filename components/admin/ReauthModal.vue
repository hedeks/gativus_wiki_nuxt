<script setup lang="ts">
import { userStore } from '~/stores/userStore'
import type { User } from '~/types'

const store = userStore()
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMain = ref<string | null>(null)

watch(() => store.isReauthenticating, (val) => {
  if (val) {
    email.value = store.userInfo?.email || ''
    password.value = ''
    errorMain.value = null
  }
})

async function onLogin() {
  if (!email.value || !password.value) return
  isLoading.value = true
  errorMain.value = null

  try {
    const data = await $fetch<{ res: { user: User, access_token: string } }>('/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        password: password.value
      }
    })
    
    if (data.res.user) {
      store.setUser(data.res.user, data.res.access_token)
      store.finishReauth(true)
    }
  } catch (err: any) {
    const msg = err?.data?.message || 'Ошибка авторизации'
    errorMain.value = msg
  } finally {
    isLoading.value = false
  }
}

function onCancel() {
  store.finishReauth(false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="store.isReauthenticating"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <div class="auth-card w-full max-w-md rounded-2xl border border-zinc-200/80 bg-[var(--gv-surface-card)] shadow-[var(--gv-shadow-lg)] dark:border-zinc-800/80 overflow-hidden relative">
          
          <button 
            type="button" 
            class="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            @click="onCancel"
          >
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>

          <div class="auth-card-head border-b border-zinc-200/70 dark:border-zinc-800 px-6 py-5 bg-[var(--gv-surface-header)]">
            <h2 class="text-xl font-bold tracking-tight text-[var(--gv-text-primary)]">
              Сессия истекла
            </h2>
            <p class="text-sm text-[var(--gv-text-secondary)] mt-1">
              Пожалуйста, войдите снова, чтобы продолжить редактирование и не потерять данные.
            </p>
          </div>

          <form class="auth-card-body px-6 py-6 flex flex-col gap-4" @submit.prevent="onLogin">
            <label class="auth-field">
              <span class="auth-label">Электронная почта</span>
              <input
                v-model="email"
                type="email"
                required
                class="auth-input"
                placeholder="you@example.com"
              >
            </label>

            <label class="auth-field">
              <span class="auth-label">Пароль</span>
              <input
                v-model="password"
                type="password"
                required
                class="auth-input"
                placeholder="••••••••"
              >
            </label>

            <p v-if="errorMain" class="auth-error" role="alert">
              {{ errorMain }}
            </p>

            <div class="flex gap-3 mt-2">
              <GvButton
                type="button"
                variant="outline"
                color="gray"
                class="flex-1"
                @click="onCancel"
              >
                Отмена
              </GvButton>
              <GvButton
                type="submit"
                variant="solid"
                color="sky"
                class="flex-1"
                :loading="isLoading"
              >
                Войти
              </GvButton>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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
</style>
