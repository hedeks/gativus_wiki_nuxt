/**
 * Mobile chapter swipe is disabled per user preference.
 * Only native vertical scrolling and table horizontal scrolling are active.
 */

export function useMobileChapterSwipe(_opts?: {
  getNextSlug?: () => string | null | undefined
  getPrevSlug?: () => string | null | undefined
  isEnabled?: () => boolean
  maxWidthPx?: number
}) {
  // No-op
}
