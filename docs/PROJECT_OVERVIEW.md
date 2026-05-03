# Gativus Wiki — обзор проекта

## 1. Назначение

Репозиторий **`gativus-wiki-nuxt`** — приложение на **Nuxt 3**: публичная вики (книги, статьи, глоссарий, граф знаний), админ-панель и REST API поверх **SQLite** через Nitro (`server/api/*`).

План фич на уровне продукта может дублироваться в `manifests/wiki_feature_plan.md` (если файл есть в дереве).

---

## 2. Технологический стек

| Слой | Технология |
|------|------------|
| Фреймворк | Nuxt 3, Vue 3, Vue Router |
| UI | `@nuxt/ui`, TailwindCSS |
| Состояние | Pinia (`stores/*`) |
| Сервер | Nitro, хэндлеры `server/api/**/*.ts` |
| БД | `better-sqlite3`, доступ через `useDatabase()` |
| Импорт ODT | `@xmldom/xmldom`, `adm-zip`, парсер `server/utils/odtParser.ts` |
| Граф | `d3` (`components/KnowledgeGraphVisualizer.vue`) |
| Прочее | JWT для API, bcrypt для паролей |

---

## 3. Карта страниц (`pages/`)

### Публичная часть

| Маршрут | Файл | Заметки |
|---------|------|---------|
| `/` | `index.vue` | Главная |
| `/about` | `about.vue` | О проекте |
| `/books`, `/books/:slug` | `books/index.vue`, `books/[slug].vue` | Книги и оглавление |
| `/articles`, `/articles/:slug` | `articles/index.vue`, `articles/[slug].vue` | Статьи; тело HTML + TOC + презентации |
| `/glossary`, `/glossary/:slug` | `glossary/index.vue`, `glossary/[slug].vue` | Термины и связанная статья |
| `/knowledge-graph` | `knowledge-graph.vue` | Layout **`graph`**, полноэкранный граф |

### Админка (`layouts/admin.vue`)

Основные разделы под **`pages/admin/*`**: книги, статьи (create/edit/history), глоссарий, категории, пользователи, импорт **ODT** (`import.vue`), импорт **ODM** (`import-odm.vue`), синхронизация JSON (`sync.vue`), медиа и служебные экраны.

Дизайн кнопок и карточек выровнен под **`GvButton`** и токены из `docs/design/design_system.md`.

---

## 4. Серверное API (обзор)

| Префикс / область | Назначение |
|-------------------|------------|
| `server/api/auth/*` | Логин, регистрация, хеш пароля |
| `server/api/articles/*` | Чтение (публично), создание/правка/удаление, ревизии, откат, презентации |
| `server/api/books/*` | CRUD книг |
| `server/api/terms/*` | CRUD терминов, поиск |
| `server/api/categories/*` | Дерево, порядок |
| `server/api/import/*` | Превью ODT, импорт ODT, проект ODM + слоты + публикация |
| `server/api/search*` | Поиск по контенту |
| `server/api/knowledge-graph*` | Данные для D3-графа |
| `server/api/admin/*` | Статистика, загрузки, relink, **sync export/import**, правки книг |

Детальные списки URL: **`docs/api/ENDPOINTS_PUBLIC.md`** и **`docs/api/ENDPOINTS_EDITOR_ADMIN.md`**.

---

## 5. Контент и качество данных

### Автоссылки терминов и граф

Серверный пайплайн в **`server/utils/termLinker.ts`**: разбор HTML, вставка ссылок класса **`wiki-term`**, синхронизация таблицы **`article_terms`** с сохранённым HTML (`syncArticleTermsFromArticleRow`). Вызывается при создании/обновлении статей, терминов и при импорте ODT/ODM.

Подробно: **`docs/features/TERM_LINKING_AND_KNOWLEDGE_GRAPH.md`**.

### Импорт и дампы

- **ODT** — одноразовый файл → несколько статей.
- **ODM** — мастер-документ + по одному **ODT** на слот главы; черновики до массовой публикации.
- **Sync JSON** — версия дампа **`1.3`** (три языка HTML у статей, локализованные категории и термины и т.д.).

Подробно: **`docs/features/IMPORT_ODT_ODM_SYNC.md`**.

### Отображение статей

Глобальные стили контента — **`assets/css/article-prose.css`**; таблицы изолируются скроллом через **`wrapArticleTables`** и класс **`.article-table-scroll`**.

Подробно: **`docs/features/ARTICLE_UI_AND_PROSE.md`**.

---

## 6. Сосуществование с legacy

В кодовой базе возможно наличие старого контура (**`/courses`**, файловые лекции, `server/api/lection/*`, `quiz/*`). Целевая модель wiki — **SQLite + API + админка**. При добавлении фич ориентируйтесь на новые маршруты и таблицы из **`docs/db/SCHEMA.md`**.

Рекомендуется:

- не вводить новые зависимости от файлового контура без необходимости;
- постепенно выводить пользовательские ссылки на **`/books`** и **`/articles`**;
- секреты держать только в переменных окружения.

---

## 7. UI/UX (кратко)

Принцип **«уверенный шёпот»**: воздух в сетке, акцент **`sky`** точечно, карточный язык секций, мягкие тени и стекло там, где это уже принято в коде.

Полный конспект: **`docs/design/design_system.md`** (Gill Sans, градиенты hero, `GvButton`, фильтры списков).

Эталон сложности вёрстки статьи — **`pages/articles/[slug].vue`** (шапка, поисковая подсветка, TOC, презентация, навигация по книге).
