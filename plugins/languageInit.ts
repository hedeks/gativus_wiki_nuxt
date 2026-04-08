export default defineNuxtPlugin((nuxtApp) => {
  const langStore = useLanguageStore()
  
  // Call init on both SSR and client
  langStore.init()
})
