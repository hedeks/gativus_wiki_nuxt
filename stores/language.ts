import { defineStore } from 'pinia'

export const useLanguageStore = defineStore('language', () => {
  // Try to load from cookie first
  const langCookie = useCookie<string>('gt_lang', {
    default: () => 'ru',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  })
  
  const currentLang = ref<string>(langCookie.value)

  // Initialization check (for reading ?lang= from URL)
  function init() {
    const route = useRoute()
    if (route.query.lang && typeof route.query.lang === 'string') {
      const qLang = route.query.lang.toLowerCase()
      if (['en', 'ru', 'zh'].includes(qLang)) {
        setLanguage(qLang)
      }
    }
  }

  function setLanguage(lang: string) {
    if (['en', 'ru', 'zh'].includes(lang)) {
      currentLang.value = lang
      langCookie.value = lang
    }
  }

  return {
    currentLang,
    setLanguage,
    init
  }
})
