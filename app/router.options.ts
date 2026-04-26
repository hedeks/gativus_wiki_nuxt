/**
 * Preserve scroll when only query changes on the same path (pagination / filters on index pages).
 */
export default {
  scrollBehavior(
    to: { path: string; query: Record<string, unknown>; hash?: string },
    from: { path: string; query: Record<string, unknown>; hash?: string } | undefined,
    savedPosition: { left: number; top: number } | undefined
  ) {
    if (savedPosition) return savedPosition

    if (
      from &&
      to.path === from.path &&
      JSON.stringify(to.query) !== JSON.stringify(from.query)
    ) {
      if (import.meta.client) {
        return { left: 0, top: window.scrollY }
      }
    }

    return { top: 0 }
  },
}
