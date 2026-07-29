/**

 * Собирает строку для FTS5 MATCH из пользовательского ввода:

 * — убирает метасимволы FTS (- " * OR …), чтобы запрос не превращался в синтаксическую ошибку или «тихий» NOT;

 * — каждый токен в двойных кавычках + префикс *, токены объединяются через AND (пробел).

 */

export function buildWikiFtsPrefixMatch(raw: string): string | null {
  const normalized = raw.normalize('NFKC').trim()
  if (!normalized)
    return null

  // Заменяем все символы, не являющиеся буквами или цифрами, на пробел.
  // Это позволит корректно разбивать слова с дефисами (k-вектор -> k вектор),
  // чтобы FTS5 мог найти их через AND.
  const cleanStr = normalized.replace(/[^\p{L}\p{N}_]+/gu, ' ')
  
  const segments = cleanStr.split(/\s+/).filter(Boolean)
  const tokens: string[] = []

  for (const t of segments) {
    if (!t)
      continue
    // Оставляем все слова, включая однобуквенные (важно для k-вектор, x-ray и т.д.)
    tokens.push(t)
  }

  if (tokens.length === 0)
    return null

  // Собираем токены через пробел. В синтаксисе FTS5 пробел означает AND.
  // Оборачиваем в кавычки для защиты от служебных слов FTS (OR, NOT).
  return tokens
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' ')
}



/** Экранирование для LIKE … ESCAPE '\\' */

export function escapeSqlLikePattern(s: string): string {

  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

}


