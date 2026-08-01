import { userStore } from '~/stores/userStore'

export default defineNuxtPlugin((nuxtApp) => {
  // We keep a queue of unresolved promises when re-authenticating
  let requestQueue: { resolve: (token: string | null) => void; reject: (err: any) => void }[] = []
  
  // We save the original fetch to fallback or use as base
  const originalFetch = globalThis.$fetch

  const processQueue = (error: Error | null, token: string | null = null) => {
    requestQueue.forEach(prom => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(token)
      }
    })
    requestQueue = []
  }

  // Override the global $fetch by wrapping it
  const customFetch = async (request: any, options: any = {}) => {
    const store = userStore()
    const requestUrl = request.toString()
    const isLoginReq = requestUrl.includes('/api/auth/login')

    // 1. Pause request if already reauthenticating
    if (store.isReauthenticating && !isLoginReq) {
      const token = await new Promise<string | null>((resolve, reject) => {
        requestQueue.push({ resolve, reject })
      })
      if (token) {
        options.headers = options.headers || {}
        options.headers.Authorization = `Bearer ${token}`
      }
    } 
    // 2. Otherwise, inject token if available
    else if (store.token && !isLoginReq) {
      options.headers = options.headers || {}
      options.headers.Authorization = `Bearer ${store.token}`
    }

    try {
      // Execute request
      return await originalFetch(request, options)
    } catch (err: any) {
      // 3. Intercept 401 Unauthorized
      if (err?.response?.status === 401 && !isLoginReq) {
        if (!store.isReauthenticating) {
          // Trigger UI modal
          store.startReauth()
            .then(success => {
              if (success) {
                processQueue(null, store.token)
              } else {
                processQueue(new Error('Re-authentication cancelled by user'))
              }
            })
            .catch(e => {
              processQueue(e)
            })
        }

        // Put this failed request in the queue to await reauth
        const token = await new Promise<string | null>((resolve, reject) => {
          requestQueue.push({ resolve, reject })
        })

        // Retry the original request with new token
        options.headers = options.headers || {}
        options.headers.Authorization = `Bearer ${token}`
        return await originalFetch(request, options)
      }

      throw err
    }
  }

  // Preserve ofetch properties (raw, create, etc.)
  Object.assign(customFetch, originalFetch)

  globalThis.$fetch = customFetch as any
})
