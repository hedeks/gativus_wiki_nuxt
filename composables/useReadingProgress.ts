export interface ReadingProgress {
  book_slug: string
  book_title?: string
  article_slug: string
  article_title?: string
  sort_order?: number | null
  progress_percent?: number
  anchor?: string | null
  updated_at: string
}

const STORAGE_KEY = 'gativus_reading_progress_v2'

let syncTimer: ReturnType<typeof setTimeout> | null = null

export function useReadingProgress() {
  const localProgressMap = useState<Record<string, ReadingProgress>>('gv-reading-progress-map', () => ({}))

  function hydrate(): void {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        localProgressMap.value = { ...JSON.parse(raw) }
      }
    } catch {}
  }

  function saveProgress(prog: ReadingProgress, immediateSync = false) {
    if (!import.meta.client) return
    
    // 1. Save synchronously to LocalStorage
    localProgressMap.value = { ...localProgressMap.value, [prog.book_slug]: prog }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localProgressMap.value))

    // 2. Sync to Server (debounced)
    if (syncTimer) clearTimeout(syncTimer)

    const doSync = () => {
      const store = userStore()
      if (store.isLoggedIn) {
        $fetch('/api/user/reading-progress', {
          method: 'POST',
          body: {
            bookSlug: prog.book_slug,
            bookTitle: prog.book_title,
            articleSlug: prog.article_slug,
            articleTitle: prog.article_title,
            sortOrder: prog.sort_order,
            progressPercent: prog.progress_percent,
            anchor: prog.anchor
          },
          headers: store.token ? { Authorization: `Bearer ${store.token}` } : {}
        }).catch(() => {})
      }
    }

    if (immediateSync) {
      doSync()
    } else {
      syncTimer = setTimeout(doSync, 5000) // 5 seconds debounce
    }
  }

  function normalizeDateStr(d: string): string {
    if (!d) return ''
    if (d.includes('T') || d.endsWith('Z') || d.includes('+')) return d
    return d.replace(' ', 'T') + 'Z'
  }

  function mergeWithServer(serverList: any[] | undefined): any[] {
    if (!serverList) serverList = []
    
    const merged: Record<string, any> = {}
    
    // Add server items
    for (const s of serverList) {
      merged[s.book_slug] = { ...s }
    }
    
    // Override with local items if they are newer
    for (const [slug, local] of Object.entries(localProgressMap.value)) {
      const server = merged[slug]
      if (!server) {
        merged[slug] = { ...local }
        continue
      }
      
      const localTime = new Date(local.updated_at).getTime()
      const serverTime = new Date(normalizeDateStr(server.updated_at)).getTime()
      
      if (localTime >= serverTime) {
        merged[slug] = { ...server, ...local }
      }
    }
    
    return Object.values(merged).sort((a, b) => {
      const tA = new Date(normalizeDateStr(a.updated_at)).getTime()
      const tB = new Date(normalizeDateStr(b.updated_at)).getTime()
      return tB - tA
    })
  }

  return { localProgressMap, hydrate, saveProgress, mergeWithServer }
}
