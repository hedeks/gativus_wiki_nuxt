// composables/usePageState.ts

interface UsePageStateOptions<T> {
    /** Функция, возвращающая данные (должна быть обёрткой над $fetch / useFetch) */
    fetchFn: (params: {
      page: number
      search: string
      filters: Record<string, any>
    }) => Promise<T>
  
    /** Начальные значения фильтров */
    initialFilters?: Record<string, string | number | null>
  
    /** Задержка debounce для поиска (мс) */
    debounceMs?: number
  
    /** Начальная страница */
    initialPage?: number
  }
  
  export function usePageState<T = any>(options: UsePageStateOptions<T>) {
    const {
      fetchFn,
      initialFilters = {},
      debounceMs = 600,
      initialPage = 1,
    } = options
  
    // ---- State ----
    const searchQuery = ref('')
    const debouncedSearch = ref('')
    const isTyping = ref(false)
    const pending = ref(true)
    const error = ref<any>(null)
    const data = ref<T | null>(null) as Ref<T | null>
    const page = ref(initialPage)
  
    // Создаём refs для каждого фильтра
    const filters = reactive<Record<string, any>>({})
    for (const [key, defaultValue] of Object.entries(initialFilters)) {
      filters[key] = ref(defaultValue)
    }
  
    // ---- Debounce logic ----
    let searchTimer: ReturnType<typeof setTimeout> | null = null
  
    watch(searchQuery, (newVal) => {
      isTyping.value = true
      if (searchTimer) clearTimeout(searchTimer)
      searchTimer = setTimeout(() => {
        debouncedSearch.value = newVal
        page.value = 1 // сброс страницы при новом поиске
        isTyping.value = false
      }, debounceMs)
    })
  
    // Сброс страницы при изменении любого фильтра
    watch(
      () => ({ ...filters }),
      () => {
        page.value = 1
      }
    )
  
    // ---- Fetch logic ----
    async function refresh() {
      pending.value = true
      error.value = null
      try {
        // Собираем плоский объект фильтров
        const flatFilters: Record<string, any> = {}
        for (const key of Object.keys(filters)) {
          flatFilters[key] = filters[key].value
        }
  
        data.value = await fetchFn({
          page: page.value,
          search: debouncedSearch.value,
          filters: flatFilters,
        })
      } catch (e) {
        error.value = e
        data.value = null
      } finally {
        pending.value = false
      }
    }
  
    // Авто-обновление при изменении зависимостей
    watch([debouncedSearch, page, () => ({ ...filters })], () => {
      refresh()
    })
  
    // ---- Filter helpers ----
    function setFilter(key: string, value: any) {
      if (filters[key]) {
        filters[key].value = value
      }
    }
  
    function toggleFilter(key: string, value: any) {
      if (!filters[key]) return
      filters[key].value = filters[key].value === value ? null : value
    }
  
    function resetFilters() {
      for (const key of Object.keys(filters)) {
        filters[key].value = initialFilters[key] ?? null
      }
      searchQuery.value = ''
    }
  
    function getFilterValue(key: string) {
      return filters[key]?.value ?? null
    }
  
    // ---- Initial fetch ----
    // Вызывается в setup вручную, либо автоматом через watch выше
  
    return {
      // State
      searchQuery,
      debouncedSearch,
      isTyping,
      pending,
      error,
      data,
      page,
      filters,
  
      // Methods
      refresh,
      setFilter,
      toggleFilter,
      resetFilters,
      getFilterValue,
    }
  }