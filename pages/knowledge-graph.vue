<template>
  <div class="knowledge-graph-page">
    <div class="graph-header">
      <div class="header-left">
        <h1 class="text-2xl font-bold">Граф знаний Gativus</h1>
        <p class="text-gray-500 text-sm">Визуализация онтологии: категории, статьи и термины</p>
      </div>
    </div>

    <div ref="graphContainer" class="graph-container">
      <div v-if="pending" class="loading-overlay">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl" />
        <span>Загрузка графа...</span>
      </div>
      <div v-else-if="!pending && (!graphData?.nodes || graphData.nodes.length === 0)" class="empty-state-overlay">
        <UIcon name="i-heroicons-share" class="text-4xl opacity-20 mb-2" />
        <p>Граф пуст. Добавьте категории и свяжите их со статьями.</p>
      </div>
      
      <svg ref="svgRef" class="graph-svg"></svg>

      <!-- Top Actions (Search, Filters, Fullscreen) -->
      <div class="graph-actions-container" @wheel.stop @mousewheel.stop>
        <!-- Search -->
        <div class="custom-search-wrapper">
          <UIcon name="i-heroicons-magnifying-glass" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Поиск..." 
            class="custom-search-input"
            @input="handleSearch"
          />
          <button 
            v-show="searchQuery" 
            class="clear-search-btn" 
            @click="clearSearch"
          >
            <UIcon name="i-heroicons-x-mark" />
          </button>
        </div>

        <div class="control-divider"></div>

        <!-- Filters -->
        <div class="custom-popover-wrapper">
          <button 
            class="action-btn" 
            :class="{ 'active': isFilterMenuOpen }"
            @click="isFilterMenuOpen = !isFilterMenuOpen"
            title="Фильтрация"
          >
            <UIcon name="i-heroicons-funnel" />
          </button>
          
          <transition name="menu-slide">
            <div v-if="isFilterMenuOpen" class="custom-popover-panel">
              <div class="filter-menu-header">Фильтрация</div>
              <div class="filter-menu-list">
                <div v-for="(val, key) in filterLabels" :key="key" class="filter-line" @click="activeFilters[key] = !activeFilters[key]">
                  <span class="filter-label-text">{{ val }}</span>
                  <div class="custom-switch" :class="{ 'checked': activeFilters[key] }">
                    <div class="switch-handle"></div>
                  </div>
                </div>
              </div>
              <div class="filter-menu-footer">
                <button class="footer-btn primary" @click="setAllFilters(true)">Все</button>
                <div class="divider-small"></div>
                <button class="footer-btn" @click="setAllFilters(false)">Ничего</button>
              </div>
            </div>
          </transition>
        </div>

        <div class="control-divider"></div>

        <!-- Fullscreen -->
        <button class="action-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Свернуть' : 'Во весь экран'">
          <UIcon :name="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" />
        </button>
      </div>

      <!-- Zoom Controls -->
      <div class="custom-zoom-controls" @wheel.stop @mousewheel.stop>
        <button class="zoom-btn" @click="zoomIn" title="Увеличить">
          <UIcon name="i-heroicons-plus" />
        </button>
        <div class="divider-hor"></div>
        <button class="zoom-btn" @click="zoomOut" title="Уменьшить">
          <UIcon name="i-heroicons-minus" />
        </button>
        <div class="divider-hor"></div>
        <button class="zoom-btn" @click="zoomFit" title="Сбросить масштаб">
          <UIcon name="i-heroicons-arrows-right-left" />
        </button>
      </div>

      <!-- Floating Popup on Click -->
      <transition name="pop">
        <div v-if="selectedNode" class="graph-popup" :style="nodePopupStyle" @mousedown.stop
          @wheel.stop @mousewheel.stop
          @click.stop="navigateToNode">
          <div class="popup-content">
            <div class="tooltip-header">
              <UIcon :name="getNodeIcon(selectedNode)" :style="{ color: getNodeColor(selectedNode) }"
                class="tooltip-icon" />
              <span class="tooltip-type">{{ getTypeLabel(selectedNode.type) }}</span>
            </div>
            <div class="tooltip-title">{{ selectedNode.title }}</div>
            <div v-if="selectedNode.description" class="popup-desc line-clamp-2">{{ selectedNode.description }}</div>
            <div class="popup-hint">Нажмите, чтобы открыть →</div>
          </div>
        </div>
      </transition>

      <!-- Link Popup -->
      <transition name="pop">
        <div v-if="selectedLink" class="graph-popup link-popup" :style="linkPopupStyle" 
             @mousedown.stop @click.stop @wheel.stop @mousewheel.stop>
          <div class="link-popup-accent" 
               :style="{ 
                 borderColor: getNodeColor(getLinkHierarchy(selectedLink).child),
                 borderLeftStyle: getLinkHierarchy(selectedLink).parent.type === 'category' ? 'dashed' : 'solid'
               }"></div>
          
          <div class="tooltip-header">
            <span class="tooltip-type">{{ relLabels[selectedLink.type] || 'Связь' }}</span>
          </div>

          <div class="link-hierarchy">
            <div class="hierarchy-item parent">
              <UIcon :name="getNodeIcon(getLinkHierarchy(selectedLink).parent)" class="h-icon opacity-50" />
              <div class="h-info">
                <span class="h-label">Контекст</span>
                <span class="h-name">{{ getLinkHierarchy(selectedLink).parent.title }}</span>
              </div>
            </div>
            
            <div class="hierarchy-separator">
              <div class="sep-line" :style="{ background: getNodeColor(getLinkHierarchy(selectedLink).child) }"></div>
            </div>

            <div class="hierarchy-item child">
              <UIcon :name="getNodeIcon(getLinkHierarchy(selectedLink).child)" 
                     class="h-icon" :style="{ color: getNodeColor(getLinkHierarchy(selectedLink).child) }" />
              <div class="h-info">
                <span class="h-label">Объект</span>
                <span class="h-name" :style="{ color: getNodeColor(getLinkHierarchy(selectedLink).child) }">
                  {{ getLinkHierarchy(selectedLink).child.title }}
                </span>
              </div>
            </div>
          </div>
          
          <p class="link-description">{{ relDescriptions[selectedLink.type] || 'Описание связи отсутствует' }}</p>
        </div>
      </transition>

      <!-- Legend -->
      <div class="custom-legend" :class="{ 'legend-collapsed': isLegendCollapsed }" @wheel.stop @mousewheel.stop>
        <div class="legend-header-row" @click="isLegendCollapsed = !isLegendCollapsed">
          <div class="legend-title">Легенда</div>
          <UIcon :name="isLegendCollapsed ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="legend-toggle-icon" />
        </div>
        <div v-if="!isLegendCollapsed" class="legend-items-list">
          <div class="legend-item"><span class="dot dot-book"></span> Книги</div>
          <div class="legend-item"><span class="dot dot-cat-red"></span> Категории</div>
          <div class="legend-item"><span class="dot dot-art"></span> Статьи</div>
          <div class="legend-item"><span class="dot dot-term"></span> Термины</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3'

useHead({
  title: 'Граф знаний — Gativus Wiki'
})

const graphContainer = ref<HTMLElement | null>(null)
const svgRef = ref<SVGElement | null>(null)
const { data: graphData, pending } = await useFetch('/api/knowledge-graph')
const selectedNode = ref<any>(null)
const selectedLink = ref<any>(null)
const currentTransform = ref(d3.zoomIdentity)
const simulationTick = ref(0) // Added for simulation reactivity
const searchQuery = ref('')
const activeFilters = ref({
  book: true,
  category: true,
  article: true,
  term: true
})
const filterLabels = {
  book: 'Книги',
  category: 'Категории',
  article: 'Статьи',
  term: 'Термины'
}
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

const nodePopupStyle = computed(() => {
  if (!selectedNode.value) return {}
  simulationTick.value // Track simulation ticks
  const x = currentTransform.value.applyX(selectedNode.value.x)
  const y = currentTransform.value.applyY(selectedNode.value.y)
  return {
    left: `${x + 15}px`,
    top: `${y + 15}px`
  }
})

const linkPopupStyle = computed(() => {
  if (!selectedLink.value) return {}
  simulationTick.value // Track simulation ticks
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
  if (!searchQuery.value) {
    d3.selectAll('.node-group').transition().duration(200).style('opacity', 1)
    return
  }
  const query = searchQuery.value.toLowerCase()
  d3.selectAll('.node-group').style('opacity', (d: any) =>
    d.title.toLowerCase().includes(query) ? 1 : 0.2
  )

  // Optional: Auto-focus first match if search is exact-ish or enterprise-like
  const match = graphData.value.nodes.find((n: any) => n.title.toLowerCase() === query)
  if (match) focusOnNode(match)
}

const clearSearch = () => {
  searchQuery.value = ''
  handleSearch()
}

const focusOnNode = (nodeData: any) => {
  if (!svgRef.value || !zoomHandler || !graphContainer.value) return
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight

  // Find the existing node object in simulation
  const target = simulation.nodes().find((n: any) => n.id === nodeData.id)
  if (!target) return

  selectedNode.value = target

  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(1.5)
    .translate(-target.x, -target.y)

  d3.select(svgRef.value).transition().duration(750).call(zoomHandler.transform, transform)
}

const relLabels: Record<string, string> = {
  belongs_to_category: 'Категория',
  part_of_book: 'Состав книги',
  part_of_article: 'Раскрытие термина',
  reference: 'Перекрестная ссылка',
  mention: 'Упоминание',
}

const relDescriptions: Record<string, string> = {
  belongs_to_category: 'Этот элемент классифицирован и относится к данной категории.',
  part_of_book: 'Данная статья является главой или частью этой книги.',
  part_of_article: 'Этот термин подробно раскрывается и поясняется в данной статье.',
  reference: 'Прямая связь или ссылка между двумя терминами в глоссарии.',
  mention: 'Термин упоминается в тексте статьи как ключевое понятие.',
}

let simulation: any = null
let zoomHandler: any = null

const zoomIn = () => {
  if (!svgRef.value || !zoomHandler) return
  d3.select(svgRef.value).transition().duration(300).call(zoomHandler.scaleBy, 1.5)
}

const zoomOut = () => {
  if (!svgRef.value || !zoomHandler) return
  d3.select(svgRef.value).transition().duration(300).call(zoomHandler.scaleBy, 0.7)
}

const zoomFit = () => {
  if (!svgRef.value || !zoomHandler || !graphContainer.value) return
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight
  d3.select(svgRef.value).transition().duration(750)
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
    book: 'Книга',
    article: 'Статья',
    category: 'Категория',
    term: 'Термин'
  }
  return dict[type] || ''
}

const navigateToNode = () => {
  if (!selectedNode.value) return
  const node = selectedNode.value
  let path = ''
  if (node.type === 'term') path = '/glossary/' + node.slug
  else if (node.type === 'article') path = '/articles/' + node.slug
  else if (node.type === 'book') path = '/books/' + node.slug
  else if (node.type === 'category') path = '/categories/' + node.slug // assuming categories have pages

  if (path) useRouter().push(path)
}

const initGraph = () => {
  if (!process.client || !graphData.value || !svgRef.value || !graphContainer.value) return

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
      }
    })

  svg.selectAll('*').remove() // Clear previous

  // --- Premium Definitions ---
  const defs = svg.append('defs')

  // 1. Shadow Filter
  const filter = defs.append('filter')
    .attr('id', 'node-shadow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')

  filter.append('feGaussianBlur')
    .attr('in', 'SourceAlpha')
    .attr('stdDeviation', 2)
    .attr('result', 'blur')
  filter.append('feOffset')
    .attr('in', 'blur')
    .attr('dx', 0)
    .attr('dy', 2)
    .attr('result', 'offsetBlur')
  
  const merge = filter.append('feMerge')
  merge.append('feMergeNode').attr('in', 'offsetBlur')
  merge.append('feMergeNode').attr('in', 'SourceGraphic')

  // 2. Link Glow Filter
  const glow = defs.append('filter')
    .attr('id', 'link-glow')
    .attr('x', '-20%')
    .attr('y', '-20%')
    .attr('width', '140%')
    .attr('height', '140%')
  glow.append('feGaussianBlur')
    .attr('stdDeviation', 3)
    .attr('result', 'coloredBlur')
  const glowMerge = glow.append('feMerge')
  glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
  glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  const feMerge = filter.append('feMerge')
  feMerge.append('feMergeNode').attr('in', 'offsetBlur')
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  // 2. Gradients
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

  const allNodes = graphData.value.nodes.map((d: any) => ({ ...d }))
  const allLinks = graphData.value.links.map((d: any) => ({ ...d }))

  // Filter based on activeFilters
  const nodes = allNodes.filter((n: any) => activeFilters.value[n.type as keyof typeof activeFilters.value])
  const nodeIds = new Set(nodes.map(n => n.id))
  const links = allLinks.filter((l: any) => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source
    const targetId = typeof l.target === 'object' ? l.target.id : l.target
    return nodeIds.has(sourceId) && nodeIds.has(targetId)
  })

  // Neighbor highlighting logic
  const getNeighbors = (node: any) => {
    return links.reduce((acc: any[], link: any) => {
      if (link.source.id === node.id) acc.push(link.target.id)
      else if (link.target.id === node.id) acc.push(link.source.id)
      return acc
    }, [node.id])
  }

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => (d as any).id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('x', d3.forceX(width / 2).strength(0.05))
    .force('y', d3.forceY(height / 2).strength(0.05))

  const link = g.append('g')
    .style('pointer-events', 'none')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'visual-link')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', (d: any) => {
      const typeLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }
      const sLevel = typeLevels[d.source.type] ?? 99
      const tLevel = typeLevels[d.target.type] ?? 99
      const parent = sLevel <= tLevel ? d.source : d.target
      const child = sLevel > tLevel ? d.source : d.target
      
      if (parent.type === 'book') return 2.5
      if (parent.type === 'category' && child.type === 'category') return 1.5
      return 1
    })
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
      d3.selectAll('.visual-link')
        .filter((l: any) => l === d)
        .transition()
        .duration(200)
        .ease(designSystemEase)
        .attr('stroke-opacity', 1)
        .attr('filter', 'url(#link-glow)')
        .attr('stroke-width', (l: any) => {
          const typeLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }
          const sLevel = typeLevels[l.source.type] ?? 99
          const tLevel = typeLevels[l.target.type] ?? 99
          const parent = sLevel <= tLevel ? l.source : l.target
          const child = sLevel > tLevel ? l.source : l.target
          let base = 1
          if (parent.type === 'book') base = 2.5
          else if (parent.type === 'category' && child.type === 'category') base = 1.5
          return base * 1.5
        })
    })
    .on('mouseout', (event: any, d: any) => {
      d3.selectAll('.visual-link')
        .filter((l: any) => l === d)
        .transition()
        .duration(200)
        .ease(designSystemEase)
        .attr('stroke-opacity', 0.4)
        .attr('filter', 'none')
        .attr('stroke-width', (l: any) => {
          const typeLevels: Record<string, number> = { category: 0, book: 1, article: 2, term: 3 }
          const sLevel = typeLevels[l.source.type] ?? 99
          const tLevel = typeLevels[l.target.type] ?? 99
          const parent = sLevel <= tLevel ? l.source : l.target
          const child = sLevel > tLevel ? l.source : l.target
          if (parent.type === 'book') return 2.5
          if (parent.type === 'category' && child.type === 'category') return 1.5
          return 1
        })
    })
    .on('click', (event: any, d: any) => {
      selectedNode.value = null
      selectedLink.value = d
      event.stopPropagation()
    })

  const node = g.append('g')
    .selectAll('.node-group')
    .data(nodes)
    .join('g')
    .attr('class', 'node-group')
    .style('cursor', 'pointer')
    .call(drag(simulation) as any)
    .on('click', (event: any, d: any) => {
      selectedNode.value = d
      selectedLink.value = null
      event.stopPropagation()
    })
    .on('mouseover', function (event: any, d: any) {
      const neighbors = getNeighbors(d)
      const query = searchQuery.value.toLowerCase()
      const duration = 200
      const ease = designSystemEase

      d3.selectAll('.node-group').transition().duration(duration).ease(ease)
        .style('opacity', (n: any) => {
          const isNeighbor = neighbors.includes(n.id)
          const matchesSearch = !query || n.title.toLowerCase().includes(query)
          return isNeighbor && matchesSearch ? 1 : 0.05
        })

      d3.selectAll('line').transition().duration(duration).ease(ease)
        .style('opacity', (l: any) => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.02)

      d3.select(this).select('circle')
        .transition().duration(duration).ease(ease)
        .attr('r', (d: any) => {
          let base = 6
          if (d.type === 'book') base = 14
          else if (d.type === 'category') base = Math.max(8, 14 - (d.depth || 0) * 3)
          else if (d.type === 'article') base = 8
          return base * 1.25
        })
        .attr('stroke-width', 3)
        .attr('stroke', '#6366f1')
    })
    .on('mouseleave', function () {
      const query = searchQuery.value.toLowerCase()
      const duration = 200
      const ease = designSystemEase

      d3.selectAll('.node-group').transition().duration(duration).ease(ease)
        .style('opacity', (n: any) => !query || n.title.toLowerCase().includes(query) ? 1 : 0.2)

      d3.selectAll('line').transition().duration(duration).ease(ease).style('opacity', 0.4)

      d3.select(this).select('circle')
        .transition().duration(duration).ease(ease)
        .attr('r', (d: any) => {
          if (d.type === 'book') return 14
          if (d.type === 'category') return Math.max(8, 14 - (d.depth || 0) * 3)
          if (d.type === 'article') return 8
          return 6
        })
        .attr('stroke-width', 2)
        .attr('stroke', '#fff')
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
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('filter', 'url(#node-shadow)')

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
    .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)')

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

    // Correctly notify Vue of movement during simulation
    if (selectedNode.value || selectedLink.value) {
      simulationTick.value++
    }
  })
}

function drag(simulation: any) {
  function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    event.subject.fx = event.subject.x
    event.subject.fy = event.subject.y
  }

  function dragged(event: any) {
    event.subject.fx = event.x
    event.subject.fy = event.y
  }

  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0)
    event.subject.fx = null
    event.subject.fy = null
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended)
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
}

onMounted(async () => {
  window.addEventListener('mousedown', handleOutsideClick)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  await nextTick()
  initGraph()

  if (process.client && graphContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      initGraph()
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

watch(graphData, () => {
  nextTick(() => initGraph())
})

watch(activeFilters, () => {
  initGraph()
}, { deep: true })
</script>


<style scoped>
.knowledge-graph-page {
  width: 100%;
  max-width: 1400px;
  /* Expansive layout for desktop */
  margin: 0 auto;
  padding: 0 16px 20px;
  height: calc(100vh - var(--header-height, 65px) - 20px);
  display: flex;
  flex-direction: column;
  user-select: none;
}

@media (min-width: 1280px) {
  .knowledge-graph-page {
    max-width: 1800px;
    padding: 0 40px 30px;
  }
}

.graph-header {
  margin-bottom: 24px;
  padding-top: 24px;
}

.header-left h1 {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #333333;
  border-bottom: 1px solid #bababa;
  display: inline-block;
  margin-bottom: 8px;
}

.dark .header-left h1 {
  color: #e5e5e5;
  border-color: #3a3a3a;
}

@media (max-width: 640px) {
  .graph-header {
    margin-bottom: 16px;
    padding-top: 16px;
  }
  .header-left h1 {
    font-size: 24px;
    letter-spacing: 2px;
  }
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

.action-btn:hover, .action-btn.active {
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

.dark .filter-menu-footer { border-color: rgba(255, 255, 255, 0.1); }

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

.dark .divider-hor { background: rgba(255, 255, 255, 0.1); }

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

.legend-toggle-icon { width: 14px; height: 14px; opacity: 0.5; display: none; }

.legend-items-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

.legend-item { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 11px; }

.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot-book { background: linear-gradient(135deg, #0ea5e9, #0369a1); }
.dot-cat-red { background: linear-gradient(135deg, #ef4444, #b91c1c); }
.dot-art { background: linear-gradient(135deg, #6366f1, #4338ca); }
.dot-term { background: linear-gradient(135deg, #10b981, #047857); }

@media (max-width: 768px) { .legend-toggle-icon { display: block; } }

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

.dark .loading-overlay { background: rgba(15, 23, 42, 0.8); }

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

.graph-svg { width: 100%; height: 100%; cursor: grab; }
.graph-svg:active { cursor: grabbing; }

/* Popups */
.graph-popup {
  position: absolute;
  z-index: 100;
  width: 260px;
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

.dark .graph-popup { background: rgba(26, 26, 26, 0.90); border-color: #3a3a3a; }

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

.tooltip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.tooltip-type { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #333333; }
.dark .tooltip-type { color: #e5e5e5; }
.tooltip-title { font-size: 15px; font-weight: 600; line-height: 1.4; color: #333333; margin-bottom: 8px; }
.dark .tooltip-title { color: #e5e5e5; }
.popup-desc { font-size: 13px; line-height: 1.5; color: #555555; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dark .popup-desc { color: #aaaaaa; }

/* Transitions */
.menu-slide-enter-active, .menu-slide-leave-active { transition: all 0.4s cubic-bezier(0.705, 0.01, 0, 0.915); }
.menu-slide-enter-from, .menu-slide-leave-to { opacity: 0; transform: translateY(-10px) scale(0.95); }

.pop-enter-active, .pop-leave-active { transition: all 0.3s cubic-bezier(0.705, 0.010, 0.000, 0.915); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.9) translateY(10px); }

@media (max-width: 1024px) {
  .graph-actions-container { top: 10px; left: 10px; right: 10px; }
  .custom-search-input { flex: 1; width: auto; }
}

@media (max-width: 640px) {
  .custom-zoom-controls { top: auto; bottom: 20px; left: 50%; right: auto; transform: translateX(-50%); flex-direction: row; }
  .divider-hor { width: 1px; height: 24px; margin: auto 4px; }
}
</style>
