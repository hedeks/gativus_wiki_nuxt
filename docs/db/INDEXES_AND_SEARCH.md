# Indexes, FTS, and Search Sync

This document describes indexing and full-text search mechanisms configured in `server/utils/migrate.ts`.

## SQL Indexes

The migration creates the following indexes:

- `idx_terms_slug` on `terms(slug)`
- `idx_articles_slug` on `articles(slug)`
- `idx_categories_slug` on `categories(slug)`
- `idx_articles_book_id` on `articles(book_id)`
- `idx_articles_category_id` on `articles(category_id)`
- `idx_articles_locale` on `articles(locale)`
- `idx_articles_origin_id` on `articles(origin_id)`
- `idx_terms_term_article_id` on `terms(term_article_id)`
- `idx_book_categories_book_id` on `book_categories(book_id)`
- `idx_book_categories_category_id` on `book_categories(category_id)`

## Full-Text Search (`wiki_fts`)

Virtual FTS5 table:

- `id` (UNINDEXED)
- `type` (UNINDEXED) - `article` or `term`
- `title`
- `content`
- `slug` (UNINDEXED)
- `locale` (UNINDEXED)
- tokenizer: `unicode61`

## Triggers

### Article Triggers
- `tr_articles_insert`: inserts article row into FTS
- `tr_articles_update`: updates title/content/slug/locale in FTS
- `tr_articles_delete`: removes article row from FTS

### Term Triggers
- `tr_terms_insert`: inserts term row into FTS
- `tr_terms_update`: updates title/content/slug in FTS
- `tr_terms_delete`: removes term row from FTS

## Startup Resync

On each migration run, FTS is explicitly resynced:

1. `DELETE FROM wiki_fts`
2. Reinsert all `articles` with their own `locale` field (kept for compatibility)
3. Reinsert all `terms` with locale hardcoded to `'en'`

This guarantees consistency if triggers were skipped or data was bulk-loaded.

## Search Behavior Note

Public `/api/search` currently searches across all locales without filtering by request locale. This aligns with the unified-article model and avoids hidden results when localized duplicates are no longer used.

## Operational Caveat

Terms are currently inserted into FTS with locale `'en'` in both triggers and resync SQL. If locale-aware term search is required for `ru`/`zh`, trigger and resync statements should be expanded to localized fields and locale tags.
