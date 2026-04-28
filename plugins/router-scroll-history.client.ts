import { markNavFromHistory } from '~/utils/navFromHistory'

export default defineNuxtPlugin({
  name: 'gativus-router-scroll-history',
  enforce: 'pre',
  setup() {
    if (typeof window === 'undefined') return

    window.addEventListener(
      'popstate',
      () => {
        markNavFromHistory()
      },
      true
    )

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  },
})
