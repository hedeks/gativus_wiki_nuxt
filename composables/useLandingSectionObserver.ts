export function useLandingSectionObserver(blockCount: MaybeRefOrGetter<number>) {
  const landingRef = ref<HTMLElement | null>(null)
  const seen = reactive<boolean[]>([])
  const inBand = reactive<boolean[]>([])
  const position = reactive<('above' | 'below' | 'in')[]>([])
  const ratioSnap = reactive<number[]>([])
  const activeFocusBlock = ref(0)
  const ioInitialized = ref(false)

  let io: IntersectionObserver | null = null

  function syncArrays(n: number) {
    while (seen.length < n) {
      seen.push(false)
      inBand.push(false)
      position.push('below')
      ratioSnap.push(0)
    }
    while (seen.length > n) {
      seen.pop()
      inBand.pop()
      position.pop()
      ratioSnap.pop()
    }
  }

  function blockAnimClass(i: number) {
    if (!ioInitialized.value)
      return 'home-section--idle'
    
    if (inBand[i])
      return 'home-section--enter'
    
    if (position[i] === 'above')
      return 'home-section--leave-up'
    
    return 'home-section--idle' // Default or below
  }

  function applyIoEntries(entries: IntersectionObserverEntry[], count: number) {
    for (const entry of entries) {
      const raw = (entry.target as HTMLElement).dataset.homeBlock
      const idx = raw != null ? Number(raw) : Number.NaN
      if (Number.isNaN(idx) || idx < 0 || idx >= count)
        continue

      const rect = entry.boundingClientRect
      const rootRect = entry.rootBounds
      
      if (rootRect) {
        if (rect.bottom < rootRect.top) {
          position[idx] = 'above'
        } else if (rect.top > rootRect.bottom) {
          position[idx] = 'below'
        } else {
          position[idx] = 'in'
        }
      }

      if (entry.isIntersecting) {
        seen[idx] = true
      }
      
      inBand[idx] = entry.isIntersecting

      const r = entry.isIntersecting ? entry.intersectionRatio : 0
      ratioSnap[idx] = r
    }

    let bestIdx = activeFocusBlock.value
    let bestRatio = -1
    for (let i = 0; i < count; i++) {
      const r = ratioSnap[i] ?? 0
      if (r > bestRatio) {
        bestRatio = r
        bestIdx = i
      }
    }
    if (bestRatio >= 0.04)
      activeFocusBlock.value = bestIdx
  }

  function bindObserver() {
    const root = landingRef.value
    const count = toValue(blockCount)
    if (!root || count <= 0)
      return

    syncArrays(count)
    io?.disconnect()
    io = new IntersectionObserver(
      entries => applyIoEntries(entries, count),
      {
        threshold: [0, 0.04, 0.11, 0.22, 0.38, 0.55, 0.72, 0.9],
        rootMargin: '-8% 0px -10% 0px',
      },
    )
    root.querySelectorAll<HTMLElement>('[data-home-block]').forEach(el => io!.observe(el))
    ioInitialized.value = true
  }

  watch(
    () => toValue(blockCount),
    (n) => {
      syncArrays(n)
      nextTick(bindObserver)
    },
  )

  onMounted(() => {
    nextTick(bindObserver)
  })

  onUnmounted(() => {
    io?.disconnect()
    io = null
  })

  return {
    landingRef,
    seen,
    inBand,
    position,
    activeFocusBlock,
    ioInitialized,
    blockAnimClass,
    bindObserver,
  }
}
