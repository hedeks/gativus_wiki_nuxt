<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

const route = useRoute()
const store = userStore()
const toast = useToast()

const parentId = computed(() => {
  const raw = route.query.parent_id
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
})

const { data: categories } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})

const allCategories = computed(() => (Array.isArray(categories.value) ? categories.value : []) as any[])

const form = reactive({
  title: '',
  title_ru: '',
  slug: '',
  slug_ru: '',
  parent_id: parentId.value as number | null,
  description: '',
  description_ru: '',
  icon: 'i-heroicons-folder',
  sort_order: 0
})

watch(parentId, (value) => {
  form.parent_id = value
})

const commonIcons = [
  'i-heroicons-folder', 'i-heroicons-folder-open', 'i-heroicons-book-open',
  'i-heroicons-academic-cap', 'i-heroicons-light-bulb', 'i-heroicons-briefcase',
  'i-heroicons-chart-bar', 'i-heroicons-chat-bubble-left-right', 'i-heroicons-cloud',
  'i-heroicons-code-bracket', 'i-heroicons-cog-6-tooth', 'i-heroicons-cpu-chip',
  'i-heroicons-cube', 'i-heroicons-device-tablet', 'i-heroicons-document-text',
  'i-heroicons-beaker', 'i-heroicons-globe-alt', 'i-heroicons-heart',
  'i-heroicons-home', 'i-heroicons-identification', 'i-heroicons-key',
  'i-heroicons-map', 'i-heroicons-microphone', 'i-heroicons-moon',
  'i-heroicons-newspaper', 'i-heroicons-paint-brush', 'i-heroicons-puzzle-piece',
  'i-heroicons-rocket', 'i-heroicons-shield-check', 'i-heroicons-sparkles',
  'i-heroicons-star', 'i-heroicons-user-group', 'i-heroicons-variable',
  'i-heroicons-video-camera', 'i-heroicons-wrench-screwdriver'
]

const showIconSelector = ref(false)
const saving = ref(false)

async function saveCategory() {
  if (!form.title.trim()) {
    toast.add({ title: 'Укажите название EN/Default', color: 'red' })
    return
  }

  saving.value = true
  try {
    await $fetch('/api/categories', {
      method: 'POST',
      body: { ...form },
      headers: store.getAuthHeader()
    })
    toast.add({ title: 'Категория создана', color: 'green' })
    navigateTo('/admin/categories')
  } catch (err: any) {
    toast.add({ title: 'Ошибка сохранения', description: err?.data?.statusMessage || err.message, color: 'red' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-page-stack">
    <div class="cta-buttons admin-index-toolbar cta-buttons--left">
      <NuxtLink to="/admin/categories" class="cta-button secondary">
        <UIcon name="i-heroicons-arrow-left" />
        <span>К списку</span>
      </NuxtLink>
    </div>

    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Создать категорию</h1>
          <p class="hero-lead">Новая ветка дерева знаний</p>
        </div>
      </div>
    </section>

    <section class="section-card">
      <header class="card-header">
        <span class="card-badge">CAT</span>
        <h2 class="card-header-title">Поля категории</h2>
      </header>
      <div class="card-body">
        <div class="category-form">
          <UForm :state="form" @submit="saveCategory" class="space-y-5">
        <UTabs :items="[
          { key: 'ru', label: 'Русский (RU)', icon: 'i-heroicons-language' },
          { key: 'en', label: 'English (EN)', icon: 'i-heroicons-globe-alt' }
        ]">
          <template #item="{ item }">
            <div v-if="item.key === 'ru'" class="space-y-4 py-2">
              <UFormGroup label="Название (RU)">
                <UInput v-model="form.title_ru" />
              </UFormGroup>
              <UFormGroup label="Slug (RU)">
                <UInput v-model="form.slug_ru" />
              </UFormGroup>
              <UFormGroup label="Описание (RU)">
                <UTextarea v-model="form.description_ru" autoresize />
              </UFormGroup>
            </div>
            <div v-else class="space-y-4 py-2">
              <UFormGroup label="Название (EN/Default)" required>
                <UInput v-model="form.title" />
              </UFormGroup>
              <UFormGroup label="Slug (EN/Default)">
                <UInput v-model="form.slug" />
              </UFormGroup>
              <UFormGroup label="Описание (EN/Default)">
                <UTextarea v-model="form.description" autoresize />
              </UFormGroup>
            </div>
          </template>
        </UTabs>

        <div class="grid md:grid-cols-2 gap-4">
          <UFormGroup label="Родитель">
            <USelectMenu
              v-model="form.parent_id"
              :options="allCategories"
              value-attribute="id"
              option-attribute="title"
              searchable
              clear-search-on-close
            />
          </UFormGroup>

          <UFormGroup label="Порядок сортировки">
            <UInput v-model.number="form.sort_order" type="number" />
          </UFormGroup>
        </div>

        <UFormGroup label="Иконка">
          <div class="flex gap-2">
            <UInput v-model="form.icon" class="flex-1" />
            <UPopover v-model:open="showIconSelector">
              <UButton color="gray" variant="soft" :icon="form.icon" />
              <template #panel>
                <div class="p-3 grid grid-cols-6 gap-1 max-h-[300px] overflow-y-auto w-[240px]">
                  <button
                    v-for="icon in commonIcons"
                    :key="icon"
                    type="button"
                    class="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                    :class="{ 'bg-sky-50 dark:bg-sky-900/30 text-sky-600': form.icon === icon }"
                    @click="form.icon = icon; showIconSelector = false"
                  >
                    <UIcon :name="icon" class="w-5 h-5" />
                  </button>
                </div>
              </template>
            </UPopover>
          </div>
        </UFormGroup>

        <div class="flex justify-end gap-3">
          <UButton to="/admin/categories" color="gray" variant="ghost">Отмена</UButton>
          <UButton type="submit" color="primary" :loading="saving">Сохранить</UButton>
        </div>
          </UForm>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.category-form {
  padding: 18px;
}
</style>
