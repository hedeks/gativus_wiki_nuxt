<script setup lang="ts">
import type { AdminUserPublic, AdminUsersListResponse } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
})

useHead({ title: 'Пользователи — Gativus Admin' })

const store = userStore()
const toast = useToast()
const isAdmin = computed(() => store.userInfo?.role === 'admin')

const {
  data: payload,
  pending,
  error,
  refresh,
} = await useFetch<AdminUsersListResponse>('/api/admin/users', {
  headers: store.getAuthHeader(),
})

const createLogin = ref('')
const createEmail = ref('')
const createPassword = ref('')
const createRole = ref<'user' | 'editor' | 'admin'>('user')

const createSubmitting = ref(false)
const savingRoleId = ref<number | null>(null)
const deletingUserId = ref<number | null>(null)

const roleDraft = ref<Record<number, AdminUserPublic['role']>>({})

watch(
  () => payload.value?.users,
  (list) => {
    if (!list) return
    const d: Record<number, AdminUserPublic['role']> = {}
    for (const u of list) d[u.id] = u.role
    roleDraft.value = d
  },
  { immediate: true }
)

const roleLabel: Record<AdminUserPublic['role'], string> = {
  user: 'Пользователь',
  editor: 'Редактор',
  admin: 'Админ',
}

function formatDt(v: string | null) {
  if (!v) return '—'
  return v.replace('T', ' ').slice(0, 19)
}

async function submitCreate() {
  createSubmitting.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      headers: { ...store.getAuthHeader(), 'Content-Type': 'application/json' },
      body: {
        login: createLogin.value.trim(),
        email: createEmail.value.trim(),
        password: createPassword.value,
        ...(isAdmin.value ? { role: createRole.value } : {}),
      },
    })
    toast.add({ title: 'Пользователь создан', color: 'green' })
    createLogin.value = ''
    createEmail.value = ''
    createPassword.value = ''
    createRole.value = 'user'
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Ошибка',
      description: e?.data?.statusMessage || e?.message || 'Не удалось создать',
      color: 'red',
    })
  } finally {
    createSubmitting.value = false
  }
}

async function patchRole(user: AdminUserPublic) {
  const next = roleDraft.value[user.id]
  if (!next || next === user.role) return

  savingRoleId.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { ...store.getAuthHeader(), 'Content-Type': 'application/json' },
      body: { role: next },
    })
    toast.add({ title: 'Роль обновлена', color: 'green' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Ошибка',
      description: e?.data?.statusMessage || e?.message || 'Не удалось сохранить',
      color: 'red',
    })
    roleDraft.value[user.id] = user.role
  } finally {
    savingRoleId.value = null
  }
}

async function deleteUser(user: AdminUserPublic) {
  if (!isAdmin.value)
    return
  if (user.id === store.userInfo?.id) {
    toast.add({ title: 'Нельзя удалить свою учётную запись', color: 'red' })
    return
  }
  const ok = typeof window !== 'undefined'
    && window.confirm(`Удалить пользователя «${user.login}» безвозвратно?`)
  if (!ok)
    return
  deletingUserId.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: store.getAuthHeader(),
    })
    toast.add({ title: 'Пользователь удалён', color: 'green' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Ошибка',
      description: e?.data?.statusMessage || e?.message || 'Не удалось удалить',
      color: 'red',
    })
  } finally {
    deletingUserId.value = null
  }
}
</script>

<template>
  <div class="admin-page-stack">
    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Пользователи</h1>
          <p class="hero-lead">
            {{ isAdmin ? 'Все учётные записи и роли' : 'Только роль «Пользователь»' }}
          </p>
          <p v-if="isAdmin" class="hero-lead text-sm mt-1 opacity-90 max-w-xl">
            Администратор может удалять пользователей (кроме себя и единственного оставшегося админа).
          </p>
        </div>
      </div>
    </section>

    <section v-if="!isAdmin" class="section-card">
      <div class="card-body card-body--row scope-note-inner">
        <UIcon name="i-heroicons-information-circle" class="scope-note-icon" />
        <p class="scope-note-text">
          Как редактор вы видите только аккаунты с ролью «Пользователь» и можете создавать такие аккаунты.
          Редакторов и админов добавляет только администратор.
        </p>
      </div>
    </section>

    <section v-if="pending" class="section-card">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-arrow-path" class="icon-spin" />
        <span>Загрузка…</span>
      </div>
    </section>

    <section v-else-if="error" class="section-card section-card--error">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-exclamation-triangle" class="icon-err" />
        <span>{{ error.message }}</span>
        <GvButton type="button" variant="outline" color="gray" size="sm" @click="refresh()">Повторить</GvButton>
      </div>
    </section>

    <template v-else-if="payload">
      <section class="section-card">
        <header class="card-header">
          <span class="card-badge">NEW</span>
          <h2 class="card-header-title">Новый пользователь</h2>
        </header>
        <div class="card-body">
          <form class="create-form" @submit.prevent="submitCreate">
            <div class="create-fields">
              <UFormGroup label="Логин">
                <UInput v-model="createLogin" autocomplete="off" required />
              </UFormGroup>
              <UFormGroup label="Email">
                <UInput v-model="createEmail" type="email" autocomplete="off" required />
              </UFormGroup>
              <UFormGroup label="Пароль">
                <UInput v-model="createPassword" type="password" autocomplete="new-password" required />
              </UFormGroup>
              <UFormGroup v-if="isAdmin" label="Роль">
                <select v-model="createRole" class="gv-admin-filter-select w-full">
                  <option value="user">Пользователь</option>
                  <option value="editor">Редактор</option>
                  <option value="admin">Админ</option>
                </select>
              </UFormGroup>
            </div>
            <GvButton
              type="submit"
              color="sky"
              variant="solid"
              size="sm"
              icon="i-heroicons-user-plus"
              :loading="createSubmitting"
            >
              Создать
            </GvButton>
          </form>
        </div>
      </section>

      <section v-if="payload.users.length === 0" class="section-card">
        <div class="card-body empty-list-inner">
          <UIcon name="i-heroicons-users" />
          <span>Пока никого нет в этом списке.</span>
        </div>
      </section>

      <section v-else class="section-card">
        <header class="card-header">
          <span class="card-badge">LIST</span>
          <h2 class="card-header-title">Учётные записи</h2>
        </header>
        <div class="card-body card-body--flush overflow-x-auto">
          <table class="users-table min-w-[720px]">
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Создан</th>
              <th>Визит</th>
              <th v-if="isAdmin" class="col-save">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in payload.users" :key="u.id">
              <td class="td-num">{{ u.id }}</td>
              <td>{{ u.login }}</td>
              <td class="td-email">{{ u.email }}</td>
              <td>
                <template v-if="isAdmin">
                  <select
                    v-model="roleDraft[u.id]"
                    class="gv-admin-filter-select role-select"
                  >
                    <option value="user">Пользователь</option>
                    <option value="editor">Редактор</option>
                    <option value="admin">Админ</option>
                  </select>
                </template>
                <template v-else>
                  <UBadge color="gray" variant="soft">{{ roleLabel[u.role] }}</UBadge>
                </template>
              </td>
              <td class="td-muted">{{ formatDt(u.created_at) }}</td>
              <td class="td-muted">{{ formatDt(u.last_visited) }}</td>
              <td v-if="isAdmin" class="col-save">
                <div class="flex flex-wrap items-center gap-2 justify-end">
                  <GvButton
                    v-if="roleDraft[u.id] !== u.role"
                    size="xs"
                    color="sky"
                    variant="soft"
                    :loading="savingRoleId === u.id"
                    icon="i-heroicons-check"
                    @click="patchRole(u)"
                  >
                    Сохранить
                  </GvButton>
                  <GvButton
                    v-if="u.id !== store.userInfo?.id"
                    size="xs"
                    color="red"
                    variant="soft"
                    icon="i-heroicons-trash"
                    :loading="deletingUserId === u.id"
                    @click="deleteUser(u)"
                  >
                    Удалить
                  </GvButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.scope-note-inner {
  align-items: flex-start;
}

.scope-note-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  color: #0284c7;
}

.dark .scope-note-icon {
  color: #38bdf8;
}

.scope-note-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #52525b;
}

.dark .scope-note-text {
  color: #a1a1aa;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}

.create-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  width: 100%;
}

.empty-list-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  color: #71717a;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th {
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid var(--gv-border-principal, #e4e4e7);
  font-weight: 600;
  color: var(--gv-text-secondary, #52525b);
  background: var(--gv-surface-header, #f9f9f9);
}

.dark .users-table th {
  background: #222;
}

.users-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--gv-border-subtle, #f4f4f5);
  vertical-align: middle;
}

.users-table tr:last-child td {
  border-bottom: none;
}

.td-num {
  font-variant-numeric: tabular-nums;
  color: #71717a;
}

.td-email {
  word-break: break-all;
}

.td-muted {
  font-size: 12px;
  color: #71717a;
  white-space: nowrap;
}

.role-select {
  min-width: 160px;
}

.col-save {
  width: 1%;
  white-space: nowrap;
}
</style>
