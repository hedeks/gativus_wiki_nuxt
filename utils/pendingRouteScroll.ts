/**
 * Cross-route scroll is deferred until the global page leave transition completes
 * (`out-in`: старый view уже opacity 0), чтобы окно не скроллилось на видимой странице.
 */
let pending = false
let pendingHash = ''

export function requestScrollAfterPageLeave(hash?: string) {
  pending = true
  pendingHash = hash && hash.length > 0 ? hash : ''
}

export function runPendingScrollAfterPageLeave() {
  if (typeof window === 'undefined' || !pending) return

  pending = false
  const hash = pendingHash
  pendingHash = ''

  window.scrollTo(0, 0)

  if (hash) {
    requestAnimationFrame(() => {
      const el = document.querySelector(hash)
      el?.scrollIntoView({ block: 'start' })
    })
  }
}
