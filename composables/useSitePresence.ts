/**
 * Накопление времени на сайте (активная вкладка) в localStorage.
 * Дни в локальной таймзоне, ключ YYYY-MM-DD.
 */

const STORAGE_KEY = 'gativus_site_presence_v1'

export interface SitePresenceState {
  totalSeconds: number
  byDay: Record<string, number>
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useSitePresence() {
  const state = useState<SitePresenceState>('gv-site-presence', () => ({
    totalSeconds: 0,
    byDay: {},
  }))

  function hydrate(): void {
    if (!import.meta.client)
      return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw)
        return
      const p = JSON.parse(raw) as Partial<SitePresenceState>
      if (p && typeof p.totalSeconds === 'number' && p.byDay && typeof p.byDay === 'object') {
        state.value = {
          totalSeconds: p.totalSeconds,
          byDay: { ...p.byDay },
        }
      }
    }
    catch {
      /* ignore corrupt */
    }
  }

  function persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
  }

  function addSeconds(seconds: number): void {
    if (seconds <= 0)
      return
    const key = dayKey(new Date())
    const byDay = { ...state.value.byDay }
    byDay[key] = (byDay[key] || 0) + seconds
    state.value = {
      totalSeconds: state.value.totalSeconds + seconds,
      byDay,
    }
    persist()
  }

  /** Запуск тикающего учёта (только клиент). */
  function start(): void {
    let lastMark = Date.now()

    function tick(): void {
      const now = Date.now()
      if (document.visibilityState === 'visible') {
        const secs = Math.floor((now - lastMark) / 1000)
        if (secs > 0)
          addSeconds(secs)
      }
      lastMark = now
    }

    const interval = setInterval(tick, 10_000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pagehide', tick)
  }

  /** Последние 7 календарных дней (включая сегодня), от YYYY-MM-DD к метке для оси X. */
  function last7DayKeys(): { key: string, label: string }[] {
    const out: { key: string, label: string }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = dayKey(d)
      const label = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })
      out.push({ key, label })
    }
    return out
  }

  return { state, hydrate, start, last7DayKeys, dayKey }
}
