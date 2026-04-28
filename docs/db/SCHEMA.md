# Database Schema (SQLite)

This document describes the effective schema created and maintained by `server/utils/migrate.ts`.

## Core Tables

### `users`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `login` TEXT UNIQUE NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `encrypted_password` TEXT NOT NULL
- `role` TEXT NOT NULL DEFAULT `'editor'`
- `uuid` TEXT UNIQUE
- `created_at` DATETIME DEFAULT `datetime('now')`
- `last_visited` DATETIME

### `sessions`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `uuid` TEXT
- `bearer` TEXT

### `categories`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `slug` TEXT UNIQUE NOT NULL
- Localized slugs/titles/descriptions: `slug_ru`, `slug_zh`, `title_ru`, `title_zh`, `description_ru`, `description_zh`
- `title` TEXT NOT NULL
- `parent_id` INTEGER REFERENCES `categories(id)` ON DELETE SET NULL
- `description` TEXT
- `icon` TEXT
- `sort_order` INTEGER DEFAULT `0`
- `created_at` DATETIME DEFAULT `datetime('now')`
- Legacy language helper fields: `lang`, `lang_ru`, `lang_zh`

### `books`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `slug` TEXT UNIQUE NOT NULL
- `title` TEXT NOT NULL
- Localized fields: `title_ru`, `title_zh`, `description_ru`, `description_zh`
- `description` TEXT
- `cover_image` TEXT
- `sort_order` INTEGER DEFAULT `0`
- `created_at` DATETIME DEFAULT `datetime('now')`
- Language helper fields: `lang`, `lang_ru`, `lang_zh`

### `articles`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `slug` TEXT UNIQUE NOT NULL
- `title` TEXT NOT NULL
- `title_ru`, `title_zh`
- `html_content` TEXT NOT NULL
- `raw_odt_path` TEXT
- `presentation_path` TEXT
- `category_id` INTEGER REFERENCES `categories(id)` ON DELETE SET NULL
- `book_id` INTEGER REFERENCES `books(id)` ON DELETE SET NULL
- `sort_order` INTEGER DEFAULT `0`
- `excerpt` TEXT
- `created_at` DATETIME DEFAULT `datetime('now')`
- `updated_at` DATETIME DEFAULT `datetime('now')`
- `created_by` INTEGER REFERENCES `users(id)` ON DELETE SET NULL
- `is_published` INTEGER DEFAULT `1`
- `is_term_article` INTEGER NOT NULL DEFAULT `0`
- `locale` TEXT NOT NULL DEFAULT `'en'` (legacy compatibility, normalized to `'en'`)
- `origin_id` INTEGER (legacy translation marker, normalized to `NULL`)
- Language helper fields: `lang`, `lang_ru`, `lang_zh`

### `terms`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `slug` TEXT UNIQUE NOT NULL
- Localized slugs/titles/definitions: `slug_ru`, `slug_zh`, `title_ru`, `title_zh`, `definition_ru`, `definition_zh`
- `title` TEXT NOT NULL
- `aliases` TEXT (JSON-like payload)
- `definition` TEXT NOT NULL
- `term_article_id` INTEGER REFERENCES `articles(id)` ON DELETE SET NULL
- `image_url` TEXT
- `video_url` TEXT
- `presentation_path` TEXT
- `created_at` DATETIME DEFAULT `datetime('now')`
- `updated_at` DATETIME DEFAULT `datetime('now')`
- `created_by` INTEGER REFERENCES `users(id)` ON DELETE SET NULL
- Language helper fields: `lang`, `lang_ru`, `lang_zh`

### `article_terms` (M:N)
- `article_id` INTEGER NOT NULL REFERENCES `articles(id)` ON DELETE CASCADE
- `term_id` INTEGER NOT NULL REFERENCES `terms(id)` ON DELETE CASCADE
- PRIMARY KEY (`article_id`, `term_id`)

### `article_revisions`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `article_id` INTEGER NOT NULL REFERENCES `articles(id)` ON DELETE CASCADE
- `html_content` TEXT NOT NULL
- `revision_num` INTEGER NOT NULL
- `change_summary` TEXT
- `created_at` DATETIME DEFAULT `datetime('now')`
- `created_by` INTEGER REFERENCES `users(id)` ON DELETE SET NULL

### `book_categories` (M:N)
- `book_id` INTEGER NOT NULL REFERENCES `books(id)` ON DELETE CASCADE
- `category_id` INTEGER NOT NULL REFERENCES `categories(id)` ON DELETE CASCADE
- PRIMARY KEY (`book_id`, `category_id`)

## Relationship Summary
- `categories.parent_id` defines a category tree.
- Articles can belong to one book and one category.
- Terms can reference one term article (`term_article_id`).
- `article_terms` links articles and terms as many-to-many.
- `book_categories` links books and categories as many-to-many.

## Migration Notes
- The migration is idempotent: table creation with `IF NOT EXISTS` and column backfill checks through `PRAGMA table_info`.
- On startup, article rows from the legacy translation model are collapsed into unified entities:
  - localized titles are backfilled to `title_ru`/`title_zh` on origin rows,
  - relation tables are rebound to origin rows,
  - translation sibling rows (`origin_id != id`) are removed,
  - remaining rows are normalized to `origin_id = NULL` and `locale = 'en'`.
- Legacy columns on `books` (`locale`, `origin_id`) are dropped on best-effort basis.
