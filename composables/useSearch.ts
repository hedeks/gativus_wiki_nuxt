// composables/useSearch.ts

export function filterBySearch<T extends Record<string, any>>(
    items: T[],
    query: string,
    fields: string[]
  ): T[] {
    if (!query || !query.trim()) return items
  
    const q = query.toLowerCase().trim()
  
    return items.filter((item) =>
      fields.some((field) => {
        const value = item[field]
        if (typeof value !== 'string' || !value.trim()) return false
        return value.toLowerCase().includes(q)
      })
    )
  }
  
  export function countActiveFilters(filters: Record<string, any>): number {
    return Object.values(filters).filter(
      (v) => v !== null && v !== undefined && v !== ''
    ).length
  }

  /** Client-side window for paginated index lists */
  export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
    const p = Math.max(1, page)
    const start = (p - 1) * pageSize
    return items.slice(start, start + pageSize)
  }

  export function totalPagesFor(itemsLength: number, pageSize: number): number {
    if (pageSize <= 0) return 1
    return Math.max(1, Math.ceil(itemsLength / pageSize))
  }