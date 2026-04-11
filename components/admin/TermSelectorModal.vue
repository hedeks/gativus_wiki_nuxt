<template>
  <UModal v-model="isOpen">
    <div class="term-selector-modal">
      <div class="modal-header">
        <h3>Выбрать термин</h3>
        <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="isOpen = false" />
      </div>

      <div class="modal-search">
        <UInput
          v-model="query"
          icon="i-heroicons-magnifying-glass"
          placeholder="Начните вводить название термина..."
          autofocus
          @keydown.enter="selectFirst"
        />
      </div>

      <div class="modal-results">
        <div v-if="pending" class="loading-state">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
          Поиск...
        </div>

        <div v-else-if="!results.length && query" class="empty-state">
          Ничего не найдено
        </div>

        <ul v-else class="results-list">
          <li
            v-for="term in results"
            :key="term.slug"
            class="result-item"
            @click="select(term)"
          >
            <div class="res-title">{{ term.title }}</div>
            <div class="res-slug">{{ term.slug }}</div>
          </li>
        </ul>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'select'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const query = ref('')
const dQuery = refDebounced(query, 300)

const { data, pending } = await useAsyncData(
  'term-search-modal',
  () => $fetch<any>('/api/terms/search', { params: { q: dQuery.value || '' } }),
  { watch: [dQuery] }
)

const results = computed(() => data.value || [])

function select(term: any) {
  emit('select', term)
  isOpen.value = false
  query.value = ''
}

function selectFirst() {
  if (results.value.length > 0) {
    select(results.value[0])
  }
}

// Minimal debounce
function refDebounced<T>(source: Ref<T>, delay: number) {
  const d = ref(source.value) as Ref<T>
  let t: any
  watch(source, v => {
    clearTimeout(t)
    t = setTimeout(() => { d.value = v }, delay)
  })
  return d
}
</script>

<style scoped>
.term-selector-modal { padding: 20px; }
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
