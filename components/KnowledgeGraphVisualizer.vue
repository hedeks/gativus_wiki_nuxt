<template>
  <div class="knowledge-graph-visualizer">
    <!-- Header removed, moved to parent if needed -->
    <div ref="graphContainer" class="graph-container">
      <div v-if="pending" class="loading-overlay">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl" />
        <span>{{ t.loading }}</span>
      </div>
      <div v-else-if="!pending && (!graphData?.nodes || graphData.nodes.length === 0)" class="empty-state-overlay">
        <UIcon name="i-heroicons-share" class="text-4xl opacity-20 mb-2" />
        <p>{{ t.empty }}</p>
      </div>

      <svg ref="svgRef" class="graph-svg"></svg>

      <!-- Top Actions (Search, Filters, Fullscreen) -->
      <div class="graph-actions-container" @wheel.stop @mousewheel.stop>
        <!-- Search -->
        <div class="custom-search-wrapper">
          <UIcon name="i-heroicons-magnifying-glass" class="search-icon" />
          <input v-model="searchQuery" type="text" :placeholder="t.search" class="custom-search-input"
            @input="handleSearch" />
          <button v-show="searchQuery" class="clear-search-btn" @click="clearSearch">
            <UIcon name="i-heroicons-x-mark" />
          </button>
        </div>

        <div class="control-divider"></div>

        <!-- Filters -->
        <div class="custom-popover-wrapper">
          <button class="action-btn" :class="{ 'active': isFilterMenuOpen }"
            @click="isFilterMenuOpen = !isFilterMenuOpen" :title="t.filters">
            <UIcon name="i-heroicons-funnel" />
          </button>

          <transition name="menu-slide">
            <div v-if="isFilterMenuOpen" class="custom-popover-panel">
              <div class="filter-menu-header">{{ t.filters }}</div>
              <div class="filter-menu-list">
                <div v-for="(label, key) in filterLabels" :key="key" class="filter-line"
                  @click="activeFilters[key] = !activeFilters[key]">
                  <span class="filter-label-text">{{ label }}</span>
                  <div class="custom-switch" :class="{ 'checked': activeFilters[key] }">
                    <div class="switch-handle"></div>
                  </div>
                </div>
              </div>
              <div class="filter-menu-footer">
                <button class="footer-btn primary" @click="setAllFilters(true)">{{ t.all }}</button>
                <div class="divider-small"></div>
                <button class="footer-btn" @click="setAllFilters(false)">{{ t.none }}</button>
              </div>
            </div>
          </transition>
        </div>

        <div class="control-divider"></div>

        <!-- Language Switcher -->
        <div class="lang-switcher" @mousedown.stop>
          <button class="lang-btn" :class="{ 'active': langStore.currentLang === 'en' }"
            @click="langStore.setLanguage('en')">
            EN
          </button>
          <div class="lang-sep"></div>
          <button class="lang-btn" :class="{ 'active': langStore.currentLang === 'ru' }"
            @click="langStore.setLanguage('ru')">
            RU
          </button>
          <div class="lang-sep"></div>
          <button class="lang-btn" :class="{ 'active': langStore.currentLang === 'zh' }"
            @click="langStore.setLanguage('zh')">
            ZH
          </button>
        </div>

        <div class="control-divider"></div>

        <!-- Fullscreen -->
        <button class="action-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Exit' : 'Fullscreen'">
          <UIcon :name="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" />
        </button>
      </div>

      <!-- Zoom Controls -->
      <div class="custom-zoom-controls" @wheel.stop @mousewheel.stop>
        <button class="zoom-btn" @click="zoomIn" title="+">
          <UIcon name="i-heroicons-plus" />
        </button>
        <div class="divider-hor"></div>
        <button class="zoom-btn" @click="zoomOut" title="-">
          <UIcon name="i-heroicons-minus" />
        </button>
        <div class="divider-hor"></div>
        <button class="zoom-btn" @click="zoomFit" :title="t.reset">
          <UIcon name="i-heroicons-arrows-right-left" />
        </button>
      </div>

      <!-- Floating Popup on Click -->
      <transition name="pop">
        <div v-if="selectedNode" class="graph-popup" :style="nodePopupStyle" @mousedown.stop @wheel.stop
          @mousewheel.stop @click.stop="navigateToNode">
          <div class="popup-content">
            <div class="tooltip-header">
              <UIcon :name="getNodeIcon(selectedNode)" :style="{ color: getNodeColor(selectedNode) }"
                class="tooltip-icon" />
              <span class="tooltip-type">{{ getTypeLabel(selectedNode.type) }}</span>
            </div>
            <div class="tooltip-title">{{ selectedNode.title }}</div>
            <div v-if="selectedNode.description" class="popup-desc line-clamp-2">{{ selectedNode.description }}</div>
            <div class="popup-hint">{{ t.hint }}</div>
          </div>
        </div>
      </transition>

      <!-- Link Popup -->
      <transition name="pop">
        <div v-if="selectedLink" class="graph-popup link-popup" :style="linkPopupStyle" @mousedown.stop @click.stop
          @wheel.stop @mousewheel.stop>
          <div class="link-popup-accent" :style="{
            borderColor: getNodeColor(getLinkHierarchy(selectedLink).child),
            borderLeftStyle: getLinkHierarchy(selectedLink).parent.type === 'category' ? 'dashed' : 'solid'
          }"></div>

          <div class="tooltip-header">
            <span class="tooltip-type">{{ relLabels[selectedLink.type] || 'Relationship' }}</span>
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

      <!-- Legend -->
      <div class="custom-legend" :class="{ 'legend-collapsed': isLegendCollapsed }" @wheel.stop @mousewheel.stop>
        <div class="legend-header-row" @click="isLegendCollapsed = !isLegendCollapsed">
          <div class="legend-title">{{ t.legend }}</div>
          <UIcon :name="isLegendCollapsed ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="legend-toggle-icon" />
        </div>
        <div v-if="!isLegendCollapsed" class="legend-items-list">
          <div class="legend-item"><span class="dot dot-book"></span> {{ t.book }}</div>
          <div class="legend-item"><span class="dot dot-cat-red"></span> {{ t.category }}</div>
          <div class="legend-item"><span class="dot dot-art"></span> {{ t.article }}</div>
          <div class="legend-item"><span class="dot dot-term"></span> {{ t.term }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3'
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()
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
    legend: 'Legend',
    book: 'Books',
    category: 'Categories',
    article: 'Articles',
    term: 'Terms'
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
    legend: 'Легенда',
    book: 'Книги',
    category: 'Категории',
    article: 'Статьи',
    term: 'Термины'
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
    legend: '图例',
    book: '书籍',
    category: '类别',
    article: '文章',
    term: '术语'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

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

const props = defineProps<{
  graphData: any;
  pending?: boolean;
  enableNavigation?: boolean;
}>()

watch(() => props.graphData, () => {
  nextTick(() => initGraph())
})

const selectedNode = ref<any>(null)
const selectedLink = ref<any>(null)
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
const isLegendCollapsed = ref(false)
const isFilterMenuOpen = ref(false)

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

// Close filter menu when clicking outside
onMounted(() => {
  window.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (isFilterMenuOpen.value && !target.closest('.custom-popover-wrapper')) {
      isFilterMenuOpen.value = false
    }
  })
})

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

const nodePopupStyle = computed(() => {
  if (!selectedNode.value) return {}
  const x = currentTransform.value.applyX(selectedNode.value.x)
  const y = currentTransform.value.applyY(selectedNode.value.y)
  return {
    left: `${x + 15}px`,
    top: `${y + 15}px`
  }
})

const linkPopupStyle = computed(() => {
  if (!selectedLink.value) return {}
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

const setAllFilters = (value: boolean) => {
  activeFilters.value = {
    book: value,
    category: value,
    article: value,
    term: value
  }
}

const toggleFullscreen = () => {
  if (!graphContainer.value) return
  if (!document.fullscreenElement) {
    graphContainer.value.requestFullscreen().then(() => {
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

  // Find matches
  const matches = props.graphData?.nodes?.filter((n: any) =>
    n.title.toLowerCase().includes(query) || (n.slug && n.slug.toLowerCase() === query)
  ) || []

  // Only update "Focus" if there's EXACTLY one match
  if (matches.length === 1) {
    const match = matches[0]
    // Only restart camera animation if it's a NEW node
    if (selectedNode.value?.id !== match.id) {
      focusOnNode(match)
    } else {
      updateHighlights()
    }
  } else {
    // If ambiguous (0 or >1 matches), we DON'T reset the screen anymore.
    // We only update highlights (nodes stay fully visible because focusNode still points to previous match or null)
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

const navigateToNode = () => {
  if (!props.enableNavigation) return
  if (!selectedNode.value) return
  const node = selectedNode.value
  let path = ''
  if (node.type === 'term') path = '/glossary/' + node.slug
  else if (node.type === 'article') path = '/articles/' + node.slug
  else if (node.type === 'book') path = '/books/' + node.slug
  else if (node.type === 'category') path = '/categories/' + node.slug

  if (path) useRouter().push(path)
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

    // Update popup positions directly via DOM to bypass Vue reactivity overhead (huge performance gain)
    if (selectedNode.value) {
      const popup = document.querySelector('.graph-popup:not(.link-popup)') as HTMLElement
      if (popup && currentTransform.value) {
        const x = currentTransform.value.applyX(selectedNode.value.x)
        const y = currentTransform.value.applyY(selectedNode.value.y)
        popup.style.left = `${x + 15}px`
        popup.style.top = `${y + 15}px`
      }
    }

    if (selectedLink.value) {
      const popup = document.querySelector('.link-popup') as HTMLElement
      if (popup && currentTransform.value) {
        const source = selectedLink.value.source
        const target = selectedLink.value.target
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        const x = currentTransform.value.applyX(midX)
        const y = currentTransform.value.applyY(midY)
        popup.style.left = `${x}px`
        popup.style.top = `${y}px`
      }
    }
  })

  updateHighlights()
}


let resizeObserver: ResizeObserver | null = null

const handleOutsideClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // Do NOT close if we clicked inside a popup
  if (target.closest('.graph-popup')) return

  // Do NOT close if we clicked on a node or a link
  if (target.closest('.node-group')) return
  if (target.tagName === 'line') return

  // Otherwise, clear selection
  selectedNode.value = null
  selectedLink.value = null
  hoveredNode.value = null
  hoveredLink.value = null
  updateHighlights()
}

onMounted(async () => {
  window.addEventListener('mousedown', handleOutsideClick)
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
    })
    resizeObserver.observe(graphContainer.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleOutsideClick)
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

/* New Manual Controls */
.graph-actions-container {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  display: flex;
  align-items: center;
  padding: 6px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 50;
}

.dark .graph-actions-container {
  background: rgba(24, 24, 27, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
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
  color: #94a3b8;
  pointer-events: none;
}

.custom-search-input {
  background: transparent;
  border: none;
  padding: 8px 32px;
  font-size: 14px;
  width: 200px;
  outline: none;
  color: #334155;
  transition: width 0.3s ease;
  user-select: text;
}

.dark .custom-search-input {
  color: #e2e8f0;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.clear-search-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #ef4444;
}

.control-divider {
  width: 1px;
  height: 20px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 8px;
}

.dark .control-divider {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.action-btn:hover,
.action-btn.active {
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
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
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2);
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
  background: rgba(24, 24, 27, 0.98);
  border-color: rgba(255, 255, 255, 0.15);
}

.filter-menu-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #94a3b8;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
  color: #334155;
  font-weight: 500;
}

.dark .filter-label-text {
  color: #e2e8f0;
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
  background: #0ea5e9;
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
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 8px;
}

.footer-btn {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 600;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: background 0.2s;
}

.footer-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.footer-btn.primary {
  color: #0ea5e9;
}

.dark .filter-menu-footer {
  border-color: rgba(255, 255, 255, 0.1);
}

/* Zoom Controls */
.custom-zoom-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 50;
}

.dark .custom-zoom-controls {
  background: rgba(24, 24, 27, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
}

.zoom-btn {
  background: transparent;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #0ea5e9;
}

.divider-hor {
  height: 1px;
  width: 24px;
  background: rgba(0, 0, 0, 0.1);
  margin: 4px auto;
}

.dark .divider-hor {
  background: rgba(255, 255, 255, 0.1);
}

/* Legend Rendering */
.custom-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  z-index: 40;
}

.dark .custom-legend {
  background: rgba(24, 24, 27, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
}

.legend-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.legend-title {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 11px;
  opacity: 0.6;
}

.legend-toggle-icon {
  width: 14px;
  height: 14px;
  opacity: 0.5;
  display: none;
}

.legend-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 11px;
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

@media (max-width: 768px) {
  .legend-toggle-icon {
    display: block;
  }
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
  background: rgba(255, 255, 255, 0.8);
  z-index: 60;
}

.dark .loading-overlay {
  background: rgba(15, 23, 42, 0.8);
}

.empty-state-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
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
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 2px;
  margin: 0 4px;
}

.dark .lang-switcher {
  background: rgba(255, 255, 255, 0.05);
}

.lang-btn {
  background: transparent;
  border: none;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.lang-btn.active {
  background: #ffffff;
  color: #0ea5e9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.dark .lang-btn.active {
  background: #3f3f46;
  color: #38bdf8;
}

.lang-sep {
  width: 1px;
  height: 10px;
  background: rgba(0, 0, 0, 0.1);
}

.dark .lang-sep {
  background: rgba(255, 255, 255, 0.1);
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
  width: 260px;
  max-width: min(260px, calc(100vw - 24px));
  background: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(16px);
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  user-select: none;
  transition: transform 0.3s cubic-bezier(0.705, 0.01, 0, 0.915),
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.graph-popup:hover {
  transform: translateY(-4px);
  border-color: #0ea5e9;
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.12);
}

.dark .graph-popup {
  background: rgba(26, 26, 26, 0.90);
  border-color: #3a3a3a;
}

.dark .graph-popup:hover {
  border-color: #0ea5e9;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 0 10px rgba(14, 165, 233, 0.08);
}

.link-popup {
  padding-left: 20px !important;
  overflow: hidden;
}

.link-popup:hover {
  transform: none;
  border-color: #e9e9e9;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.dark .link-popup:hover {
  border-color: #3a3a3a;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
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
  .graph-actions-container {
    top: 10px;
    left: 10px;
    right: 10px;
    padding: 4px;
  }

  .custom-search-input {
    flex: 1;
    width: auto;
  }
}

@media (max-width: 640px) {
  .graph-actions-container {
    top: 8px;
    left: 8px;
    right: 8px;
    gap: 2px;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .custom-search-wrapper {
    order: 1;
    width: 100%;
  }

  .custom-search-input {
    width: 100%;
    padding: 8px 30px;
  }

  .control-divider {
    display: none;
  }

  .lang-switcher {
    margin: 0;
  }

  .custom-zoom-controls {
    top: auto;
    bottom: 10px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    flex-direction: row;
    z-index: 70;
  }

  .custom-legend {
    bottom: 58px;
    left: 10px;
    padding: 10px 12px;
    max-width: calc(100% - 20px);
  }

  .graph-popup {
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
