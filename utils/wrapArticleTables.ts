/**
 * Оборачивает каждый корневой <table>...</table> в <div class="article-table-scroll">,
 * чтобы overflow-x был только у таблицы, а не у всего блока статьи.
 * Учитывает вложенные таблицы (один блок от внешнего <table> до парного </table>).
 */
export function wrapArticleTables(html: string): string {
  if (!html || !/<table\b/i.test(html))
    return html

  const lc = html.toLowerCase()
  let out = ''
  let i = 0

  while (i < html.length) {
    const open = lc.indexOf('<table', i)
    if (open === -1) {
      out += html.slice(i)
      break
    }

    out += html.slice(i, open)

    let depth = 1
    let pos = open + 6
    let end = -1

    while (depth > 0 && pos < html.length) {
      const nextOpen = lc.indexOf('<table', pos)
      const nextClose = lc.indexOf('</table>', pos)

      if (nextClose === -1) {
        out += html.slice(open)
        return out
      }

      const useOpen = nextOpen !== -1 && nextOpen < nextClose

      if (useOpen) {
        depth++
        pos = nextOpen + 6
      }
      else {
        depth--
        pos = nextClose + 8
        if (depth === 0)
          end = pos
      }
    }

    if (end === -1) {
      out += html.slice(open)
      break
    }

    const inner = html.slice(open, end)
    out += `<div class="article-table-scroll">${inner}</div>`
    i = end
  }

  return out
}
