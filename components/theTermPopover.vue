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
          <NuxtLink v-if="term.slug" :to="`/glossary/${term.slug}`" class="popover-link">
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
}

const visible = ref(false)
const loading = ref(false)
const term = ref<TermData | null>(null)
const popoverEl = ref<HTMLElement>()

const popoverStyle = ref({
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
  const popoverW = 320
  const margin = 8

  let left = rect.left + window.scrollX
  let top = rect.bottom + window.scrollY + margin

  // Clamp horizontally
  const maxLeft = window.innerWidth - popoverW - margin
  if (left > maxLeft) left = maxLeft
  if (left < margin) left = margin

  // If no space below — show above
  if (rect.bottom + 260 > window.innerHeight) {
    top = rect.top + window.scrollY - 260 - margin
    if (top < margin) top = rect.bottom + window.scrollY + margin
  }

  popoverStyle.value = { top: `${top}px`, left: `${left}px` }
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
  z-index: 100;
  width: 320px;
  background: rgba(255, 255, 255, 0.90);
  backdrop-filter: blur(16px);
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 0 2px rgba(34, 60, 80, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.term-popover:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.95);
  border-color: #0284c7;
  /* Primary sky-600 */
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
}

:global(.dark) .term-popover {
  background: rgba(26, 26, 26, 0.90);
  border-color: #3a3a3a;
  box-shadow: 0 0 2px rgba(50, 50, 50, 0.3);
}

:global(.dark) .term-popover:hover {
  background: rgba(26, 26, 26, 0.95);
  border-color: #0ea5e9;
  /* Primary sky-500 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.popover-category {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #333333;
}

:global(.dark) .popover-category {
  color: #e5e5e5;
}

.cat-icon {
  width: 14px;
  height: 14px;
}

.popover-title {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
  line-height: 1.4;
  margin-bottom: 2px;
}

:global(.dark) .popover-title {
  color: #e5e5e5;
}

.popover-aliases {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.alias-chip {
  padding: 4px 10px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #e9e9e9;
  color: #666666;
  font-size: 12px;
  font-weight: 500;
}

:global(.dark) .alias-chip {
  background: #252525;
  border-color: #3a3a3a;
  color: #999999;
}

.popover-definition {
  font-size: 13px;
  line-height: 1.5;
  color: #555555;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:global(.dark) .popover-definition {
  color: #aaaaaa;
}

.popover-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid #e9e9e9;
  margin-top: 2px;
  gap: 10px;
}

:global(.dark) .popover-footer {
  border-color: #3a3a3a;
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
  color: #666666;
  text-decoration: none;
  transition: color 0.15s;
  white-space: nowrap;
}

:global(.dark) .popover-link {
  color: #999999;
}

.popover-link:hover {
  color: #0284c7;
}

/* Primary sky-600 */
:global(.dark) .popover-link:hover {
  color: #0ea5e9;
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
