import { requestScrollAfterPageLeave } from '~/utils/pendingRouteScroll'
import { consumeNavFromHistory } from '~/utils/navFromHistory'

/**
 * - Back/forward: savedPosition; без отложенного скролла (см. consumeNavFromHistory).
 * - Тот же path, меняется только query: сохранить Y (фильтры / пагинация).
 * - Смена path (push / обычная ссылка SPA): router не скроллит; верх — в pageTransition.onAfterLeave.
 * - Остальное (в т.ч. первый заход): сразу верх.
 */
export default {
  scrollBehavior(
    to: { path: string; query: Record<string, unknown>; hash?: string },
    from: { path: string; query: Record<string, unknown>; hash?: string } | undefined,
    savedPosition: { left: number; top: number } | undefined
  ) {
    if (savedPosition) {
      if (import.meta.client) consumeNavFromHistory()
      return savedPosition
    }

    const navigatedViaHistory = import.meta.client ? consumeNavFromHistory() : false

    if (
      from &&
      to.path === from.path &&
      JSON.stringify(to.query) !== JSON.stringify(from.query)
    ) {
      if (import.meta.client) {
        return { left: 0, top: window.scrollY }
      }
    }

    if (!import.meta.client) {
      return { top: 0 }
    }

    if (from && to.path !== from.path) {
      if (!navigatedViaHistory) {
        requestScrollAfterPageLeave(to.hash)
      }
      return false
    }

    return { top: 0 }
  },
}
