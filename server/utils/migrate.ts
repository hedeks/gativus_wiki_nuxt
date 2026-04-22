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
      created_at     DATETIME DEFAULT (datetime('now'))
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

  // ─── 11. Multi-language columns for books (title/description variants) ───
  try {
    const bookCols = await db.prepare('PRAGMA table_info(books)').all() as any[]
    
    if (!bookCols.some((c: any) => c.name === 'title_ru')) {
      await db.exec(`ALTER TABLE books ADD COLUMN title_ru TEXT`)
      console.log('[migrate] Added title_ru to books')
    }
    if (!bookCols.some((c: any) => c.name === 'title_zh')) {
      await db.exec(`ALTER TABLE books ADD COLUMN title_zh TEXT`)
      console.log('[migrate] Added title_zh to books')
    }
    if (!bookCols.some((c: any) => c.name === 'description_ru')) {
      await db.exec(`ALTER TABLE books ADD COLUMN description_ru TEXT`)
      console.log('[migrate] Added description_ru to books')
    }
    if (!bookCols.some((c: any) => c.name === 'description_zh')) {
      await db.exec(`ALTER TABLE books ADD COLUMN description_zh TEXT`)
      console.log('[migrate] Added description_zh to books')
    }
  } catch (e) {
    console.warn('[migrate] Book localized columns update failed:', e)
  }
  
  // Try to drop obsolete locale columns from books
  try {
    await db.exec(`ALTER TABLE books DROP COLUMN locale`)
    await db.exec(`ALTER TABLE books DROP COLUMN origin_id`)
  } catch { /* graceful fail if columns don't exist or sqlite version is too old */ }

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

  // ─── 14. Phase 3: Glossary ───
  // Add is_term_article flag to articles
  try {
    const artCols3 = await db.prepare('PRAGMA table_info(articles)').all() as any[]
    if (!artCols3.some((c: any) => c.name === 'is_term_article')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN is_term_article INTEGER NOT NULL DEFAULT 0`)
      console.log('[migrate] Added "is_term_article" column to articles')
    }
  } catch { /* table may not exist yet */ }

  // Add term_article_id to terms (replaces full_html + category_id)
  try {
    const termCols = await db.prepare('PRAGMA table_info(terms)').all() as any[]
    if (!termCols.some((c: any) => c.name === 'term_article_id')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN term_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL`)
      console.log('[migrate] Added "term_article_id" column to terms')
    }
    // Drop deprecated columns (graceful fail for older SQLite versions)
    if (termCols.some((c: any) => c.name === 'full_html')) {
      try { await db.exec(`ALTER TABLE terms DROP COLUMN full_html`) } catch { /* ignore */ }
    }
    if (termCols.some((c: any) => c.name === 'category_id')) {
      try { await db.exec(`ALTER TABLE terms DROP COLUMN category_id`) } catch { /* ignore */ }
    }
  } catch { /* table may not exist yet */ }

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_terms_term_article_id ON terms(term_article_id)`)

  // ─── 15. Phase 4: Universal Edges & i18n ───
  // Localized Terms
  try {
    const termCols = await db.prepare('PRAGMA table_info(terms)').all() as any[]
    
    if (!termCols.some((c: any) => c.name === 'title_ru')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN title_ru TEXT`)
      console.log('[migrate] Added title_ru to terms')
    }
    if (!termCols.some((c: any) => c.name === 'definition_ru')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN definition_ru TEXT`)
      console.log('[migrate] Added definition_ru to terms')
    }
    if (!termCols.some((c: any) => c.name === 'slug_ru')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN slug_ru TEXT`)
      console.log('[migrate] Added slug_ru to terms')
    }
    
    // Add media columns for terms (Phase 5)
    if (!termCols.some((c: any) => c.name === 'image_url')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN image_url TEXT`)
      console.log('[migrate] Added image_url to terms')
    }
    if (!termCols.some((c: any) => c.name === 'video_url')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN video_url TEXT`)
      console.log('[migrate] Added video_url to terms')
    }
    if (!termCols.some((c: any) => c.name === 'presentation_path')) {
      await db.exec(`ALTER TABLE terms ADD COLUMN presentation_path TEXT`)
      console.log('[migrate] Added presentation_path to terms')
    }
  } catch (e) {
    console.warn('[migrate] Term localized columns update failed:', e)
  }

  // Localized Categories
  try {
    const catCols = await db.prepare('PRAGMA table_info(categories)').all() as any[]
    if (!catCols.some((c: any) => c.name === 'title_ru')) {
      await db.exec(`ALTER TABLE categories ADD COLUMN title_ru TEXT`)
      console.log('[migrate] Added title_ru to categories')
    }
    if (!catCols.some((c: any) => c.name === 'description_ru')) {
      await db.exec(`ALTER TABLE categories ADD COLUMN description_ru TEXT`)
      console.log('[migrate] Added description_ru to categories')
    }
    if (!catCols.some((c: any) => c.name === 'slug_ru')) {
      await db.exec(`ALTER TABLE categories ADD COLUMN slug_ru TEXT`)
      console.log('[migrate] Added slug_ru to categories')
    }
  } catch (e) {
    console.warn('[migrate] Category localized columns update failed:', e)
  }

  // ─── 16. Phase 5: Full-Text Search (FTS5) ───
  console.log('[migrate] Setting up FTS5 search indexing...')
  
  // Create virtual FTS5 table
  // Columns: rowid (mapped to original id), type ('article'|'term'), title, content, slug, locale
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
