import { useState } from '#app'
import { computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'

/** Одна точка стека «Назад»: полный путь (включая query/hash) + позиция скролла окна */
export interface AdminHistoryEntry {
  fullPath: string
  scrollY: number
}

const HISTORY_KEY = 'admin-history-v2'
const MAX_LEN = 5

function scrollTop(): number {
  if (typeof window === 'undefined') return 0
  return window.scrollY ?? document.documentElement.scrollTop ?? 0
}

function restoreScroll(y: number) {
  if (typeof window === 'undefined') return
  const ySafe = Math.max(0, y)
  const apply = () => {
    window.scrollTo({ top: ySafe, behavior: 'auto' })
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      apply()
      requestAnimationFrame(apply)
    })
    setTimeout(apply, 80)
    setTimeout(apply, 380)
  })
}

export const useAdminHistory = () => {
  const history = useState<AdminHistoryEntry[]>(HISTORY_KEY, () => [])
  const router = useRouter()

  const pushRoute = (fullPath: string) => {
    if (!fullPath.startsWith('/admin')) return

    const last = history.value[history.value.length - 1]
    if (last?.fullPath === fullPath) return

    if (history.value.length > 0) {
      const prev = history.value[history.value.length - 1]
      history.value[history.value.length - 1] = {
        ...prev,
        scrollY: scrollTop(),
      }
    }

    history.value.push({ fullPath, scrollY: 0 })

    while (history.value.length > MAX_LEN) {
      history.value.shift()
    }
  }

  const goBack = () => {
    if (history.value.length <= 1) {
      router.push('/admin')
      return
    }

    history.value.pop()
    const prev = history.value[history.value.length - 1]

    router.push(prev.fullPath).then(() => {
      restoreScroll(prev.scrollY ?? 0)
    })
  }

  const canGoBack = computed(() => history.value.length > 1)

  return {
    history,
    pushRoute,
    goBack,
    canGoBack,
  }
}
