/**
 * Mobile-only horizontal swipe: left → next chapter, right → previous.
 */

export function useMobileChapterSwipe(opts: {
  getNextSlug: () => string | null | undefined
  getPrevSlug: () => string | null | undefined
  isEnabled?: () => boolean
  maxWidthPx?: number
}) {
  if (!import.meta.client) return

  const maxW = opts.maxWidthPx ?? 768
  const threshold = 56
  const verticalDominance = 1.25
  const maxDurationMs = 700

  let startX = 0
  let startY = 0
  let startT = 0
  let touchId: number | null = null

  function isMobileViewport() {
    return typeof window !== 'undefined' && window.innerWidth <= maxW
  }

  function defaultEnabled() {
    return true
  }

  const isEnabled = opts.isEnabled ?? defaultEnabled

  function onTouchStart(e: TouchEvent) {
    if (!isMobileViewport() || !isEnabled()) return
    if (!e.touches.length) return
    const t = e.touches[0]
    touchId = t.identifier
    startX = t.clientX
    startY = t.clientY
    startT = Date.now()
  }

  function onTouchEnd(e: TouchEvent) {
    if (!isMobileViewport() || !isEnabled()) {
      touchId = null
      return
    }
    if (touchId === null) return
    const t = Array.from(e.changedTouches).find(ct => ct.identifier === touchId)
    touchId = null
    if (!t) return

    const dx = t.clientX - startX
    const dy = t.clientY - startY
    const dt = Date.now() - startT

    if (dt > maxDurationMs) return
    if (Math.abs(dy) * verticalDominance > Math.abs(dx)) return
    if (Math.abs(dx) < threshold) return

    if (dx < 0) {
      const slug = opts.getNextSlug()
      if (slug) {
        navigateTo(`/articles/${slug}`)
      }
    } else {
      const slug = opts.getPrevSlug()
      if (slug) {
        navigateTo(`/articles/${slug}`)
      }
    }
  }

  onMounted(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
  })
}
