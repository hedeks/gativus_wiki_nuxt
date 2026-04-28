import { useState } from '#app'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

export const useAdminHistory = () => {
  const history = useState<string[]>('admin-history', () => [])
  const router = useRouter()

  const pushRoute = (path: string) => {
    // If the last route is the same, don't add
    if (history.value[history.value.length - 1] === path) return
    
    history.value.push(path)
    
    // Keep only last 5 routes
    if (history.value.length > 5) {
      history.value.shift()
    }
  }

  const goBack = () => {
    if (history.value.length > 1) {
      history.value.pop() // remove current
      const prevPath = history.value[history.value.length - 1]
      router.push(prevPath)
    } else {
      router.push('/admin')
    }
  }

  const canGoBack = computed(() => history.value.length > 1)

  return {
    history,
    pushRoute,
    goBack,
    canGoBack
  }
}
