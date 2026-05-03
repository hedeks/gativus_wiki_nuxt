# Public API Endpoints

This list reflects handlers in `server/api/*` and `server/routes/*`.

## Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/hashPass`

## Books
- `GET /api/books`
- `GET /api/books/all`
- `GET /api/books/:slug`

## Articles
- `GET /api/articles`
- `GET /api/articles/all`
- `GET /api/articles/:slug`

## Terms (Glossary)
- `GET /api/terms`
- `GET /api/terms/all`
- `GET /api/terms/search`
- `GET /api/terms/:slug`

## Categories
- `GET /api/categories`

## Search and Graph
- `GET /api/search`
- `GET /api/knowledge-graph` — параметр `lang` (`en`|`ru`|`zh`) задаёт локализованные подписи узлов; рёбра «упоминание» строятся по `article_terms` только для статей с **`is_published = 1`** (черновики на графе по связям не видны).

## Infrastructure/Public Files
- `GET /api/uploads/[...path]`
- `GET /sitemap.xml`

## Locale and Query Notes

- `lang`/`locale` can still appear in requests for backward compatibility.
- Articles now follow a unified entity model (no locale-splitting/origin switching in read APIs).
- `GET /api/knowledge-graph` accepts `lang` (`en|ru|zh`) for localized labels of categories/books/terms while article nodes remain unified entities; mention edges only include published articles (see above).
