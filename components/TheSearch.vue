<script setup lang="ts">
/**
 * Глобальный поиск: панель в стиле дизайн-системы Gativus (Ontologie Article indigo / Term emerald).
 * Якоря для статей — сервер подбирает заголовок по FTS-snippet (`server/utils/searchAnchors.ts`).
 */
import { useLanguageStore } from '~/stores/language'

const props = withDefaults(
  defineProps<{
    /**
     * Глобальный Ctrl/Cmd+K. На странице должен быть ровно один слушатель:
     * в `theHeader` два экземпляра поиска — горячую клавишу включают только у одного.
     */
    shortcutHotkey?: boolean
    /**
     * Узкая шапка (мобильный ряд): только иконка, подпись в sr-only — без переполнения.
     */
    compactTrigger?: boolean
  }>(),
  { shortcutHotkey: true, compactTrigger: false },
)

interface SearchHit {
  id: number
  type: 'article' | 'term'
  title: string
  slug: string
  snippet?: string
  url: string
  anchor?: string | null
}

const langStore = useLanguageStore()
const isOpen = ref(false)
const query = ref('')
const results = ref<SearchHit[]>([])
const pending = ref(false)
const isDebouncing = ref(false)
const activeHitIndex = ref(0)

type SearchFilterMode = 'all' | 'article' | 'term'
const filterMode = ref<SearchFilterMode>('all')

const tDict: Record<string, Record<string, string>> = {
  en: {
    triggerLabel: 'Search',
    placeholder: 'Search Gativus...',
    noResults: 'No results found',
    articles: 'Articles',
    terms: 'Terms',
    filters: 'Filters',
    contentType: 'Content type',
    allSources: 'All',
    onlyArticles: 'Articles only',
    onlyTerms: 'Terms only',
    clearSearch: 'Clear search',
    hintTyping: 'Type at least 2 characters',
    hintBrand: 'Gativus search',
    enterSelect: 'Select',
    arrowNav: 'Navigate',
    escClose: 'Close',
    toSection: 'Section',
    enterArticlesOnly: 'Open article',
    enterTerm: 'Open glossary entry',
  },
  ru: {
    triggerLabel: 'Поиск',
    placeholder: 'Поиск по Gativus...',
    noResults: 'Ничего не найдено',
    articles: 'Статьи',
    terms: 'Термины',
    filters: 'Фильтры',
    contentType: 'Тип материала',
    allSources: 'Всё',
    onlyArticles: 'Только статьи',
    onlyTerms: 'Только термины',
    clearSearch: 'Очистить поле',
    hintTyping: 'Минимум 2 символа',
    hintBrand: 'Поиск Gativus',
    enterSelect: 'Выбор',
    arrowNav: 'Навигация',
    escClose: 'Закрыть',
    toSection: 'К разделу',
    enterArticlesOnly: 'Открыть статью',
    enterTerm: 'Открыть термин',
  },
  zh: {
    triggerLabel: '搜索',
    placeholder: '搜索...',
    noResults: '未找到结果',
    articles: '文章',
    terms: '词汇',
    filters: '筛选',
    contentType: '内容类型',
    allSources: '全部',
    onlyArticles: '仅文章',
    onlyTerms: '仅词条',
    clearSearch: '清除',
    hintTyping: '至少输入 2 个字符',
    hintBrand: 'Gativus 搜索',
    enterSelect: '选择',
    arrowNav: '移动',
    escClose: '关闭',
    toSection: '章节',
    enterArticlesOnly: '打开文章',
    enterTerm: '打开词条',
  },
}

const t = computed(() => tDict[langStore.currentLang] || tDict.en)

const activeFilterCount = computed(() => (filterMode.value === 'all' ? 0 : 1))

let timeout: ReturnType<typeof setTimeout> | null = null

async function fetchResults(q: string) {
  const params: Record<string, string> = { q, locale: langStore.currentLang }
  if (filterMode.value === 'article') params.types = 'article'
  else if (filterMode.value === 'term') params.types = 'term'

  const { items } = await $fetch<{ items: SearchHit[] }>('/api/search', { params })
  results.value = items || []
  activeHitIndex.value = 0
}

function scheduleSearch() {
  if (timeout) clearTimeout(timeout)
  if (!query.value || query.value.length < 2) {
    results.value = []
    isDebouncing.value = false
    pending.value = false
    activeHitIndex.value = 0
    return
  }
  isDebouncing.value = true
  pending.value = false
  timeout = setTimeout(async () => {
    pending.value = true
    isDebouncing.value = false
    try {
      await fetchResults(query.value)
    }
    catch (e) {
      console.error('Search error:', e)
    }
    finally {
      pending.value = false
    }
  }, 300)
}

watch(query, () => scheduleSearch())

watch(filterMode, () => {
  if (query.value.length >= 2) {
    if (timeout) clearTimeout(timeout)
    pending.value = true
    isDebouncing.value = false
    fetchResults(query.value)
      .catch((e) => console.error('Search error:', e))
      .finally(() => {
        pending.value = false
      })
  }
})

watch(isOpen, (open) => {
  if (import.meta.client) {
    document.body.style.overflow = open ? 'hidden' : ''
    if (open)
      window.addEventListener('keydown', onResultsKeydown)
    else
      window.removeEventListener('keydown', onResultsKeydown)
  }

  if (!open) {
    if (timeout) clearTimeout(timeout)
    timeout = null
    results.value = []
    query.value = ''
    pending.value = false
    isDebouncing.value = false
    filterMode.value = 'all'
    activeHitIndex.value = 0
  }
})

watch(
  () => langStore.currentLang,
  () => {
    if (!isOpen.value || query.value.length < 2)
      return
    if (timeout)
      clearTimeout(timeout)
    pending.value = true
    isDebouncing.value = false
    fetchResults(query.value)
      .catch((e) => console.error('Search error:', e))
      .finally(() => {
        pending.value = false
      })
  },
)

const isMac = ref(false)

function closeModal() {
  isOpen.value = false
}

const groupedResults = computed(() => {
  const groups: Record<'article' | 'term', SearchHit[]> = { article: [], term: [] }
  results.value.forEach((r) => {
    if (groups[r.type])
      groups[r.type].push(r)
  })
  return groups
})

/** Только статьи участвуют в Enter / стрелках и фокусе. */
const navigableArticleHits = computed(() => [...groupedResults.value.article])

watch(navigableArticleHits, (hits) => {
  if (activeHitIndex.value >= hits.length)
    activeHitIndex.value = Math.max(0, hits.length - 1)
})

function onResultsKeydown(e: KeyboardEvent) {
  if (!isOpen.value)
    return
  const hits = navigableArticleHits.value
  if (e.key === 'Escape') {
    e.preventDefault()
    closeModal()
    return
  }
  if (!hits.length)
    return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeHitIndex.value = (activeHitIndex.value + 1) % hits.length
    scrollActiveIntoView()
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeHitIndex.value = (activeHitIndex.value - 1 + hits.length) % hits.length
    scrollActiveIntoView()
  }
  else if (e.key === 'Enter') {
    e.preventDefault()
    const hit = hits[activeHitIndex.value]
    if (hit?.type === 'article')
      void goToResult(hit.url)
  }
}

const resultsScrollEl = ref<HTMLElement | null>(null)

function scrollActiveIntoView() {
  nextTick(() => {
    if (!import.meta.client || !resultsScrollEl.value)
      return
    const node = resultsScrollEl.value.querySelector(`[data-hit-index="${activeHitIndex.value}"]`)
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

function onCmdKOpenSearch(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value = true
  }
}

onMounted(() => {
  if (typeof navigator !== 'undefined') {
    const p = navigator.platform || ''
    const ua = navigator.userAgent || ''
    isMac.value = /Mac|iPhone|iPod|iPad/i.test(p) || /Mac OS/i.test(ua)
  }
  if (import.meta.client && props.shortcutHotkey)
    window.addEventListener('keydown', onCmdKOpenSearch)
})

async function goToResult(url: string) {
  isOpen.value = false
  query.value = ''
  await navigateTo(url)
}

onUnmounted(() => {
  if (!import.meta.client)
    return
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onResultsKeydown)
  if (props.shortcutHotkey)
    window.removeEventListener('keydown', onCmdKOpenSearch)
})

function isArticleHitActive(idx: number): boolean {
  return activeHitIndex.value === idx
}

function onHitPointerArticle(idx: number) {
  activeHitIndex.value = idx
}
</script>

<template>
  <div
    class="gv-search"
    :class="{ 'gv-search--compact-trigger': compactTrigger }"
  >
    <GvButton
      type="button"
      unstyled
      chromeless
      class="gv-search__trigger group gv-focusable"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-label="`${t.triggerLabel}. ${t.placeholder}`"
      @click="isOpen = true"
    >
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="gv-search__trigger-icon shrink-0"
        aria-hidden="true"
      />
      <span class="gv-search__trigger-label">{{ t.triggerLabel }}</span>
      <kbd class="gv-search__kbd gv-search__kbd--hint hidden lg:inline-flex" aria-hidden="true">
        <span>{{ isMac ? '⌘' : 'Ctrl' }}</span><span class="gv-search__kbd-plus">K</span>
      </kbd>
    </GvButton>

    <Teleport to="body">
      <transition name="gv-search-fade">
        <div
          v-if="isOpen"
          class="gv-search__overlay"
          aria-hidden="true"
          @click.self="closeModal"
        />
      </transition>
      <transition name="gv-search-panel">
        <div
          v-if="isOpen"
          class="gv-search__shell"
          @click.self="closeModal"
        >
          <div
            class="gv-search__dialog"
            role="dialog"
            aria-modal="true"
            :aria-label="t.placeholder"
            @click.stop
          >
            <div class="gv-search__toolbar">
              <BaseSearch
                v-model="query"
                class="gv-search__field min-w-0 flex-1"
                no-max-width
                size="md"
                :placeholder="t.placeholder"
                :is-pending="pending"
                :is-debouncing="isDebouncing"
                :clear-label="t.clearSearch"
                autofocus
              />
              <ExpandableFilters
                class="gv-search__filters w-full shrink-0 sm:w-auto"
                size="md"
                :label="t.filters"
                :active-count="activeFilterCount"
                :has-active-filters="activeFilterCount > 0"
              >
                <div class="gv-search__filter-block">
                  <span class="gv-search__filter-heading">{{ t.contentType }}</span>
                  <div class="gv-search__filter-pills">
                    <GvButton
                      type="button"
                      chromeless
                      variant="ghost"
                      color="gray"
                      class="gv-filter-pill gv-focusable"
                      :class="{ 'is-active': filterMode === 'all' }"
                      @click="filterMode = 'all'"
                    >
                      {{ t.allSources }}
                    </GvButton>
                    <GvButton
                      type="button"
                      chromeless
                      variant="ghost"
                      color="gray"
                      class="gv-filter-pill gv-focusable"
                      :class="{ 'is-active': filterMode === 'article' }"
                      @click="filterMode = 'article'"
                    >
                      {{ t.onlyArticles }}
                    </GvButton>
                    <GvButton
                      type="button"
                      chromeless
                      variant="ghost"
                      color="gray"
                      class="gv-filter-pill gv-focusable"
                      :class="{ 'is-active': filterMode === 'term' }"
                      @click="filterMode = 'term'"
                    >
                      {{ t.onlyTerms }}
                    </GvButton>
                  </div>
                </div>
              </ExpandableFilters>
            </div>

            <div
              ref="resultsScrollEl"
              class="gv-search__results custom-scroll"
            >
              <div v-if="results.length > 0" class="gv-search__groups">
                <!-- Статьи — онтология Article #6366f1 -->
                <section
                  v-if="groupedResults.article.length > 0"
                  class="gv-search__group gv-search__group--article gv-surface-card"
                  :aria-label="t.articles"
                >
                  <div class="gv-search__group-head gv-card-header gv-search__group-head--article">
                    <h3 class="gv-search__group-title">
                      {{ t.articles }}
                    </h3>
                  </div>
                  <div class="gv-search__group-body gv-search__group-body--article">
                  <ul class="gv-search__list">
                    <li v-for="(res, idx) in groupedResults.article" :key="'a-' + res.id">
                      <button
                        type="button"
                        class="gv-search__hit gv-search__hit--article gv-focusable"
                        :class="{ 'gv-search__hit--active': isArticleHitActive(idx) }"
                        :data-hit-index="idx"
                        @pointerenter="onHitPointerArticle(idx)"
                        @click="goToResult(res.url)"
                      >
                        <span class="gv-search__hit-icon gv-search__hit-icon--article" aria-hidden="true">
                          <UIcon name="i-heroicons-document-text" class="gv-search__hit-icon-svg" />
                        </span>
                        <span class="gv-search__hit-body">
                          <span class="gv-search__hit-title-row">
                            <span class="gv-search__hit-title gv-search__hit-title--article">{{ res.title }}</span>
                            <span
                              v-if="res.anchor"
                              class="gv-search__anchor-pill"
                              :title="res.url"
                            >{{ t.toSection }}</span>
                          </span>
                          <span class="gv-search__snippet gv-search__snippet--article" v-html="res.snippet" />
                        </span>
                      </button>
                    </li>
                  </ul>
                  </div>
                </section>

                <!-- Термины — онтология Term #10b981 -->
                <section
                  v-if="groupedResults.term.length > 0"
                  class="gv-search__group gv-search__group--term gv-surface-card"
                  :aria-label="t.terms"
                >
                  <div class="gv-search__group-head gv-card-header gv-search__group-head--term">
                    <h3 class="gv-search__group-title">
                      {{ t.terms }}
                    </h3>
                  </div>
                  <div class="gv-search__group-body gv-search__group-body--term">
                  <ul class="gv-search__list">
                    <li v-for="res in groupedResults.term" :key="'t-' + res.id">
                      <button
                        type="button"
                        class="gv-search__hit gv-search__hit--term gv-focusable"
                        :aria-label="`${res.title}. ${t.enterTerm}`"
                        @click="goToResult(res.url)"
                      >
                        <span class="gv-search__hit-icon gv-search__hit-icon--term" aria-hidden="true">
                          <UIcon name="i-heroicons-document-magnifying-glass" class="gv-search__hit-icon-svg" />
                        </span>
                        <span class="gv-search__hit-body">
                          <span class="gv-search__hit-title gv-search__hit-title--term">{{ res.title }}</span>
                          <span class="gv-search__snippet gv-search__snippet--term" v-html="res.snippet" />
                        </span>
                      </button>
                    </li>
                  </ul>
                  </div>
                </section>
              </div>

              <div
                v-else-if="query.length >= 2 && !pending && !isDebouncing"
                class="gv-search__empty"
              >
                <UIcon name="i-heroicons-face-frown" class="gv-search__empty-icon" aria-hidden="true" />
                <p>{{ t.noResults }}</p>
              </div>

              <div v-else-if="query.length < 2" class="gv-search__hint">
                <p>{{ t.hintTyping }}</p>
                <p class="gv-search__hint-brand">
                  {{ t.hintBrand }}
                </p>
              </div>
            </div>

            <div class="gv-search__footer">
              <div class="gv-search__footer-keys">
                <span><kbd class="gv-search__kbd">↵</kbd> {{ t.enterArticlesOnly }}</span>
                <span><kbd class="gv-search__kbd">↑↓</kbd> {{ t.arrowNav }}</span>
                <span><kbd class="gv-search__kbd">Esc</kbd> {{ t.escClose }}</span>
              </div>
              <GvButton
                type="button"
                variant="ghost"
                color="gray"
                size="xs"
                class="gv-search__close-foot"
                @click="closeModal"
              >
                {{ t.escClose }}
              </GvButton>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ─── Ontology accents (design_system §5) ─── */
.gv-search {
  --gv-hit-article: #6366f1;
  --gv-hit-article-muted: color-mix(in srgb, #6366f1 75%, var(--gv-text-secondary));
  --gv-hit-term: #10b981;
  --gv-hit-term-muted: color-mix(in srgb, #10b981 80%, var(--gv-text-secondary));
}

.gv-search :deep(.gv-search__trigger .gv-btn__label) {
  display: contents;
}

.gv-search--compact-trigger .gv-search__trigger-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.gv-search--compact-trigger .gv-search__kbd--hint {
  display: none;
}

.gv-search--compact-trigger :deep(.gv-search__trigger.gv-btn--chromeless) {
  position: relative;
  min-width: 42px;
  justify-content: center;
  padding-inline: 10px !important;
  gap: 0;
}

.gv-search__filters :deep(.expandable-filters) {
  width: 100%;
}

@media (min-width: 640px) {
  .gv-search__filters :deep(.expandable-filters) {
    width: auto;
  }
}

.gv-search__trigger-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--gv-text-secondary);
  transition: color 0.2s ease;
}

.gv-search__trigger-icon :deep(svg) {
  width: 20px;
  height: 20px;
  stroke: currentColor;
}

:deep(.gv-search__trigger.gv-btn--chromeless:hover) .gv-search__trigger-icon,
:deep(.gv-search__trigger.gv-btn--chromeless:focus-visible) .gv-search__trigger-icon {
  color: var(--gv-primary);
}

.gv-search__trigger-label {
  margin-left: 2px;
  min-width: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  transition: color 0.2s ease;
  max-width: 4.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 400px) {
  .gv-search__trigger-label {
    max-width: none;
    font-size: 12px;
    letter-spacing: 0.1em;
  }
}

:deep(.gv-search__trigger.gv-btn--chromeless:hover) .gv-search__trigger-label,
:deep(.gv-search__trigger.gv-btn--chromeless:focus-visible) .gv-search__trigger-label {
  color: var(--gv-text-primary);
}

:deep(.gv-search__trigger.gv-btn--chromeless) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 40px;
  min-width: 0;
  padding: 8px 14px !important;
  border-radius: 999px;
  cursor: pointer;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    background 0.25s ease;
  background: color-mix(in srgb, var(--gv-surface-card) 92%, var(--gv-surface-header));
  border: 1px solid var(--gv-border-principal);
  box-shadow: var(--gv-shadow-sm);
}

:deep(.gv-search__trigger.gv-btn--chromeless:hover) {
  border-color: color-mix(in srgb, var(--gv-primary) 28%, var(--gv-border-principal));
  background: var(--gv-surface-card);
  box-shadow: var(--gv-shadow-md);
}

:deep(.gv-search__trigger.gv-btn--chromeless:focus-visible) {
  outline: 2px solid var(--gv-primary);
  outline-offset: 2px;
}

.gv-search__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--gv-text-secondary);
  background: color-mix(in srgb, var(--gv-surface-header) 88%, var(--gv-border-principal));
  border: 1px solid var(--gv-border-principal);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--gv-surface) 75%, transparent);
}

.gv-search__kbd--hint {
  margin-left: 12px;
  gap: 2px;
  opacity: 0.72;
}

.gv-search__kbd-plus {
  margin-left: 1px;
}

/* Overlay + dialog */
.gv-search-fade-enter-active,
.gv-search-fade-leave-active {
  transition: opacity 0.25s ease;
}

.gv-search-fade-enter-from,
.gv-search-fade-leave-to {
  opacity: 0;
}

.gv-search__overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: color-mix(in srgb, var(--gv-text-primary) 34%, transparent);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

.gv-search-panel-enter-active,
.gv-search-panel-leave-active {
  transition:
    opacity 0.28s cubic-bezier(0.705, 0.01, 0, 0.915),
    transform 0.28s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.gv-search-panel-enter-from,
.gv-search-panel-leave-to {
  opacity: 0;
}

@media (min-width: 640px) {
  .gv-search-panel-enter-from,
  .gv-search-panel-leave-to {
    transform: translateY(-12px) scale(0.98);
  }
}

.gv-search__shell {
  position: fixed;
  inset: 0;
  z-index: 121;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  pointer-events: none;
}

@media (min-width: 640px) {
  .gv-search__shell {
    align-items: center;
    padding: 2rem 1rem;
  }
}

.gv-search__dialog {
  pointer-events: auto;
  width: min(100%, calc(100vw - 32px));
  max-width: 36rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  padding: 1rem;
  border-radius: var(--gv-radius-container);
  background: var(--gv-surface-card);
  border: 1px solid var(--gv-border-principal);
  box-shadow: var(--gv-shadow-lg);
  overflow: hidden;
}

.dark .gv-search__dialog {
  background: color-mix(in srgb, var(--gv-surface-card) 96%, var(--gv-surface-header));
  box-shadow:
    var(--gv-shadow-lg),
    0 0 0 1px color-mix(in srgb, var(--gv-primary) 12%, transparent);
}

.gv-search__toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-shrink: 0;
  min-width: 0;
}

@media (min-width: 640px) {
  .gv-search__toolbar {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
}

.gv-search__filter-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gv-search__filter-heading {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.gv-search__filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gv-search__results {
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(60vh, 520px);
  overflow-y: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.gv-search__groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 4px 0 8px;
}

/* Карточки секций — foundation: gv-surface-card + шапка как gv-card-header (design_system §7.1) */
.gv-search__group.gv-surface-card {
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.gv-search__group--article.gv-surface-card {
  border-left: 3px solid var(--gv-hit-article);
}

.gv-search__group--term.gv-surface-card {
  border-left: 3px solid var(--gv-hit-term);
}

.gv-search__group-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

/* Шапка секции: глобальный gv-card-header + цвет заголовка по онтологии */
.gv-search__group-head--article .gv-search__group-title {
  color: var(--gv-hit-article);
}

.gv-search__group-head--term .gv-search__group-title {
  color: var(--gv-hit-term);
}

.gv-search__group-body {
  padding: 12px 14px 14px;
}

.gv-search__group-body--article {
  background: color-mix(in srgb, var(--gv-hit-article) 7%, var(--gv-surface-card));
}

.gv-search__group-body--term {
  background: color-mix(in srgb, var(--gv-hit-term) 7%, var(--gv-surface-card));
}

.dark .gv-search__group-body--article {
  background: color-mix(in srgb, var(--gv-hit-article) 12%, var(--gv-surface-header));
}

.dark .gv-search__group-body--term {
  background: color-mix(in srgb, var(--gv-hit-term) 12%, var(--gv-surface-header));
}

.gv-search__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gv-search__hit {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  margin: 0;
  border-radius: var(--gv-radius-control);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition:
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.15s ease;
}

.gv-search__group--article .gv-search__hit--article {
  background: color-mix(in srgb, var(--gv-hit-article) 18%, var(--gv-surface-card));
  border: 1px solid color-mix(in srgb, var(--gv-hit-article) 32%, var(--gv-border-principal));
}

.dark .gv-search__group--article .gv-search__hit--article {
  background: color-mix(in srgb, var(--gv-hit-article) 22%, var(--gv-surface-header));
  border-color: color-mix(in srgb, var(--gv-hit-article) 40%, var(--gv-border-principal));
}

.gv-search__group--term .gv-search__hit--term {
  background: color-mix(in srgb, var(--gv-hit-term) 18%, var(--gv-surface-card));
  border: 1px solid color-mix(in srgb, var(--gv-hit-term) 32%, var(--gv-border-principal));
}

.dark .gv-search__group--term .gv-search__hit--term {
  background: color-mix(in srgb, var(--gv-hit-term) 22%, var(--gv-surface-header));
  border-color: color-mix(in srgb, var(--gv-hit-term) 40%, var(--gv-border-principal));
}

.gv-search__group--article .gv-search__hit--article:hover {
  background: color-mix(in srgb, var(--gv-hit-article) 26%, var(--gv-surface-card));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gv-hit-article) 38%, transparent);
}

.dark .gv-search__group--article .gv-search__hit--article:hover {
  background: color-mix(in srgb, var(--gv-hit-article) 30%, var(--gv-surface-header));
}

.gv-search__group--term .gv-search__hit--term:hover {
  background: color-mix(in srgb, var(--gv-hit-term) 26%, var(--gv-surface-card));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--gv-hit-term) 38%, transparent);
}

.dark .gv-search__group--term .gv-search__hit--term:hover {
  background: color-mix(in srgb, var(--gv-hit-term) 30%, var(--gv-surface-header));
}

.gv-search__group--article .gv-search__hit--article.gv-search__hit--active {
  background: color-mix(in srgb, var(--gv-hit-article) 30%, var(--gv-surface-card)) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--gv-hit-article) 42%, transparent);
}

.dark .gv-search__group--article .gv-search__hit--article.gv-search__hit--active {
  background: color-mix(in srgb, var(--gv-hit-article) 38%, var(--gv-surface-header)) !important;
}

.gv-search__hit-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--gv-radius-control);
  border-width: 1px;
  border-style: solid;
}

.gv-search__hit-icon-svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.gv-search__hit-icon--article {
  background: color-mix(in srgb, var(--gv-hit-article) 36%, var(--gv-surface-card));
  border-color: color-mix(in srgb, var(--gv-hit-article) 55%, var(--gv-border-principal));
  color: var(--gv-hit-article);
}

.dark .gv-search__hit-icon--article {
  background: color-mix(in srgb, var(--gv-hit-article) 42%, var(--gv-surface-header));
  border-color: color-mix(in srgb, var(--gv-hit-article) 58%, var(--gv-border-principal));
}

.gv-search__hit-icon--article :deep(svg) {
  color: inherit;
  stroke: currentColor;
}

.gv-search__hit-icon--term {
  background: color-mix(in srgb, var(--gv-hit-term) 36%, var(--gv-surface-card));
  border-color: color-mix(in srgb, var(--gv-hit-term) 52%, var(--gv-border-principal));
  color: var(--gv-hit-term);
}

.dark .gv-search__hit-icon--term {
  background: color-mix(in srgb, var(--gv-hit-term) 42%, var(--gv-surface-header));
  border-color: color-mix(in srgb, var(--gv-hit-term) 56%, var(--gv-border-principal));
}

.gv-search__hit-icon--term :deep(svg) {
  color: inherit;
  stroke: currentColor;
}

.gv-search__hit-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gv-search__hit-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.gv-search__hit-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
}

.gv-search__hit-title--article {
  color: var(--gv-hit-article);
}

.gv-search__hit-title--term {
  color: var(--gv-hit-term);
}

.gv-search__anchor-pill {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--gv-hit-article) 14%, var(--gv-surface-card));
  color: var(--gv-hit-article);
  border: 1px solid color-mix(in srgb, var(--gv-hit-article) 25%, var(--gv-border-principal));
}

.gv-search__snippet {
  font-size: 12px;
  line-height: 1.45;
  color: var(--gv-text-secondary);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.gv-search__snippet--article :deep(a) {
  pointer-events: none;
  cursor: inherit;
  color: inherit !important;
  text-decoration: none;
}

.gv-search__group--article .gv-search__snippet :deep(b),
.gv-search__group--article .gv-search__snippet :deep(strong) {
  color: var(--gv-hit-article-muted);
  font-weight: 800;
}

.gv-search__group--term .gv-search__snippet :deep(b),
.gv-search__group--term .gv-search__snippet :deep(strong) {
  color: var(--gv-hit-term-muted);
  font-weight: 800;
}

.gv-search__empty {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--gv-text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.gv-search__empty-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 10px;
  opacity: 0.35;
}

.gv-search__hint {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--gv-text-secondary);
  font-size: 13px;
}

.gv-search__hint-brand {
  margin-top: 10px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  opacity: 0.48;
}

.gv-search__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--gv-border-principal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.gv-search__footer-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.gv-search__footer-keys span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gv-search__close-foot {
  flex-shrink: 0;
}

.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--gv-border-principal) 85%, transparent) transparent;
}

.custom-scroll::-webkit-scrollbar {
  width: 4px;
}

.custom-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--gv-border-principal) 85%, transparent);
  border-radius: 10px;
}

.dark .custom-scroll {
  scrollbar-color: color-mix(in srgb, var(--gv-text-secondary) 32%, transparent) transparent;
}

.dark .custom-scroll::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--gv-text-secondary) 32%, transparent);
}

/* ─── Адаптив: узкие экраны / тач / safe-area ─── */
@media (max-width: 639px) {
  .gv-search-panel-enter-from,
  .gv-search-panel-leave-to {
    transform: translateY(-100%);
  }

  .gv-search__shell {
    align-items: flex-start;
    justify-content: stretch;
    padding-top: max(0.5rem, env(safe-area-inset-top));
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    padding-left: max(0.5rem, env(safe-area-inset-left));
    padding-right: max(0.5rem, env(safe-area-inset-right));
  }

  .gv-search__dialog {
    width: 100%;
    max-width: none;
    border-radius: 0 0 var(--gv-radius-container) var(--gv-radius-container);
    max-height: min(
      92dvh,
      calc(100svh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 12px)
    );
    padding: 0.75rem max(0.75rem, env(safe-area-inset-left)) max(0.75rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-right));
    gap: 0.75rem;
  }

  .gv-search__results {
    max-height: none;
  }

  .gv-search__groups {
    gap: 1rem;
    padding: 2px 0 6px;
  }

  .gv-search__group-head {
    padding: 10px 12px;
  }

  .gv-search__group-body {
    padding: 10px 12px 12px;
  }

  .gv-search__footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding-top: 10px;
  }

  .gv-search__footer-keys {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    font-size: 9px;
    letter-spacing: 0.05em;
  }

  .gv-search__empty {
    padding: 1.75rem 0.75rem;
  }

  .gv-search__hint {
    padding: 1.75rem 0.75rem;
    font-size: 12px;
  }

  .gv-search__close-foot {
    align-self: flex-end;
  }
}

@media (max-width: 389px) {
  .gv-search__hit {
    gap: 10px;
    padding: 12px 10px;
    align-items: flex-start;
  }

  .gv-search__hit-icon {
    width: 36px;
    height: 36px;
  }

  .gv-search__hit-icon-svg {
    width: 18px;
    height: 18px;
  }

  .gv-search__hit-title {
    font-size: 13px;
  }

  .gv-search__snippet {
    font-size: 11px;
  }

  .gv-search__dialog {
    padding-inline: max(0.5rem, env(safe-area-inset-left)) max(0.5rem, env(safe-area-inset-right));
  }

  .gv-search__filter-pills {
    gap: 6px;
  }
}

@media (pointer: coarse) {
  .gv-search__hit {
    min-height: 44px;
  }
}
</style>
