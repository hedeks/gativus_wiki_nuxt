<template>
  <Teleport to="body">
    <Transition name="popover" @after-enter="onPopoverAfterEnter">
      <div
        v-if="visible && term"
        ref="popoverEl"
        class="term-popover"
        :class="{ 'term-popover--mobile': isMobilePopover }"
        :style="popoverStyle"
        :aria-busy="loading"
        @click.stop
      >
        <template v-if="loading">
          <div
            class="popover-title-skel popover-skel-line popover-skel-line--lg"
            aria-hidden="true"
          />
          <div class="popover-category popover-skel-line popover-skel-line--sm" aria-hidden="true" />
          <div class="popover-media popover-skel-media" />
          <div class="popover-skel-chips">
            <span class="popover-skel-chip" />
            <span class="popover-skel-chip" />
          </div>
          <div class="popover-definition popover-skel-line" />
          <div class="popover-definition popover-skel-line popover-skel-line--md" />
        </template>

        <template v-else>
          <div
            v-if="term.category_title"
            class="popover-category"
            :style="term.category_color ? { color: term.category_color } : {}"
          >
            <UIcon v-if="term.category_icon" :name="term.category_icon" class="cat-icon" />
            {{ term.category_title }}
          </div>

          <div class="popover-title">{{ term.title }}</div>

          <div v-if="term.image_url || term.video_url" class="popover-media">
            <img v-if="term.image_url" :src="term.image_url" class="media-preview" alt="">
            <video
              v-else-if="term.video_url"
              :src="term.video_url"
              class="media-preview"
              muted
              autoplay
              loop
              playsinline
            />
          </div>

          <div v-if="term.aliases?.length" class="popover-aliases">
            <span v-for="alias in term.aliases.slice(0, 3)" :key="alias" class="alias-chip">{{ alias }}</span>
          </div>

          <p v-if="loadError" class="popover-definition popover-definition--error">{{ t.loadError }}</p>
          <p v-else-if="term.definition" class="popover-definition">{{ term.definition }}</p>
        </template>

        <div class="popover-footer">
          <span v-if="loading" class="popover-loading">
            <UIcon name="i-heroicons-arrow-path" class="spin-icon" />
            {{ t.loading }}
          </span>
          <NuxtLink v-if="term.slug" :to="`/glossary/${term.slug}`" class="popover-link" @click="close">
            {{ t.openArticle }}
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { useLanguageStore } from '~/stores/language'

interface TermData {
  id: number
  slug: string
  title: string
  aliases: string[]
  definition: string
  has_article: boolean
  category_title?: string
  category_slug?: string
  category_icon?: string
  category_color?: string
  image_url?: string
  video_url?: string
}

const langStore = useLanguageStore()

const uiDict: Record<string, { loading: string; openArticle: string; loadError: string }> = {
  en: {
    loading: 'Loading...',
    openArticle: 'Open article →',
    loadError: 'Could not load term details.',
  },
  ru: {
    loading: 'Загрузка...',
    openArticle: 'Открыть статью →',
    loadError: 'Не удалось загрузить данные термина.',
  },
  zh: {
    loading: '加载中...',
    openArticle: '打开条目 →',
    loadError: '无法加载术语详情。',
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

/** Нижняя шторка на узком экране — не привязываем к getBoundingClientRect().left якоря (часто уезжает влево). */
const isMobilePopover = useMediaQuery('(max-width: 640px)')
const lastAnchorEl = ref<HTMLElement | null>(null)

const visible = ref(false)
const loading = ref(false)
const loadError = ref(false)
const term = ref<TermData | null>(null)
const popoverEl = ref<HTMLElement>()
const route = useRoute()

const popoverStyle = ref<Record<string, string>>({
  position: 'fixed',
  left: '-9999px',
  top: '0px',
  width: '320px',
  zIndex: '1000',
})

/**
 * Плановая высота под размещение: скелетон loading (категория + медиа 140px + чипы + линии + футер)
 * — типично самый «высокий» каркас до загрузки. После монтирования уточняем через measurePlacementBoxHeight.
 * Подгоняйте под .popover-skel-* + padding/gap в стилях.
 */
const POPOVER_PLACEMENT_BOX_PX = 368

const cache = new Map<string, TermData>()

/** true — попап открыт снизу от якоря, false — сверху */
const popoverPlaceBelow = ref(true)

function parseStylePx(v: string | undefined): number | undefined {
  if (v == null || v === 'auto') return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

function computeAnchorLockedTop(
  rect: DOMRect,
  planBoxH: number,
  margin: number,
  gap: number,
): { placeBelow: boolean, topPx: number } {
  const vv = window.visualViewport
  const winH = vv?.height ?? window.innerHeight
  const winTop = vv?.offsetTop ?? 0
  const st = winTop + margin
  const sb = winTop + winH - margin

  const spaceBelow = sb - (rect.bottom + gap)
  const spaceAbove = rect.top - gap - st

  if (planBoxH <= spaceBelow) {
    return { placeBelow: true, topPx: rect.bottom + gap }
  }
  if (planBoxH <= spaceAbove) {
    return { placeBelow: false, topPx: rect.top - gap - planBoxH }
  }
  if (spaceBelow >= spaceAbove) {
    return { placeBelow: true, topPx: rect.bottom + gap }
  }
  return { placeBelow: false, topPx: rect.top - gap - Math.min(planBoxH, spaceAbove) }
}

function measurePlacementBoxHeight(el: HTMLElement | undefined): number {
  if (!el) return POPOVER_PLACEMENT_BOX_PX
  const h = el.getBoundingClientRect().height
  return Math.max(POPOVER_PLACEMENT_BOX_PX, h)
}

function applyPopoverAnchorPosition(anchor: HTMLElement) {
  const margin = 8
  const gap = 8

  if (isMobilePopover.value) return

  const rect = anchor.getBoundingClientRect()
  const planH = measurePlacementBoxHeight(popoverEl.value)
  const { placeBelow, topPx } = computeAnchorLockedTop(rect, planH, margin, gap)
  popoverPlaceBelow.value = placeBelow

  popoverStyle.value = {
    ...popoverStyle.value,
    left: `${rect.left}px`,
    top: `${topPx}px`,
  }
}

function seedPopoverPositionFromStyleOrAnchor(popup: HTMLElement): { l: number, t: number } {
  let l = parseStylePx(popoverStyle.value.left)
  let t = parseStylePx(popoverStyle.value.top)
  if (l !== undefined && t !== undefined) return { l, t }

  const anchor = lastAnchorEl.value
  const gap = 8
  if (anchor && !isMobilePopover.value) {
    const r = anchor.getBoundingClientRect()
    if (l === undefined) l = r.left
    if (t === undefined) t = r.bottom + gap
  }

  const br = popup.getBoundingClientRect()
  if (l === undefined) l = br.left
  if (t === undefined) t = br.top
  return { l, t }
}

function onPopoverAfterEnter() {
  if (!visible.value || isMobilePopover.value) return
  clampPopoverToScreen()
}

function clampPopoverToScreen() {
  const popup = popoverEl.value
  const anchor = lastAnchorEl.value
  if (!popup || !visible.value || isMobilePopover.value) return

  const pad = 8
  const gap = 8
  let maxHStr = ''

  popup.style.maxHeight = ''
  popup.style.overflowY = ''
  void popup.offsetHeight

  const vv = window.visualViewport
  const winW = vv?.width ?? window.innerWidth
  const winH = vv?.height ?? window.innerHeight
  const winLeft = vv?.offsetLeft ?? 0
  const winTop = vv?.offsetTop ?? 0

  const screenLeft = winLeft + pad
  const screenTop = winTop + pad
  const screenRight = winLeft + winW - pad
  const screenBottom = winTop + winH - pad

  const seeded = seedPopoverPositionFromStyleOrAnchor(popup)
  let l = seeded.l
  let t: number

  if (anchor) {
    const rect = anchor.getBoundingClientRect()
    const pl = parseStylePx(popoverStyle.value.left)
    if (pl !== undefined) l = pl

    void popup.offsetHeight
    const H = popup.getBoundingClientRect().height

    if (popoverPlaceBelow.value) {
      t = rect.bottom + gap
      if (t + H > screenBottom - pad) {
        maxHStr = `${Math.max(48, Math.floor(screenBottom - pad - t))}px`
      }
    }
    else {
      const roomAbove = rect.top - gap - screenTop
      if (H <= roomAbove - pad) {
        t = rect.top - gap - H
      }
      else {
        const cap = Math.max(48, Math.floor(roomAbove - pad))
        maxHStr = `${cap}px`
        t = rect.top - gap - cap
      }
    }
  }
  else {
    t = seeded.t
  }

  const applyDom = () => {
    popup.style.left = `${l}px`
    popup.style.top = `${t}px`
    if (maxHStr) {
      popup.style.maxHeight = maxHStr
      popup.style.overflowY = 'auto'
    }
    else {
      popup.style.maxHeight = ''
      popup.style.overflowY = ''
    }
  }

  applyDom()
  void popup.offsetHeight

  if (screenRight <= screenLeft || screenBottom <= screenTop) {
    let r = popup.getBoundingClientRect()
    l += screenLeft + Math.max(0, (winW - 2 * pad - r.width) / 2) - r.left
    t += screenTop + Math.max(0, (winH - 2 * pad - r.height) / 2) - r.top
    applyDom()
    void popup.offsetHeight
  }

  for (let pass = 0; pass < 8; pass++) {
    const r = popup.getBoundingClientRect()
    let moved = false
    if (r.left < screenLeft) {
      l += screenLeft - r.left
      moved = true
    }
    if (r.right > screenRight) {
      l -= r.right - screenRight
      moved = true
    }
    applyDom()
    void popup.offsetHeight
    if (!moved) break
  }

  popoverStyle.value = {
    ...popoverStyle.value,
    left: `${l}px`,
    top: `${t}px`,
    maxHeight: maxHStr || '',
    overflowY: maxHStr ? 'auto' : '',
    overflow: maxHStr ? 'auto' : '',
  }

  popup.style.removeProperty('left')
  popup.style.removeProperty('top')
  popup.style.removeProperty('max-height')
  popup.style.removeProperty('overflow-y')
}

function positionPopover(anchor: HTMLElement) {
  const margin = 8
  const gap = 8

  if (isMobilePopover.value) {
    popoverStyle.value = {
      position: 'fixed',
      left: '12px',
      right: '12px',
      width: 'auto',
      top: 'auto',
      bottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      maxHeight: 'min(58vh, 520px)',
      zIndex: '1000',
      overflow: 'auto',
    }
    return
  }

  const rect = anchor.getBoundingClientRect()
  const w = Math.min(320, window.innerWidth - margin * 2)
  const planH = popoverEl.value ? measurePlacementBoxHeight(popoverEl.value) : POPOVER_PLACEMENT_BOX_PX
  const { placeBelow, topPx } = computeAnchorLockedTop(rect, planH, margin, gap)
  popoverPlaceBelow.value = placeBelow

  popoverStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${topPx}px`,
    width: `${w}px`,
    maxHeight: '',
    right: 'auto',
    bottom: 'auto',
    overflow: '',
    overflowY: '',
    zIndex: '1000',
  }

  nextTick(() => {
    if (!popoverEl.value) {
      nextTick(() => {
        applyPopoverAnchorPosition(anchor)
        clampPopoverToScreen()
      })
      return
    }
    applyPopoverAnchorPosition(anchor)
    nextTick(() => clampPopoverToScreen())
  })
}

function onViewportResize() {
  if (!visible.value) return
  nextTick(() => {
    if (lastAnchorEl.value) positionPopover(lastAnchorEl.value)
    else clampPopoverToScreen()
  })
}

watch(() => route.fullPath, () => {
  close()
})

watch(visible, (v) => {
  if (!process.client) return
  if (v) {
    window.addEventListener('resize', onViewportResize)
    window.visualViewport?.addEventListener('resize', onViewportResize)
    window.visualViewport?.addEventListener('scroll', onViewportResize)
  } else {
    window.removeEventListener('resize', onViewportResize)
    window.visualViewport?.removeEventListener('resize', onViewportResize)
    window.visualViewport?.removeEventListener('scroll', onViewportResize)
  }
})

function handleDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const termEl = target.closest('.wiki-term') as HTMLElement | null

  if (termEl) {
    e.preventDefault()
    const slug = termEl.dataset.termSlug
    if (slug) showPopover(slug, termEl)
    return
  }

  if (popoverEl.value && !popoverEl.value.contains(target)) close()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function placeholderTerm(slug: string, anchor: HTMLElement): TermData {
  const title = (anchor.textContent || '').trim() || slug
  return {
    id: 0,
    slug,
    title,
    aliases: [],
    definition: '',
    has_article: false,
    category_title: undefined,
    category_slug: undefined,
    category_icon: undefined,
    category_color: undefined,
    image_url: undefined,
    video_url: undefined,
  }
}

async function showPopover(slug: string, anchor: HTMLElement) {
  loadError.value = false
  lastAnchorEl.value = anchor
  term.value = placeholderTerm(slug, anchor)
  positionPopover(anchor)
  visible.value = true
  loading.value = true

  if (process.client) await nextTick()

  if (cache.has(slug)) {
    term.value = cache.get(slug)!
    loading.value = false
    loadError.value = false
    positionPopover(anchor)
    nextTick(() => {
      if (!popoverEl.value) {
        nextTick(() => clampPopoverToScreen())
        return
      }
      clampPopoverToScreen()
    })
    return
  }

  try {
    const data = await $fetch<any>(`/api/terms/${slug}`, {
      query: { lang: langStore.currentLang },
    })
    const mapped: TermData = {
      id: data.id,
      slug: data.slug,
      title: data.title,
      aliases: data.aliases || [],
      definition: data.definition,
      has_article: Boolean(data.term_article_id),
      category_title: data.category_title,
      category_slug: data.category_slug,
      category_icon: data.category_icon,
      category_color: data.category_color,
      image_url: data.image_url,
      video_url: data.video_url,
    }
    cache.set(slug, mapped)
    term.value = mapped
    loadError.value = false
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
    if (lastAnchorEl.value) positionPopover(lastAnchorEl.value)
    nextTick(() => {
      if (!popoverEl.value) {
        nextTick(() => clampPopoverToScreen())
        return
      }
      clampPopoverToScreen()
    })
  }
}

function close() {
  visible.value = false
  term.value = null
  loadError.value = false
  lastAnchorEl.value = null
}

watch(isMobilePopover, () => {
  if (visible.value && lastAnchorEl.value) nextTick(() => positionPopover(lastAnchorEl.value))
})

watch(() => langStore.currentLang, () => {
  cache.clear()
})

onMounted(() => {
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', onViewportResize)
  window.visualViewport?.removeEventListener('resize', onViewportResize)
  window.visualViewport?.removeEventListener('scroll', onViewportResize)
})
</script>

<style scoped>
.term-popover {
  position: fixed;
  z-index: 1000;
  max-width: calc(100vw - 24px);
  min-height: 0;
  background: color-mix(in srgb, var(--gv-surface-card) 94%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  padding: 16px;
  box-shadow: var(--gv-shadow-md);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.term-popover:hover {
  background: color-mix(in srgb, var(--gv-surface-card) 96%, transparent);
  border-color: color-mix(in srgb, var(--gv-primary) 38%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-lg);
}

:global(.dark) .term-popover {
  background: color-mix(in srgb, var(--gv-surface-card) 92%, transparent);
  border-color: var(--gv-border-principal);
  box-shadow: var(--gv-shadow-md);
}

:global(.dark) .term-popover:hover {
  background: color-mix(in srgb, var(--gv-surface-card) 94%, transparent);
  border-color: color-mix(in srgb, var(--gv-primary) 45%, var(--gv-border-principal));
  box-shadow: var(--gv-shadow-lg);
}

.term-popover--mobile {
  left: 12px !important;
  right: 12px !important;
  width: auto !important;
  top: auto !important;
  max-width: none;
  transform: none !important;
  -webkit-overflow-scrolling: touch;
}

.term-popover--mobile:hover {
  transform: none !important;
}

.popover-skel-line,
.popover-skel-media,
.popover-skel-chip {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--gv-surface-header) 0%,
    color-mix(in srgb, var(--gv-surface-header) 55%, var(--gv-border-principal)) 45%,
    var(--gv-surface-header) 100%
  );
  background-size: 220% 100%;
  animation: term-pop-skel 1.15s ease-in-out infinite;
}

.popover-skel-line {
  height: 12px;
  width: 100%;
  margin: 0;
}

.popover-skel-line--sm {
  width: 38%;
}

.popover-skel-line--md {
  width: 72%;
}

.popover-skel-line--lg {
  width: 94%;
}

.popover-title-skel {
  height: 24px;
}

.popover-skel-media {
  height: 140px;
  width: 100%;
  border-radius: 10px;
}

.popover-skel-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.popover-skel-chip {
  height: 24px;
  width: 52px;
}

@keyframes term-pop-skel {
  0% {
    background-position: 120% 0;
  }
  100% {
    background-position: -120% 0;
  }
}

.popover-category {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gv-text-secondary);
}

.cat-icon {
  width: 14px;
  height: 14px;
}

.popover-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--gv-text-primary);
  line-height: 1.4;
  margin-bottom: 0;
}

.popover-media {
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-principal);
}

.media-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popover-aliases {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.alias-chip {
  padding: 4px 9px;
  border-radius: 8px;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-principal);
  color: var(--gv-text-secondary);
  font-size: 11px;
  font-weight: 600;
}

.popover-definition {
  font-size: 13px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.popover-definition--error {
  -webkit-line-clamp: unset;
  line-clamp: unset;
  display: block;
  color: #dc2626;
}

:global(.dark) .popover-definition--error {
  color: #f87171;
}

.popover-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid var(--gv-border-principal);
  margin-top: 2px;
  gap: 10px;
}

.popover-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--gv-text-secondary);
  margin-right: auto;
}

.spin-icon {
  width: 14px;
  height: 14px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.popover-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--gv-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
  white-space: nowrap;
}

.popover-link:hover {
  color: var(--gv-primary);
}

:global(.dark) .popover-link:hover {
  color: var(--gv-primary);
}

.popover-enter-active,
.popover-leave-active {
  transition: all 0.35s cubic-bezier(0.705, 0.01, 0, 0.915);
  transform-origin: top left;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(6px);
}

.popover-enter-from.term-popover--mobile,
.popover-leave-to.term-popover--mobile {
  transform: translateY(12px);
}

.term-popover--mobile.popover-enter-active,
.term-popover--mobile.popover-leave-active {
  transform-origin: bottom center;
}
</style>
