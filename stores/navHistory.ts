import { defineStore } from 'pinia'

export interface NavEntry {
  path: string
  scroll: number
  isPresentation: boolean
  timestamp: number
}

const MAX_ENTRIES = 15

export const useNavHistoryStore = defineStore('navHistory', {
  state: () => ({
    entries: [] as NavEntry[],
  }),
  actions: {
    record(path: string, scroll: number, isPresentation: boolean) {
      const entry: NavEntry = { path, scroll, isPresentation, timestamp: Date.now() }
      const idx = this.entries.findIndex(e => e.path === path)
      if (idx !== -1) this.entries.splice(idx, 1)
      this.entries.push(entry)
      if (this.entries.length > MAX_ENTRIES) this.entries.shift()
    },
  },
  getters: {
    forPath: (state) => (path: string): NavEntry | undefined =>
      [...state.entries].reverse().find(e => e.path === path),
  },
})
