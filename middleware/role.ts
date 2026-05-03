/**
 * Gativus Wiki — Client Role Middleware
 * Ensures user has admin role. Apply via definePageMeta({ middleware: ['auth', 'role'] })
 */

export default defineNuxtRouteMiddleware(() => {
  const store = userStore()


  if (store.userInfo?.role !== 'admin' && store.userInfo?.role !== 'editor') {
    const toast = useToast()
    toast.add({
      title: 'Доступ запрещён',
      description: 'Эта страница доступна только администраторам',
      color: 'red'
    })
    return navigateTo('/')
  }
})
