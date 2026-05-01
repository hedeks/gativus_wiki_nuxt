/**

 * Собирает строку для FTS5 MATCH из пользовательского ввода:

 * — убирает метасимволы FTS (- " * OR …), чтобы запрос не превращался в синтаксическую ошибку или «тихий» NOT;

 * — каждый токен в двойных кавычках + префикс *, токены объединяются через AND (пробел).

 */

export function buildWikiFtsPrefixMatch(raw: string): string | null {

  const normalized = raw.normalize('NFKC').trim()

  if (!normalized)

    return null



  const segments = normalized.split(/\s+/).filter(Boolean)

  const tokens: string[] = []



  for (const seg of segments) {

    const t = seg.replace(/[^\p{L}\p{N}_]+/gu, '')

    if (!t)

      continue

    if (t.length >= 2) {

      tokens.push(t)

      continue

    }

    const cp = t.codePointAt(0)!

    if (cp > 127)

      tokens.push(t)

  }



  if (tokens.length === 0)

    return null



  return tokens

    .map((t) => `"${t.replace(/"/g, '""')}"*`)

    .join(' ')

}



/** Экранирование для LIKE … ESCAPE '\\' */

export function escapeSqlLikePattern(s: string): string {

  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

}


