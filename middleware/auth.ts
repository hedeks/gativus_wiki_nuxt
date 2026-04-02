/**
 * Gativus Wiki — Client Auth Middleware
 * Protects /admin/* routes. Apply via definePageMeta({ middleware: 'auth' })
 */

export default defineNuxtRouteMiddleware((to) => {
  const store = userStore()

  if (!store.isLoggedIn) {
    // If store is somehow not initialized (SSR), try to check again
    store.checkAuth()
  }

  if (!store.isLoggedIn) {
    return navigateTo('/login')
  }
})
