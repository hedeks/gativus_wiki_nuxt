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
      <GvButton to="/admin/categories" variant="outline" color="gray" size="sm" icon="i-heroicons-arrow-left">
        К списку
      </GvButton>
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
