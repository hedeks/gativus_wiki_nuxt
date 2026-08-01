import { defineStore } from "pinia";
import type { User } from "~/types";

export const userStore = defineStore('user', () => {
    const userInfo = ref<User | null>(null)
    const isLoggedIn = ref(false)
    const token = ref<string | null>(null)

    // Promise Queue state for Re-authentication
    const isReauthenticating = ref(false)
    const reauthPromise = ref<{ resolve: (v: boolean) => void, reject: (err: any) => void } | null>(null)

    // Using Nuxt cookies to persist state across SSR and client
    const tokenCookie = useCookie<string | null>('gativus_token', { maxAge: 60 * 60 * 24 * 30 })
    const userCookie = useCookie<User | null>('gativus_user', { maxAge: 60 * 60 * 24 * 30 })

    /** Initialize state from cookies (works in SSR and client) */
    function checkAuth() {
        if (tokenCookie.value && userCookie.value) {
            token.value = tokenCookie.value
            userInfo.value = userCookie.value
            isLoggedIn.value = true
        }
    }

    /** Set user data after successful login */
    function setUser(user: User, accessToken: string) {
        userInfo.value = user
        token.value = accessToken
        isLoggedIn.value = true

        tokenCookie.value = accessToken
        userCookie.value = user
    }

    /** Clear session */
    function logout() {
        userInfo.value = null
        token.value = null
        isLoggedIn.value = false

        tokenCookie.value = null
        userCookie.value = null
    }

    /** Get Authorization header value for API calls */
    function getAuthHeader(): Record<string, string> {
        if (token.value) {
            return { Authorization: `Bearer ${token.value}` }
        }
        return {}
    }

    /**
     * Starts the re-authentication process by opening the modal and returning a promise.
     * The promise resolves when the user successfully logs in, or rejects if cancelled.
     */
    function startReauth(): Promise<boolean> {
        isReauthenticating.value = true
        return new Promise((resolve, reject) => {
            reauthPromise.value = { resolve, reject }
        })
    }

    /**
     * Finishes the re-authentication process and resolves/rejects the queue.
     */
    function finishReauth(success: boolean) {
        isReauthenticating.value = false
        if (reauthPromise.value) {
            if (success) {
                reauthPromise.value.resolve(true)
            } else {
                reauthPromise.value.reject(new Error('Re-authentication cancelled by user'))
            }
            reauthPromise.value = null
        }
    }

    // Call checkAuth immediately on store creation
    checkAuth()

    return {
        userInfo,
        isLoggedIn,
        token,
        isReauthenticating,
        checkAuth,
        setUser,
        logout,
        getAuthHeader,
        startReauth,
        finishReauth
    }
})