<template>
  <UModal v-model="isOpen">
    <div class="book-selector-modal">
      <div class="modal-header">
        <h3>Выбрать книгу</h3>
        <GvButton color="gray" variant="ghost" square icon="i-heroicons-x-mark" @click="isOpen = false" />
      </div>

      <div class="modal-search">
        <UInput
          v-model="query"
          icon="i-heroicons-magnifying-glass"
          placeholder="Начните вводить название книги..."
          autofocus
          @keydown.enter="selectFirst"
        />
      </div>

      <div class="modal-results">
        <div v-if="pending" class="loading-state">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
          Поиск...
        </div>

        <div v-else-if="!filteredResults.length && query" class="empty-state">
          Ничего не найдено
        </div>

        <ul v-else class="results-list">
          <li
            v-for="book in filteredResults"
            :key="book.slug"
            class="result-item"
            @click="select(book)"
          >
            <div class="res-title">{{ book.title }}</div>
            <div class="res-slug">{{ book.slug }}</div>
          </li>
        </ul>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLanguageStore } from '~/stores/language'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'select'])
const langStore = useLanguageStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const query = ref('')

const { data: books, pending } = await useFetch<any[]>('/api/books', {
  query: computed(() => ({ locale: langStore.currentLang }))
})

const results = computed(() => books.value || [])

const filteredResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return results.value
  return results.value.filter(b => 
    String(b.title || '').toLowerCase().includes(q) || 
    String(b.slug || '').toLowerCase().includes(q)
  )
})

function select(book: any) {
  emit('select', book)
  isOpen.value = false
  query.value = ''
}

function selectFirst() {
  if (filteredResults.value.length > 0) {
    select(filteredResults.value[0])
  }
}
</script>

<style scoped>
.book-selector-modal { padding: 20px; }
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.modal-header h3 { margin: 0; font-size: 18px; font-weight: 700; }

.modal-search { margin-bottom: 16px; }

.modal-results { min-height: 200px; max-height: 400px; overflow-y: auto; }

.loading-state, .empty-state {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; height: 160px; color: #94a3b8; font-size: 14px;
}

.results-list { list-style: none; padding: 0; margin: 0; }
.result-item {
  padding: 10px 14px; border-radius: 8px; cursor: pointer;
  transition: background 0.15s;
  display: flex; flex-direction: column; gap: 2px;
}
.result-item:hover { background: #f1f5f9; }
.dark .result-item:hover { background: #27272a; }

.res-title { font-size: 14px; font-weight: 600; color: #1e293b; }
.dark .res-title { color: #e2e8f0; }
.res-slug { font-size: 11px; color: #94a3b8; font-family: monospace; }
</style>
