<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import type { AdminUserPublic, AdminUsersListResponse } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role'],
  fluid: true
})

useHead({ title: 'Пользователи — Workspace — Gativus Admin' })

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

// Search
const searchQuery = ref('')
const filteredUsers = computed(() => {
  const list = payload.value?.users || []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((u: any) => 
    String(u.login || '').toLowerCase().includes(q) || 
    String(u.email || '').toLowerCase().includes(q)
  )
})

// Selected States
const selectedUserId = ref<number | null>(null)
const selectedUser = computed(() => 
  (payload.value?.users || []).find(u => u.id === selectedUserId.value)
)

const createOpen = ref(false)
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

function startCreate() {
  selectedUserId.value = null
  createOpen.value = true
  createLogin.value = ''
  createEmail.value = ''
  createPassword.value = ''
  createRole.value = 'user'
}

function cancelCreate() {
  createOpen.value = false
}

function selectUser(user: AdminUserPublic) {
  createOpen.value = false
  selectedUserId.value = user.id
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
    createOpen.value = false
    await refresh()
    // Select newly created user if possible
    const created = payload.value?.users.find(u => u.login === createLogin.value.trim())
    if (created) selectUser(created)
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

// Multi-select for bulk delete
const selectedIds = ref(new Set<number>())

const selectableUsers = computed(() =>
  (payload.value?.users || []).filter((u: AdminUserPublic) => u.id !== store.userInfo?.id)
)

const allSelected = computed(() =>
  selectableUsers.value.length > 0 && selectableUsers.value.every((u: AdminUserPublic) => selectedIds.value.has(u.id))
)

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

function toggleAll() {
  if (allSelected.value) selectedIds.value = new Set()
  else selectedIds.value = new Set(selectableUsers.value.map((u: AdminUserPublic) => u.id))
}

const isBulkDeleting = ref(false)

async function bulkDelete() {
  if (!selectedIds.value.size) return
  if (!confirm(`Удалить выбранных пользователей (${selectedIds.value.size}) безвозвратно?`)) return
  isBulkDeleting.value = true
  const ids = Array.from(selectedIds.value)
  let ok = 0, fail = 0
  for (const id of ids) {
    try {
      await $fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: store.getAuthHeader() })
      ok++
    } catch { fail++ }
  }
  selectedIds.value = new Set()
  isBulkDeleting.value = false
  toast.add({ title: fail ? `Удалено: ${ok}, ошибок: ${fail}` : `Удалено ${ok} пользователей`, color: fail ? 'orange' : 'green' })
  if (ids.includes(selectedUserId.value || 0)) {
    selectedUserId.value = null
  }
  await refresh()
}

async function deleteUser(user: AdminUserPublic) {
  if (!isAdmin.value) return
  if (user.id === store.userInfo?.id) {
    toast.add({ title: 'Нельзя удалить свою учётную запись', color: 'red' })
    return
  }
  if (!confirm(`Удалить пользователя «${user.login}» безвозвратно?`)) return
  
  deletingUserId.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: store.getAuthHeader(),
    })
    toast.add({ title: 'Пользователь удалён', color: 'green' })
    if (selectedUserId.value === user.id) {
      selectedUserId.value = null
    }
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
  <div class="gv-workspace-page">
    <div class="workspace-grid grid grid-cols-12 gap-0">
      
      <!-- Left Pane: Users List (4/12) -->
      <div class="workspace-list col-span-4 flex flex-col border-r border-gray-200 dark:border-gray-800 min-h-0 bg-white dark:bg-[#111113]">
        <header class="workspace-list-header flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500">
              <UIcon name="i-heroicons-users" class="text-xl" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Workspace</h1>
              <p class="text-[10px] text-gray-500 font-medium">Пользователи</p>
            </div>
          </div>
          <GvButton 
            type="button" 
            color="sky" 
            size="xs" 
            icon="i-heroicons-user-plus"
            @click="startCreate"
          >
            Новый
          </GvButton>
        </header>

        <div class="list-controls p-4 shrink-0 border-b border-gray-200 dark:border-gray-800">
          <BaseSearch
            v-model="searchQuery"
            placeholder="Поиск по пользователям..."
            :is-pending="pending"
            :is-debouncing="false"
          />
        </div>

        <!-- Bulk Action Bar -->
        <div v-if="isAdmin && selectedIds.size > 0" class="px-4 py-2 bg-red-50 dark:bg-red-950/20 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider shrink-0">
          <div class="flex items-center gap-3">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" class="gv-checkbox" />
            <span>Выбрать все ({{ selectedIds.size }})</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" @click="selectedIds = new Set()" class="text-gray-500 hover:text-gray-700">Отмена</button>
            <button type="button" @click="bulkDelete" class="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold">
              <UIcon name="i-heroicons-trash" /> Удалить ({{ selectedIds.size }})
            </button>
          </div>
        </div>
        <div v-else-if="isAdmin" class="px-4 py-2 bg-gray-50 dark:bg-[#161618] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">
          <div class="flex items-center gap-3">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" class="gv-checkbox" />
            <span>Выбрать все</span>
          </div>
        </div>

        <div class="users-scroll-container flex-1 overflow-y-auto">
          <div v-if="pending && filteredUsers.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl mb-2" />
            <p class="text-xs">Загрузка списка...</p>
          </div>
          <div v-else-if="filteredUsers.length === 0" class="p-8 text-center text-gray-400">
            <UIcon name="i-heroicons-users" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs">Ничего не найдено</p>
          </div>
          <div v-else class="divide-y divide-gray-100 dark:divide-gray-850">
            <div 
              v-for="u in filteredUsers" 
              :key="u.id"
              class="user-item p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/10"
              :class="{ 'user-item--active': selectedUserId === u.id && !createOpen }"
              @click="selectUser(u)"
            >
              <div class="flex items-center gap-3 min-w-0">
                <input 
                  v-if="isAdmin && u.id !== store.userInfo?.id"
                  type="checkbox" 
                  :checked="selectedIds.has(u.id)" 
                  @change="toggleSelect(u.id)" 
                  @click.stop
                  class="gv-checkbox shrink-0" 
                />
                <div v-else-if="isAdmin" class="w-4 h-4 shrink-0" />
                
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-gray-900 dark:text-white truncate">{{ u.login }}</span>
                    <UBadge :color="u.role === 'admin' ? 'red' : u.role === 'editor' ? 'sky' : 'gray'" size="xs" variant="soft">
                      {{ roleLabel[u.role] }}
                    </UBadge>
                  </div>
                  <span class="text-xs text-gray-500 truncate block mt-0.5">{{ u.email }}</span>
                </div>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="text-gray-400 text-sm shrink-0" />
            </div>
          </div>
        </div>
      </div>

      <!-- Right Pane: Details / Creation Form (8/12) -->
      <div class="workspace-editor-pane col-span-8 bg-[#fafafa] dark:bg-[#161618] flex flex-col relative overflow-hidden min-h-0 border-l border-gray-200 dark:border-gray-800">
        <!-- Scope note for non-admins -->
        <div v-if="!isAdmin" class="p-4 bg-sky-50 dark:bg-sky-950/20 border-b border-sky-100 dark:border-sky-900/20 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2 shrink-0">
          <UIcon name="i-heroicons-information-circle" class="text-base shrink-0 mt-0.5" />
          <p>
            Как редактор вы видите только аккаунты с ролью «Пользователь» и можете создавать такие аккаунты. Редакторов и админов может изменять/добавлять только администратор.
          </p>
        </div>

        <div v-if="error" class="p-6 text-red-500 flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-xl" />
          <span>{{ error.message }}</span>
          <GvButton type="button" variant="outline" color="gray" size="sm" @click="refresh()">Повторить</GvButton>
        </div>

        <!-- Empty State -->
        <div v-else-if="selectedUserId === null && !createOpen" class="empty-state flex-1 flex flex-col items-center justify-center opacity-60">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="text-6xl text-gray-300 dark:text-gray-700 mb-4" />
          <p class="text-sm font-medium text-gray-500">Выберите пользователя слева для просмотра настроек или создайте нового</p>
        </div>

        <!-- Creation Form -->
        <div v-else-if="createOpen" class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-2xl mx-auto">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white mb-6 uppercase tracking-wider">
              Новый пользователь
            </h2>
            <form @submit.prevent="submitCreate" class="space-y-5">
              <UFormGroup label="Логин" required>
                <UInput v-model="createLogin" autocomplete="off" required />
              </UFormGroup>
              <UFormGroup label="Email" required>
                <UInput v-model="createEmail" type="email" autocomplete="off" required />
              </UFormGroup>
              <UFormGroup label="Пароль" required>
                <UInput v-model="createPassword" type="password" autocomplete="new-password" required />
              </UFormGroup>
              <UFormGroup v-if="isAdmin" label="Роль">
                <select v-model="createRole" class="gv-admin-filter-select w-full min-h-[40px]">
                  <option value="user">Пользователь</option>
                  <option value="editor">Редактор</option>
                  <option value="admin">Админ</option>
                </select>
              </UFormGroup>
              
              <div class="flex justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-800">
                <GvButton type="button" color="gray" variant="ghost" @click="cancelCreate">Отмена</GvButton>
                <GvButton type="submit" color="sky" :loading="createSubmitting" icon="i-heroicons-user-plus">Создать</GvButton>
              </div>
            </form>
          </div>
        </div>

        <!-- Detail Card -->
        <div v-else-if="selectedUser" class="workspace-editor-scroll flex-1 overflow-y-auto p-6 bg-white dark:bg-[#111113]">
          <div class="max-w-2xl mx-auto space-y-6">
            <div class="flex items-center justify-between border-b border-gray-150 dark:border-gray-800 pb-4">
              <div>
                <h2 class="text-lg font-bold text-gray-900 dark:text-white">{{ selectedUser.login }}</h2>
                <p class="text-xs text-gray-500 mt-1">ID пользователя: {{ selectedUser.id }}</p>
              </div>
              
              <GvButton
                v-if="isAdmin && selectedUser.id !== store.userInfo?.id"
                color="red"
                variant="soft"
                size="sm"
                icon="i-heroicons-trash"
                :loading="deletingUserId === selectedUser.id"
                @click="deleteUser(selectedUser)"
              >
                Удалить аккаунт
              </GvButton>
            </div>

            <div class="space-y-4">
              <UFormGroup label="Электронная почта">
                <UInput :model-value="selectedUser.email" readonly disabled />
              </UFormGroup>

              <div class="grid md:grid-cols-2 gap-4">
                <UFormGroup label="Зарегистрирован">
                  <UInput :model-value="formatDt(selectedUser.created_at)" readonly disabled />
                </UFormGroup>
                <UFormGroup label="Последний визит">
                  <UInput :model-value="formatDt(selectedUser.last_visited)" readonly disabled />
                </UFormGroup>
              </div>

              <UFormGroup label="Роль доступа" :help="isAdmin ? 'Измените роль и сохраните изменения' : 'Только администратор может изменять роли'">
                <div class="flex gap-3">
                  <select
                    v-model="roleDraft[selectedUser.id]"
                    class="gv-admin-filter-select flex-1 min-h-[40px]"
                    :disabled="!isAdmin"
                  >
                    <option value="user">Пользователь</option>
                    <option value="editor">Редактор</option>
                    <option value="admin">Админ</option>
                  </select>
                  
                  <GvButton
                    v-if="isAdmin && roleDraft[selectedUser.id] !== selectedUser.role"
                    color="sky"
                    variant="solid"
                    :loading="savingRoleId === selectedUser.id"
                    icon="i-heroicons-check"
                    @click="patchRole(selectedUser)"
                  >
                    Сохранить роль
                  </GvButton>
                </div>
              </UFormGroup>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px); /* 65px is the topbar height */
  overflow: hidden;
  background: var(--gv-surface);
}

.workspace-grid {
  height: 100%;
  flex: 1;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.users-scroll-container {
  overflow-y: auto;
  flex: 1;
}

.workspace-editor-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workspace-editor-scroll {
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.user-item {
  border-bottom: 1px solid var(--gv-border-subtle);
}

.user-item--active {
  background: rgba(14, 165, 233, 0.05) !important;
  border-left: 3px solid #0ea5e9;
  padding-left: 13px !important;
}
.dark .user-item--active {
  background: rgba(14, 165, 233, 0.1) !important;
}

.gv-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #0ea5e9;
}
</style>
