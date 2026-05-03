<template>
  <Teleport to="body">
    <Transition name="popover" @after-enter="onPopoverAfterEnter">
      <div
        v-if="visible && term"
        ref="popoverEl"
        class="term-popover"
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
import { useLanguageStore } from '~/stores/language'
import {
  ANCHORED_POPUP_GAP_PX,
  ANCHORED_POPUP_PAD_PX,
  ANCHORED_POPUP_PLAN_WIDTH_PX,
  pickPopupRectFromPoint,
  viewportScreenBox,
} from '~/utils/anchoredPopupPlacement'

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

/** Координаты клика в системе клиента (viewport) — единственный якорь позиции попапа. */
const pointerClient = ref<{ x: number, y: number } | null>(null)
const lastAnchorEl = ref<HTMLElement | null>(null)

const cache = new Map<string, TermData>()

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
 * Позиционирование от точки курсора: высота для расчёта квадранта ограничивается окном и зоной у курсора,
 * чтобы высокий скелетон не раздувал «виртуальный» прямоугольник и не уносил попап вверх.
 */

function syncPopoverLayout() {
  const popup = popoverEl.value
  if (!popup || !visible.value || !pointerClient.value) return

  const { x: cx, y: cy } = pointerClient.value
  const { screenLeft, screenRight, screenTop, screenBottom, winW } = viewportScreenBox()
  const gap = ANCHORED_POPUP_GAP_PX
  const pad = ANCHORED_POPUP_PAD_PX
  const width = Math.min(ANCHORED_POPUP_PLAN_WIDTH_PX, winW - 2 * pad)

  popup.style.maxHeight = ''
  popup.style.overflowY = ''
  void popup.offsetHeight

  const rawNaturalH = popup.getBoundingClientRect().height
  const viewportStrip = screenBottom - screenTop
  /** Высота, которая реально помещается в окно; скелетон часто выше — иначе pickPopupRectFromPoint считает «ящик» огромным и уводит попап далеко вверх от курсора. */
  const viewportCap = Math.max(160, Math.floor(viewportStrip - gap * 4))
  const availBelow = Math.max(0, screenBottom - cy - gap * 2)
  const availAbove = Math.max(0, cy - screenTop - gap * 2)
  const adjacentCap = Math.max(availBelow, availAbove, 140)
  const hPlacement = Math.min(rawNaturalH, viewportCap, adjacentCap)

  let { left, top } = pickPopupRectFromPoint(
    cx,
    cy,
    width,
    hPlacement,
    gap,
    screenLeft,
    screenRight,
    screenTop,
    screenBottom,
  )

  popup.style.position = 'fixed'
  popup.style.left = `${left}px`
  popup.style.top = `${top}px`
  popup.style.width = `${width}px`
  void popup.offsetHeight

  let r = popup.getBoundingClientRect()
  const hRefined = Math.min(r.height, viewportCap, adjacentCap)
  ;({ left, top } = pickPopupRectFromPoint(
    cx,
    cy,
    width,
    hRefined,
    gap,
    screenLeft,
    screenRight,
    screenTop,
    screenBottom,
  ))

  let maxHStr = ''
  if (rawNaturalH > viewportCap) {
    maxHStr = `${viewportCap}px`
  }
  else if (top + r.height > screenBottom - pad) {
    maxHStr = `${Math.max(120, Math.floor(screenBottom - pad - top))}px`
  }

  popup.style.left = `${left}px`
  popup.style.top = `${top}px`
  if (maxHStr) {
    popup.style.maxHeight = maxHStr
    popup.style.overflowY = 'auto'
  }
  else {
    popup.style.maxHeight = ''
    popup.style.overflowY = ''
  }
  void popup.offsetHeight

  const vv = window.visualViewport
  const winH = vv?.height ?? window.innerHeight
  const winLeft = vv?.offsetLeft ?? 0
  const winTop = vv?.offsetTop ?? 0

  if (screenRight <= screenLeft || screenBottom <= screenTop) {
    r = popup.getBoundingClientRect()
    left += winLeft + pad + Math.max(0, (winW - 2 * pad - r.width) / 2) - r.left
    top += winTop + pad + Math.max(0, (winH - 2 * pad - r.height) / 2) - r.top
    popup.style.left = `${left}px`
    popup.style.top = `${top}px`
    void popup.offsetHeight
  }

  for (let pass = 0; pass < 8; pass++) {
    r = popup.getBoundingClientRect()
    let moved = false
    if (r.left < screenLeft) {
      left += screenLeft - r.left
      moved = true
    }
    if (r.right > screenRight) {
      left -= r.right - screenRight
      moved = true
    }
    if (!moved) break
    popup.style.left = `${left}px`
    void popup.offsetHeight
  }

  for (let pass = 0; pass < 8; pass++) {
    r = popup.getBoundingClientRect()
    let moved = false
    if (r.top < screenTop) {
      top += screenTop - r.top
      moved = true
    }
    if (r.bottom > screenBottom) {
      top -= r.bottom - screenBottom
      moved = true
    }
    if (!moved) break
    popup.style.top = `${top}px`
    void popup.offsetHeight
  }

  popoverStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    maxHeight: maxHStr || '',
    overflowY: maxHStr ? 'auto' : '',
    overflow: maxHStr ? 'auto' : '',
    right: 'auto',
    bottom: 'auto',
    zIndex: '1000',
  }

  popup.style.removeProperty('left')
  popup.style.removeProperty('top')
  popup.style.removeProperty('width')
  popup.style.removeProperty('max-height')
  popup.style.removeProperty('overflow-y')
  popup.style.removeProperty('position')
}

function onPopoverAfterEnter() {
  if (!visible.value) return
  syncPopoverLayout()
}

function positionPopover() {
  nextTick(() => {
    if (!popoverEl.value) {
      nextTick(() => syncPopoverLayout())
      return
    }
    syncPopoverLayout()
  })
}

function onViewportResize() {
  if (!visible.value) return
  nextTick(() => syncPopoverLayout())
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
    if (slug) showPopover(slug, termEl, e.clientX, e.clientY)
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

async function showPopover(slug: string, anchor: HTMLElement, clientX: number, clientY: number) {
  loadError.value = false
  pointerClient.value = { x: clientX, y: clientY }
  lastAnchorEl.value = anchor
  term.value = placeholderTerm(slug, anchor)
  positionPopover()
  visible.value = true
  loading.value = true

  if (process.client) await nextTick()

  if (cache.has(slug)) {
    term.value = cache.get(slug)!
    loading.value = false
    loadError.value = false
    positionPopover()
    nextTick(() => syncPopoverLayout())
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
    if (pointerClient.value) positionPopover()
    nextTick(() => syncPopoverLayout())
  }
}

function close() {
  visible.value = false
  term.value = null
  loadError.value = false
  lastAnchorEl.value = null
  pointerClient.value = null
}

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
  -webkit-overflow-scrolling: touch;
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
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
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
</style>
