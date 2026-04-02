/**
 * Gativus Wiki — Database Seed
 * Populates initial data: root categories, first book.
 * Safe to run multiple times (checks for existence before inserting).
 */

import type { Database } from 'db0'

export async function runSeed(db: Database) {
  console.log('[seed] Checking if seed data is needed...')

  // ─── 1. Root Categories: GTOM, GNET, GATE ───
  const existingCategories = await db.prepare('SELECT COUNT(*) as count FROM categories').get() as any
  if (existingCategories?.count === 0) {
    console.log('[seed] Creating root categories...')

    await db.prepare(
      `INSERT INTO categories (slug, title, description, icon, sort_order, color) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('gtom', 'GTOM — Gativus Theory of Mind', 'Фундаментальная теория, определяющая архитектуру и механику сознания', 'i-heroicons-light-bulb', 1, '#6366f1')

    await db.prepare(
      `INSERT INTO categories (slug, title, description, icon, sort_order, color) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('gnet', 'GNET — Gativus Network', 'Спецификация сетевой топологии, описывающая физическую структуру сети', 'i-heroicons-globe-alt', 2, '#8b5cf6')

    await db.prepare(
      `INSERT INTO categories (slug, title, description, icon, sort_order, color) VALUES (?, ?, ?, ?, ?, ?)`
    ).run('gate', 'GATE — Gativus Edge Device', 'Физическое устройство для хранения, исполнения и защиты узлов нейронной сети', 'i-heroicons-cpu-chip', 3, '#a855f7')

    console.log('[seed] Root categories created ✓')
  }

  // ─── 2. First Book: GTOM ───
  const existingBooks = await db.prepare('SELECT COUNT(*) as count FROM books').get() as any
  if (existingBooks?.count === 0) {
    console.log('[seed] Creating first book (GTOM)...')

    await db.prepare(
      `INSERT INTO books (slug, title, description, sort_order) VALUES (?, ?, ?, ?)`
    ).run('gtom', 'Gativus Theory of Mind', 'Фундаментальная книга проекта Gativus — полная теория сознания', 1)

    console.log('[seed] Book GTOM created ✓')
  }

  // ─── 3. Promote first user to admin ───
  const firstUser = await db.prepare('SELECT id, role FROM users ORDER BY id ASC LIMIT 1').get() as any
  if (firstUser && firstUser.role !== 'admin') {
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', firstUser.id)
    console.log(`[seed] User #${firstUser.id} promoted to admin ✓`)
  }

  console.log('[seed] Seed check completed ✓')
}
