<template>
  <div class="admin-page-stack admin-page-stack--fluid book-edit-page">
    <section v-if="pending" class="section-card">
      <div class="card-body card-body--row">
        <UIcon name="i-heroicons-arrow-path" class="icon-spin" />
        <span>Загрузка…</span>
      </div>
    </section>

    <template v-else>
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
            <h1 class="hero-title gv-hero-gradient uppercase">Книга</h1>
            <p class="hero-lead">{{ book?.title || 'Редактирование' }}</p>
          </div>
        </div>
      </section>

      <div v-if="book" class="edit-container">
      <!-- Section 1: Metadata -->
      <div class="card p-6 mb-8 mt-6">
        <h3 class="section-title mb-6">Основная информация</h3>
        <form @submit.prevent="updateMetadata" class="edit-form">
          <div class="tabs-wrapper mb-6">
            <UTabs :items="[
              { label: '🇬🇧 EN', slot: 'en' },
              { label: '🇷🇺 RU', slot: 'ru' },
              { label: '🇨🇳 ZH', slot: 'zh' }
            ]" v-model="activeTabIndex" class="w-full">
              <template #en>
                <div class="form-grid pt-4">
                  <div class="form-column">
                    <UFormGroup label="Title (English)" required>
                      <UInput v-model="form.title" size="lg" />
                    </UFormGroup>
                    <UFormGroup label="Description (English)">
                      <UTextarea v-model="form.description" :rows="3" />
                    </UFormGroup>
                  </div>
                  <div class="form-column">
                  </div>
                </div>
              </template>
              <template #ru>
                <div class="form-grid pt-4">
                  <div class="form-column">
                    <UFormGroup label="Заголовок (Русский)">
                      <UInput v-model="form.title_ru" size="lg" />
                    </UFormGroup>
                    <UFormGroup label="Описание (Русский)">
                      <UTextarea v-model="form.description_ru" :rows="3" />
                    </UFormGroup>
                  </div>
                </div>
              </template>
              <template #zh>
                <div class="form-grid pt-4">
                  <div class="form-column">
                    <UFormGroup label="标题 (中文)">
                      <UInput v-model="form.title_zh" size="lg" />
                    </UFormGroup>
                    <UFormGroup label="描述 (中文)">
                      <UTextarea v-model="form.description_zh" :rows="3" />
                    </UFormGroup>
                  </div>
                </div>
              </template>
            </UTabs>
          </div>

          <div class="form-grid border-t border-gray-100 dark:border-gray-800 pt-6">
            <div class="form-column">
              <UFormGroup label="Slug (URL)">
                <UInput v-model="form.slug" />
              </UFormGroup>
              <UFormGroup label="Категории">
                <USelectMenu v-model="form.category_ids" :options="categories || []" multiple value-attribute="id"
                  option-attribute="title" searchable />
              </UFormGroup>
            </div>

            <div class="form-column">
              <UFormGroup label="Обложка" help="Загрузите изображение или выберите из галереи">
                <AdminMediaPicker
                  v-model="form.cover_image"
                  upload-endpoint="/api/admin/uploads/cover"
                  accept="image/*"
                />
              </UFormGroup>

              <div class="dual-row">
                <UFormGroup label="Порядок сортировки" class="flex-1">
                  <UInput v-model.number="form.sort_order" type="number" />
                </UFormGroup>
              </div>
            </div>
          </div>

          <div class="form-footer mt-6 flex justify-end">
            <UButton type="submit" color="black" :loading="savingMetadata" icon="i-heroicons-check"
              class="rounded-xl px-8">
              Сохранить метаданные
            </UButton>
          </div>
        </form>
      </div>

      <!-- Section 2: Chapter Management -->
      <div class="card p-6">
        <div class="section-header mb-6">
          <h3 class="section-title">Состав глав</h3>
          <div class="add-chapter-box flex items-center gap-4">
            <USelectMenu v-model="selectedArticleToAdd" :options="availableArticles" option-attribute="title" searchable
              class="w-64" placeholder="Добавить статью..."
              @update:model-value="addArticleToBook">
              <template #option="{ option }">
                <div class="article-option">
                  <span class="text-sm font-medium">{{ option.title }}</span>
                  <span class="text-xs text-gray-500">/{{ option.slug }}</span>
                </div>
              </template>
            </USelectMenu>
          </div>
        </div>

        <div v-if="currentChapters.length === 0" class="empty-chapters">
          В составе книги пока нет глав.
        </div>

        <div v-else class="chapters-list">
          <div v-for="(chapter, index) in currentChapters" :key="chapter.id" class="chapter-item"
            :class="{ 'is-dragging': draggedIndex === index, 'drag-over': dragOverIndex === index }" draggable="true"
            @dragstart="handleDragStart(index)" @dragover.prevent @dragenter="handleDragEnter(index)"
            @dragend="handleDragEnd" @drop="handleDrop(index)">
            <div class="chapter-drag-handle">
              <UIcon name="i-heroicons-bars-2" />
            </div>
            <div class="chapter-info">
              <span class="chapter-index">#{{ index + 1 }}</span>
              <span class="chapter-title">{{ chapter.title }}</span>
              <span v-if="!chapter.is_published" class="draft-badge">Черновик</span>
            </div>
            <div class="chapter-actions">
              <UButton
                :to="`/admin/articles/${chapter.id}/edit`"
                icon="i-heroicons-pencil-square"
                variant="ghost"
                color="gray"
                size="xs"
                title="Редактировать статью"
              />
              <UButton icon="i-heroicons-chevron-up" variant="ghost" color="gray" size="xs" :disabled="index === 0"
                @click="moveChapter(index, -1)" />
              <UButton icon="i-heroicons-chevron-down" variant="ghost" color="gray" size="xs"
                :disabled="index === currentChapters.length - 1" @click="moveChapter(index, 1)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click="removeChapter(index)" />
            </div>
          </div>
        </div>

        <div v-if="chaptersChanged"
          class="chapters-footer mt-6 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <span class="text-sm text-blue-700 dark:text-blue-300">
            Порядок глав изменен.
          </span>
          <UButton color="black" :loading="savingChapters" icon="i-heroicons-check" class="rounded-xl"
            @click="saveChapters">
            Сохранить состав
          </UButton>
        </div>
      </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'role']
})

const store = userStore()
const route = useRoute()
const bookId = route.params.id

// ─── Data Fetching ───
const { data: book, pending, refresh } = await useFetch<any>(`/api/books/${bookId}`, {
  headers: store.getAuthHeader()
})
const { data: categories } = await useFetch<any[]>('/api/categories', {
  headers: store.getAuthHeader()
})
const { data: allArticles } = await useFetch<any>('/api/articles?limit=500&published_only=false', {
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

const activeTabIndex = ref(1); // Default to RU tab

const chapters = ref<any[]>([])
const currentChapters = computed(() => chapters.value || [])

const chaptersChanged = ref(false)

const selectedArticleToAdd = ref<any>(null)

// ─── Native Drag & Drop ───
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function handleDragStart(index: number) {
  draggedIndex.value = index
}

function handleDragEnter(index: number) {
  dragOverIndex.value = index
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

function handleDrop(toIndex: number) {
  if (draggedIndex.value === null || draggedIndex.value === toIndex) return

  const items = [...chapters.value]
  const draggedItem = items.splice(draggedIndex.value, 1)[0]
  items.splice(toIndex, 0, draggedItem)

  chapters.value = items
  chaptersChanged.value = true
  handleDragEnd()
}

// Initialize form when book data arrives
watch(book, (newBook) => {
  if (newBook) {
    form.value = {
      title: newBook.title,
      title_ru: newBook.title_ru || '',
      title_zh: newBook.title_zh || '',
      slug: newBook.slug,
      description: newBook.description || '',
      description_ru: newBook.description_ru || '',
      description_zh: newBook.description_zh || '',
      cover_image: newBook.cover_image || '',
      sort_order: newBook.sort_order || 0,
      category_ids: newBook.category_ids || []
    }

    chapters.value = newBook.articles || []
  }
}, { immediate: true })

// ─── Available Articles logic ───
const availableArticles = computed(() => {
  if (!allArticles.value?.items) return []
  // Exclude already linked articles and keep only unassigned articles
  return allArticles.value.items.filter((a: any) =>
    !a.book_id &&
    !currentChapters.value.find((c: any) => c.id === a.id)
  )
})

// ─── Metadata Management ───
const savingMetadata = ref(false)
async function updateMetadata() {
  savingMetadata.value = true
  try {
    await $fetch(`/api/books/${book.value.slug}`, {
      method: 'PUT',
      body: form.value,
      headers: store.getAuthHeader()
    })
    await refresh()
  } catch (err: any) {
    alert('Ошибка: ' + (err.data?.statusMessage || err.message))
  } finally {
    savingMetadata.value = false
  }
}

// ─── Chapter Management ───
function addArticleToBook(article: any) {
  if (!article) return
  chapters.value.push(article)
  chaptersChanged.value = true
  selectedArticleToAdd.value = null
}

function moveChapter(index: number, direction: number) {
  const newIndex = index + direction
  const list = [...chapters.value]
  if (newIndex < 0 || newIndex >= list.length) return

  const temp = list[index]
  list[index] = list[newIndex]
  list[newIndex] = temp

  chapters.value = list
  chaptersChanged.value = true
}

function removeChapter(index: number) {
  chapters.value.splice(index, 1)
  chaptersChanged.value = true
}

const savingChapters = ref(false)
async function saveChapters() {
  savingChapters.value = true
  try {
    await $fetch(`/api/admin/books/${book.value.id}/chapters`, {
      method: 'PATCH',
      body: {
        article_ids: currentChapters.value.map((c: any) => c.id)
      },
      headers: store.getAuthHeader()
    })
    chaptersChanged.value = false
    await refresh()
  } catch (err: any) {
    alert('Ошибка при сохранении глав: ' + (err.data?.statusMessage || err.message))
  } finally {
    savingChapters.value = false
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
  font-size: 26px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #1a1a1a;
}

.dark .page-title {
  color: #e5e5e5;
}

.card {
  background: #fff;
  border-radius: 15px;
  border: 1px solid #c8c8c8;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.05);
}

.dark .card {
  background: #18181b;
  /* zinc-900 */
  border-color: #27272a;
  /* zinc-800 */
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6b7280;
  margin-bottom: 24px;
}

.dark .section-title {
  color: #9ca3af;
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

/* Chapter Styles */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  transition: all 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.dark .chapter-item {
  background: #27272a;
  /* zinc-800 */
  border-color: #3f3f46;
  /* zinc-700 */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.chapter-item:hover {
  transform: translateY(-2px);
  border-color: #0ea5e9;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.chapter-item.is-dragging {
  opacity: 0.4;
  border: 1px dashed #0ea5e9;
  background: #f0f9ff;
}

.chapter-item.drag-over {
  border-top: 2px solid #000;
  transform: translateY(2px);
}

.chapter-drag-handle {
  color: #9ca3af;
  cursor: grab;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.chapter-index {
  font-size: 11px;
  font-weight: 800;
  color: #9ca3af;
  min-width: 24px;
  opacity: 0.5;
}

.chapter-title {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 15px;
}

.dark .chapter-title {
  color: #e5e5e5;
}

.draft-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 99px;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  font-weight: 700;
  text-transform: uppercase;
}

.dark .draft-badge {
  background: #450a0a;
  color: #fca5a5;
  border-color: #7f1d1d;
}

.chapter-actions {
  display: flex;
  gap: 4px;
}

.empty-chapters {
  padding: 60px;
  text-align: center;
  color: #9ca3af;
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
}

.dark .empty-chapters {
  border-color: #3f3f46;
}

.article-option {
  display: flex;
  flex-direction: column;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .loading-overlay {
  background: rgba(0, 0, 0, 0.5);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .book-edit-page {
    padding: 0;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 14px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .add-chapter-box {
    width: 100%;
  }

  .add-chapter-box :deep(.w-64) {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
