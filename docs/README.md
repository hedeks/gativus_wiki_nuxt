# Docs

Эта папка содержит техническую документацию по текущему состоянию проекта.

## Файлы

- `PROJECT_OVERVIEW.md` — обзор архитектуры, модулей и маршрутов.
- `UNUSED_FILES_AUDIT.md` — аудит legacy/лишних файлов и рекомендации по очистке.
- `db/SCHEMA.md` — schema reference for core SQLite tables and relations.
- `db/INDEXES_AND_SEARCH.md` — indexes, FTS5 setup, and sync behavior.
- `api/AUTH_AND_SECURITY.md` — auth flow, roles, and guard model.
- `api/ENDPOINTS_PUBLIC.md` — public API endpoints and locale notes.
- `api/ENDPOINTS_EDITOR_ADMIN.md` — editor/admin endpoint matrix.
- `design/design_system.md` — **единый** конспект UI: токены, фон, онтология цветов, `GvButton` / `GvPagination`, admin/public паттерны, mobile.
- `design/FOUNDATION.md`, `design/VISUAL_STYLE_CONSPECT.md`, `design/COMPONENT_RECIPES.md` — редиректы на `design_system.md`.

## Назначение

Документация отражает фактическое состояние кодовой базы в переходный период
между legacy-потоком `courses + markdown` и новой wiki-архитектурой
`SQLite + server/api + admin`.
