/**
 * Флаг «навигация через back/forward» выставляется в plugins/router-scroll-history.client.ts
 * (popstate, capture). Сбрасывается при consume после scrollBehavior.
 */
let fromHistory = false

export function markNavFromHistory() {
  fromHistory = true
}

export function consumeNavFromHistory(): boolean {
  const v = fromHistory
  fromHistory = false
  return v
}
