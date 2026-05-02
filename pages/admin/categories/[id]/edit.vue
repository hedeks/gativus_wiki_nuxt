<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

const route = useRoute()
const store = userStore()
const toast = useToast()
const categoryId = computed(() => Number(route.params.id))

const { data: categories, refresh } = await useFetch('/api/categories', {
  headers: store.getAuthHeader()
})
const allCategories = computed(() => (Array.isArray(categories.value) ? categories.value : []) as any[])
const currentCategory = computed(() => allCategories.value.find((c) => c.id === categoryId.value))

const form = reactive({
  title: '',
  title_ru: '',
  slug: '',
  slug_ru: '',
  parent_id: null as number | null,
  description: '',
  description_ru: '',
  icon: 'i-heroicons-folder',
  sort_order: 0
})

watch(currentCategory, (cat) => {
  if (!cat) return
  form.title = cat.title || ''
  form.title_ru = cat.title_ru || ''
  form.slug = cat.slug || ''
  form.slug_ru = cat.slug_ru || ''
  form.parent_id = cat.parent_id ?? null
  form.description = cat.description || ''
  form.description_ru = cat.description_ru || ''
  form.icon = cat.icon || 'i-heroicons-folder'
  form.sort_order = cat.sort_order || 0
}, { immediate: true })

const saving = ref(false)

async function saveCategory() {
  if (!currentCategory.value) return
  if (!form.title.trim()) {
    toast.add({ title: 'Укажите название EN/Default', color: 'red' })
    return
  }

  saving.value = true
  try {
    await $fetch(`/api/categories/${currentCategory.value.id}`, {
      method: 'PUT',
      body: { ...form },
      headers: store.getAuthHeader()
    })
    await refresh()
    toast.add({ title: 'Категория сохранена', color: 'green' })
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
      <GvButton to="/admin/categories" variant="outline" color="gray" size="sm" icon="i-heroicons-arrow-left">
        К списку
      </GvButton>
    </div>

    <section class="admin-dash-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo" />
        <div class="hero-text">
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="hero-title gv-hero-gradient uppercase">Категория</h1>
          <p class="hero-lead">{{ currentCategory?.title || 'Редактирование' }}</p>
        </div>
      </div>
    </section>

    <section v-if="currentCategory" class="section-card">
      <header class="card-header">
        <span class="card-badge">EDIT</span>
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
              :options="allCategories.filter((c) => c.id !== categoryId)"
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
          <AdminIconPicker v-model="form.icon" />
        </UFormGroup>

        <div class="flex justify-end gap-3">
          <GvButton to="/admin/categories" color="gray" variant="ghost">Отмена</GvButton>
          <GvButton type="submit" color="primary" :loading="saving">Сохранить</GvButton>
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
