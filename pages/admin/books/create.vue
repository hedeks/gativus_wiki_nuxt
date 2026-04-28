<template>
  <div class="admin-page-stack book-create-page">
    <div class="cta-buttons admin-index-toolbar cta-buttons--left">
      <NuxtLink to="/admin/books" class="cta-button secondary">
        <UIcon name="i-heroicons-arrow-left" />
        <span>Назад к списку</span>
      </NuxtLink>
    </div>

    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Новая книга</h1>
          <p class="hero-lead">Локализованные поля и метаданные</p>
        </div>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">NEW</span>
        <h2 class="card-header-title">Данные книги</h2>
      </header>
      <div class="card-body">
        <form @submit.prevent="handleSubmit" class="create-form">
        <div class="form-grid">
          <!-- Left Column: Basic Info -->
          <div class="form-column">
            <div class="tabs-wrapper mb-6">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название и описание</label>
              <UTabs :items="[
                { label: '🇬🇧 EN', slot: 'en' },
                { label: '🇷🇺 RU', slot: 'ru' },
                { label: '🇨🇳 ZH', slot: 'zh' }
              ]" class="w-full">
                <template #en>
                  <div class="space-y-4 pt-4">
                    <UFormGroup label="Title (English)" required>
                      <UInput v-model="form.title" placeholder="Gativus: Core Concepts" size="lg" />
                    </UFormGroup>
                    <UFormGroup label="Description (English)">
                      <UTextarea v-model="form.description" :rows="4" placeholder="Brief summary of the book..." />
                    </UFormGroup>
                  </div>
                </template>
                <template #ru>
                  <div class="space-y-4 pt-4">
                    <UFormGroup label="Заголовок (Русский)">
                      <UInput v-model="form.title_ru" placeholder="Gativus: Базовые концепции" size="lg" />
                    </UFormGroup>
                    <UFormGroup label="Описание (Русский)">
                      <UTextarea v-model="form.description_ru" :rows="4" placeholder="Краткое описание книги..." />
                    </UFormGroup>
                  </div>
                </template>
                <template #zh>
                  <div class="space-y-4 pt-4">
                    <UFormGroup label="标题 (中文)">
                      <UInput v-model="form.title_zh" placeholder="Gativus：核心概念" size="lg" />
                    </UFormGroup>
                    <UFormGroup label="描述 (中文)">
                      <UTextarea v-model="form.description_zh" :rows="4" placeholder="书的简要摘要..." />
                    </UFormGroup>
                  </div>
                </template>
              </UTabs>
            </div>

            <UFormGroup label="Slug (URL)" help="Оставьте пустым для автогенерации">
              <UInput v-model="form.slug" placeholder="gativus-core-concepts" />
            </UFormGroup>
          </div>

          <!-- Right Column: Meta Info -->
          <div class="form-column">
            <UFormGroup label="Обложка" help="Загрузите изображение или выберите из галереи">
              <AdminMediaPicker
                v-model="form.cover_image"
                upload-endpoint="/api/admin/uploads/cover"
                accept="image/*"
              />
            </UFormGroup>

            <div class="dual-row">
              <UFormGroup label="Порядок сортировки" class="flex-1" help="Позиция в списке книг">
                <UInput v-model.number="form.sort_order" type="number" icon="i-heroicons-bars-3-center-left" />
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
    </section>
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
  title_ru: '',
  title_zh: '',
  slug: '',
  description: '',
  description_ru: '',
  description_zh: '',
  cover_image: '',
  sort_order: 0,
  category_ids: [] as number[]
})

const saving = ref(false)

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
