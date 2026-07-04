<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
  fluid: true
})

useHead({ title: 'Файловое хранилище — Gativus Admin' })

const store = userStore()
const toast = useToast()

const files = ref<any[]>([])
const stats = ref<any>({
  totalCount: 0,
  totalSize: 0,
  orphanedCount: 0,
  orphanedSize: 0
})
const pending = ref(true)

// Categories / Subgroups tabs configuration
const tabs = [
  { key: 'covers', label: 'Обложки книг', icon: 'i-heroicons-photo' },
  { key: 'presentations', label: 'Презентации', icon: 'i-heroicons-presentation-chart-line' },
  { key: 'articles', label: 'Медиа статей', icon: 'i-heroicons-document-text' },
  { key: 'terms', label: 'Медиа глоссария', icon: 'i-heroicons-bookmark' },
  { key: 'landing', label: 'Медиа лендинга', icon: 'i-heroicons-computer-desktop' },
  { key: 'odt', label: 'Документы ODT', icon: 'i-heroicons-document' },
  { key: 'odm', label: 'Проекты ODM', icon: 'i-heroicons-document-duplicate' },
  { key: 'preview', label: 'Превью/Прочее', icon: 'i-heroicons-paper-clip' }
]

const activeTab = ref('covers')

// Fetch files list
async function fetchFiles() {
  pending.value = true
  try {
    const res = await $fetch<any>('/api/admin/files', {
      headers: store.getAuthHeader()
    })
    files.value = res.files || []
    stats.value = res.stats || {
      totalCount: 0,
      totalSize: 0,
      orphanedCount: 0,
      orphanedSize: 0
    }
  } catch (e: any) {
    toast.add({ title: 'Не удалось загрузить список файлов', description: e.message, color: 'red' })
  } finally {
    pending.value = false
  }
}

// Filtered files for active tab
const filteredFiles = computed(() => {
  return files.value.filter(f => f.group === activeTab.value)
})

// File helpers
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isImage(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
}

function isVideo(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ['mp4', 'webm', 'ogg', 'mov'].includes(ext)
}

// Actions
const deletingPath = ref<string | null>(null)
const clearingOrphans = ref(false)

async function deleteFile(path: string) {
  if (!confirm('Вы уверены, что хотите окончательно удалить этот файл с сервера?')) return

  deletingPath.value = path
  try {
    await $fetch('/api/admin/files', {
      method: 'DELETE',
      headers: store.getAuthHeader(),
      body: { path }
    })
    toast.add({ title: 'Файл успешно удален', color: 'green' })
    await fetchFiles()
  } catch (e: any) {
    toast.add({ 
      title: 'Не удалось удалить файл', 
      description: e?.data?.statusMessage || e?.message, 
      color: 'red' 
    })
  } finally {
    deletingPath.value = null
  }
}

async function cleanOrphanedFiles() {
  if (!confirm(`Вы действительно хотите удалить все неиспользуемые файлы (${stats.value.orphanedCount} шт.)? Это освободит ${formatSize(stats.value.orphanedSize)}.`)) return

  clearingOrphans.value = true
  try {
    const res = await $fetch<any>('/api/admin/files/cleanup', {
      method: 'POST',
      headers: store.getAuthHeader()
    })
    toast.add({ title: res.message || 'Очистка успешно завершена', color: 'green' })
    await fetchFiles()
  } catch (e: any) {
    toast.add({ title: 'Не удалось очистить хранилище', description: e.message, color: 'red' })
  } finally {
    clearingOrphans.value = false
  }
}

// Replacement Modal & Form
const isReplaceModalOpen = ref(false)
const activeReplaceFile = ref<any>(null)
const selectedReplaceFile = ref<File | null>(null)
const replaceFileInputRef = ref<HTMLInputElement | null>(null)
const replacing = ref(false)

function openReplaceModal(file: any) {
  activeReplaceFile.value = file
  selectedReplaceFile.value = null
  isReplaceModalOpen.value = true
}

function onReplaceFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedReplaceFile.value = input.files[0]
  }
}

async function handleReplaceFile() {
  if (!activeReplaceFile.value || !selectedReplaceFile.value) return
  replacing.value = true

  const formData = new FormData()
  formData.append('path', activeReplaceFile.value.path)
  formData.append('file', selectedReplaceFile.value)

  try {
    await $fetch('/api/admin/files/replace', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader()
    })
    toast.add({ title: 'Файл успешно заменен', color: 'green' })
    isReplaceModalOpen.value = false
    await fetchFiles()
  } catch (e: any) {
    toast.add({ 
      title: 'Не удалось заменить файл', 
      description: e?.data?.statusMessage || e?.message, 
      color: 'red' 
    })
  } finally {
    replacing.value = false
  }
}

// Initial fetch
onMounted(() => {
  fetchFiles()
})
</script>

<template>
  <div class="gv-workspace-page flex flex-col gap-4">
    <!-- Hero / Header -->
    <section class="admin-dash-hero shrink-0">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Файлы сервера</h1>
          <p class="hero-lead">Управление медиаресурсами, ODT/ODM и презентациями</p>
        </div>
      </div>
    </section>

    <!-- Storage Statistics -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
      <div class="stat-card gv-glass border border-gray-100 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-4">
        <div class="stat-icon-wrap bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
          <UIcon name="i-heroicons-folder" class="h-6 w-6" />
        </div>
        <div>
          <p class="stat-label">Всего файлов</p>
          <h3 class="stat-value">{{ stats.totalCount }} <span class="text-xs text-gray-500 font-normal">({{ formatSize(stats.totalSize) }})</span></h3>
        </div>
      </div>

      <div class="stat-card gv-glass border border-gray-100 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-4">
        <div class="stat-icon-wrap bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <UIcon name="i-heroicons-trash" class="h-6 w-6" />
        </div>
        <div>
          <p class="stat-label">Не используется («Сироты»)</p>
          <h3 class="stat-value text-amber-500">{{ stats.orphanedCount }} <span class="text-xs text-gray-500 font-normal">({{ formatSize(stats.orphanedSize) }})</span></h3>
        </div>
      </div>

      <div class="stat-card gv-glass border border-gray-100 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="stat-icon-wrap bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <UIcon name="i-heroicons-arrow-path" class="h-6 w-6" />
          </div>
          <div>
            <p class="stat-label">Обслуживание</p>
            <h3 class="stat-value text-emerald-500">Очистка</h3>
          </div>
        </div>
        <GvButton
          type="button"
          color="amber"
          variant="outline"
          size="sm"
          icon="i-heroicons-sparkles"
          :loading="clearingOrphans"
          :disabled="stats.orphanedCount === 0"
          @click="cleanOrphanedFiles"
        >
          Очистить сирот
        </GvButton>
      </div>
    </section>

    <!-- Workspace Tabs Grid -->
    <div class="workspace-main-layout flex flex-col md:flex-row gap-4 items-stretch flex-1 min-h-0">
      <!-- Tabs Column -->
      <aside class="w-full md:w-64 gv-glass border border-gray-100 dark:border-zinc-800 rounded-xl p-2 shrink-0 overflow-y-auto">
        <nav class="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left whitespace-nowrap"
            :class="activeTab === tab.key 
              ? 'bg-sky-50 text-sky-600 dark:bg-zinc-800 dark:text-sky-400' 
              : 'text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-900'"
            @click="activeTab = tab.key"
          >
            <UIcon :name="tab.icon" class="h-5 w-5 shrink-0" />
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Files List Panel -->
      <section class="flex-1 min-w-0 w-full gv-glass border border-gray-100 dark:border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        <div v-if="pending" class="p-8 text-center text-gray-500 flex-1 flex flex-col items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin mx-auto mb-2 text-sky-500" />
          <span>Сканирование файлов на сервере...</span>
        </div>

        <div v-else-if="filteredFiles.length === 0" class="p-8 text-center text-gray-500 flex-1 flex flex-col items-center justify-center">
          <UIcon name="i-heroicons-folder-open" class="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-zinc-700" />
          <p class="font-medium">Файлы в этой подгруппе отсутствуют</p>
        </div>

        <div v-else class="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-gray-50/50 dark:bg-zinc-900/50">
                <th class="py-3 px-4 w-12 text-center">Превью</th>
                <th class="py-3 px-4">Имя файла / Путь</th>
                <th class="py-3 px-4 w-28">Размер</th>
                <th class="py-3 px-4 w-40">Дата изменения</th>
                <th class="py-3 px-4">Используется в</th>
                <th class="py-3 px-4 w-32 text-right">Действия</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-zinc-800">
              <tr 
                v-for="file in filteredFiles" 
                :key="file.path" 
                class="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10 transition-colors align-middle text-sm"
              >
                <!-- Thumbnail -->
                <td class="py-3 px-4 text-center">
                  <div class="w-10 h-10 rounded border border-gray-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-zinc-900 mx-auto">
                    <img 
                      v-if="file.url && isImage(file.name)" 
                      :src="file.url" 
                      alt="Превью" 
                      class="object-cover w-full h-full"
                    />
                    <video 
                      v-else-if="file.url && isVideo(file.name)" 
                      :src="file.url" 
                      class="object-cover w-full h-full"
                    />
                    <UIcon 
                      v-else 
                      :name="tabs.find(t => t.key === file.group)?.icon || 'i-heroicons-document'" 
                      class="h-5 w-5 text-gray-400 dark:text-zinc-600" 
                    />
                  </div>
                </td>

                <!-- Path & Name -->
                <td class="py-3 px-4 min-w-[200px]">
                  <div class="font-semibold text-gray-900 dark:text-white truncate max-w-xs md:max-w-sm" :title="file.name">
                    {{ file.name }}
                  </div>
                  <div class="text-xs text-gray-400 truncate max-w-xs md:max-w-sm" :title="file.path">
                    {{ file.path }}
                  </div>
                </td>

                <!-- Size -->
                <td class="py-3 px-4 text-gray-600 dark:text-zinc-300">
                  {{ formatSize(file.size) }}
                </td>

                <!-- Date -->
                <td class="py-3 px-4 text-gray-500 text-xs">
                  {{ formatDate(file.mtime) }}
                </td>

                <!-- DB Reference -->
                <td class="py-3 px-4">
                  <div v-if="file.referencedEntity">
                    <!-- Book Cover -->
                    <div v-if="file.referencedEntity.type === 'book'" class="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <UIcon name="i-heroicons-book-open" class="h-4 w-4 shrink-0" />
                      <NuxtLink :to="`/admin/books?edit=${file.referencedEntity.id}`" class="hover:underline truncate max-w-[200px]" :title="file.referencedEntity.name">
                        {{ file.referencedEntity.name }}
                      </NuxtLink>
                    </div>
                    <!-- Article Presentation / Image -->
                    <div v-else-if="file.referencedEntity.type === 'article'" class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <UIcon name="i-heroicons-document-text" class="h-4 w-4 shrink-0" />
                      <NuxtLink :to="`/admin/articles?edit=${file.referencedEntity.id}`" class="hover:underline truncate max-w-[200px]" :title="file.referencedEntity.name">
                        {{ file.referencedEntity.name }}
                      </NuxtLink>
                    </div>
                    <!-- Glossary Term -->
                    <div v-else-if="file.referencedEntity.type === 'term'" class="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                      <UIcon name="i-heroicons-bookmark" class="h-4 w-4 shrink-0" />
                      <NuxtLink :to="`/admin/glossary?edit=${file.referencedEntity.id}`" class="hover:underline truncate max-w-[200px]" :title="file.referencedEntity.name">
                        {{ file.referencedEntity.name }}
                      </NuxtLink>
                    </div>
                    <!-- ODM Project Structure -->
                    <div v-else-if="file.referencedEntity.type === 'odm_project'" class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <UIcon name="i-heroicons-document-duplicate" class="h-4 w-4 shrink-0" />
                      <span class="truncate max-w-[200px]" :title="file.referencedEntity.name">
                        {{ file.referencedEntity.name }}
                      </span>
                    </div>
                    <!-- ODM Project Part (Chapter slot) -->
                    <div v-else-if="file.referencedEntity.type === 'odm_part'" class="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <UIcon name="i-heroicons-document" class="h-4 w-4 shrink-0" />
                      <span class="truncate max-w-[200px]" :title="file.referencedEntity.name">
                        {{ file.referencedEntity.name }}
                      </span>
                    </div>
                    <!-- Landing Page Block -->
                    <div v-else-if="file.referencedEntity.type === 'landing_block'" class="flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                      <UIcon name="i-heroicons-computer-desktop" class="h-4 w-4 shrink-0" />
                      <NuxtLink :to="`/admin/landing`" class="hover:underline truncate max-w-[200px]" :title="file.referencedEntity.name">
                        {{ file.referencedEntity.name }}
                      </NuxtLink>
                    </div>
                  </div>
                  <div v-else class="flex items-center gap-1.5 text-amber-500 text-xs font-semibold uppercase tracking-wider">
                    <UIcon name="i-heroicons-exclamation-triangle" class="h-4 w-4 shrink-0 animate-pulse" />
                    <span>Не используется</span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <!-- Replace -->
                    <GvButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-arrow-path"
                      title="Заменить файл"
                      @click="openReplaceModal(file)"
                    />
                    <!-- Delete (Disabled if used) -->
                    <GvButton
                      type="button"
                      variant="ghost"
                      color="red"
                      size="sm"
                      icon="i-heroicons-trash"
                      :title="file.isOrphaned ? 'Удалить файл' : 'Нельзя удалить: файл используется в БД'"
                      :disabled="!file.isOrphaned || deletingPath === file.path"
                      @click="deleteFile(file.path)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Replace File Modal -->
    <UModal v-model="isReplaceModalOpen">
      <UCard :ui="{ divide: 'divide-y divide-gray-100 dark:divide-zinc-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Замена файла
            </h3>
            <GvButton
              type="button"
              variant="ghost"
              color="gray"
              square
              icon="i-heroicons-x-mark"
              @click="isReplaceModalOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4 py-2">
          <div>
            <p class="text-xs text-gray-400 uppercase font-semibold">Заменяемый файл:</p>
            <p class="text-sm font-medium text-gray-900 dark:text-white break-all">{{ activeReplaceFile?.name }}</p>
            <p class="text-xs text-gray-500 break-all">{{ activeReplaceFile?.path }}</p>
          </div>

          <!-- Drag and drop placeholder / file select -->
          <div 
            class="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-sky-500 transition-colors"
            @click="replaceFileInputRef?.click()"
          >
            <input
              ref="replaceFileInputRef"
              type="file"
              class="hidden"
              @change="onReplaceFileChange"
            />
            <div class="space-y-2">
              <UIcon name="i-heroicons-cloud-arrow-up" class="h-10 w-10 text-gray-400 mx-auto" />
              <p class="text-sm text-gray-600 dark:text-zinc-400">
                <span class="text-sky-500 font-semibold">Выберите файл</span> для замены
              </p>
              <p class="text-xs text-gray-400">
                Все вхождения и ссылки в БД автоматически сохранятся или обновятся.
              </p>
            </div>
          </div>

          <!-- Selected File Details -->
          <div v-if="selectedReplaceFile" class="bg-gray-50 dark:bg-zinc-900 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 flex items-center gap-3">
            <UIcon name="i-heroicons-document-check" class="h-6 w-6 text-emerald-500 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold truncate">{{ selectedReplaceFile.name }}</p>
              <p class="text-xs text-gray-500">{{ formatSize(selectedReplaceFile.size) }}</p>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <GvButton
              type="button"
              variant="outline"
              color="gray"
              size="sm"
              @click="isReplaceModalOpen = false"
            >
              Отмена
            </GvButton>
            <GvButton
              type="button"
              color="sky"
              size="sm"
              icon="i-heroicons-arrow-path"
              :loading="replacing"
              :disabled="!selectedReplaceFile"
              @click="handleReplaceFile"
            >
              Заменить
            </GvButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped>
.files-page {
  width: 100%;
}

.gv-workspace-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 65px);
  overflow: hidden;
  box-sizing: border-box;
  padding: 16px;
}

.workspace-main-layout {
  height: 100%;
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .stat-label {
  color: #94a3b8;
}

.stat-value {
  margin: 2px 0 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.dark .stat-value {
  color: #f1f5f9;
}
</style>
