import { defineStore } from "pinia";
import type { User } from "~/types";

export const userStore = defineStore('user', () => {
    const userInfo = ref<User | null>(null)
    const isLoggedIn = ref(false)
    const token = ref<string | null>(null)

    // Using Nuxt cookies to persist state across SSR and client
    const tokenCookie = useCookie<string | null>('gativus_token', { maxAge: 60 * 60 * 24 })
    const userCookie = useCookie<User | null>('gativus_user', { maxAge: 60 * 60 * 24 })

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

    // Call checkAuth immediately on store creation
    checkAuth()

    return {
        userInfo,
        isLoggedIn,
        token,
        checkAuth,
        setUser,
        logout,
        getAuthHeader
    }
})