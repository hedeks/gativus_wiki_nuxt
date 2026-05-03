# Editor / Admin API — матрица эндпоинтов

Роли задаются через JWT и проверки `requireRole` / аналоги в хэндлерах. Ниже — ориентировочное разделение; точное поведение смотрите в файле каждого маршрута.

---

## Роль `editor` или выше (`editor`, `admin`)

### Книги

- `POST /api/books`
- `PUT /api/books/:slug`

### Статьи

- `POST /api/articles` — создание; автолинковка терминов в HTML (EN/RU/ZH при наличии полей), **`syncArticleTermsFromArticleRow`** после вставки.
- `PUT /api/articles/:slug` — то же при изменении HTML; ревизия при изменении основного HTML.
- `GET /api/articles/:slug/revisions`
- `GET /api/articles/:slug/revisions/:id`
- `POST /api/articles/:slug/revert`
- `POST /api/articles/:slug/presentation`

### Термины

- `POST /api/terms` — при наличии расширенного контента создаётся статья термина; линковка + **`syncArticleTermsFromArticleRow`** для этой статьи.
- `PUT /api/terms/:slug`

### Категории

- `POST /api/categories`
- `PUT /api/categories/:id`
- `PUT /api/categories/reorder`

### Импорт контента

- `POST /api/import/preview` — превью **только `.odt`** (multipart: `file`, JSON `options`: `split_level`, `locale`, …).
- `POST /api/import/odt` — полный импорт **`.odt`** в статьи; на каждую статью линковка терминов + синхронизация **`article_terms`**.
- `POST /api/import/odm/project` — загрузка **`.odm`**, создание записей **`odm_projects`** / **`odm_project_parts`**; опции книги (`book_id` / `create_book`, `split_level`, …).
- `GET /api/import/odm/project/:id` — проект и слоты (+ статистика черновиков/опубликованных при наличии в ответе).
- `POST /api/import/odm/project/:id/part/:partId` — загрузка **`.odt`** в слот; статьи как черновики по умолчанию; линковка + **`article_terms`**.
- `POST /api/import/odm/project/:id/publish` — массовая публикация статей проекта.

### Прочее (админское пространство имён, доступ editor+ где не указано иначе)

- `GET /api/admin/stats`
- `GET /api/admin/articles/:id`
- `GET /api/admin/terms/:id`
- `PATCH /api/admin/books/:id/chapters`
- `POST /api/admin/uploads/article-image`
- `POST /api/admin/uploads/cover`
- `POST /api/admin/uploads/term-media`
- `POST /api/admin/uploads/odt-to-html`

Примечания:

- `PATCH /api/admin/books/:id/chapters` — единый список глав на книгу (без разбиения по локали в payload).
- Унифицированная модель статьи: переключение «локали-сущности» в payload для чтения/записи не используется — поля `title_ru`, `html_content_ru` и т.д. на одной строке **`articles`**.

---

## Роль только `admin`

- `DELETE /api/books/:slug`
- `DELETE /api/articles/:slug`
- `DELETE /api/terms/:slug`
- `DELETE /api/categories/:id`

### Перелинковка и синхронизация БД JSON

- `POST /api/admin/relink` — массовое применение **`linkTermsInHtml`** и обновление **`article_terms`** по текущему глоссарию (детали в коде хэндлера).

- `GET /api/admin/sync/export` — выгрузка дампа графа знаний и контента:
  - поле **`version`**: актуально **`"1.3"`**;
  - включает три языка HTML статей, локализованные категории/термины, `locale`/`origin_id` статей, `article_mentions` с **`mention_count`**.

- `POST /api/admin/sync/import` — загрузка JSON (multipart `file`):
  - поддерживаемые **`dump.version`**: **`1.1`**, **`1.2`**, **`1.3`**;
  - upsert по slug; восстановление **`article_terms`** из дампа.

Подробнее о составе дампа и ограничениях: **`docs/features/IMPORT_ODT_ODM_SYNC.md`**.
