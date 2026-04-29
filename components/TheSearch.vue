<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
const isOpen = ref(false)
const query = ref('')
const results = ref<any[]>([])
const pending = ref(false)

const tDict: Record<string, any> = {
  en: { placeholder: 'Search Gativus...', noResults: 'No results found', articles: 'Articles', terms: 'Terms' },
  ru: { placeholder: 'Поиск по гативус...', noResults: 'Ничего не найдено', articles: 'Статьи', terms: 'Термины' },
  zh: { placeholder: '搜索维基...', noResults: '未找到结果', articles: '文章', terms: '词汇' }
}

const t = computed(() => tDict[langStore.currentLang] || tDict.en)

// Watch for query changes with debounce
let timeout: any = null
watch(query, (newVal) => {
  if (timeout) clearTimeout(timeout)
  if (!newVal || newVal.length < 2) {
    results.value = []
    return
  }

  pending.value = true
  timeout = setTimeout(async () => {
    try {
      const { items } = await $fetch<any>('/api/search', {
        params: { q: newVal, locale: langStore.currentLang }
      })
      results.value = items || []
    } catch (e) {
      console.error('Search error:', e)
    } finally {
      pending.value = false
    }
  }, 300)
})

// Keyboard shortcut (Cmd+K / Ctrl+K)
onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      isOpen.value = true
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
})

const navigateTo = (url: string) => {
  isOpen.value = false
  query.value = ''
  useRouter().push(url)
}

const groupedResults = computed(() => {
  const groups: Record<string, any[]> = { article: [], term: [] }
  results.value.forEach(r => {
    if (groups[r.type]) groups[r.type].push(r)
  })
  return groups
})
</script>

<template>
  <div class="search-wrap">
    <!-- Trigger Button -->
      <GvButton
        type="button"
        unstyled
        chromeless
        class="search-trigger group"
        @click="isOpen = true"
      >
        <UIcon name="i-heroicons-magnifying-glass"
          class="w-5 h-5 text-gray-400 group-hover:text-sky-500 transition-colors" />
        <span
          class="hidden lg:inline text-sm text-gray-400 group-hover:text-gray-600 transition-colors uppercase tracking-widest font-bold ml-2">
          {{ t.placeholder }}
        </span>
        <UKbd class="ml-4 hidden lg:inline-flex opacity-50">{{ (navigator?.platform?.indexOf('Mac') > -1) ? '⌘' : 'Ctrl'
          }} K</UKbd>
      </GvButton>

    <!-- Modal / Command Palette Style -->
    <UModal v-model="isOpen" :ui="{
      container: 'flex items-start sm:items-center justify-center pt-20 sm:pt-0',
      width: 'w-[calc(100vw-32px)] sm:max-w-xl',
      rounded: 'rounded-2xl',
      shadow: 'shadow-2xl'
    }">
      <div class="p-4 flex flex-col gap-4 bg-white dark:bg-zinc-900 overflow-hidden">
        <div class="relative">
          <UIcon name="i-heroicons-magnifying-glass"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <UInput v-model="query" :placeholder="t.placeholder" variant="none" size="xl" autofocus
            class="w-full pl-10 h-14 text-lg font-medium border-b dark:border-zinc-800" :loading="pending" />
        </div>

        <!-- Results -->
        <div class="overflow-y-auto max-h-[60vh] custom-scroll pr-1">
          <div v-if="results.length > 0" class="flex flex-col gap-6 py-2">
            <!-- Articles -->
            <div v-if="groupedResults.article.length > 0" class="group-wrap">
              <h3 class="result-group-title">{{ t.articles }}</h3>
              <div class="flex flex-col gap-1 mt-2">
                <GvButton
                  v-for="res in groupedResults.article"
                  :key="res.id"
                  type="button"
                  unstyled
                  chromeless
                  block
                  class="result-item"
                  @click="navigateTo(res.url)"
                >
                  <div class="flex items-center gap-3">
                    <div class="result-icon-wrap bg-sky-50 dark:bg-sky-900/20">
                      <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-sky-600" />
                    </div>
                    <div class="flex flex-col text-left">
                      <span class="result-title">{{ res.title }}</span>
                      <span class="result-snippet" v-html="res.snippet"></span>
                    </div>
                  </div>
                </GvButton>
              </div>
            </div>

            <!-- Terms -->
            <div v-if="groupedResults.term.length > 0" class="group-wrap">
              <h3 class="result-group-title">{{ t.terms }}</h3>
              <div class="flex flex-col gap-1 mt-2">
                <GvButton
                  v-for="res in groupedResults.term"
                  :key="res.id"
                  type="button"
                  unstyled
                  chromeless
                  block
                  class="result-item"
                  @click="navigateTo(res.url)"
                >
                  <div class="flex items-center gap-3">
                    <div class="result-icon-wrap bg-purple-50 dark:bg-purple-900/20">
                      <UIcon name="i-heroicons-document-magnifying-glass" class="w-4 h-4 text-purple-600" />
                    </div>
                    <div class="flex flex-col text-left">
                      <span class="result-title">{{ res.title }}</span>
                      <span class="result-snippet" v-html="res.snippet"></span>
                    </div>
                  </div>
                </GvButton>
              </div>
            </div>
          </div>

          <div v-else-if="query.length >= 2 && !pending" class="py-12 text-center text-gray-400">
            <UIcon name="i-heroicons-face-frown" class="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p class="text-sm font-medium tracking-wide uppercase">{{ t.noResults }}</p>
          </div>

          <div v-else-if="query.length < 2" class="py-12 text-center text-gray-300">
            <p class="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 italic">SEARCH in GATIVUS</p>
          </div>
        </div>

        <div
          class="flex items-center justify-between pt-4 border-t dark:border-zinc-800 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <div class="flex gap-4">
            <span class="flex items-center gap-1">
              <UKbd size="xs">↵</UKbd> select
            </span>
            <span class="flex items-center gap-1">
              <UKbd size="xs">↑↓</UKbd> navigate
            </span>
          </div>
        </div>
      </div>
    </UModal>
  </div>
</template>

<style scoped>
.search-wrap :deep(.search-trigger .gv-btn__label),
.search-wrap :deep(.result-item .gv-btn__label) {
  display: contents;
}

:deep(.search-trigger.gv-btn--chromeless) {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 42px;
  padding: 8px 18px !important;
  border-radius: 99px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.dark :deep(.search-trigger.gv-btn--chromeless) {
  background: #18181b;
  border-color: #27272a;
}

:deep(.search-trigger.gv-btn--chromeless:hover) {
  border-color: #d4d4d8;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.dark :deep(.search-trigger.gv-btn--chromeless:hover) {
  background: #1e1e21;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.result-group-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #94a3b8;
  margin-left: 8px;
}

:deep(.result-item) {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

:deep(.result-item:hover) {
  background: #f1f5f9;
}

.dark :deep(.result-item:hover) {
  background: #27272a;
}

.result-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.dark .result-title {
  color: #f1f5f9;
}

.result-snippet {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
  margin-top: 2px;
}

.result-snippet :deep(b) {
  color: #0284c7;
  font-weight: 900;
}

.custom-scroll::-webkit-scrollbar {
  width: 4px;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.dark .custom-scroll::-webkit-scrollbar-thumb {
  background: #3f3f46;
}
</style>
