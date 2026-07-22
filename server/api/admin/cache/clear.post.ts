/**
 * POST /api/admin/cache/clear
 * Clears the entire server-side cache (Nitro unstorage).
 * Role: admin.
 */

export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  
  try {
    const storage = useStorage('cache')
    await storage.clear()
    
    return {
      success: true,
      message: 'Серверный кеш успешно очищен.'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Ошибка при очистке кеша: ' + error.message
    })
  }
})
