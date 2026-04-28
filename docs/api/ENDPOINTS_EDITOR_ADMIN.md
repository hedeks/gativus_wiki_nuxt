# Editor/Admin API Endpoints

## Editor-level (`editor` or `admin`)

### Books
- `POST /api/books`
- `PUT /api/books/:slug`

### Articles
- `POST /api/articles`
- `PUT /api/articles/:slug`
- `GET /api/articles/:slug/revisions`
- `GET /api/articles/:slug/revisions/:id`
- `POST /api/articles/:slug/revert`
- `POST /api/articles/:slug/presentation`

### Terms
- `POST /api/terms`
- `PUT /api/terms/:slug`

### Categories
- `POST /api/categories`
- `PUT /api/categories/:id`
- `PUT /api/categories/reorder`

### Import
- `POST /api/import/preview`
- `POST /api/import/odt`

### Admin namespace (editor-accessible handlers)
- `GET /api/admin/stats`
- `GET /api/admin/articles/:id`
- `GET /api/admin/terms/:id`
- `PATCH /api/admin/books/:id/chapters`
- `POST /api/admin/uploads/article-image`
- `POST /api/admin/uploads/cover`
- `POST /api/admin/uploads/term-media`
- `POST /api/admin/uploads/odt-to-html`

Notes:
- `PATCH /api/admin/books/:id/chapters` now applies to one unified chapter list per book (no locale partitioning in payload).
- Article create/update APIs follow unified entity semantics; locale switching payload fields are ignored/removed.

## Admin-only (`admin`)

- `DELETE /api/books/:slug`
- `DELETE /api/articles/:slug`
- `DELETE /api/terms/:slug`
- `DELETE /api/categories/:id`
- `POST /api/admin/relink`
- `GET /api/admin/sync/export`
- `POST /api/admin/sync/import`

