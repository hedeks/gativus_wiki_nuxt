<template>
  <Teleport to="body">
    <Transition name="popover">
      <div v-if="visible && term" ref="popoverEl" class="term-popover" :style="popoverStyle" @click.stop>
        <!-- Category pill -->
        <div v-if="term.category_title" class="popover-category"
          :style="term.category_color ? { color: term.category_color } : {}">
          <UIcon v-if="term.category_icon" :name="term.category_icon" class="cat-icon" />
          {{ term.category_title }}
        </div>

        <!-- Title -->
        <div class="popover-title">{{ term.title }}</div>

        <!-- Media Preview -->
        <div v-if="term.image_url || term.video_url" class="popover-media">
          <img v-if="term.image_url" :src="term.image_url" class="media-preview" />
          <video v-else-if="term.video_url" :src="term.video_url" class="media-preview" muted autoplay loop playsinline />
        </div>

        <!-- Aliases -->
        <div v-if="term.aliases?.length" class="popover-aliases">
          <span v-for="alias in term.aliases.slice(0, 3)" :key="alias" class="alias-chip">
            {{ alias }}
          </span>
        </div>

        <!-- Definition -->
        <p class="popover-definition">{{ term.definition }}</p>

        <!-- Footer -->
        <div class="popover-footer">
          <span v-if="loading" class="popover-loading">
            <UIcon name="i-heroicons-arrow-path" class="spin-icon" />
            Загрузка...
          </span>
          <NuxtLink v-if="term.slug" :to="`/glossary/${term.slug}`" class="popover-link" @click="close">
            Открыть статью →
          </NuxtLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
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

const visible = ref(false)
const loading = ref(false)
const term = ref<TermData | null>(null)
const popoverEl = ref<HTMLElement>()
const route = useRoute()

// Close on navigation
watch(() => route.fullPath, () => {
  close()
})

const popoverStyle = ref<{
  top: string
  left: string
  width?: string
}>({
  top: '0px',
  left: '0px',
})

// Cache to avoid repeated fetches
const cache = new Map<string, TermData>()

// Global click handler
function handleDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const termEl = target.closest('.wiki-term') as HTMLElement | null

  if (termEl) {
    e.preventDefault()
    const slug = termEl.dataset.termSlug
    if (slug) showPopover(slug, termEl)
    return
  }

  // Click outside → close
  if (popoverEl.value && !popoverEl.value.contains(target)) {
    close()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

async function showPopover(slug: string, anchor: HTMLElement) {
  // Position
  positionPopover(anchor)
  visible.value = true

  // Use cache if available
  if (cache.has(slug)) {
    term.value = cache.get(slug)!
    loading.value = false
    return
  }

  loading.value = true
  term.value = null
  try {
    const data = await $fetch<any>(`/api/terms/${slug}`)
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
  } catch {
    close()
  } finally {
    loading.value = false
  }
}

function positionPopover(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect()
  const margin = 8
  
  // Estimate or measure width
  // Mobile: take up to 90% of screen, max 320px
  const popoverW = Math.min(320, window.innerWidth - (margin * 2))

  let left = rect.left + window.scrollX
  let top = rect.bottom + window.scrollY + margin

  // Clamp horizontally
  const maxLeft = window.innerWidth - popoverW - margin
  if (left > maxLeft) left = maxLeft
  if (left < margin) left = margin

  // If no space below — show above
  // On mobile, height is more variable, use 300px as safe margin
  if (rect.bottom + 300 > window.innerHeight) {
    top = rect.top + window.scrollY - 300 - margin
    if (top < margin) top = rect.bottom + window.scrollY + margin
  }

  popoverStyle.value = { 
    top: `${top}px`, 
    left: `${left}px`,
    width: `${popoverW}px` 
  }
}

function close() {
  visible.value = false
  term.value = null
}

onMounted(() => {
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.term-popover {
  position: absolute;
  z-index: 1000;
  width: calc(100vw - 32px);
  max-width: 320px;
  background: color-mix(in srgb, var(--gv-surface-card) 94%, transparent);
  backdrop-filter: blur(14px);
  border: 1px solid var(--gv-border-principal);
  border-radius: var(--gv-radius-container);
  padding: 16px;
  box-shadow: var(--gv-shadow-md);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.term-popover:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--gv-surface-card) 96%, transparent);
  border-color: color-mix(in srgb, var(--gv-primary) 38%, var(--gv-border-principal));
  /* Primary sky-600 */
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
  /* Primary sky-500 */
  box-shadow: var(--gv-shadow-lg);
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

:global(.dark) .popover-category {
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

:global(.dark) .popover-title {
  color: var(--gv-text-primary);
}

.popover-media {
  width: 100%;
  height: 140px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--gv-surface-header);
  border: 1px solid var(--gv-border-principal);
}

:global(.dark) .popover-media {
  background: #252528;
  border-color: var(--gv-border-principal);
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

:global(.dark) .alias-chip {
  background: #252525;
  border-color: var(--gv-border-principal);
  color: var(--gv-text-secondary);
}

.popover-definition {
  font-size: 13px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:global(.dark) .popover-definition {
  color: var(--gv-text-secondary);
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

:global(.dark) .popover-footer {
  border-color: var(--gv-border-principal);
}

.popover-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
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

:global(.dark) .popover-link {
  color: var(--gv-text-secondary);
}

.popover-link:hover {
  color: var(--gv-primary);
}

/* Primary sky-600 */
:global(.dark) .popover-link:hover {
  color: var(--gv-primary);
}

/* Primary sky-500 */

/* Transition */
.popover-enter-active,
.popover-leave-active {
  transition: all 0.4s cubic-bezier(0.705, 0.010, 0.000, 0.915);
  transform-origin: top left;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
</style>
