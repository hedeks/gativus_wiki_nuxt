/**
 * Gativus Wiki — Database Initialization Plugin
 * Runs migrations and seed data on server startup.
 */

import { runMigrations } from '../utils/migrate'
import { runSeed } from '../utils/seed'

export default defineNitroPlugin(async () => {
  try {
    const db = useDatabase()
    await runMigrations(db)
    await runSeed(db)
    console.log('[dbInit] Database initialized successfully ✓')
  } catch (error) {
    console.error('[dbInit] Database initialization failed:', error)
  }
})
