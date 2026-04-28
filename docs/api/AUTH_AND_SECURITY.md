# Auth and Security

## Authentication Flow

- Login endpoint: `POST /api/auth/login`
- Register endpoint: `POST /api/auth/register`
- JWT payload includes user data and expiration.
- Session table (`sessions`) stores `uuid` and bearer token metadata.

## Role Model

Effective roles used in API guards:

- `editor`
- `admin`

Registration behavior:
- First registered user becomes `admin`.
- Next users become `editor`.

Role checks are enforced with `requireRole(event, 'editor' | 'admin')` from `server/utils/requireRole.ts`.

## Guard Coverage

### Public endpoints
- Read APIs such as search, books/articles/terms/categories reads, knowledge graph, uploads proxy, sitemap.

### Editor and admin endpoints
- Most create/update actions require `editor`.
- Destructive actions (for example delete and system sync operations) require `admin`.

## Security Notes

- Keep `jwtSecret` in runtime env only; do not commit secrets.
- `sessions.uuid` is not an FK and has no unique constraint; the app currently tolerates multiple rows per user UUID.
- `POST /api/auth/hashPass` is publicly callable utility; keep this intentional or restrict/remove it if no longer needed.
