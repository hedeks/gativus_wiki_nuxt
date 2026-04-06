/**
 * Gativus Wiki — Database Migrations
 * Creates all required tables for the wiki system.
 * Safe to run multiple times (uses IF NOT EXISTS / column existence checks).
 */

import type { Database } from 'db0'

export async function runMigrations(db: Database) {
  console.log('[migrate] Running database migrations...')

  // Enable WAL mode and busy timeout to prevent "database is locked" errors
  await db.exec(`PRAGMA journal_mode = WAL`)
  await db.exec(`PRAGMA busy_timeout = 5000`)

  // ─── 1. Ensure 'role' column exists in users table ───
  try {
    const columns = await db.prepare('PRAGMA table_info(users)').all()
    const hasRole = (columns as any[]).some((col: any) => col.name === 'role')
    if (!hasRole) {
      await db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'editor'`)
      console.log('[migrate] Added "role" column to users table')
    }
  } catch {
    // Table might not exist yet — will be created below
  }

  // ─── 2. Users table (CREATE IF NOT EXISTS for fresh installs) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      login              TEXT UNIQUE NOT NULL,
      email              TEXT UNIQUE NOT NULL,
      encrypted_password TEXT NOT NULL,
      role               TEXT NOT NULL DEFAULT 'editor',
      uuid               TEXT UNIQUE,
      created_at         DATETIME DEFAULT (datetime('now')),
      last_visited       DATETIME
    )
  `)

  // ─── 3. Sessions (already exists, ensure it's there) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid    TEXT,
      bearer  TEXT
    )
  `)

  // ─── 4. Categories (self-referencing tree) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT UNIQUE NOT NULL,
      title       TEXT NOT NULL,
      parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      icon        TEXT,
      sort_order  INTEGER DEFAULT 0,
      color       TEXT,
      created_at  DATETIME DEFAULT (datetime('now'))
    )
  `)

  // ─── 5. Terms (glossary) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS terms (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT UNIQUE NOT NULL,
      title       TEXT NOT NULL,
      aliases     TEXT,
      definition  TEXT NOT NULL,
      full_html   TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      created_at  DATETIME DEFAULT (datetime('now')),
      updated_at  DATETIME DEFAULT (datetime('now')),
      created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // ─── 6. Books ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT UNIQUE NOT NULL,
      title       TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT (datetime('now'))
    )
  `)

  // ─── 7. Articles ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT UNIQUE NOT NULL,
      title          TEXT NOT NULL,
      html_content   TEXT NOT NULL,
      raw_odt_path   TEXT,
      category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      book_id        INTEGER REFERENCES books(id) ON DELETE SET NULL,
      sort_order     INTEGER DEFAULT 0,
      excerpt        TEXT,
      created_at     DATETIME DEFAULT (datetime('now')),
      updated_at     DATETIME DEFAULT (datetime('now')),
      created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_published   INTEGER DEFAULT 1
    )
  `)

  // ─── 8. Article ↔ Term (many-to-many) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS article_terms (
      article_id  INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      term_id     INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      PRIMARY KEY (article_id, term_id)
    )
  `)

  // ─── 9. Article Revisions ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS article_revisions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id     INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      html_content   TEXT NOT NULL,
      revision_num   INTEGER NOT NULL,
      change_summary TEXT,
      created_at     DATETIME DEFAULT (datetime('now')),
      created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // ─── 10. Locale & origin_id for articles (i18n readiness) ───
  try {
    const artCols = await db.prepare('PRAGMA table_info(articles)').all() as any[]
    if (!artCols.some((c: any) => c.name === 'locale')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'`)
      console.log('[migrate] Added "locale" column to articles')
    }
    if (!artCols.some((c: any) => c.name === 'origin_id')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN origin_id INTEGER`)
      console.log('[migrate] Added "origin_id" column to articles')
    }
    if (!artCols.some((c: any) => c.name === 'presentation_path')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN presentation_path TEXT`)
      console.log('[migrate] Added "presentation_path" column to articles')
    }
  } catch { /* table may not exist yet — created above */ }

  // ─── 11. Locale & origin_id for books ───
  try {
    const bookCols = await db.prepare('PRAGMA table_info(books)').all() as any[]
    if (!bookCols.some((c: any) => c.name === 'locale')) {
      await db.exec(`ALTER TABLE books ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'`)
      console.log('[migrate] Added "locale" column to books')
    }
    if (!bookCols.some((c: any) => c.name === 'origin_id')) {
      await db.exec(`ALTER TABLE books ADD COLUMN origin_id INTEGER`)
      console.log('[migrate] Added "origin_id" column to books')
    }
  } catch { /* table may not exist yet — created above */ }

  // ─── 12. Book ↔ Category (many-to-many) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS book_categories (
      book_id      INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, category_id)
    )
  `)

  // ─── 13. Indexes ───
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_terms_slug ON terms(slug)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_book_id ON articles(book_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_terms_category_id ON terms(category_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_locale ON articles(locale)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_articles_origin_id ON articles(origin_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_books_locale ON books(locale)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_book_categories_book_id ON book_categories(book_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_book_categories_category_id ON book_categories(category_id)`)

  console.log('[migrate] All migrations completed ✓')
}
