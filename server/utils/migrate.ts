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
      slug_ru     TEXT,
      title       TEXT NOT NULL,
      title_ru    TEXT,
      parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      description_ru TEXT,
      icon        TEXT,
      sort_order  INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT (datetime('now')),
      lang        TEXT,
      lang_ru     TEXT,
      lang_zh     TEXT
    )
  `)

  // ─── 5. Terms (glossary) ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS terms (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      slug            TEXT UNIQUE NOT NULL,
      slug_ru         TEXT,
      title           TEXT NOT NULL,
      title_ru        TEXT,
      aliases         TEXT,
      definition      TEXT NOT NULL,
      definition_ru   TEXT,
      term_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
      image_url       TEXT,
      video_url       TEXT,
      presentation_path TEXT,
      created_at      DATETIME DEFAULT (datetime('now')),
      updated_at      DATETIME DEFAULT (datetime('now')),
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      lang            TEXT,
      lang_ru         TEXT,
      lang_zh         TEXT
    )
  `)

  // ─── 6. Books ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT UNIQUE NOT NULL,
      title          TEXT NOT NULL,
      title_ru       TEXT,
      title_zh       TEXT,
      description    TEXT,
      description_ru TEXT,
      description_zh TEXT,
      cover_image    TEXT,
      sort_order     INTEGER DEFAULT 0,
      created_at     DATETIME DEFAULT (datetime('now')),
      lang           TEXT,
      lang_ru        TEXT,
      lang_zh        TEXT
    )
  `)

  // ─── 7. Articles ───
  await db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      slug           TEXT UNIQUE NOT NULL,
      title          TEXT NOT NULL,
      title_ru       TEXT,
      title_zh       TEXT,
      html_content   TEXT NOT NULL,
      raw_odt_path   TEXT,
      presentation_path TEXT,
      category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      book_id        INTEGER REFERENCES books(id) ON DELETE SET NULL,
      sort_order     INTEGER DEFAULT 0,
      excerpt        TEXT,
      created_at     DATETIME DEFAULT (datetime('now')),
      updated_at     DATETIME DEFAULT (datetime('now')),
      created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_published   INTEGER DEFAULT 1,
      is_term_article INTEGER NOT NULL DEFAULT 0,
      locale         TEXT NOT NULL DEFAULT 'en',
      origin_id      INTEGER,
      lang           TEXT,
      lang_ru        TEXT,
      lang_zh        TEXT
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

  // ─── 10. Robust Migration Checks (for existing databases) ───
  const tables = ['users', 'categories', 'terms', 'books', 'articles']
  for (const table of tables) {
    try {
      const columns = await db.prepare(`PRAGMA table_info(${table})`).all() as any[]
      const colNames = columns.map(c => c.name)

      const ensureColumn = async (col: string, definition: string) => {
        if (!colNames.includes(col)) {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`)
          console.log(`[migrate] Added "${col}" to ${table}`)
        }
      }

      if (table === 'users') {
        await ensureColumn('role', "TEXT NOT NULL DEFAULT 'editor'")
      }

      if (table === 'articles') {
        await ensureColumn('locale', "TEXT NOT NULL DEFAULT 'en'")
        await ensureColumn('origin_id', 'INTEGER')
        await ensureColumn('presentation_path', 'TEXT')
        await ensureColumn('is_term_article', 'INTEGER NOT NULL DEFAULT 0')
        await ensureColumn('title_ru', 'TEXT')
        await ensureColumn('title_zh', 'TEXT')
        await ensureColumn('lang', 'TEXT')
        await ensureColumn('lang_ru', 'TEXT')
        await ensureColumn('lang_zh', 'TEXT')
      }

      if (table === 'books') {
        await ensureColumn('title_ru', 'TEXT')
        await ensureColumn('title_zh', 'TEXT')
        await ensureColumn('description_ru', 'TEXT')
        await ensureColumn('description_zh', 'TEXT')
        await ensureColumn('lang', 'TEXT')
        await ensureColumn('lang_ru', 'TEXT')
        await ensureColumn('lang_zh', 'TEXT')
      }

      if (table === 'categories') {
        await ensureColumn('title_ru', 'TEXT')
        await ensureColumn('description_ru', 'TEXT')
        await ensureColumn('slug_ru', 'TEXT')
        await ensureColumn('lang', 'TEXT')
        await ensureColumn('lang_ru', 'TEXT')
        await ensureColumn('lang_zh', 'TEXT')
      }

      if (table === 'terms') {
        await ensureColumn('term_article_id', 'INTEGER REFERENCES articles(id) ON DELETE SET NULL')
        await ensureColumn('title_ru', 'TEXT')
        await ensureColumn('definition_ru', 'TEXT')
        await ensureColumn('slug_ru', 'TEXT')
        await ensureColumn('image_url', 'TEXT')
        await ensureColumn('video_url', 'TEXT')
        await ensureColumn('presentation_path', 'TEXT')
        await ensureColumn('lang', 'TEXT')
        await ensureColumn('lang_ru', 'TEXT')
        await ensureColumn('lang_zh', 'TEXT')
      }
    } catch (e) {
      console.warn(`[migrate] Check failed for table ${table}:`, e)
    }
  }

  // Try to drop obsolete locale columns from books
  try {
    await db.exec(`ALTER TABLE books DROP COLUMN locale`)
    await db.exec(`ALTER TABLE books DROP COLUMN origin_id`)
  } catch { /* graceful fail */ }

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
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_terms_term_article_id ON terms(term_article_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_book_categories_book_id ON book_categories(book_id)`)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_book_categories_category_id ON book_categories(category_id)`)

  // ─── 16. Phase 5: Full-Text Search (FTS5) ───
  console.log('[migrate] Setting up FTS5 search indexing...')
  
  await db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS wiki_fts USING fts5(
      id UNINDEXED,
      type UNINDEXED,
      title,
      content,
      slug UNINDEXED,
      locale UNINDEXED,
      tokenize='unicode61'
    )
  `)

  // Create Triggers for Articles
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS tr_articles_insert AFTER INSERT ON articles BEGIN
      INSERT INTO wiki_fts(id, type, title, content, slug, locale)
      VALUES (new.id, 'article', new.title, new.html_content, new.slug, new.locale);
    END;
  `)
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS tr_articles_update AFTER UPDATE ON articles BEGIN
      UPDATE wiki_fts SET
        title = new.title,
        content = new.html_content,
        slug = new.slug,
        locale = new.locale
      WHERE id = old.id AND type = 'article';
    END;
  `)
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS tr_articles_delete AFTER DELETE ON articles BEGIN
      DELETE FROM wiki_fts WHERE id = old.id AND type = 'article';
    END;
  `)

  // Create Triggers for Terms
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS tr_terms_insert AFTER INSERT ON terms BEGIN
      INSERT INTO wiki_fts(id, type, title, content, slug, locale)
      VALUES (new.id, 'term', new.title, new.definition, new.slug, 'en');
    END;
  `)
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS tr_terms_update AFTER UPDATE ON terms BEGIN
      UPDATE wiki_fts SET
        title = new.title,
        content = new.definition,
        slug = new.slug
      WHERE id = old.id AND type = 'term';
    END;
  `)
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS tr_terms_delete AFTER DELETE ON terms BEGIN
      DELETE FROM wiki_fts WHERE id = old.id AND type = 'term';
    END;
  `)

  // Populate data if empty (Initial seed)
  const ftsCount = await db.prepare('SELECT COUNT(*) as count FROM wiki_fts').get() as any
  if (ftsCount?.count === 0) {
    console.log('[migrate] Initializing FTS5 indices from existing data...')
    await db.exec(`
      INSERT INTO wiki_fts(id, type, title, content, slug, locale)
      SELECT id, 'article', title, html_content, slug, locale FROM articles;
    `)
    await db.exec(`
      INSERT INTO wiki_fts(id, type, title, content, slug, locale)
      SELECT id, 'term', title, definition, slug, 'en' FROM terms;
    `)
  }

  // Synchronize Article Category/Book across translations
  try {
    console.log('[migrate] Synchronizing article metadata (category/book) across translations...')
    await db.exec(`
      UPDATE articles 
      SET 
        category_id = (SELECT category_id FROM articles origin WHERE origin.id = articles.origin_id),
        book_id = (SELECT book_id FROM articles origin WHERE origin.id = articles.origin_id)
      WHERE origin_id IS NOT NULL AND origin_id != id
    `)
  } catch (e) {
    console.log('[migrate] Article synchronization failed (possibly origin_id NULL):', e)
  }

  console.log('[migrate] All migrations completed ✓')
}
