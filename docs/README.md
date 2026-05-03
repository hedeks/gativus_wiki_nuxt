# Документация проекта `gativus-wiki-nuxt`

Техническая документация отражает **фактическое состояние** кодовой базы (Nuxt 3 + Nitro + SQLite wiki).

## Оглавление

### Обзор и архитектура

| Файл | Содержание |
|------|------------|
| [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) | Стек, структура `pages/` и `server/api/`, связь подсистем, заметки по legacy |
| [`features/IMPORT_ODT_ODM_SYNC.md`](./features/IMPORT_ODT_ODM_SYNC.md) | Импорт ODT/ODM, превью, синхронизация JSON дампа (версии, поля, ограничения) |
| [`features/TERM_LINKING_AND_KNOWLEDGE_GRAPH.md`](./features/TERM_LINKING_AND_KNOWLEDGE_GRAPH.md) | Автоссылки терминов, `article_terms`, API графа, роли редакторских эндпоинтов |
| [`features/ARTICLE_UI_AND_PROSE.md`](./features/ARTICLE_UI_AND_PROSE.md) | Рендер статей: `article-prose`, TOC, таблицы, обёртка `wrapArticleTables` |

### База данных

| Файл | Содержание |
|------|------------|
| [`db/SCHEMA.md`](./db/SCHEMA.md) | Таблицы SQLite, ключевые колонки, связи |
| [`db/INDEXES_AND_SEARCH.md`](./db/INDEXES_AND_SEARCH.md) | Индексы, FTS5, поведение поиска |

### API

| Файл | Содержание |
|------|------------|
| [`api/AUTH_AND_SECURITY.md`](./api/AUTH_AND_SECURITY.md) | Аутентификация, роли, ограничения доступа |
| [`api/ENDPOINTS_PUBLIC.md`](./api/ENDPOINTS_PUBLIC.md) | Публичные эндпоинты |
| [`api/ENDPOINTS_EDITOR_ADMIN.md`](./api/ENDPOINTS_EDITOR_ADMIN.md) | Эндпоинты редактора и администратора |

### Дизайн-система

| Файл | Содержание |
|------|------------|
| [`design/design_system.md`](./design/design_system.md) | **Единый** эталон: токены, `GvButton`, паттерны админки и публичных страниц |
| [`design/FOUNDATION.md`](./design/FOUNDATION.md), [`VISUAL_STYLE_CONSPECT.md`](./design/VISUAL_STYLE_CONSPECT.md), [`COMPONENT_RECIPES.md`](./design/COMPONENT_RECIPES.md) | Короткие указатели на `design_system.md` |

## Контекст продукта

Концепция GTOM / книги / вики описана на уровне продукта в корневом [`README.md`](../README.md). Здесь — **реализация вики-приложения** (статьи, глоссарий, граф, импорт, админка).

## Legacy

Часть маршрутов и API может относиться к старому контуру (`courses`, файловые лекции). Актуальный целевой контур wiki — см. `PROJECT_OVERVIEW.md`, §«Миграция».
