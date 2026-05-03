# Импорт контента (ODT / ODM) и синхронизация JSON

Подробное описание потоков загрузки OpenDocument и полного дампа графа знаний.

---

## 1. Импорт одиночного ODT

### Эндпоинты

| Метод | Путь | Роль |
|--------|------|------|
| `POST` | `/api/import/preview` | Редактор+: превью разбиения на статьи (multipart: `file`, `options`) |
| `POST` | `/api/import/odt` | Редактор+: запись статей в БД |

### Поведение `preview`

- Принимает **только `.odt`** (не `.odm` — для мастер-документа используется поток ODM).
- Парсинг через утилиты `server/utils/odtParser.ts` (распаковка ZIP ODT, XML).
- В ответе — массив виртуальных статей (`title`, `slug`, `html`, `excerpt` и т.д.) без записи в БД.

### Поведение полного импорта ODT

1. Файл сохраняется под `server/storage/odt/`.
2. Статьи создаются с привязкой к `book_id` / `category_id` из `options`.
3. После парсинга HTML для **каждой** статьи выполняется:
   - `buildTermsMap` → `linkTermsInHtml` (`server/utils/termLinker.ts`) — якоря `wiki-term` в тексте.
   - `syncArticleTermsFromArticleRow` — пересборка строк в `article_terms` по сохранённому HTML (все локали колонок HTML, если есть).
4. Создаётся ревизия `article_revisions` с тем же HTML.

Исходный файл: `server/api/import/odt.post.ts`.

---

## 2. Импорт книги через ODM (мастер-документ)

ODM задаёт **последовательность слотов** (глав); для каждого слота загружается отдельный **`.odt`**.

### Эндпоинты

| Метод | Путь | Назначение |
|--------|------|------------|
| `POST` | `/api/import/odm/project` | Создать проект: multipart `file` (.odm) + JSON `options` |
| `GET` | `/api/import/odm/project/:id` | Состояние проекта и слотов |
| `POST` | `/api/import/odm/project/:id/part/:partId` | Загрузить `.odt` в слот |
| `POST` | `/api/import/odm/project/:id/publish` | Массовая публикация черновиков проекта |

### Параметры создания проекта (`options`)

- Режим **существующая книга**: `book_id`, `category_id`, `split_level` (`none` | `h1` | `h2`).
- Режим **новая книга**: `create_book` — объект с полями книги (в т.ч. `title`, `title_ru`, `title_zh`, `slug`, описания, `category_ids`, `cover_image`, `sort_order`).

### Нумерация списков ODT между слотами

- В `odm_project_parts` хранится `numbering_state_out_json` предыдущего импортированного слота; следующий `.odt` получает продолжение счётчиков (`server/utils/odtParser.ts`, режим tiered и т.д.).

### Черновики и публикация

- Статьи из слотов ODM по умолчанию создаются с **`is_published = 0`**.
- Граф знаний на публичном `GET /api/knowledge-graph` строит рёбра «упоминание» только для **опубликованных** статей; до `publish` связи в `article_terms` уже могут быть заполнены.

### Линковка терминов при импорте слота

Аналогично ODT: `linkTermsInHtml` + `syncArticleTermsFromArticleRow` на каждую созданную статью. Файл: `server/api/import/odm/project/[id]/part/[partId].post.ts`.

### Таблицы БД

См. `docs/db/SCHEMA.md` — `odm_projects`, `odm_project_parts`.

UI: `pages/admin/import-odm.vue` (режимы книги, слоты, модалка публикации).

---

## 3. Синхронизация JSON (backup / перенос)

### Экспорт

- `GET /api/admin/sync/export` — только роль **`admin`**.
- Заголовки: `Content-Disposition` (attachment), `Content-Type: application/json`.

**Версия дампа:** поле верхнего уровня `version`. Актуальная **`"1.3"`**.

Структура (ключевые массивы):

- `categories` — в т.ч. `slug_ru`, `slug_zh`, `title_ru`, `title_zh`, `description_*`, `parent_slug`, `sort_order`.
- `books` — категории книги как `category_slugs[]`.
- `articles` — единая сущность: `slug`, `slug_ru`, `slug_zh`, `title`, `title_*`, `excerpt_*`, **`html_content`, `html_content_ru`, `html_content_zh`**, `presentation_path*`, `category_slug`, `book_slug`, флаги публикации, **`locale`**, **`origin_id`**, сортировка, даты.
- `terms` — в т.ч. `slug_*`, `title_*`, `definition_*`, медиа, `term_article_slug`.
- `article_mentions` — `{ article_slug, term_slug, mention_count }`.

Реализация: `server/api/admin/sync/export.get.ts`.

### Импорт

- `POST /api/admin/sync/import` — multipart поле `file` (JSON), роль **`admin`**.
- Поддерживаемые значения **`dump.version`**: `1.1`, `1.2`, `1.3`.
- Upsert по `slug` для категорий, книг, статей, терминов; затем пересборка `article_terms` из дампа.

Поведение импорта статей (важно):

- Используются поля локализации HTML/слагов как в дампе; `is_published` читается с **`??`**, чтобы черновик `0` не превращался в опубликованный.
- `locale` и `origin_id` записываются из дампа (в ранней логике после импорта принудительно сбрасывались — **сейчас сохраняются**, если переданы).

Реализация: `server/api/admin/sync/import.post.ts`.

### Что **не** входит в дамп

- Пользователи и сессии.
- История **`article_revisions`** (кроме текущего HTML в статье).
- Бинарные файлы (обложки/медиа — только URL/пути в полях).
- Проекты **ODM** (`odm_projects` / `odm_project_parts`).
- Детальные колонки `lang` / `lang_ru` / `lang_zh` у сущностей (если не расширять формат отдельно).

Для полного снимка инстанса допустим отдельный механизм (копия файла SQLite + `storage/`).

---

## 4. Админские страницы

| Страница | Файл |
|----------|------|
| Импорт ODT | `pages/admin/import.vue` |
| Импорт ODM | `pages/admin/import-odm.vue` |
| Синхронизация | `pages/admin/sync.vue` |

Кнопки выровнены под компонент **`GvButton`** (варианты solid/outline, цвет `sky` / `gray`).

На странице синка превью графа из файла учитывает локаль интерфейса (`en` / `ru` / `zh`) для подписей узлов из полей `*_ru`, `*_zh`.
