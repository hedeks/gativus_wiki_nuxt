<template>
  <div class="knowledge-graph-visualizer" :class="{ 'knowledge-graph-visualizer--frameless': frameless }">
    <div ref="graphViewport" class="graph-viewport">
      <div ref="graphContainer" class="graph-container" :class="{ 'graph-container--frameless': frameless }">
        <svg ref="svgRef" class="graph-svg"></svg>
      </div>

      <!-- Слой UI вне .graph-container — иначе overflow:hidden обрезает backdrop-filter («стекло») -->
      <div class="graph-chrome">
        <div v-if="pending" class="loading-overlay">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl" />
          <span>{{ t.loading }}</span>
        </div>
        <div v-else-if="!pending && (!graphData?.nodes || graphData.nodes.length === 0)" class="empty-state-overlay">
          <UIcon name="i-heroicons-share" class="text-4xl opacity-20 mb-2" />
          <p>{{ t.empty }}</p>
        </div>

      <!-- Top: hero (страница графа) + контролы в одной карточке ДС -->
      <div
        class="graph-actions-container kg-glass-surface"
        :class="{
          'graph-actions-container--frameless': frameless,
          'graph-actions-container--mobile-compact': graphActionsMobileCompact,
        }"
        @wheel.stop
        @mousewheel.stop
      >
        <div v-show="graphActionsMobileCompact" class="graph-actions-compact">
          <span class="graph-actions-compact-label">{{ frameless ? t.graphHeroTitle : t.toolbarCompactLabel }}</span>
          <GvButton
            type="button"
            unstyled
            chromeless
            square
            class="action-btn graph-actions-compact-open"
            icon="i-heroicons-bars-3"
            :title="t.toolbarExpand"
            :aria-label="t.toolbarExpand"
            @click="isMobileToolbarExpanded = true"
          />
        </div>

        <div v-show="!graphActionsMobileCompact" class="graph-actions-expanded">
          <header v-if="frameless" class="kg-graph-hero" aria-label="Introduction">
            <h1 class="kg-graph-headline">
              <span class="kg-graph-title uppercase">{{ t.graphHeroTitle }}</span>
              <span class="kg-graph-sep" aria-hidden="true" />
              <span class="kg-graph-brand gv-hero-gradient uppercase">Gativus</span>
            </h1>
          </header>

          <div class="graph-actions-toolbar">
            <div v-if="isMobileChrome" class="graph-actions-toolbar-collapse-row">
              <GvButton
                type="button"
                unstyled
                chromeless
                square
                class="action-btn"
                icon="i-heroicons-chevron-up"
                :title="t.toolbarCollapse"
                :aria-label="t.toolbarCollapse"
                @click="isMobileToolbarExpanded = false"
              />
            </div>
            <div class="custom-search-wrapper">
            <UIcon name="i-heroicons-magnifying-glass" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t.search"
              class="custom-search-input"
              @input="handleSearch"
            >
            <GvButton
              v-show="searchQuery"
              type="button"
              unstyled
              chromeless
              square
              class="clear-search-btn"
              icon="i-heroicons-x-mark"
              title="Clear"
              aria-label="Clear search"
              @click="clearSearch"
            />
          </div>

          <div class="control-divider control-divider--toolbar"></div>

          <!-- Filters -->
          <div class="custom-popover-wrapper">
            <GvButton
              type="button"
              unstyled
              chromeless
              square
              class="action-btn"
              :class="{ active: isFilterMenuOpen }"
              icon="i-heroicons-funnel"
              :title="t.filters"
              @click="isFilterMenuOpen = !isFilterMenuOpen"
            />

            <transition name="menu-slide">
              <div v-if="isFilterMenuOpen" class="custom-popover-panel">
                <div class="filter-menu-header">{{ t.filters }}</div>
                <div class="filter-menu-list">
                  <div
                    v-for="(label, key) in filterLabels"
                    :key="key"
                    class="filter-line"
                    @click="activeFilters[key] = !activeFilters[key]"
                  >
                    <span class="filter-label-text">{{ label }}</span>
                    <div class="custom-switch" :class="{ checked: activeFilters[key] }">
                      <div class="switch-handle"></div>
                    </div>
                  </div>
                </div>
                <div class="filter-menu-footer">
                  <GvButton type="button" unstyled chromeless class="footer-btn primary" @click="setAllFilters(true)">{{ t.all }}</GvButton>
                  <div class="divider-small"></div>
                  <GvButton type="button" unstyled chromeless class="footer-btn" @click="setAllFilters(false)">{{ t.none }}</GvButton>
                </div>
              </div>
            </transition>
          </div>

          <div class="control-divider control-divider--toolbar"></div>

          <!-- Language Switcher -->
          <div class="lang-switcher">
            <GvButton
              type="button"
              unstyled
              chromeless
              class="lang-btn"
              :class="{ active: langStore.currentLang === 'en' }"
              @click="langStore.setLanguage('en')"
            >
              EN
            </GvButton>
            <div class="lang-sep"></div>
            <GvButton
              type="button"
              unstyled
              chromeless
              class="lang-btn"
              :class="{ active: langStore.currentLang === 'ru' }"
              @click="langStore.setLanguage('ru')"
            >
              RU
            </GvButton>
            <div class="lang-sep"></div>
            <GvButton
              type="button"
              unstyled
              chromeless
              class="lang-btn"
              :class="{ active: langStore.currentLang === 'zh' }"
              @click="langStore.setLanguage('zh')"
            >
              ZH
            </GvButton>
          </div>

          <div class="control-divider control-divider--toolbar"></div>

          <!-- Fullscreen -->
          <GvButton
            type="button"
            unstyled
            chromeless
            square
            class="action-btn"
            :title="isFullscreen ? 'Exit' : 'Fullscreen'"
            @click="toggleFullscreen"
          >
            <UIcon :name="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" />
          </GvButton>
          </div>
        </div>
      </div>

      <div class="kg-graph-ui-cluster" @wheel.stop @mousewheel.stop>
        <div class="custom-zoom-controls kg-glass-surface">
          <GvButton type="button" unstyled chromeless square class="zoom-btn" icon="i-heroicons-plus" title="+" @click="zoomIn" />
          <div class="divider-hor"></div>
          <GvButton type="button" unstyled chromeless square class="zoom-btn" icon="i-heroicons-minus" title="-" @click="zoomOut" />
          <div class="divider-hor"></div>
          <GvButton type="button" unstyled chromeless square class="zoom-btn" icon="i-heroicons-arrows-right-left" :title="t.reset" @click="zoomFit" />
        </div>
      </div>

      <aside
        v-if="!pending && graphData?.nodes?.length"
        class="graph-stats-panel kg-glass-surface"
        :class="{ 'graph-stats-panel--collapsed': isStatsCollapsed }"
        :aria-label="t.statsTitle"
      >
        <button
          type="button"
          class="graph-stats-toggle"
          :aria-expanded="!isStatsCollapsed"
          :title="isStatsCollapsed ? t.statsExpand : t.statsCollapse"
          @click="isStatsCollapsed = !isStatsCollapsed"
        >
          <span class="graph-stats-heading">{{ t.statsTitle }}</span>
          <UIcon
            :name="isStatsCollapsed ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="graph-stats-chevron"
            aria-hidden="true"
          />
        </button>
        <div v-show="!isStatsCollapsed" class="graph-stats-body">
          <div class="graph-stats-summary">
            <div class="graph-stats-pill">
              <span class="graph-stats-pill-label">{{ t.statsNodes }}</span>
              <span class="graph-stats-pill-value tabular-nums">{{ visibleGraphStats.nodesTotal }}</span>
            </div>
            <div class="graph-stats-pill">
              <span class="graph-stats-pill-label">{{ t.statsLinks }}</span>
              <span class="graph-stats-pill-value tabular-nums">{{ visibleGraphStats.linksTotal }}</span>
            </div>
          </div>
          <div class="graph-stats-section">{{ t.statsByType }}</div>
          <ul class="graph-stats-list" role="list">
            <li v-for="row in statsTypeRows" :key="row.key" class="graph-stats-line" role="listitem">
              <span class="graph-stats-line-left">
                <span class="dot" :class="row.dotClass" aria-hidden="true" />
                <span>{{ row.label }}</span>
              </span>
              <span class="tabular-nums graph-stats-count">{{ row.count }}</span>
            </li>
          </ul>
          <template v-if="statsLinkRows.length">
            <div class="graph-stats-section">{{ t.statsLinkTypes }}</div>
            <ul class="graph-stats-list graph-stats-list--compact" role="list">
              <li v-for="row in statsLinkRows" :key="row.key" class="graph-stats-line" role="listitem">
                <span class="graph-stats-link-label">{{ row.label }}</span>
                <span class="tabular-nums graph-stats-count">{{ row.count }}</span>
              </li>
            </ul>
          </template>
        </div>
      </aside>

      <!-- Node detail: как theTermPopover для терминов + адаптив -->
      <transition name="pop">
        <div
          v-if="selectedNode && !nodePopupPanelClosed"
          class="graph-popup graph-popup-node"
          :class="{ 'graph-popup--mobile': isMobileChrome }"
          :style="nodePopupStyle"
          :aria-busy="selectedNode.type === 'term' && termPopupLoading"
          @mousedown.stop
          @wheel.stop
          @mousewheel.stop
        >
          <div class="graph-popup__top">
            <div class="graph-popup__head">
              <UIcon
                :name="getNodeIcon(selectedNode)"
                :style="{ color: getNodeColor(selectedNode) }"
                class="graph-popup__head-icon"
              />
              <span class="graph-popup__type-label">{{ getTypeLabel(selectedNode.type) }}</span>
            </div>
            <GvButton
              type="button"
              unstyled
              chromeless
              square
              class="action-btn graph-popup__close"
              icon="i-heroicons-x-mark"
              :title="t.popupClose"
              :aria-label="t.popupClose"
              @click="closeNodePopupPanel"
            />
          </div>

          <template v-if="selectedNode.type === 'term' && termPopupLoading">
            <div class="graph-popup__title-text graph-popup__title-text--loading-preview">
              {{ selectedNode.title }}
            </div>
            <div class="graph-popup__skeleton" aria-hidden="true">
              <div class="graph-popup__sk-line graph-popup__sk-line--sm" />
              <div class="graph-popup__sk-line graph-popup__sk-line--lg" />
              <div class="graph-popup__sk-media" />
              <div class="graph-popup__sk-chips">
                <span class="graph-popup__sk-chip" />
                <span class="graph-popup__sk-chip" />
                <span class="graph-popup__sk-chip" />
              </div>
              <div class="graph-popup__sk-line" />
              <div class="graph-popup__sk-line" />
              <div class="graph-popup__sk-line graph-popup__sk-line--md" />
            </div>
          </template>
          <template v-else-if="selectedNode.type === 'term'">
            <div
              v-if="termPopupDetail?.category_title"
              class="graph-popup__category"
              :style="termPopupDetail.category_color ? { color: termPopupDetail.category_color } : {}"
            >
              <UIcon
                v-if="termPopupDetail.category_icon"
                :name="termPopupDetail.category_icon"
                class="graph-popup__cat-icon"
              />
              {{ termPopupDetail.category_title }}
            </div>
            <div class="graph-popup__title-text">{{ termPopupDetail?.title || selectedNode.title }}</div>
            <div v-if="termPopupDetail?.image_url || termPopupDetail?.video_url" class="graph-popup__media">
              <img
                v-if="termPopupDetail.image_url"
                :src="termPopupDetail.image_url"
                class="graph-popup__media-preview"
                alt=""
              >
              <video
                v-else-if="termPopupDetail.video_url"
                :src="termPopupDetail.video_url"
                class="graph-popup__media-preview"
                muted
                autoplay
                loop
                playsinline
              />
            </div>
            <div v-if="termPopupDetail?.aliases?.length" class="graph-popup__aliases">
              <span
                v-for="alias in termPopupDetail.aliases.slice(0, 3)"
                :key="alias"
                class="graph-popup__alias-chip"
              >{{ alias }}</span>
            </div>
            <p
              v-if="termPopupDetail?.definition || selectedNode.description"
              class="graph-popup__definition"
            >{{ termPopupDetail?.definition || selectedNode.description }}</p>
          </template>
          <template v-else>
            <div class="graph-popup__title-text">{{ selectedNode.title }}</div>
            <p v-if="selectedNode.description" class="graph-popup__definition">{{ selectedNode.description }}</p>
          </template>

          <div class="graph-popup__footer">
            <span
              v-if="selectedNode.type === 'term' && termPopupLoading"
              class="graph-popup__loading graph-popup__loading--footer"
            >
              <UIcon name="i-heroicons-arrow-path" class="graph-popup__spin" />
              {{ t.loadingDetail }}
            </span>
            <NuxtLink
              v-if="enableNavigation && selectedNodePath"
              :to="selectedNodePath"
              class="graph-popup__link"
              @click.stop
            >{{ t.openEntity }}</NuxtLink>
          </div>
        </div>
      </transition>

      <!-- Link popup -->
      <transition name="pop">
        <div
          v-if="selectedLink && !linkPopupPanelClosed"
          class="graph-popup link-popup graph-popup-link"
          :class="{ 'graph-popup--mobile': isMobileChrome }"
          :style="linkPopupStyle"
          @mousedown.stop
          @wheel.stop
          @mousewheel.stop
        >
          <div class="link-popup-accent" :style="{
            borderColor: getNodeColor(getLinkHierarchy(selectedLink).child),
            borderLeftStyle: getLinkHierarchy(selectedLink).parent.type === 'category' ? 'dashed' : 'solid'
          }"></div>

          <div class="graph-popup__top graph-popup__top--link">
            <div class="graph-popup__head">
              <span class="tooltip-type">{{ relLabels[selectedLink.type] || 'Relationship' }}</span>
            </div>
            <GvButton
              type="button"
              unstyled
              chromeless
              square
              class="action-btn graph-popup__close"
              icon="i-heroicons-x-mark"
              :title="t.popupClose"
              :aria-label="t.popupClose"
              @click="closeLinkPopupPanel"
            />
          </div>

          <div class="link-hierarchy">
            <div class="hierarchy-item parent">
              <UIcon :name="getNodeIcon(getLinkHierarchy(selectedLink).parent)" class="h-icon opacity-50" />
              <div class="h-info">
                <span class="h-label">{{ t.context }}</span>
                <span class="h-name">{{ getLinkHierarchy(selectedLink).parent.title }}</span>
              </div>
            </div>

            <div class="hierarchy-separator">
              <div class="sep-line" :style="{ background: getNodeColor(getLinkHierarchy(selectedLink).child) }"></div>
            </div>

            <div class="hierarchy-item child">
              <UIcon :name="getNodeIcon(getLinkHierarchy(selectedLink).child)" class="h-icon"
                :style="{ color: getNodeColor(getLinkHierarchy(selectedLink).child) }" />
              <div class="h-info">
                <span class="h-label">{{ t.object }}</span>
                <span class="h-name" :style="{ color: getNodeColor(getLinkHierarchy(selectedLink).child) }">
                  {{ getLinkHierarchy(selectedLink).child.title }}
                </span>
              </div>
            </div>
          </div>

          <p class="link-description">{{ relDescriptions[selectedLink.type] || 'Description' }}</p>
          <p
            v-if="mentionCountForSelectedLink != null"
            class="link-mentions"
          >
            {{ t.mentions }}: <strong class="tabular-nums">{{ mentionCountForSelectedLink }}</strong>
          </p>
        </div>
      </transition>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3'
import { useMediaQuery } from '@vueuse/core'
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
const graphViewport = ref<HTMLElement | null>(null)
const graphContainer = ref<HTMLElement | null>(null)
const svgRef = ref<SVGElement | null>(null)

const uiDict: Record<string, any> = {
  en: {
    title: 'Gativus Knowledge Graph',
    subtitle: 'Ontology visualization: categories, articles, and terms',
    search: 'Search...',
    loading: 'Loading graph...',
    empty: 'Graph is empty. Add categories and link them to articles.',
    filters: 'Filtering',
    all: 'All',
    none: 'None',
    reset: 'Reset scale',
    hint: 'Click to open →',
    mentions: 'Occurrences in article text',
    context: 'Context',
    object: 'Object',
    book: 'Books',
    category: 'Categories',
    article: 'Articles',
    term: 'Terms',
    graphHeroTitle: 'Knowledge graph',
    statsTitle: 'Overview',
    statsNodes: 'Nodes',
    statsLinks: 'Links',
    statsByType: 'By type',
    statsLinkTypes: 'Link types',
    statsExpand: 'Expand summary',
    statsCollapse: 'Collapse summary',
    toolbarExpand: 'Open toolbar',
    toolbarCollapse: 'Collapse toolbar',
    toolbarCompactLabel: 'Graph panel',
    popupClose: 'Close',
    openEntity: 'Open page →',
    loadingDetail: 'Loading...',
  },
  ru: {
    title: 'Граф знаний Gativus',
    subtitle: 'Визуализация онтологии: категории, статьи и термины',
    search: 'Поиск...',
    loading: 'Загрузка графа...',
    empty: 'Граф пуст. Добавьте категории и свяжите их со статьями.',
    filters: 'Фильтрация',
    all: 'Все',
    none: 'Ничего',
    reset: 'Сбросить масштаб',
    hint: 'Нажмите, чтобы открыть →',
    mentions: 'Вхождений в тексте статьи',
    context: 'Контекст',
    object: 'Объект',
    book: 'Книги',
    category: 'Категории',
    article: 'Статьи',
    term: 'Термины',
    graphHeroTitle: 'Граф знаний',
    statsTitle: 'Сводка',
    statsNodes: 'Узлы',
    statsLinks: 'Связи',
    statsByType: 'По типам',
    statsLinkTypes: 'Типы связей',
    statsExpand: 'Развернуть сводку',
    statsCollapse: 'Свернуть сводку',
    toolbarExpand: 'Открыть панель',
    toolbarCollapse: 'Свернуть панель',
    toolbarCompactLabel: 'Граф',
    popupClose: 'Закрыть',
    openEntity: 'Открыть страницу →',
    loadingDetail: 'Загрузка...',
  },
  zh: {
    title: 'Gativus 知识图谱',
    subtitle: '本体可视化：类别、文章和术语',
    search: '搜索...',
    loading: '正在加载图谱...',
    empty: '图谱为空。添加类别并将它们链接到文章。',
    filters: '过滤',
    all: '全部',
    none: '无',
    reset: '重置缩放',
    hint: '点击打开 →',
    mentions: '文章正文中的出现次数',
    context: '上下文',
    object: '对象',
    book: '书籍',
    category: '类别',
    article: '文章',
    term: '术语',
    graphHeroTitle: '知识图谱',
    statsTitle: '概览',
    statsNodes: '节点',
    statsLinks: '关系',
    statsByType: '按类型',
    statsLinkTypes: '关系类型',
    statsExpand: '展开概览',
    statsCollapse: '收起概览',
    toolbarExpand: '展开工具栏',
    toolbarCollapse: '收起工具栏',
    toolbarCompactLabel: '图谱',
    popupClose: '关闭',
    openEntity: '打开页面 →',
    loadingDetail: '加载中...',
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const isMobileChrome = useMediaQuery('(max-width: 640px)')
const isMobileToolbarExpanded = ref(false)

/** На мобиле по умолчанию компактная панель; на десктопе всегда полная */
const graphActionsMobileCompact = computed(
  () => Boolean(isMobileChrome.value && !isMobileToolbarExpanded.value),
)

watch(isMobileChrome, (mobile) => {
  if (!mobile)
    isMobileToolbarExpanded.value = false
})

const mentionCountForSelectedLink = computed(() => {
  const l = selectedLink.value
  if (!l || (l.type !== 'mention' && l.type !== 'reference')) return null
  const n = l.mentionCount
  if (n == null || Number.isNaN(Number(n))) return null
  return Math.max(1, Math.floor(Number(n)))
})

const filterLabels = computed(() => ({
  book: t.value.book,
  category: t.value.category,
  article: t.value.article,
  term: t.value.term
}))

const props = withDefaults(
  defineProps<{
    graphData: any
    pending?: boolean
    enableNavigation?: boolean
    /** Встроенная страница: без рамки/тени у области графа (слитно с фоном лейаута) */
    frameless?: boolean
  }>(),
  { pending: false, frameless: false },
)

watch(() => props.graphData, () => {
  nextTick(() => initGraph())
})

const selectedNode = ref<any>(null)
const selectedLink = ref<any>(null)
const nodePopupPanelClosed = ref(false)
const linkPopupPanelClosed = ref(false)
const termPopupDetail = ref<any>(null)
const termPopupLoading = ref(false)
const hoveredNode = ref<any>(null)
const hoveredLink = ref<any>(null)
const currentTransform = ref(d3.zoomIdentity)
const simulationTick = ref(0) // Added for simulation reactivity
const searchQuery = ref('')
const activeFilters = ref({
  book: true,
  category: true,
  article: true,
  term: true
})

const isFullscreen = ref(false)
const isStatsCollapsed = ref(false)
const isFilterMenuOpen = ref(false)

watch(isMobileToolbarExpanded, (open) => {
  if (!open)
    isFilterMenuOpen.value = false
})

const ontologyLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }

/**
 * Returns parent and child nodes for a link based on ontology levels.
 */
const getLinkHierarchy = (link: any) => {
  const sLevel = ontologyLevels[link.source.type] ?? 99
  const tLevel = ontologyLevels[link.target.type] ?? 99

  if (sLevel < tLevel) {
    return { parent: link.source, child: link.target }
  } else if (sLevel > tLevel) {
    return { parent: link.target, child: link.source }
  } else {
    // For same-level nodes (Category -> Category)
    // Source is the sub-entity (child), Target is the parent entity.
    return { parent: link.target, child: link.source }
  }
}

const getNeighbors = (node: any) => {
  if (!node || !props.graphData?.links) return []
  return props.graphData.links.reduce((acc: any[], link: any) => {
    const sId = typeof link.source === 'object' ? link.source.id : link.source
    const tId = typeof link.target === 'object' ? link.target.id : link.target
    if (sId === node.id) acc.push(tId)
    else if (tId === node.id) acc.push(sId)
    return acc
  }, [node.id])
}

const normalizeLinkEndpointId = (endpoint: any) => typeof endpoint === 'object' ? endpoint.id : endpoint
const isSameLink = (a: any, b: any) => {
  if (!a || !b) return false
  const aSource = normalizeLinkEndpointId(a.source)
  const aTarget = normalizeLinkEndpointId(a.target)
  const bSource = normalizeLinkEndpointId(b.source)
  const bTarget = normalizeLinkEndpointId(b.target)
  return (
    a.type === b.type &&
    ((aSource === bSource && aTarget === bTarget) || (aSource === bTarget && aTarget === bSource))
  )
}

const getLinkBaseWidth = (link: any) => {
  const typeLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }
  const sLevel = typeLevels[link.source.type] ?? 99
  const tLevel = typeLevels[link.target.type] ?? 99
  const parent = sLevel <= tLevel ? link.source : link.target
  const child = sLevel > tLevel ? link.source : link.target
  if (parent.type === 'book') return 2.5
  if (parent.type === 'category' && child.type === 'category') return 1.5
  return 1
}

const updateHighlights = () => {
  if (!svgRef.value) return

  const focusNode = hoveredNode.value || selectedNode.value
  const focusLink = hoveredLink.value || selectedLink.value
  const neighbors = focusNode ? getNeighbors(focusNode) : null
  const linkEndpointIds = focusLink
    ? [normalizeLinkEndpointId(focusLink.source), normalizeLinkEndpointId(focusLink.target)]
    : null

  // 1. Update Nodes
  d3.selectAll('.node-group')
    .style('opacity', (n: any) => {
      if (focusLink && linkEndpointIds) {
        return linkEndpointIds.includes(n.id) ? 1 : 0.08
      }
      // If we have a focus node (hover or selected), show neighbors
      if (focusNode) {
        const isNeighbor = neighbors?.includes(n.id)
        return isNeighbor ? 1 : 0.05
      }
      // If no focus, the graph stays fully visible (even if searching, unless we found a unique node)
      return 1
    })

  // 2. Update Links
  d3.selectAll('.visual-link')
    .style('opacity', (l: any) => {
      if (focusLink) {
        return isSameLink(l, focusLink) ? 1 : 0.05
      }
      if (focusNode) {
        const isConnected = l.source.id === focusNode.id || l.target.id === focusNode.id
        return isConnected ? 1 : 0.02
      }
      return 0.4
    })
    .attr('stroke-width', (l: any) => {
      const baseWidth = getLinkBaseWidth(l)
      if (focusLink && isSameLink(l, focusLink)) return baseWidth * 2
      return baseWidth
    })
}

// Manifest CSS cubic-bezier(0.705, 0.010, 0.000, 0.915) approximation for D3
// This is a "slow build-up, fast middle, very slow finish" type of curve
const designSystemEase = (t: number) => {
  // Cubic Bezier approximation formula
  // For (0.705, 0.01, 0, 0.915)
  const x1 = 0.705, y1 = 0.01, x2 = 0, y2 = 0.915
  // Since x2 is 0 and x1 is large, it's a very specific curve.
  // Let's use a simpler power-based approximation that feels similar:
  // It starts slow and peaks late.
  return Math.pow(t, 2.5) * (1.5 - 0.5 * t) // Roughly approximates the feel
}

// Auto-reset highlights when selection is cleared, but DON'T clear search query
watch(selectedNode, (newVal) => {
  if (!newVal && !selectedLink.value) {
    updateHighlights()
  }
})

watch(() => langStore.currentLang, async () => {
  selectedNode.value = null
  selectedLink.value = null
  hoveredNode.value = null
  hoveredLink.value = null
  isFilterMenuOpen.value = false
  await nextTick()
  initGraph()
  updateHighlights()
})

const selectedNodePath = computed(() => {
  const node = selectedNode.value
  if (!node?.slug) return null
  if (node.type === 'term') return `/glossary/${node.slug}`
  if (node.type === 'article') return `/articles/${node.slug}`
  if (node.type === 'book') return `/books/${node.slug}`
  if (node.type === 'category') return `/categories/${node.slug}`
  return null
})

const closeNodePopupPanel = (e?: MouseEvent) => {
  e?.stopPropagation()
  nodePopupPanelClosed.value = true
}

const closeLinkPopupPanel = (e?: MouseEvent) => {
  e?.stopPropagation()
  linkPopupPanelClosed.value = true
}

watch([selectedNode, () => langStore.currentLang], async ([node]) => {
  termPopupDetail.value = null
  if (!process.client || !node || node.type !== 'term' || !node.slug) {
    termPopupLoading.value = false
    return
  }
  termPopupLoading.value = true
  try {
    termPopupDetail.value = await $fetch(`/api/terms/${encodeURIComponent(node.slug)}`, {
      query: { lang: langStore.currentLang },
    })
  }
  catch {
    termPopupDetail.value = null
  }
  finally {
    termPopupLoading.value = false
  }
}, { immediate: true })

const nodePopupStyle = computed(() => {
  if (!selectedNode.value || isMobileChrome.value) return {}
  const x = currentTransform.value.applyX(selectedNode.value.x)
  const y = currentTransform.value.applyY(selectedNode.value.y)
  return {
    left: `${x + 15}px`,
    top: `${y + 15}px`
  }
})

const linkPopupStyle = computed(() => {
  if (!selectedLink.value || isMobileChrome.value) return {}
  const source = selectedLink.value.source
  const target = selectedLink.value.target
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2
  const x = currentTransform.value.applyX(midX)
  const y = currentTransform.value.applyY(midY)
  return {
    left: `${x}px`,
    top: `${y}px`
  }
})

/** Удерживаем попап в пересечении .graph-viewport с видимой областью окна (прокрутка страницы, dynamic toolbar). */
let graphPopupClampRaf = 0

/** Под узлом / связью → при нехватке места сверху → иначе снова снизу у якоря (как theTermPopover). */
function pickPreferredPopupTopHost(
  popup: HTMLElement,
  host: HTMLElement,
  anchorYHost: number,
  offsetBelow: number,
): number {
  const pad = 8
  const hr = host.getBoundingClientRect()
  const anchorClientY = hr.top + anchorYHost
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  const winTop = vv?.offsetTop ?? 0
  const winH = vv?.height ?? window.innerHeight
  const screenTop = winTop + pad
  const screenBottom = winTop + winH - pad

  const topBelowHost = anchorYHost + offsetBelow
  const belowTopClient = hr.top + topBelowHost

  popup.style.maxHeight = ''
  popup.style.overflowY = ''
  popup.style.top = `${topBelowHost}px`
  void popup.offsetHeight
  const h = popup.getBoundingClientRect().height

  const spaceBelow = screenBottom - belowTopClient
  const spaceAbove = anchorClientY - pad - screenTop

  if (h <= spaceBelow) return topBelowHost
  if (h <= spaceAbove) return (anchorClientY - pad - h) - hr.top
  return topBelowHost
}

function clampPopupInHost(popup: HTMLElement, host: HTMLElement, left: number, top: number) {
  const pad = 8
  popup.style.maxHeight = ''
  popup.style.overflowY = ''
  const c = host.getBoundingClientRect()
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  const winW = vv?.width ?? window.innerWidth
  const winH = vv?.height ?? window.innerHeight
  const winLeft = vv?.offsetLeft ?? 0
  const winTop = vv?.offsetTop ?? 0

  const screenLeft = winLeft + pad
  const screenTop = winTop + pad
  const screenRight = winLeft + winW - pad
  const screenBottom = winTop + winH - pad

  const boundLeft = Math.max(c.left + pad, screenLeft)
  const boundTop = Math.max(c.top + pad, screenTop)
  const boundRight = Math.min(c.right - pad, screenRight)
  const boundBottom = Math.min(c.bottom - pad, screenBottom)

  let l = left
  let t = top

  const apply = () => {
    popup.style.left = `${l}px`
    popup.style.top = `${t}px`
  }

  apply()
  let r = popup.getBoundingClientRect()

  // Нет пересечения хоста с экраном — центрируем в видимой области
  if (boundRight <= boundLeft || boundBottom <= boundTop) {
    l += screenLeft + Math.max(0, (winW - 2 * pad - r.width) / 2) - r.left
    t += screenTop + Math.max(0, (winH - 2 * pad - r.height) / 2) - r.top
    apply()
    r = popup.getBoundingClientRect()
  } else {
    const spanX = boundRight - boundLeft
    const spanY = boundBottom - boundTop

    if (r.width <= spanX) {
      if (r.left < boundLeft) l += boundLeft - r.left
      apply()
      r = popup.getBoundingClientRect()
      if (r.right > boundRight) l -= r.right - boundRight
    } else {
      l += boundLeft - r.left
    }

    apply()
    r = popup.getBoundingClientRect()

    if (r.height <= spanY) {
      if (r.top < boundTop) t += boundTop - r.top
      apply()
      r = popup.getBoundingClientRect()
      if (r.bottom > boundBottom) t -= r.bottom - boundBottom
    }
    else {
      const capY = Math.max(1, Math.floor(spanY))
      popup.style.maxHeight = `${capY}px`
      popup.style.overflowY = 'auto'
      apply()
      r = popup.getBoundingClientRect()
      if (r.top < boundTop) t += boundTop - r.top
      apply()
      r = popup.getBoundingClientRect()
      if (r.bottom > boundBottom) t -= r.bottom - boundBottom
    }

    apply()
  }

  // Финально не даём уйти за пределы экрана (погрешность; попап шире/выше коридора)
  for (let pass = 0; pass < 6; pass++) {
    r = popup.getBoundingClientRect()
    let moved = false
    if (r.left < screenLeft) {
      l += screenLeft - r.left
      moved = true
    }
    if (r.right > screenRight) {
      l -= r.right - screenRight
      moved = true
    }
    if (r.top < screenTop) {
      t += screenTop - r.top
      moved = true
    }
    if (r.bottom > screenBottom) {
      t -= r.bottom - screenBottom
      moved = true
    }
    apply()
    if (!moved) break
  }
}

function applyGraphPopupClamp() {
  if (!process.client || isMobileChrome.value) return
  const host = graphViewport.value
  if (!host || !currentTransform.value) return

  if (selectedNode.value && !nodePopupPanelClosed.value) {
    const el = document.querySelector('.graph-popup-node') as HTMLElement | null
    if (el) {
      const nx = currentTransform.value.applyX(selectedNode.value.x)
      const ny = currentTransform.value.applyY(selectedNode.value.y)
      const off = 15
      const left = nx + off
      const topPref = pickPreferredPopupTopHost(el, host, ny, off)
      clampPopupInHost(el, host, left, topPref)
    }
  }

  if (selectedLink.value && !linkPopupPanelClosed.value) {
    const el = document.querySelector('.graph-popup-link') as HTMLElement | null
    if (el) {
      const s = selectedLink.value.source
      const tN = selectedLink.value.target
      const midX = (s.x + tN.x) / 2
      const midY = (s.y + tN.y) / 2
      const hx = currentTransform.value.applyX(midX)
      const hy = currentTransform.value.applyY(midY)
      const off = 8
      const left = hx
      const topPref = pickPreferredPopupTopHost(el, host, hy, off)
      clampPopupInHost(el, host, left, topPref)
    }
  }
}

function requestGraphPopupClamp() {
  if (!process.client || isMobileChrome.value) return
  if (graphPopupClampRaf) cancelAnimationFrame(graphPopupClampRaf)
  graphPopupClampRaf = requestAnimationFrame(() => {
    graphPopupClampRaf = 0
    applyGraphPopupClamp()
  })
}

watch(
  [
    termPopupLoading,
    termPopupDetail,
    selectedNode,
    selectedLink,
    nodePopupPanelClosed,
    linkPopupPanelClosed,
  ],
  () => {
    nextTick(() => requestGraphPopupClamp())
  },
)

const setAllFilters = (value: boolean) => {
  activeFilters.value = {
    book: value,
    category: value,
    article: value,
    term: value
  }
}

const toggleFullscreen = () => {
  if (!graphViewport.value) return
  if (!document.fullscreenElement) {
    graphViewport.value.requestFullscreen().then(() => {
      isFullscreen.value = true
    })
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const handleSearch = () => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    selectedNode.value = null
    zoomFit()
    updateHighlights()
    return
  }

  const matches = props.graphData?.nodes?.filter((n: any) =>
    n.title.toLowerCase().includes(query) || (n.slug && n.slug.toLowerCase() === query),
  ) || []

  // Одинаковые названия у разных типов: приоритет выше по иерархии (category → book → article → term),
  // плюс точное совпадение slug / заголовка важнее частичного.
  const typeRank = (n: any) => ontologyLevels[n.type as keyof typeof ontologyLevels] ?? 99
  const slugExact = (n: any) => (n.slug && String(n.slug).toLowerCase() === query) ? 0 : 1
  const titleExact = (n: any) => (n.title && String(n.title).toLowerCase() === query) ? 0 : 1

  matches.sort((a, b) => {
    const dSlug = slugExact(a) - slugExact(b)
    if (dSlug !== 0) return dSlug
    const dTitle = titleExact(a) - titleExact(b)
    if (dTitle !== 0) return dTitle
    return typeRank(a) - typeRank(b)
  })

  if (matches.length >= 1) {
    const best = matches[0]
    if (selectedNode.value?.id !== best.id) {
      focusOnNode(best)
    } else {
      updateHighlights()
    }
  } else {
    updateHighlights()
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  selectedNode.value = null
  zoomFit()
  updateHighlights()
}

const focusOnNode = (nodeData: any) => {
  if (!svgRef.value || !zoomHandler || !graphContainer.value) return
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight

  // Find the existing node object in simulation
  const target = simulation.nodes().find((n: any) => n.id === nodeData.id)
  if (!target) return

  nodePopupPanelClosed.value = false
  selectedNode.value = target
  updateHighlights()

  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(1.5)
    .translate(-target.x, -target.y)

  d3.select(svgRef.value).transition().duration(750)
    .on('end', () => updateHighlights()) // Ensure final state is correct
    .call(zoomHandler.transform, transform)
}

const relLabels = computed<Record<string, string>>(() => {
  if (langStore.currentLang === 'ru') {
    return {
      belongs_to_category: 'Категория',
      part_of_book: 'Состав книги',
      part_of_article: 'Раскрытие термина',
      reference: 'Перекрестная ссылка',
      mention: 'Упоминание',
    }
  }
  if (langStore.currentLang === 'zh') {
    return {
      belongs_to_category: '所属分类',
      part_of_book: '书籍内容',
      part_of_article: '术语释义',
      reference: '交叉引用',
      mention: '提及',
    }
  }
  return {
    belongs_to_category: 'Category',
    part_of_book: 'Book Content',
    part_of_article: 'Term Definition',
    reference: 'Cross Reference',
    mention: 'Mention',
  }
})

const relDescriptions = computed<Record<string, string>>(() => {
  if (langStore.currentLang === 'ru') {
    return {
      belongs_to_category: 'Этот элемент классифицирован и относится к данной категории.',
      part_of_book: 'Данная статья является главой или частью этой книги.',
      part_of_article: 'Этот термин подробно раскрывается и поясняется в данной статье.',
      reference: 'Прямая связь или ссылка между двумя терминами в глоссарии.',
      mention: 'Термин упоминается в тексте статьи как ключевое понятие.',
    }
  }
  if (langStore.currentLang === 'zh') {
    return {
      belongs_to_category: '该元素被归类到此类别。',
      part_of_book: '该文章是此书中的章节或部分。',
      part_of_article: '该术语在此文章中有详细解释。',
      reference: '术语之间的直接交叉关联。',
      mention: '该术语在文章中作为关键概念被提及。',
    }
  }
  return {
    belongs_to_category: 'This item is classified under this category.',
    part_of_book: 'This article is a chapter or section of this book.',
    part_of_article: 'This term is explained in detail within this article.',
    reference: 'A direct link or reference between two glossary terms.',
    mention: 'The term is mentioned as a key concept in the article text.',
  }
})

type VisibleGraphByType = { book: number, category: number, article: number, term: number }

const visibleGraphStats = computed(() => {
  const emptyByType: VisibleGraphByType = { book: 0, category: 0, article: 0, term: 0 }
  const data = props.graphData
  if (!data?.nodes?.length) {
    return {
      nodesTotal: 0,
      linksTotal: 0,
      byType: { ...emptyByType },
      linkTypes: {} as Record<string, number>,
    }
  }
  const allNodes = data.nodes as any[]
  const allLinks = (data.links || []) as any[]
  const nodes = allNodes.filter((n: any) => activeFilters.value[n.type as keyof typeof activeFilters.value])
  const nodeIds = new Set(nodes.map((n: any) => n.id))
  const links = allLinks.filter((l: any) => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    return nodeIds.has(sourceId) && nodeIds.has(targetId)
  })
  const byType = { ...emptyByType }
  for (const n of nodes) {
    const ty = n.type as keyof VisibleGraphByType
    if (ty in byType)
      byType[ty]++
  }
  const linkTypes: Record<string, number> = {}
  for (const l of links) {
    const k = typeof l.type === 'string' ? l.type : 'relation'
    linkTypes[k] = (linkTypes[k] || 0) + 1
  }
  return {
    nodesTotal: nodes.length,
    linksTotal: links.length,
    byType,
    linkTypes,
  }
})

const statsTypeRows = computed(() => {
  const s = visibleGraphStats.value
  const labels = filterLabels.value
  const order: Array<keyof VisibleGraphByType> = ['category', 'book', 'article', 'term']
  const dotMap: Record<keyof VisibleGraphByType, string> = {
    category: 'dot-cat-red',
    book: 'dot-book',
    article: 'dot-art',
    term: 'dot-term',
  }
  return order.map(key => ({
    key,
    label: labels[key],
    count: s.byType[key],
    dotClass: dotMap[key],
  }))
})

const statsLinkRows = computed(() => {
  const s = visibleGraphStats.value
  const labels = relLabels.value
  return Object.entries(s.linkTypes)
    .map(([key, count]) => ({ key, label: labels[key] || key, count }))
    .sort((a, b) => b.count - a.count)
})

let simulation: any = null
let zoomHandler: any = null

const zoomIn = () => {
  if (!svgRef.value || !zoomHandler) return
  d3.select(svgRef.value).transition().duration(350).call(zoomHandler.scaleBy, 1.5)
}

const zoomOut = () => {
  if (!svgRef.value || !zoomHandler) return
  d3.select(svgRef.value).transition().duration(350).call(zoomHandler.scaleBy, 0.7)
}

const zoomFit = () => {
  if (!svgRef.value || !zoomHandler || !graphContainer.value) return
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight
  d3.select(svgRef.value).transition().duration(350)
    .call(zoomHandler.transform, d3.zoomIdentity.translate(0, 0).scale(1))
}

const getNodeIcon = (node: any) => {
  if (node.type === 'category') return node.icon || 'i-heroicons-folder'
  if (node.type === 'book') return 'i-heroicons-book-open'
  if (node.type === 'article') return 'i-heroicons-document-text'
  return 'i-heroicons-document-magnifying-glass'
}

const getNodeColor = (node: any) => {
  if (!node) return '#94a3b8'

  // 1. Determine type (from property or ID fallback)
  let type = node.type || ''
  const id = (typeof node === 'string' ? node : node.id) || ''

  if (!type && id) {
    if (id.startsWith('cat-')) type = 'category'
    else if (id.startsWith('art-')) type = 'article'
    else if (id.startsWith('term-')) type = 'term'
    else if (id.startsWith('book-')) type = 'book'
  }

  // 2. Map to manifest colors
  if (type === 'book') return '#0ea5e9'
  if (type === 'article') return '#6366f1'
  if (type === 'category') return '#ef4444' // Force manifest Red for consistency
  if (type === 'term') return '#10b981'

  return '#94a3b8'
}

const getTypeLabel = (type: string) => {
  const dict: any = {
    en: { book: 'Book', article: 'Article', category: 'Category', term: 'Term' },
    ru: { book: 'Книга', article: 'Статья', category: 'Категория', term: 'Термин' },
    zh: { book: '书籍', article: '文章', category: '类别', term: '术语' }
  }
  const currentDict = dict[langStore.currentLang] || dict.en
  return currentDict[type] || ''
}

const initGraph = () => {
  if (!process.client || !props.graphData || !svgRef.value || !graphContainer.value) return

  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight
  const svg = d3.select(svgRef.value)
    .attr('viewBox', [0, 0, width, height])
    .attr('width', width)
    .attr('height', height)
    .on('mousedown', (event: any) => {
      if (event.target === svgRef.value) {
        selectedNode.value = null
        selectedLink.value = null
        hoveredNode.value = null
        hoveredLink.value = null
        updateHighlights()
      }
    })

  svg.selectAll('*').remove() // Clear previous

  // Premium Elements Definitions
  const defs = svg.append('defs')

  // 1. Gradients
  const createGradient = (id: string, startColor: string, endColor: string) => {
    const grad = defs.append('linearGradient')
      .attr('id', id)
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%')
    grad.append('stop').attr('offset', '0%').attr('stop-color', startColor)
    grad.append('stop').attr('offset', '100%').attr('stop-color', endColor)
  }

  createGradient('grad-book', '#0ea5e9', '#0369a1')      // Sky
  createGradient('grad-category', '#ef4444', '#b91c1c')  // Red (Fixed)
  createGradient('grad-article', '#6366f1', '#4338ca')   // Indigo
  createGradient('grad-term', '#10b981', '#047857')      // Emerald

  const g = svg.append('g')

  // Zoom behavior
  zoomHandler = d3.zoom<SVGElement, unknown>()
    .extent([[0, 0], [width, height]])
    .scaleExtent([0.1, 4])
    .on('zoom', (event: any) => {
      g.attr('transform', event.transform)
      currentTransform.value = event.transform
      requestGraphPopupClamp()
    })

  svg.call(zoomHandler)

  const allNodes = props.graphData.nodes?.map((d: any) => ({ ...d })) || []
  const allLinks = props.graphData.links?.map((d: any) => ({ ...d })) || []

  // Filter based on activeFilters
  const nodes = allNodes.filter((n: any) => activeFilters.value[n.type as keyof typeof activeFilters.value])
  const nodeIds = new Set(nodes.map(n => n.id))
  const links = allLinks.filter((l: any) => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    return nodeIds.has(sourceId) && nodeIds.has(targetId)
  })

  // Hierarchy Y-axis mapping (Categories top, Terms bottom)
  const getYPosition = (type: string) => {
    if (type === 'category') return height * 0.2
    if (type === 'book') return height * 0.4
    if (type === 'article') return height * 0.6
    if (type === 'term') return height * 0.8
    return height / 2
  }

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => (d as any).id).distance(100)) // Reduced from 200 for a tighter look
    .force('charge', d3.forceManyBody().strength(-600)) // Scaled down from -1000 to prevent spreading too far
    // Soft center to keep the graph in view
    .force('center', d3.forceCenter(width / 2, height / 2))
    // X-axis: Weak horizontal pull to allow wide natural spreading
    .force('x', d3.forceX(width / 2).strength(0.03))
    // Y-axis: Semantic clustering based on the Ontology Philosophy hierarchy
    .force('y', d3.forceY((d: any) => getYPosition(d.type)).strength(0.15))

  const link = g.append('g')
    .style('pointer-events', 'none')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'visual-link')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', (d: any) => getLinkBaseWidth(d))
    .attr('stroke-dasharray', (d: any) => {
      const typeLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }
      const sLevel = typeLevels[d.source.type] ?? 99
      const tLevel = typeLevels[d.target.type] ?? 99
      const parent = sLevel <= tLevel ? d.source : d.target

      // If the parent is a category, it's a "virtual" dashed link
      if (parent.type === 'category') return '4,4'
      return 'none'
    })
    .attr('stroke', (d: any) => {
      const typeLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }
      const sLevel = typeLevels[d.source.type] ?? 99
      const tLevel = typeLevels[d.target.type] ?? 99

      // Child (higher level) determines color. If same level, use source.
      const child = sLevel > tLevel ? d.source : d.target

      const colors: Record<string, string> = {
        book: '#0ea5e9',
        article: '#6366f1',
        category: '#ef4444',
        term: '#10b981'
      }

      return colors[child.type] || '#94a3b8'
    })

  // Link Hit-zones (wider invisible lines for easier clicking) - ON TOP
  const linkHitbox = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 15)
    .attr('cursor', 'pointer')
    .on('mouseover', (event: any, d: any) => {
      hoveredLink.value = d
      updateHighlights()
    })
    .on('mouseout', () => {
      hoveredLink.value = null
      updateHighlights()
    })
    .on('click', (event: any, d: any) => {
      selectedNode.value = null
      selectedLink.value = d
      hoveredLink.value = null
      linkPopupPanelClosed.value = false
      updateHighlights()
      event.stopPropagation()
    })

  const node = g.append('g')
    .selectAll('.node-group')
    .data(nodes)
    .join('g')
    .attr('class', 'node-group')
    .style('cursor', 'pointer')
    .on('click', (event: any, d: any) => {
      selectedNode.value = d
      selectedLink.value = null
      hoveredLink.value = null
      nodePopupPanelClosed.value = false
      updateHighlights()
      event.stopPropagation()
    })
    .on('mouseover', function (event: any, d: any) {
      hoveredNode.value = d
      updateHighlights()

      d3.select(this).select('circle')
        .attr('r', (n: any) => {
          let base = 6
          if (n.type === 'book') base = 14
          else if (n.type === 'category') base = Math.max(8, 14 - (n.depth || 0) * 3)
          else if (n.type === 'article') base = 8
          return base * 1.25
        })
        .attr('stroke-width', 3)
        .attr('stroke', '#6366f1')
    })
    .on('mouseleave', function () {
      hoveredNode.value = null
      updateHighlights()

      d3.select(this).select('circle')
        .attr('r', (n: any) => {
          if (n.type === 'book') return 14
          if (n.type === 'category') return Math.max(8, 14 - (n.depth || 0) * 3)
          if (n.type === 'article') return 8
          return 6
        })
        .attr('stroke-width', 2)
        .attr('stroke', 'var(--node-stroke)')
    })

  // Node circles
  node.append('circle')
    .attr('r', (d: any) => {
      if (d.type === 'book') return 14
      if (d.type === 'category') return Math.max(8, 14 - (d.depth || 0) * 3)
      if (d.type === 'article') return 8
      return 6
    })
    .attr('fill', (d: any) => {
      if (d.type === 'book') return 'url(#grad-book)'
      if (d.type === 'category') return 'url(#grad-category)'
      if (d.type === 'article') return 'url(#grad-article)'
      if (d.type === 'term') return 'url(#grad-term)'
      return '#94a3b8'
    })
    .attr('stroke', 'var(--node-stroke)')
    .attr('stroke-width', 2)

  // Node labels
  node.append('text')
    .attr('dy', (d: any) => {
      if (d.type === 'category') {
        const r = Math.max(8, 14 - (d.depth || 0) * 3)
        return -(r + 8)
      }
      return 15
    })
    .attr('text-anchor', 'middle')
    .text((d: any) => d.title)
    .attr('font-size', (d: any) => d.type === 'category' ? '12px' : '10px')
    .attr('font-weight', (d: any) => d.type === 'category' ? '600' : '400')
    .attr('fill', 'currentColor')
    .style('pointer-events', 'none')
    // Replaced slow CSS text-shadow with high-performance SVG halo (Fix for Firefox physics stuttering)
    .attr('stroke', 'var(--text-halo)')
    .attr('stroke-width', 3)
    .style('paint-order', 'stroke fill')

  simulation.on('tick', () => {
    linkHitbox
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    node
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)

    // Позиции попапов: rAF + clamp (тот же путь, что и при zoom)
    requestGraphPopupClamp()
  })

  updateHighlights()
}


let resizeObserver: ResizeObserver | null = null

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  if (target.closest('.graph-popup')) return
  if (target.closest('.graph-actions-container')) return
  if (target.closest('.kg-graph-ui-cluster')) return
  if (target.closest('.graph-stats-panel')) return
  if (target.closest('.node-group')) return
  if (target.tagName.toLowerCase() === 'line') return

  selectedNode.value = null
  selectedLink.value = null
  hoveredNode.value = null
  hoveredLink.value = null
  updateHighlights()
}

const handleWindowClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (isFilterMenuOpen.value && !target.closest('.custom-popover-wrapper')) {
    isFilterMenuOpen.value = false
  }
  handleOutsideClick(event)
}

function onGraphPopupEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (selectedNode.value && !nodePopupPanelClosed.value) {
    nodePopupPanelClosed.value = true
    e.preventDefault()
    return
  }
  if (selectedLink.value && !linkPopupPanelClosed.value) {
    linkPopupPanelClosed.value = true
    e.preventDefault()
  }
}

onMounted(async () => {
  window.addEventListener('click', handleWindowClick)
  window.addEventListener('keydown', onGraphPopupEscape)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  await nextTick()
  initGraph()
  zoomFit()

  if (process.client && graphContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!svgRef.value || !graphContainer.value) return
      const { offsetWidth: w, offsetHeight: h } = graphContainer.value
      d3.select(svgRef.value)
        .attr('viewBox', `0 0 ${w} ${h}`)
        .attr('width', w)
        .attr('height', h)
      // zoom extent тоже обновим
      zoomHandler?.extent([[0, 0], [w, h]])
      // координаты сил не обновляем — они останутся прежними
      nextTick(() => requestGraphPopupClamp())
    })
    resizeObserver.observe(graphContainer.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleWindowClick)
  window.removeEventListener('keydown', onGraphPopupEscape)
  if (graphPopupClampRaf) {
    cancelAnimationFrame(graphPopupClampRaf)
    graphPopupClampRaf = 0
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// Ensure dynamic resizing is captured properly
watch(activeFilters, () => {
  initGraph()
  zoomFit();
}, { deep: true })
</script>


<style scoped>
.knowledge-graph-visualizer {
  --node-stroke: #ffffff;
  --text-halo: rgba(255, 255, 255, 0.95);

  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.graph-viewport {
  flex: 1 1 0;
  position: relative;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.graph-chrome {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.graph-chrome * {
  pointer-events: auto;
}

:deep(.dark) .knowledge-graph-visualizer,
.dark .knowledge-graph-visualizer,
:global(.dark) .knowledge-graph-visualizer {
  --node-stroke: #1a1a1a;
  --text-halo: rgba(26, 26, 26, 0.95);
}



.graph-container {
  flex: 1;
  position: relative;
  background: #ffffff;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  box-shadow: 0 0 1px 1px rgba(119, 119, 119, 0.1);
  overflow: hidden;
  overscroll-behavior: contain;
}

.dark .graph-container {
  background: #1a1a1a;
  border-color: #333333;
}

.graph-container.graph-container--frameless {
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: var(--gv-canvas-gradient);
}

.dark .graph-container.graph-container--frameless {
  border: none;
  background: var(--gv-canvas-gradient);
}

/* Полноэкран — градиент на внешнем viewport, подложка графа прозрачна */
.graph-viewport:fullscreen,
.graph-viewport:-webkit-full-screen {
  background: var(--gv-canvas-gradient) !important;
}

.graph-viewport:fullscreen .graph-container,
.graph-viewport:-webkit-full-screen .graph-container {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.knowledge-graph-visualizer--frameless {
  min-height: 0;
}

/* Общее «стекло» для панелей на графе */
.kg-glass-surface {
  border-radius: var(--gv-radius-container);
  border: 1px solid var(--gv-border-principal);
  box-shadow: var(--gv-shadow-sm);
  background: color-mix(in srgb, var(--gv-surface) 62%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  backdrop-filter: blur(14px) saturate(160%);
}

.dark .kg-glass-surface {
  border-color: var(--gv-border-principal);
  background: color-mix(in srgb, var(--gv-surface) 48%, transparent);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 28px rgba(0, 0, 0, 0.35);
}

/* Зум справа сверху */
.kg-graph-ui-cluster {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.graph-stats-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 40;
  padding: 12px 14px;
  min-width: 200px;
  max-width: min(280px, calc(100vw - 40px));
  pointer-events: auto;
}

.graph-stats-panel--collapsed {
  min-width: auto;
  padding: 10px 12px;
}

.graph-stats-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 0;
  margin: 0 0 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
  border-radius: var(--gv-radius-control, 8px);
}

.graph-stats-toggle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--gv-primary) 55%, transparent);
  outline-offset: 2px;
}

.graph-stats-panel--collapsed .graph-stats-toggle {
  margin-bottom: 0;
}

.graph-stats-heading {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--gv-text-secondary) 78%, transparent);
}

.graph-stats-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.55;
  color: var(--gv-text-secondary);
}

.graph-stats-body .graph-stats-section:first-of-type {
  margin-top: 0;
}

.graph-stats-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.graph-stats-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--gv-radius-container, 12px);
  background: color-mix(in srgb, var(--gv-text-primary) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 80%, transparent);
}

.dark .graph-stats-pill {
  background: color-mix(in srgb, var(--gv-surface-card) 40%, transparent);
}

.graph-stats-pill-label {
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--gv-text-secondary) 85%, transparent);
}

.graph-stats-pill-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.graph-stats-section {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--gv-text-secondary) 72%, transparent);
  margin: 8px 0 6px;
}

.graph-stats-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.graph-stats-list--compact {
  gap: 4px;
}

.graph-stats-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--gv-text-primary);
}

.graph-stats-line-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.graph-stats-line-left .dot {
  flex-shrink: 0;
}

.graph-stats-count {
  font-weight: 600;
  color: color-mix(in srgb, var(--gv-text-secondary) 92%, transparent);
}

.graph-stats-link-label {
  font-size: 11px;
  line-height: 1.25;
  color: var(--gv-text-secondary);
  min-width: 0;
}

/* Toolbar + hero (frameless page) */
.graph-actions-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 0;
}

.graph-actions-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 50;
  width: max-content;
  max-width: calc(100% - 40px);
  padding: 6px;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.graph-actions-container--frameless {
  top: clamp(8px, 1.6dvh, 16px);
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 16px);
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: clamp(10px, 1.8vw, 14px) clamp(18px, 3.2vw, 28px) clamp(8px, 1.2vw, 10px);
}

.graph-actions-container--frameless .graph-actions-toolbar {
  margin-top: 0;
  padding-top: clamp(4px, 0.8vw, 8px);
}

.graph-actions-expanded {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: stretch;
}

.graph-actions-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
}

.graph-actions-compact-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: color-mix(in srgb, var(--gv-text-secondary) 82%, transparent);
  max-width: min(220px, 72vw);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.graph-actions-toolbar-collapse-row {
  flex: 1 0 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

.kg-graph-hero {
  flex-shrink: 0;
}

.kg-graph-headline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  flex-wrap: wrap;
  margin: 0;
  line-height: 1.05;
}

.kg-graph-title {
  font-size: clamp(2.25rem, 5.5vw, 3rem);
  font-weight: 700;
  letter-spacing: 6px;
  line-height: 1;
  color: var(--gv-text-secondary);
}

.kg-graph-brand {
  font-size: clamp(2.25rem, 5.5vw, 3rem);
  font-weight: 700;
  letter-spacing: 6px;
  line-height: 1;
}

.kg-graph-sep {
  width: 1px;
  height: 1em;
  min-height: 1.75rem;
  margin: 0 clamp(12px, 2vw, 18px);
  align-self: center;
  background: color-mix(in srgb, var(--gv-text-secondary) 55%, transparent);
}

.graph-actions-container--frameless .kg-graph-hero {
  padding-bottom: clamp(6px, 1.2vw, 10px);
  margin-bottom: clamp(2px, 0.5vw, 4px);
  border-bottom: 1px solid color-mix(in srgb, var(--gv-border-principal) 65%, transparent);
}

.custom-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  width: 16px;
  height: 16px;
  color: color-mix(in srgb, var(--gv-text-secondary) 62%, transparent);
  pointer-events: none;
}

.custom-search-input {
  background: transparent;
  border: none;
  padding: 8px 32px;
  font-size: 14px;
  width: 200px;
  outline: none;
  color: var(--gv-text-primary);
  transition: width 0.3s ease;
  user-select: text;
}

.dark .custom-search-input {
  color: var(--gv-text-primary);
}

:deep(.clear-search-btn) {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--gv-text-secondary) 62%, transparent);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

:deep(.clear-search-btn:hover) {
  background: color-mix(in srgb, var(--gv-text-primary) 8%, transparent);
  color: var(--gv-danger, #ef4444);
}

.control-divider {
  width: 1px;
  height: 20px;
  background: color-mix(in srgb, var(--gv-border-principal) 85%, transparent);
  margin: 0 8px;
  flex-shrink: 0;
}

.dark .control-divider {
  background: color-mix(in srgb, var(--gv-border-principal) 90%, transparent);
}

:deep(.action-btn) {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: color-mix(in srgb, var(--gv-text-secondary) 88%, transparent);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.705, 0.01, 0, 0.915);
}

:deep(.action-btn:hover),
:deep(.action-btn.active) {
  background: color-mix(in srgb, var(--gv-primary) 14%, transparent);
  color: var(--gv-primary);
}

:deep(.action-btn .gv-btn__label),
:deep(.zoom-btn .gv-btn__label) {
  display: contents;
}

/* Custom Popover */
.custom-popover-wrapper {
  position: relative;
}

.custom-popover-panel {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  width: 220px;
  background: color-mix(in srgb, var(--gv-surface-card) 96%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  padding: 16px;
  box-shadow: var(--gv-shadow-md);
  z-index: 100;
}

@media (max-width: 640px) {
  .custom-popover-panel {
    left: auto;
    right: 0;
    width: 200px;
  }
}

.dark .custom-popover-panel {
  background: color-mix(in srgb, var(--gv-surface-card) 94%, transparent);
  border-color: var(--gv-border-principal);
}

.filter-menu-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: color-mix(in srgb, var(--gv-text-secondary) 72%, transparent);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--gv-border-principal) 70%, transparent);
}

.filter-menu-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}

.filter-label-text {
  font-size: 14px;
  color: var(--gv-text-primary);
  font-weight: 500;
}

.dark .filter-label-text {
  color: var(--gv-text-primary);
}

/* Custom Switch */
.custom-switch {
  width: 36px;
  height: 20px;
  background: #e2e8f0;
  border-radius: 20px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.dark .custom-switch {
  background: #3f3f46;
}

.custom-switch.checked {
  background: var(--gv-primary);
}

.switch-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.custom-switch.checked .switch-handle {
  left: 18px;
}

.filter-menu-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--gv-border-principal) 70%, transparent);
  display: flex;
  gap: 8px;
}

:deep(.footer-btn) {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: color-mix(in srgb, var(--gv-text-secondary) 92%, transparent);
  transition: background 0.2s;
}

:deep(.footer-btn:hover) {
  background: color-mix(in srgb, var(--gv-text-primary) 6%, transparent);
}

:deep(.footer-btn.primary) {
  color: var(--gv-primary);
}

:deep(.footer-btn .gv-btn__label) {
  display: contents;
}

/* Zoom — оболочка .kg-glass-surface на элементе */
.custom-zoom-controls {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  padding: 4px;
}

:deep(.zoom-btn) {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: color-mix(in srgb, var(--gv-text-secondary) 88%, transparent);
  cursor: pointer;
  transition: all 0.2s;
}

:deep(.zoom-btn:hover) {
  background: color-mix(in srgb, var(--gv-primary) 14%, transparent);
  color: var(--gv-primary);
}

.divider-hor {
  height: 1px;
  width: 24px;
  background: color-mix(in srgb, var(--gv-border-principal) 85%, transparent);
  margin: 4px auto;
}

.dark .divider-hor {
  background: color-mix(in srgb, var(--gv-border-principal) 90%, transparent);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-book {
  background: linear-gradient(135deg, #0ea5e9, #0369a1);
}

.dot-cat-red {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
}

.dot-art {
  background: linear-gradient(135deg, #6366f1, #4338ca);
}

.dot-term {
  background: linear-gradient(135deg, #10b981, #047857);
}

/* Base Overlays */
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 60;
  background: color-mix(in srgb, var(--gv-surface) 78%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.dark .loading-overlay {
  background: color-mix(in srgb, var(--gv-surface) 55%, transparent);
}

.empty-state-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 55;
  color: color-mix(in srgb, var(--gv-text-secondary) 88%, transparent);
  font-size: 14px;
}

/* Base SVG Styles (GPU Accelerated) */
:deep(.node-group) {
  /* transitions removed from the group level to avoid opacity lag */
}

:deep(.visual-link) {
  /* transitions removed for links focus to prevent stuttering */
}

:deep(.node-group circle) {
  transition: r 0.25s cubic-bezier(0.705, 0.010, 0.000, 0.915),
    stroke-width 0.25s cubic-bezier(0.705, 0.010, 0.000, 0.915),
    stroke 0.25s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

/* Language Switcher */
.lang-switcher {
  display: flex;
  align-items: center;
  background: color-mix(in srgb, var(--gv-text-primary) 5%, transparent);
  border-radius: 10px;
  padding: 4px;
  margin: 0 4px;
  gap: 2px;
}

.dark .lang-switcher {
  background: color-mix(in srgb, var(--gv-surface-card) 45%, transparent);
}

:deep(.lang-btn) {
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 8px 14px;
  min-height: 34px;
  min-width: 2.75rem;
  border-radius: 8px;
  cursor: pointer;
  color: color-mix(in srgb, var(--gv-text-secondary) 88%, transparent);
  transition: all 0.2s;
}

:deep(.lang-btn.gv-btn--chromeless) {
  padding: 8px 14px !important;
  min-height: 34px !important;
  min-width: 2.75rem !important;
}

:deep(.lang-btn.active) {
  background: var(--gv-surface-card);
  color: var(--gv-primary);
  box-shadow: var(--gv-shadow-sm);
}

.dark :deep(.lang-btn.active) {
  background: color-mix(in srgb, var(--gv-surface-card) 95%, transparent);
  color: var(--gv-primary);
}

:deep(.lang-btn .gv-btn__label) {
  display: contents;
}

.lang-sep {
  width: 1px;
  height: 14px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--gv-border-principal) 85%, transparent);
}

.dark .lang-sep {
  background: color-mix(in srgb, var(--gv-border-principal) 90%, transparent);
}

.graph-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.graph-svg:active {
  cursor: grabbing;
}

/* Popups */
.graph-popup {
  position: absolute;
  z-index: 100;
  width: min(320px, calc(100vw - 24px));
  max-width: min(320px, calc(100vw - 24px));
  background: color-mix(in srgb, var(--gv-surface-card) 92%, transparent);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  padding: 14px 16px 16px;
  box-shadow: var(--gv-shadow-md);
  cursor: default;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.graph-popup--mobile {
  position: fixed;
  left: 12px !important;
  right: 12px !important;
  top: auto !important;
  bottom: max(12px, env(safe-area-inset-bottom, 0px)) !important;
  width: auto !important;
  max-width: none !important;
  max-height: min(55vh, 480px);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  transform: none !important;
  z-index: 200;
}

.graph-popup--mobile:hover {
  transform: none !important;
}

.graph-popup__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin: -2px 0 0;
}

.graph-popup__top--link {
  margin-bottom: 2px;
}

.graph-popup__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.graph-popup__head-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.graph-popup__type-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gv-text-secondary);
}

.graph-popup__close {
  flex-shrink: 0;
}

.graph-popup__category {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gv-text-secondary);
}

.graph-popup__cat-icon {
  width: 14px;
  height: 14px;
}

.graph-popup__title-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--gv-text-primary);
  line-height: 1.35;
}

.graph-popup__title-text--loading-preview {
  opacity: 0.9;
}

.graph-popup__skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
}

.graph-popup__sk-line,
.graph-popup__sk-media,
.graph-popup__sk-chip {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--gv-surface-header) 0%,
    color-mix(in srgb, var(--gv-surface-header) 55%, var(--gv-border-principal)) 45%,
    var(--gv-surface-header) 100%
  );
  background-size: 220% 100%;
  animation: graph-popup-skel 1.15s ease-in-out infinite;
}

.graph-popup__sk-line {
  height: 12px;
  width: 100%;
}

.graph-popup__sk-line--sm {
  width: 38%;
}

.graph-popup__sk-line--md {
  width: 74%;
}

.graph-popup__sk-line--lg {
  width: 94%;
}

.graph-popup__sk-media {
  height: 140px;
  width: 100%;
  border-radius: 10px;
}

.graph-popup__sk-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.graph-popup__sk-chip {
  height: 24px;
  width: 52px;
}

@keyframes graph-popup-skel {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.graph-popup__media {
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-principal);
}

.graph-popup__media-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.graph-popup__aliases {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.graph-popup__alias-chip {
  padding: 4px 9px;
  border-radius: 8px;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-principal);
  color: var(--gv-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.graph-popup__definition {
  font-size: 13px;
  line-height: 1.55;
  color: var(--gv-text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.graph-popup--mobile .graph-popup__definition {
  -webkit-line-clamp: 8;
  line-clamp: 8;
}

.graph-popup__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 10px;
  margin-top: 2px;
  border-top: 1px solid var(--gv-border-principal);
}

.graph-popup__loading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--gv-text-secondary);
  margin-right: auto;
}

.graph-popup__spin {
  width: 14px;
  height: 14px;
  animation: graph-popup-spin 0.8s linear infinite;
}

@keyframes graph-popup-spin {
  to {
    transform: rotate(360deg);
  }
}

.graph-popup__link {
  font-size: 13px;
  font-weight: 600;
  color: var(--gv-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
  white-space: nowrap;
}

.graph-popup__link:hover {
  color: var(--gv-primary);
}

.dark .graph-popup__link:hover {
  color: var(--gv-primary);
}

.graph-popup:hover:not(.graph-popup--mobile) {
  border-color: color-mix(in srgb, var(--gv-primary) 45%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-lg);
}

.dark .graph-popup {
  background: color-mix(in srgb, var(--gv-surface-card) 88%, transparent);
  border-color: var(--gv-border-principal);
}

.dark .graph-popup:hover:not(.graph-popup--mobile) {
  border-color: color-mix(in srgb, var(--gv-primary) 50%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-lg);
}

.link-popup {
  position: relative;
  padding-left: 20px !important;
  overflow: hidden;
}

.graph-popup--mobile.link-popup {
  padding-left: 16px !important;
}

.link-popup:hover {
  transform: none;
  border-color: var(--gv-border-principal);
  box-shadow: var(--gv-shadow-md);
}

.dark .link-popup:hover {
  border-color: var(--gv-border-principal);
  box-shadow: var(--gv-shadow-md);
}

.link-popup-accent {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 4px;
  border-left-width: 4px;
}

.link-hierarchy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 12px 0;
}

.hierarchy-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.h-icon {
  width: 18px;
  height: 18px;
  margin-top: 2px;
}

.h-info {
  display: flex;
  flex-direction: column;
}

.h-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.4;
  font-weight: 700;
  margin-bottom: 2px;
}

.h-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}

.hierarchy-separator {
  padding-left: 8px;
  height: 10px;
}

.sep-line {
  width: 2px;
  height: 100%;
  opacity: 0.2;
  border-radius: 2px;
}

.link-description {
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 10px;
  margin-top: 4px;
}

.dark .link-description {
  color: #94a3b8;
  border-color: rgba(255, 255, 255, 0.05);
}

.link-mentions {
  font-size: 12px;
  color: #0ea5e9;
  margin: 0;
  padding-top: 8px;
}

.dark .link-mentions {
  color: #38bdf8;
}

.tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tooltip-type {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #333333;
}

.dark .tooltip-type {
  color: #e5e5e5;
}

.tooltip-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: #333333;
  margin-bottom: 8px;
}

.dark .tooltip-title {
  color: #e5e5e5;
}

.popup-desc {
  font-size: 13px;
  line-height: 1.5;
  color: #555555;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .popup-desc {
  color: #aaaaaa;
}

/* Transitions */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.menu-slide-enter-from,
.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

@media (max-width: 1024px) {
  .graph-actions-container:not(.graph-actions-container--frameless) {
    top: 10px;
    left: 10px;
    right: 10px;
    max-width: none;
    width: auto;
  }

  .graph-actions-container--frameless {
    max-width: calc(100% - 20px);
  }

  .graph-actions-container {
    padding: 6px;
  }

  .custom-search-input {
    flex: 1;
    width: auto;
    min-width: 0;
  }
}

@media (max-width: 768px) {
  .kg-graph-title,
  .kg-graph-brand {
    font-size: clamp(2rem, 6.5vw, 2.25rem);
    letter-spacing: 4px;
  }
}

@media (max-width: 640px) {
  .graph-actions-container--mobile-compact {
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%);
    width: max-content;
    min-width: min(240px, calc(100vw - 24px));
    max-width: min(340px, calc(100vw - 24px));
    padding: 8px 12px;
  }

  .graph-actions-container:not(.graph-actions-container--frameless) {
    top: 8px;
    left: 8px;
    right: 8px;
  }

  .graph-actions-container--frameless {
    padding: 10px 14px 11px;
    max-width: calc(100% - 16px);
  }

  .kg-graph-sep {
    margin: 0 10px;
    min-height: 1.5rem;
  }

  .graph-actions-toolbar {
    gap: 6px;
    justify-content: center;
  }

  .custom-search-wrapper {
    order: 1;
    width: 100%;
    flex: 1 1 100%;
  }

  .custom-search-input {
    width: 100%;
    padding: 8px 30px;
  }

  .control-divider--toolbar {
    display: none;
  }

  .lang-switcher {
    margin: 0;
  }

  .kg-graph-ui-cluster {
    top: auto;
    bottom: 10px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    align-items: center;
    z-index: 70;
    max-width: calc(100vw - 20px);
  }

  .graph-stats-panel {
    bottom: 64px;
    left: 10px;
    right: auto;
    max-width: min(280px, calc(100% - 88px));
    padding: 10px 12px;
  }

  .custom-zoom-controls {
    flex-direction: row;
  }

  .graph-popup:not(.graph-popup--mobile) {
    width: min(240px, calc(100vw - 20px));
    padding: 12px;
  }

  .divider-hor {
    width: 1px;
    height: 24px;
    margin: auto 4px;
  }
}
</style>
