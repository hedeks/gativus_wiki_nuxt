# Gativus Wiki — План функционала

> **Версия**: 1.1  
> **Дата**: 2026-04-01  
> **Статус**: Утверждён  

---

## 0. Текущее состояние и контекст

### Что есть сейчас
- **Nuxt 3** + **Nuxt Content** (markdown в `content/courses/`)
- **better-sqlite3** для локальной БД (Supabase удаляется из проекта)
- Серверные API: `server/api/auth/` (login, register), `server/api/lection/` (отдача md-файлов)
- **ODT-парсер** (`odt_parser/index.js`) — конвертирует ODT/ODM → Markdown
- Pinia store с базовой моделью пользователя (`userStore.ts`)
- Одна книга (`book-gtom.md`, ~210KB, GTOM) — монолитный md-файл

### Ключевое архитектурное решение: хранилище контента

Текущая модель (файлы `.md` в `content/`) не подходит для вики-системы, потому что:
1. Нет динамического создания/редактирования статей через UI
2. Нет связей между статьями (глоссарий, категории)
3. Нет метаданных для термов и графа

**Решение**: Переход на **базу данных** как основное хранилище статей и метаданных. Контент хранится в HTML (результат парсинга ODT), а не в Markdown. Nuxt Content используется только для статических страниц (about, etc.).

---

## 1. Глоссарий терминов

### 1.1 Модель данных

```
┌─────────────────────────────────────────┐
│ terms                                   │
├─────────────────────────────────────────┤
│ id          INTEGER PRIMARY KEY         │
│ slug        TEXT UNIQUE NOT NULL        │  ← URL-friendly: "b-vektor", "srnt"
│ title       TEXT NOT NULL               │  ← Отображаемое: "b-вектор", "SRNT"
│ aliases     TEXT (JSON array)           │  ← Синонимы: ["вектор поведения"]
│ definition  TEXT NOT NULL               │  ← Краткое определение (plain text)
│ full_html   TEXT                        │  ← Полная статья (HTML)
│ category_id INTEGER REFERENCES categories(id) │
│ created_at  DATETIME                    │
│ updated_at  DATETIME                    │
│ created_by  INTEGER REFERENCES users(id)│
└─────────────────────────────────────────┘
```

### 1.2 API эндпоинты

| Метод | Путь | Описание | Роль |
|:------|:-----|:---------|:-----|
| GET | `/api/terms` | Список всех терминов (с пагинацией, поиском) | public |
| GET | `/api/terms/:slug` | Один термин по slug | public |
| POST | `/api/terms` | Создать термин | editor+ |
| PUT | `/api/terms/:slug` | Обновить термин | editor+ |
| DELETE | `/api/terms/:slug` | Удалить термин | admin |
| GET | `/api/terms/search?q=...` | Поиск по title/aliases | public |

### 1.3 Страницы

| Путь | Компонент | Описание |
|:-----|:----------|:---------|
| `/glossary` | `pages/glossary/index.vue` | Алфавитный список всех терминов с фильтрацией по категориям |
| `/glossary/:slug` | `pages/glossary/[slug].vue` | Полная страница термина |

### 1.4 UI-компонент: Попап термина

Компонент `<TermPopover>` — при наведении/клике на термин в тексте статьи показывает:
- Название
- Краткое определение
- Категорию (с иконкой)
- Кнопку «Подробнее →» (ведёт на `/glossary/:slug`)

---

## 2. Дерево категорий (Граф знаний)

### 2.1 Модель данных

```
┌──────────────────────────────────────────┐
│ categories                               │
├──────────────────────────────────────────┤
│ id          INTEGER PRIMARY KEY          │
│ slug        TEXT UNIQUE NOT NULL         │
│ title       TEXT NOT NULL                │
│ parent_id   INTEGER REFERENCES categories(id) NULL │  ← NULL = корневая
│ description TEXT                         │
│ icon        TEXT                         │  ← CSS class иконки
│ sort_order  INTEGER DEFAULT 0            │
│ color       TEXT                         │  ← HEX для визуализации
│ created_at  DATETIME                     │
└──────────────────────────────────────────┘
```

Предполагаемое дерево (пример):

```
Gativus (корень)
├── Архитектура сознания
│   ├── SERN (сенсорно-рефлекторная сеть)
│   ├── SRNT (субъективная реальность)
│   │   ├── MAP (карты)
│   │   ├── OPN (операционные сети)
│   │   └── TRL (траекторные логи)
│   └── NDDI (компонентный узел)
├── Эволюционные уровни
│   ├── Физические пороги (EVL1-EVL3)
│   ├── Символьные пороги (EVL6-EVL8)
│   └── Аксиологические пороги (EVLA-EVLB)
├── Нейромедиаторы и маркеры
├── Математический аппарат
│   ├── Векторы (b, P, W)
│   └── Свёрточные сети (CNN1-CNN3)
└── Применения
    └── LLM и современные AI
```

### 2.2 Визуализация: Force-directed граф (D3.js)

Страница `/knowledge-graph` — полноценный интерактивный граф на **D3.js** (`d3-force`):
- Узлы = категории (крупные) + термины (мелкие)
- Рёбра = принадлежность к категории + связи между терминами через `article_terms`
- Масштабирование (zoom) и перетаскивание (drag)
- Поиск с подсветкой пути до найденного узла
- Цветовая кодировка по корневым категориям (используется `color` из таблицы `categories`)
- При клике на узел-термин — попап с определением + ссылка на `/glossary/:slug`
- При клике на узел-категорию — подсветка всех связанных терминов
- Адаптивность: на мобильных — упрощённый вид с уменьшенным количеством узлов

### 2.3 API

| Метод | Путь | Описание | Роль |
|:------|:-----|:---------|:-----|
| GET | `/api/categories` | Дерево категорий | public |
| GET | `/api/categories/:slug` | Категория + термины | public |
| POST | `/api/categories` | Создать категорию | admin |
| PUT | `/api/categories/:id` | Обновить (включая parent_id) | admin |
| DELETE | `/api/categories/:id` | Удалить (если нет потомков) | admin |
| PUT | `/api/categories/reorder` | Пакетное перемещение в дереве | admin |

### 2.4 Управление деревом в админке

Drag-and-drop интерфейс для перемещения узлов:
- Перетаскивание категории меняет `parent_id` и `sort_order`
- Визуальный предпросмотр нового дерева перед сохранением
- Защита от циклических зависимостей (parent не может быть потомком)

---

## 3. Связывание терминов в тексте статей

### 3.1 Механизм разметки

При сохранении/импорте статьи серверный процессор сканирует HTML-контент и оборачивает найденные термины:

```
Исходный HTML:
<p>EVL3 вводит b-вектор сплайса...</p>

После обработки:
<p><a class="wiki-term" data-term-slug="evl3" href="/glossary/evl3">EVL3</a> 
вводит <a class="wiki-term" data-term-slug="b-vektor" href="/glossary/b-vektor">b-вектор</a> 
сплайса...</p>
```

### 3.2 Алгоритм автолинкинга

```
1. Загрузить из БД: все terms (title + aliases) → Map<string, slug>
2. Отсортировать по длине (длинные первые, чтобы "b-вектор сплайса" не перекрывался "вектор")
3. Для каждого термина:
   a. Найти вхождения в текст (вне существующих тегов <a>, <code>, <pre>)
   b. Обернуть первое вхождение в <a class="wiki-term" ...>
   c. (Опционально) оборачивать все вхождения или только первое в каждом разделе
4. Сохранить обработанный HTML
```

### 3.3 Клиентский попап

Глобальный обработчик на уровне layout:

```javascript
// При клике на .wiki-term — показать попап с определением
// При зажатии клика / правом клике — перейти на полную страницу
document.addEventListener('click', (e) => {
  const termEl = e.target.closest('.wiki-term')
  if (termEl) {
    e.preventDefault()
    const slug = termEl.dataset.termSlug
    showTermPopover(slug, termEl)  // Fetch /api/terms/:slug, показать 
  }
})
```

Компонент `<TermPopover>`:
- Floating UI (или UPopover от Nuxt UI) для позиционирования
- Lazy-загрузка: данные термина подгружаются при первом показе, затем кешируются
- Анимация появления (fade + scale)
- Кнопки: «Открыть статью», «Копировать ссылку»

---

## 4. Импорт из ODT и хранение контента

### 4.1 Архитектурное решение: ODT → HTML (не Markdown)

**Почему HTML, а не Markdown:**
- ODT — это ZIP с XML. Внутри — богатое форматирование: таблицы, изображения, стили.
- Markdown теряет почти всю семантику (стили, сложные таблицы, inline-форматирование).
- HTML сохраняет всё и позволяет добавлять wiki-разметку (термины, попапы).
- Nuxt Content (markdown) всё равно компилирует md → AST → HTML; вырезаем промежуточный шаг.

### 4.2 ODT-парсер как Nuxt Server Endpoint

ODT-парсер переносится из отдельного `odt_parser/` в серверную часть Nuxt:

```
server/utils/odtParser.ts     ← Основная логика (рефакторинг odt_parser/index.js → TypeScript)
server/api/import/odt.post.ts ← Endpoint: принимает multipart/form-data с ODT файлом
server/api/import/preview.post.ts ← Endpoint: парсит ODT и возвращает HTML preview без сохранения
```

### 4.3 Пайплайн импорта

```
POST /api/import/odt (multipart/form-data)
    │
    ▼
[1] Распаковка ZIP (adm-zip)
    │
    ▼
[2] Парсинг content.xml (xmldom)
    │
    ▼
[3] Конвертация XML → HTML
    │ - Заголовки → <h1>-<h6>
    │ - Параграфы → <p>
    │ - Списки → <ul>/<ol>
    │ - Таблицы → <table>
    │ - Изображения (draw:image) → извлечение из Pictures/, сохранение в /public/uploads/
    │ - Стили (bold/italic/underline) → <strong>/<em>/<u>
    │ - Draw-объекты (draw:frame, draw:custom-shape, draw:rect, draw:line, draw:connector и др.):
    │     • Растровые (PNG/JPG внутри draw:frame) → <img>
    │     • Векторные фигуры (draw:custom-shape, draw:rect) → inline <svg>
    │     • Группы (draw:g) → вложенный <svg> с сохранением структуры
    │     • Текстовые блоки внутри фигур (draw:text-box) → <div> с позиционированием
    │     • OLE-объекты (draw:object) → пропуск с placeholder-предупреждением
    │     • Размеры (svg:width, svg:height) конвертируются из cm/mm в px
    │
    ▼
[4] Автолинкинг терминов (§3.2)
    │
    ▼
[5] Разбиение на статьи (по h1/h2)
    │ - Каждый раздел = отдельная статья в БД
    │ - Привязка к категории дерева
    │
    ▼
[6] Сохранение в БД (таблица articles) + создание revision v1
```

### 4.4 Модель данных — Статьи

```
┌──────────────────────────────────────────┐
│ articles                                 │
├──────────────────────────────────────────┤
│ id             INTEGER PRIMARY KEY       │
│ slug           TEXT UNIQUE NOT NULL       │
│ title          TEXT NOT NULL              │
│ html_content   TEXT NOT NULL              │  ← Обработанный HTML
│ raw_odt_path   TEXT                       │  ← Путь к оригинальному ODT (если сохраняем)
│ category_id    INTEGER REFERENCES categories(id) │
│ book_id        INTEGER REFERENCES books(id) NULL │ ← К какой книге принадлежит
│ sort_order     INTEGER DEFAULT 0          │
│ excerpt        TEXT                       │  ← Автогенерируемый отрывок
│ created_at     DATETIME                  │
│ updated_at     DATETIME                  │
│ created_by     INTEGER REFERENCES users(id) │
│ is_published   BOOLEAN DEFAULT true       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ books                                    │
├──────────────────────────────────────────┤
│ id             INTEGER PRIMARY KEY       │
│ slug           TEXT UNIQUE NOT NULL       │  ← "gtom", "gativus-emotions"
│ title          TEXT NOT NULL              │
│ description    TEXT                       │
│ cover_image    TEXT                       │
│ sort_order     INTEGER DEFAULT 0          │
│ created_at     DATETIME                  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ article_terms (many-to-many)             │
├──────────────────────────────────────────┤
│ article_id  INTEGER REFERENCES articles(id) │
│ term_id     INTEGER REFERENCES terms(id)    │
│ PRIMARY KEY (article_id, term_id)           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ article_revisions                        │
├──────────────────────────────────────────┤
│ id             INTEGER PRIMARY KEY       │
│ article_id     INTEGER REFERENCES articles(id) │
│ html_content   TEXT NOT NULL              │  ← Снимок HTML на момент ревизии
│ revision_num   INTEGER NOT NULL           │
│ change_summary TEXT                       │  ← Описание изменений
│ created_at     DATETIME                  │
│ created_by     INTEGER REFERENCES users(id) │
└──────────────────────────────────────────┘
```

> **Версионность**: каждое сохранение статьи (через импорт или ручную правку) создаёт новую запись в `article_revisions`. В админке доступен просмотр diff между ревизиями и откат к предыдущей версии.

### 4.5 Админ-интерфейс импорта

Страница `/admin/import`:
1. Drag-and-drop зона для ODT/ODM файлов
2. Preview: вызов `POST /api/import/preview` → показать распарсенный HTML до сохранения
3. Настройки импорта:
   - Выбор книги (или создать новую)
   - Выбор корневой категории
   - Уровень заголовка для разбиения на статьи (h1 / h2)
   - Включить/выключить автолинкинг терминов
4. Кнопка «Импортировать» → `POST /api/import/odt` → прогресс-бар → результат

### 4.6 Редактирование статей

- Импорт из ODT — основной способ создания контента
- Ручная правка HTML через textarea в админке (`/admin/articles/:id/edit`)
- WYSIWYG-редактор **не используется** — достаточно сырого HTML
- При каждом сохранении создаётся новая ревизия в `article_revisions`

### 4.7 Хранение оригиналов ODT

Оригинальные `.odt` файлы сохраняются в `server/storage/odt/` для возможности:
- Повторного импорта с другими настройками
- Аудита изменений

---

## 5. Система авторизации

### 5.1 Роли

| Роль | Код | Описание |
|:-----|:----|:---------|
| Пользователь | `user` | Чтение статей, глоссария, графа. Не требует логина. |
| Редактор | `editor` | Создание/редактирование статей и терминов. Импорт ODT. |
| Админ | `admin` | Всё выше + управление категориями, пользователями, ролями. |

### 5.2 Модель данных (обновлённая)

```
┌──────────────────────────────────────────┐
│ users                                    │
├──────────────────────────────────────────┤
│ id                 INTEGER PRIMARY KEY   │
│ login              TEXT UNIQUE NOT NULL   │
│ email              TEXT UNIQUE NOT NULL   │
│ encrypted_password TEXT NOT NULL          │
│ role               TEXT DEFAULT 'editor'  │  ← 'editor' | 'admin'
│ uuid               TEXT UNIQUE            │
│ created_at         DATETIME              │
│ last_visited       DATETIME              │
└──────────────────────────────────────────┘
```

> Примечание: регистрация доступна только через инвайт-ссылку от админа, либо первый пользователь автоматически становится админом.

### 5.3 Middleware авторизации

```
server/middleware/
├── auth.ts           ← Проверка JWT токена, добавление user в event.context
└── requireRole.ts    ← Фабрика middleware: requireRole('editor'), requireRole('admin')
```

Клиентский middleware:
```
middleware/
├── auth.ts           ← Редирект на /login если нет токена (для /admin/*)
└── role.ts           ← Проверка роли для защищённых страниц
```

### 5.4 Защита эндпоинтов

Все `POST/PUT/DELETE` эндпоинты проверяют:
1. Наличие и валидность JWT
2. Роль пользователя (`editor` для CRUD статей/терминов, `admin` для категорий/пользователей)

### 5.5 Интерфейс

- **Логин** (`/login`) — уже существует, нужен рефакторинг
- **Админка** (`/admin`) — hub с навигацией:
  - Импорт ODT
  - Управление статьями (CRUD + ручная правка HTML + история ревизий)
  - Управление глоссарием
  - Управление категориями (drag-and-drop дерево)
  - Управление пользователями (только admin)

---

## 6. Навигация и страницы (итоговая карта)

### Публичные страницы

| Путь | Описание |
|:-----|:---------|
| `/` | Главная (Gativus Wiki) |
| `/about` | О проекте |
| `/books` | Список книг (замена `/courses`) |
| `/books/:slug` | Оглавление книги |
| `/books/:slug/:article` | Статья книги |
| `/glossary` | Глоссарий (алфавитный / по категориям) |
| `/glossary/:slug` | Страница термина |
| `/knowledge-graph` | Интерактивный граф знаний |

### Защищённые страницы

| Путь | Роль | Описание |
|:-----|:-----|:---------|
| `/login` | — | Авторизация |
| `/admin` | editor+ | Dashboard |
| `/admin/import` | editor+ | Импорт ODT |
| `/admin/articles` | editor+ | Список статей |
| `/admin/articles/:id/edit` | editor+ | Правка HTML + ревизии |
| `/admin/articles/:id/history` | editor+ | История ревизий (diff, откат) |
| `/admin/glossary` | editor+ | CRUD терминов |
| `/admin/categories` | admin | Управление деревом |
| `/admin/users` | admin | Управление пользователями |

### Обновлённая навигация

**Header:**
| Метка | Путь | Иконка |
|:------|:-----|:-------|
| Главная | `/` | `i-heroicons-home` |
| Книги Gativus | `/books` | `i-heroicons-book-open` |
| Глоссарий | `/glossary` | `i-heroicons-document-magnifying-glass` |
| Граф знаний | `/knowledge-graph` | `i-heroicons-share` |
| О проекте | `/about` | `i-heroicons-information-circle` |

---

## 7. Технологический стек (итого)

| Компонент | Технология | Обоснование |
|:----------|:-----------|:------------|
| Фреймворк | Nuxt 3 | Уже используется |
| UI | Nuxt UI + Tailwind | Уже используется |
| БД | **SQLite** (better-sqlite3 через `useDatabase()`) | Локальная, автономная, уже в зависимостях |
| ORM | Raw SQL через `useDatabase()` | Минимум зависимостей, полный контроль |
| Аутентификация | JWT (jsonwebtoken) | Уже реализовано |
| ODT парсинг | `server/utils/odtParser.ts` (adm-zip + xmldom) | Рефакторинг `odt_parser/` → Nuxt server endpoint |
| Граф знаний | **D3.js** (`d3-force`) | Force-directed граф с первой итерации |
| Поиск | SQLite FTS5 | Полнотекстовый поиск из коробки |
| Кеширование | Nuxt `useAsyncData` + `getCachedData` | Стандартный механизм |

---

## 8. Порядок реализации (фазы)

### Фаза 1 — Фундамент (БД + авторизация)
1. Настроить SQLite schema (таблицы: users, categories, terms, articles, books, article_terms, article_revisions)
2. Написать миграции / seed скрипт
3. Удалить Supabase из зависимостей и `.env`
4. Рефакторинг авторизации (роли editor/admin)
5. Серверные middleware (auth, requireRole)
6. Базовый layout админки

### Фаза 2 — Контент (статьи + импорт)
1. Написать парсер odt в `server/utils/odtParser.ts` (рефакторинг JS→TS, ODT→HTML вместо MD)
2. Создать endpoints: `POST /api/import/odt`, `POST /api/import/preview`
3. API для статей и книг (CRUD) + ревизии при каждом сохранении
4. Страница импорта ODT в админке (`/admin/import`)
5. Страница редактирования HTML (`/admin/articles/:id/edit`)
6. Страница истории ревизий (`/admin/articles/:id/history`) с diff и откатом
7. Мультиязычность в админке нужно, чтобы можно было загружать разные версии статей на разных языках, одна статья может иметь несколько переводов
8. Публичные страницы: `/articles`, `/articles/:slug`, `/articles/:slug/:article`
9. Рендеринг HTML-статей с Prose-стилями

### Фаза 3 — Глоссарий
1. API для терминов (CRUD)
2. Страницы: `/glossary`, `/glossary/:slug`
3. Админка: управление терминами
4. Автолинкинг терминов в HTML статей
5. Компонент `<TermPopover>`

### Фаза 4 — Категории и граф знаний (D3.js)
1. API для категорий (CRUD + reorder)
2. Админка: drag-and-drop дерево категорий
3. Привязка статей и терминов к категориям
4. Страница `/knowledge-graph` — force-directed граф на D3.js
5. Фильтрация глоссария и статей по категориям

### Фаза 5 — Полировка
1. Полнотекстовый поиск (SQLite FTS5)
2. SEO: sitemap, meta-теги для каждой статьи
3. Breadcrumbs на всех страницах
---

## 9. Схема базы данных (ER-диаграмма)

```
users ─────────┐──────────────────────────┐
  │             │                          │
  │ created_by  │ created_by               │ created_by
  ▼             ▼                          ▼
terms ◄─── article_terms ───► articles ──► article_revisions
  │                              │
  │ category_id                  │ category_id, book_id
  ▼                              ▼
categories ◄──── (self-ref)     books
  │ parent_id        
  └──► categories    
```

---

## 10. Принятые решения

| Вопрос | Решение | Обоснование |
|:-------|:--------|:------------|
| Хранилище данных | **Локальный SQLite** | Автономность, простота, уже в зависимостях. Supabase удаляется. |
| ODT-парсер | **Nuxt Server Endpoint** (`server/utils/odtParser.ts`) | Единая кодовая база, TypeScript, доступ к БД напрямую. |
| Редактирование | **Импорт ODT + ручная правка HTML** | Без WYSIWYG. Textarea с сырым HTML в админке. |
| Граф знаний | **D3.js force-directed** с первой итерации | Визуально впечатляющий, соответствует масштабу GTOM. |
| Версионность | **Да, только в админке** | Таблица `article_revisions`. Просмотр diff и откат. |

---

## 11. Мультиязычность (i18n)

### 11.1 Поддерживаемые языки

| Код  | Язык      | Примечание |
|:-----|:----------|:-----------|
| `en` | English   | Основной язык проекта, все термины GTOM/GNET/GATE на английском |
| `ru` | Русский   | Полная локализация интерфейса и контента |
| `zh` | 中文 (Chinese) | Полная локализация интерфейса и контента |

### 11.2 Структура

**Два уровня локализации:**

1. **UI-интерфейс** (навигация, кнопки, метки) — через `@nuxtjs/i18n`
2. **Контент** (статьи, термины, книги) — через поля в БД

#### Схема контента в БД

Контент хранится с привязкой к языку. Каждая запись в `articles`, `terms`, `books`, `categories` получает поле `locale`:

```
┌─────────────────────────────────────────────┐
│ articles / terms / books                    │
├─────────────────────────────────────────────┤
│ ...existing fields...                       │
│ locale       TEXT NOT NULL DEFAULT 'en'     │  ← 'en' | 'ru' | 'zh'
│ origin_id    INTEGER                        │  ← ссылка на оригинал (для связи переводов)
└─────────────────────────────────────────────┘
```

- `locale` — код языка записи
- `origin_id` — связывает переводы: все версии одной статьи на разных языках ссылаются на один `origin_id`
- Если `origin_id IS NULL` — это оригинал

#### Структура UI-переводов

```
locales/
├── en.json    # English UI strings
├── ru.json    # Русские UI строки
└── zh.json    # 中文 UI 字符串
```

### 11.3 Роутинг

Используется prefix-стратегия `@nuxtjs/i18n`:

```
/en/about          → About (English)
/ru/about          → О проекте (Русский)
/zh/about          → 关于项目 (中文)

/en/glossary/nddi  → NDDI term (English)
/ru/glossary/nddi  → NDDI термин (Русский)
/zh/glossary/nddi  → NDDI 术语 (中文)
```

Язык по умолчанию: `en` (без префикса: `/about` = `/en/about`).

### 11.4 API

Все публичные API принимают `?locale=` параметр:

```
GET /api/terms?locale=ru           → термины на русском
GET /api/articles/:slug?locale=zh  → статья на китайском
GET /api/terms/:slug/translations  → все переводы данного термина
```

### 11.5 UI-компоненты

- **Переключатель языка** в хедере (рядом с переключателем темы)
- При переключении: меняется и язык интерфейса, и контент
- Если перевод статьи/термина отсутствует — показывается fallback на `en` с пометкой «Translation unavailable»

### 11.6 Фаза реализации

Мультиязычность добавляется **после Фазы 2** (когда есть контент-пайплайн):

1. Установка `@nuxtjs/i18n`, структура `locales/`
2. Добавление `locale` и `origin_id` в схему БД (миграция)
3. Переключатель языка в хедере
4. Обновление всех API для фильтрации по `locale`
5. Локализация UI-строк (en → ru → zh)
6. Админка: интерфейс создания переводов для существующих статей

