<template>
  <div class="admin-media-picker">
    <div class="flex gap-2 items-center">
      <UInput
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        class="flex-1"
        :placeholder="placeholder || 'https://...'"
      />
      <GvButton
        v-if="modelValue"
        icon="i-heroicons-eye"
        color="gray"
        variant="soft"
        title="Предпросмотр"
        @click="previewOpen = true"
      />
      <GvButton
        icon="i-heroicons-cloud-arrow-up"
        color="gray"
        variant="soft"
        title="Загрузить"
        :loading="uploading"
        @click="fileInput?.click()"
      />
      <GvButton
        icon="i-heroicons-folder-open"
        color="gray"
        variant="soft"
        title="Выбрать из галереи"
        @click="openGallery"
      />
    </div>

    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="accept"
      @change="handleUpload"
    />

    <!-- Preview Modal -->
    <UModal v-model="previewOpen">
      <div class="p-4">
        <h3 class="text-lg font-bold mb-4">Предпросмотр</h3>
        <div class="flex justify-center bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden min-h-[200px]">
          <img v-if="isImage(modelValue)" :src="modelValue" class="max-w-full max-h-[60vh] object-contain" />
          <video v-else-if="isVideo(modelValue)" :src="modelValue" controls class="max-w-full max-h-[60vh]"></video>
          <div v-else class="flex flex-col items-center justify-center p-8 text-gray-500">
            <UIcon name="i-heroicons-document" class="text-4xl mb-2" />
            <span>Файл не является изображением или видео</span>
            <a :href="modelValue" target="_blank" class="mt-2 text-primary underline">Открыть в новой вкладке</a>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <GvButton color="gray" variant="soft" @click="previewOpen = false">Закрыть</GvButton>
        </div>
      </div>
    </UModal>

    <!-- Gallery Modal -->
    <UModal v-model="galleryOpen" :ui="{ width: 'w-full sm:max-w-3xl' }">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold">Галерея файлов</h3>
          <GvButton color="gray" variant="ghost" square icon="i-heroicons-x-mark" @click="galleryOpen = false" />
        </div>

        <div v-if="loadingGallery" class="flex justify-center p-8">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
        </div>
        
        <div v-else-if="galleryFiles.length === 0" class="text-center p-8 text-gray-500">
          Файлы не найдены.
        </div>

        <div v-else class="gallery-grid">
          <div
            v-for="file in galleryFiles"
            :key="file.url"
            class="gallery-item"
            @click="selectFile(file.url)"
          >
            <div class="gallery-item-preview">
              <img v-if="file.type === 'image'" :src="file.url" loading="lazy" />
              <div v-else-if="file.type === 'video'" class="file-icon">
                <UIcon name="i-heroicons-film" />
              </div>
              <div v-else class="file-icon">
                <UIcon name="i-heroicons-document" />
              </div>
            </div>
            <div class="gallery-item-info">
              <div class="file-name" :title="file.filename">{{ file.filename }}</div>
              <div class="file-meta">{{ file.category }} • {{ formatSize(file.size) }}</div>
            </div>
          </div>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  uploadEndpoint: string // e.g., '/api/admin/uploads/cover'
  accept?: string // e.g., 'image/*'
}>()

const emit = defineEmits(['update:modelValue'])
const store = userStore()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const previewOpen = ref(false)
const galleryOpen = ref(false)
const loadingGallery = ref(false)
const galleryFiles = ref<any[]>([])

function isImage(url: string) {
  if (!url) return false
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
}

function isVideo(url: string) {
  if (!url) return false
  return /\.(mp4|webm|ogg)$/i.test(url)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await $fetch<{ url: string }>(props.uploadEndpoint, {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader()
    })
    emit('update:modelValue', response.url)
    toast.add({ title: 'Файл загружен', color: 'green' })
  } catch (err: any) {
    toast.add({ title: 'Ошибка загрузки', description: err.data?.statusMessage || err.message, color: 'red' })
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function openGallery() {
  galleryOpen.value = true
  if (galleryFiles.value.length === 0) {
    loadingGallery.value = true
    try {
      const res = await $fetch<{ items: any[] }>('/api/admin/uploads', {
        headers: store.getAuthHeader()
      })
      galleryFiles.value = res.items
    } catch (err: any) {
      toast.add({ title: 'Ошибка загрузки галереи', color: 'red' })
    } finally {
      loadingGallery.value = false
    }
  }
}

function selectFile(url: string) {
  emit('update:modelValue', url)
  galleryOpen.value = false
}
</script>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

.gallery-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}

.dark .gallery-item {
  border-color: #3f3f46;
  background: #18181b;
}

.gallery-item:hover {
  border-color: var(--gv-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.gallery-item-preview {
  height: 100px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dark .gallery-item-preview {
  background: #27272a;
}

.gallery-item-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  font-size: 32px;
  color: #9ca3af;
}

.gallery-item-info {
  padding: 8px;
}

.file-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #374151;
}

.dark .file-name {
  color: #d1d5db;
}

.file-meta {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
}

.dark .file-meta {
  color: #9ca3af;
}
</style>
