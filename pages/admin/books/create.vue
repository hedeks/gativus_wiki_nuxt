<template>
  <div class="book-create-page">
    <div class="page-header">
      <UButton to="/admin/books" icon="i-heroicons-arrow-left" variant="ghost" color="gray">
        Назад к списку
      </UButton>
      <h2 class="page-title">Создание новой книги</h2>
    </div>

    <div class="card p-6">
      <form @submit.prevent="handleSubmit" class="create-form">
        <div class="form-grid">
          <!-- Left Column: Basic Info -->
          <div class="form-column">
            <UFormGroup label="Заголовок" required help="Название книги, например: Основы биологии">
              <UInput v-model="form.title" placeholder="Введите заголовок" size="lg" />
            </UFormGroup>

            <UFormGroup label="Slug (URL)" help="Оставьте пустым для автогенерации">
              <UInput v-model="form.slug" placeholder="osnovy-biologii" />
            </UFormGroup>

            <UFormGroup label="Описание" help="Краткая аннотация для витрины">
              <UTextarea v-model="form.description" :rows="4" placeholder="О чем эта книга..." />
            </UFormGroup>
          </div>

          <!-- Right Column: Meta Info -->
          <div class="form-column">
            <UFormGroup label="Обложка" help="Загрузите изображение или вставьте URL">
              <div class="cover-upload-wrapper flex gap-2">
                <UInput v-model="form.cover_image" placeholder="https://example.com/cover.jpg" icon="i-heroicons-photo"
                  class="flex-1" />
                <UButton icon="i-heroicons-cloud-arrow-up" color="gray" label="Загрузить" :loading="uploading"
                  @click="fileInput?.click()" />
                <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="onFileSelected" />
              </div>
              <div v-show="form.cover_image" class="cover-preview-large mt-3">
                <img :src="form.cover_image" alt="Preview" />
              </div>
            </UFormGroup>

            <div class="dual-row">
              <UFormGroup label="Язык" class="flex-1">
                <USelect v-model="form.locale" :options="['en', 'ru', 'zh']" />
              </UFormGroup>

              <UFormGroup label="Порядок" class="flex-1">
                <UInput v-model.number="form.sort_order" type="number" />
              </UFormGroup>
            </div>

            <UFormGroup label="Категории" help="Выберите одну или несколько категорий">
              <USelectMenu v-model="form.category_ids" :options="(categories as any[]) || []" value-attribute="id"
                option-attribute="title" multiple placeholder="Выберите категории" searchable />
            </UFormGroup>
          </div>
        </div>

        <div class="form-footer mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
          <UButton type="submit" color="primary" size="lg" :loading="saving" icon="i-heroicons-check">
            Создать книгу
          </UButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const store = userStore()

const { data: categories } = await useFetch<any[]>('/api/categories', {
  headers: store.getAuthHeader()
})

const form = ref({
  title: '',
  slug: '',
  description: '',
  cover_image: '',
  locale: 'ru',
  sort_order: 0,
  category_ids: [] as number[]
})

const saving = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await $fetch<{ url: string }>('/api/admin/uploads/cover', {
      method: 'POST',
      body: formData,
      headers: store.getAuthHeader()
    })
    form.value.cover_image = response.url
  } catch (err: any) {
    alert('Ошибка загрузки: ' + (err.data?.statusMessage || err.message))
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function handleSubmit() {
  if (!form.value.title) {
    alert('Заголовок обязателен')
    return
  }

  saving.value = true
  try {
    const response = await $fetch<any>('/api/books', {
      method: 'POST',
      body: form.value,
      headers: store.getAuthHeader()
    })

    // Redirect to newly created book edit page to add chapters
    navigateTo(`/admin/books/${response.id}/edit`)
  } catch (err: any) {
    alert('Ошибка при создании: ' + (err.data?.statusMessage || err.message))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.page-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #1a1a1a;
}

.dark .page-title {
  color: #e5e5e5;
}

.card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.dark .card {
  background: #18181b;
  /* zinc-900 */
  border-color: #27272a;
  /* zinc-800 */
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dual-row {
  display: flex;
  gap: 16px;
}

.cover-preview-large {
  width: 140px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dark .cover-preview-large {
  border-color: #27272a;
  background: #27272a;
}

.cover-preview-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.dark .form-footer {
  border-top-color: #27272a;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
