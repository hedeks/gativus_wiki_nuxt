// composables/useDebounce.ts

/**
 * Возвращает два независимых ref:
 * - `searchQuery` — для v-model (строка)
 * - `debouncedQuery` — для фильтрации (обновляется с задержкой)
 * - `isTyping` — флаг печати
 */
export function useDebounce(initialValue: string = '', delay: number = 300) {
    const searchQuery = ref(initialValue)
    const debouncedQuery = ref(initialValue)
    const isTyping = ref(false)
  
    let timer: ReturnType<typeof setTimeout> | null = null
  
    watch(searchQuery, (newVal) => {
      isTyping.value = true
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        debouncedQuery.value = newVal
        isTyping.value = false
        timer = null
      }, delay)
    })

    onUnmounted(() => {
      if (timer) clearTimeout(timer)
    })

    return {
      searchQuery,
      debouncedQuery,
      isTyping,
    }
  }