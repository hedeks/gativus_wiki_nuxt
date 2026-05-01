/** Убирает HTML-теги из slug — иначе из БД/FTS мог попасть фрагмент вида `<b>word</b>` и сломать URL. */
export function sanitizeSlugForPath(raw: unknown): string {
  return String(raw ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

/**
 * Snippet из FTS может содержать разметку из индексированного HTML (в т.ч. `<a href>`).
 * Для UI оставляем только безопасные выделения `<b>` / `<strong>`.
 */
export function sanitizeSearchSnippet(html: string | undefined | null): string {
  if (!html)
    return ''
  let s = String(html)
  s = s.replace(/<\/(?:script|style)\b[^>]*>/gi, '')
  s = s.replace(/<\/?(?:script|style)\b[^>]*>/gi, '')
  s = s.replace(/<\/?a\b[^>]*>/gi, '')
  s = s.replace(/<\/?(?:iframe|object|embed|form)\b[^>]*>/gi, '')
  s = s.replace(/ on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  return s
}
