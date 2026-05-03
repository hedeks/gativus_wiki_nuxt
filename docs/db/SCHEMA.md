# Database Schema (SQLite)

Эффективная схема создаётся и дополняется в **`server/utils/migrate.ts`** (идемпотентные `CREATE IF NOT EXISTS` и добавление колонок через `PRAGMA table_info`).

---

## Основные таблицы

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

- `id`, `uuid`, `bearer` — служебная таблица сессий (если используется в проекте).

### `categories`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT  
- `slug` TEXT UNIQUE NOT NULL  
- Локализация: **`slug_ru`**, **`slug_zh`**, **`title_ru`**, **`title_zh`**, **`description_ru`**, **`description_zh`**  
- `title` TEXT NOT NULL  
- `parent_id` INTEGER REFERENCES `categories(id)` ON DELETE SET NULL  
- `description` TEXT  
- `icon` TEXT  
- `sort_order` INTEGER DEFAULT 0  
- `created_at` DATETIME  
- Доп. поля: `lang`, `lang_ru`, `lang_zh` (legacy / справочно).  

### `books`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT  
- `slug` TEXT UNIQUE NOT NULL  
- `title` TEXT NOT NULL  
- **`title_ru`**, **`title_zh`**, **`description_ru`**, **`description_zh`**, **`description`**  
- `cover_image` TEXT  
- `sort_order` INTEGER DEFAULT 0  
- `created_at` DATETIME  
- `lang`, `lang_ru`, `lang_zh`  

### `articles`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT  
- `slug` TEXT UNIQUE NOT NULL  
- **`slug_ru`**, **`slug_zh`**  
- `title` TEXT NOT NULL  
- **`title_ru`**, **`title_zh`**  
- **`html_content`** TEXT NOT NULL  
- **`html_content_ru`**, **`html_content_zh`**  
- **`raw_odt_path`** TEXT  
- **`presentation_path`**, **`presentation_path_ru`**, **`presentation_path_zh`**  
- `category_id` INTEGER REFERENCES `categories(id)` ON DELETE SET NULL  
- `book_id` INTEGER REFERENCES `books(id)` ON DELETE SET NULL  
- `sort_order` INTEGER DEFAULT 0  
- **`excerpt`**, **`excerpt_ru`**, **`excerpt_zh`**  
- `created_at`, `updated_at` DATETIME  
- `created_by` INTEGER REFERENCES `users(id)` ON DELETE SET NULL  
- **`is_published`** INTEGER DEFAULT 1  
- **`is_term_article`** INTEGER NOT NULL DEFAULT 0  
- **`locale`** TEXT NOT NULL DEFAULT `'en'`  
- **`origin_id`** INTEGER (цепочки / кластеры; может быть NULL)  
- `lang`, `lang_ru`, `lang_zh`  

### `terms`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT  
- `slug` TEXT UNIQUE NOT NULL  
- **`slug_ru`**, **`slug_zh`**  
- `title` TEXT NOT NULL  
- **`title_ru`**, **`title_zh`**  
- `aliases` TEXT (JSON-массив строк и т.п.)  
- `definition` TEXT NOT NULL  
- **`definition_ru`**, **`definition_zh`**  
- **`term_article_id`** INTEGER REFERENCES `articles(id)` ON DELETE SET NULL  
- **`image_url`**, **`video_url`**  
- **`presentation_path`**, **`presentation_path_ru`**, **`presentation_path_zh`**  
- `created_at`, `updated_at`  
- `created_by` INTEGER REFERENCES `users(id)` ON DELETE SET NULL  
- `lang`, `lang_ru`, `lang_zh`  

### `article_terms` (M:N + счётчик упоминаний)

- `article_id` INTEGER NOT NULL REFERENCES `articles(id)` ON DELETE CASCADE  
- `term_id` INTEGER NOT NULL REFERENCES `terms(id)` ON DELETE CASCADE  
- **`mention_count`** INTEGER NOT NULL DEFAULT 1  
- PRIMARY KEY (`article_id`, `term_id`)  

Смысл **`mention_count`**: суммарное число якорей `<a class="wiki-term" …>` по сохранённым полям HTML статьи после синхронизации (`syncArticleTermsFromArticleRow`).

### `article_revisions`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT  
- `article_id` INTEGER NOT NULL REFERENCES `articles(id)` ON DELETE CASCADE  
- `html_content` TEXT NOT NULL (на практике основная локаль ревизии; см. код сохранения)  
- `revision_num` INTEGER NOT NULL  
- `change_summary` TEXT  
- `created_at` DATETIME  
- `created_by` INTEGER REFERENCES `users(id)` ON DELETE SET NULL  

### `book_categories` (M:N)

- `book_id`, `category_id` — PRIMARY KEY pair, CASCADE от книги и категории.

---

## ODM (мастер-документ)

### `odm_projects`

- `id` PRIMARY KEY  
- **`book_id`**, **`category_id`** — опциональная привязка после создания книги  
- **`master_storage_path`**, **`master_original_name`** — сохранённый `.odm`  
- **`split_level`** TEXT DEFAULT `'none'` (`none` | `h1` | `h2`)  
- `created_at`, `updated_at`, `created_by`  

### `odm_project_parts`

- `id` PRIMARY KEY  
- **`project_id`** REFERENCES `odm_projects(id)` ON DELETE CASCADE  
- **`sort_order`** — порядок слота  
- **`master_href`**, **`display_title`** — из мастера  
- **`odt_storage_path`**, **`odt_original_name`** — после загрузки `.odt`  
- **`numbering_state_in_json`**, **`numbering_state_out_json`** — продолжение нумерации списков между слотами  
- **`imported_article_ids`** TEXT (JSON массив id статей)  
- **`status`** TEXT DEFAULT `'pending'` (`pending` | `imported` | `error` …)  
- UNIQUE (`project_id`, `sort_order`)  

Индекс: `idx_odm_parts_project` на `project_id`.

---

## Связи (кратко)

- Дерево категорий: `categories.parent_id`.  
- Статья: максимум одна книга и одна категория (`book_id`, `category_id`).  
- Термин → необязательная статья расширенного содержания: `terms.term_article_id`.  
- Упоминания терминов в текстах статей: **`article_terms`** (+ счётчик).  
- Книги ↔ категории: **`book_categories`**.

---

## Миграции и нормализация

- Миграции идемпотентны; недостающие колонки добавляются через `ALTER TABLE`.  
- При старте может выполняться свёртка legacy-модели переводов статей в одну строку на сущность (перенос полей на «origin», удаление дублей, `origin_id`/`locale`). Детали — в **`migrate.ts`** и комментариях к дампу **`docs/features/IMPORT_ODT_ODM_SYNC.md`**.
