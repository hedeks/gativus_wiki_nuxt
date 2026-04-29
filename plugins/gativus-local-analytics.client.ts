export default defineNuxtPlugin(() => {
  const presence = useSitePresence()
  presence.hydrate()
  presence.start()

  useReadingProgress().hydrate()
})
