# Gativus — Design System

Единый конспект визуального языка и UI-паттернов вики. Код — источник правды; этот файл фиксирует правила для авторов интерфейса.

---

## 1. Принцип

**Premium minimalism**: спокойная глубина, чёткая типографика, один основной акцент (sky / primary в светлой теме), без визуального шума.

Референсы в коде:

- `pages/about.vue` — hero и карточные секции (`section-card`, `card-header`, `card-body`).
- `pages/articles/[slug].vue` — контентная витрина и типографика статьи.
- `layouts/admin.vue` + `assets/css/admin-about-cards.css` — админ-оболочка и about-скин для контента под `.admin-gv-skin`.

---

## 2. Где что лежит

| Область | Файлы |
|--------|--------|
| CSS-переменные `--gv-*`, глобальные классы (`gv-page`, `gv-surface-card`, `gv-hero-gradient`, `gv-public-layout`, …) | `app.vue` (`<style>`) |
| Публичный layout (холст скроллится с контентом) | `layouts/default.vue` → корневой класс `gv-public-layout` |
| Админка: sidebar, topbar, рабочая зона с тем же градиентом, что и холст | `layouts/admin.vue` (`admin-main` → `var(--gv-canvas-gradient)`) |
| Карточки / hero / CTA админ-списков | `assets/css/admin-about-cards.css` (подключается в `nuxt.config.ts`) |
| Индексы книг / статей / глоссария | `components/knowledge/KnowledgeIndexLayout.vue`, `PageHero`, `GvPagination` |
| Кнопки | `components/GvButton.vue` |

Обёртка админ-контента: `admin-content-inner gv-admin-page admin-gv-skin`. Стили about-паттерна действуют **только** под `.admin-gv-skin`.

---

## 3. Токены (`:root` / `.dark`)

Определены в `app.vue`:

| Токен | Назначение |
|-------|------------|
| `--gv-surface`, `--gv-surface-card`, `--gv-surface-header` | Поверхности |
| `--gv-text-primary`, `--gv-text-secondary` | Текст |
| `--gv-border-principal`, `--gv-border-subtle` | Границы |
| `--gv-shadow-sm`, `--gv-shadow-md`, `--gv-shadow-lg` | Тени |
| `--gv-primary`, `--gv-primary-hover` | Акцент (переопределяется на индексах книг/статей/терминов) |
| `--gv-radius-container`, `--gv-radius-control` | Радиусы (15px / 12px) |
| `--gv-canvas-gradient` | Фон «холста» публичной части и `admin-main` (плавный градиент) |
| `--gv-canvas-fallback` | Сплошной цвет `html` при overscroll |

Правило: новые экраны сначала используют существующие `--gv-*`; новый accent-цвет — только осознанно.

---

## 4. Фон и layout

- **Public:** градиент на `.gv-public-layout` (не `fixed`, скролл вместе с контентом, как в админской колонке).
- **Admin:** тот же `var(--gv-canvas-gradient)` на `.admin-main`, лёгкий `inset` слева от сайдбара.
- **`html`:** `--gv-canvas-fallback` для подложки.

---

## 5. Онтология цвета (сущности)

Фиксированные оттенки для графа, бейджей и акцентов:

| Сущность | Hex | Примечание |
|----------|-----|------------|
| **Book** | `#0ea5e9` | На индексе книг `--gv-primary` подменяется под sky книги |
| **Article** | `#6366f1` | Индекс статей — свой `--gv-primary` |
| **Term** | `#10b981` | Глоссарий — зелёный акцент |
| **Category** | `#ef4444` | |

Связи в графе: **virtual** — пунктир, **structural** — сплошная линия.

На `.knowledge-index[data-accent="book|article|term"]` в `KnowledgeIndexLayout` задаются локальные `--gv-primary` / `--gv-primary-hover` — **пагинация и пиллы** наследуют эти переменные (`GvPagination` использует `var(--gv-primary)` для активной страницы).

---

## 6. Компоненты (публичные)

### 6.1 `GvButton`

- Основной CTA: **`color="sky"`** или **`color="primary"`** (тон `accent`, в коде — sky).
- Вторичные действия: `variant="outline"` / `ghost`, `color="gray"`.
- Опасные действия: `color="red"`.
- Режимы `chromeless`, `unstyled` — для интеграции в кастомные контейнеры (поиск, пиллы).

### 6.2 `GvPagination`

Клиентская пагинация для индексов (`books`, `articles`, `glossary`).

**Пропсы:**

- `v-model` / `modelValue` — текущая страница (с 1).
- `total` — число элементов после фильтров.
- `pageSize` — размер страницы (книги 12, статьи 10, глоссарий 20).
- `siblingCount` (опционально, по умолчанию `1`) — соседние номера вокруг текущей.

**Поведение:** шаги «назад / вперёд» на `GvButton`, номера страниц — нативные кнопки с `gv-focus` и токенами; активная страница — `var(--gv-primary)`.

### 6.3 Прочие утилиты

- `gv-page` — ограничитель ширины контентных страниц.
- `gv-surface-card`, `gv-card-header` — карточка без admin-skin.
- `gv-glass` — размытие для sticky-шапок.
- `gv-filter-pill` + `GvButton` `chromeless` `ghost` — фильтры на индексах.
- `gv-focus`, `gv-focusable` — видимый `:focus-visible`.

---

## 7. Паттерны

### 7.1 Карточка (public / общий GV)

- Оболочка: `gv-surface-card`.
- Шапка: `gv-card-header`.
- Тело: единый вертикальный ритм отступов.

### 7.2 Карточка (admin, about-стиль)

- `section-card` + `card-header` / `card-body`; опционально `section-card--error`.
- Действия: `cta-buttons`, кнопки `cta-button` (`primary` / `secondary`).

### 7.3 Таблица (admin)

- Обёртка с `overflow-x: auto`.
- На мобиле колонки не ломать — только горизонтальный скролл.

### 7.4 Форма (admin)

- Секции как карточки с явным заголовком.
- На узком экране primary action заметен внизу блока.

### 7.5 Шапка admin-страницы

- `gv-admin-head` → `gv-admin-eyebrow`, `gv-admin-title`, `gv-admin-subtitle`.

### 7.6 Группы действий

Классы: `header-actions`, `page-actions`, `form-actions`, `modal-actions`, `import-actions`. На `≤768px` — wrap; на `≤360px` — по возможности full-width.

---

## 8. Mobile-first (обязательно)

- **≤768px:** шапки колонкой; actions wrap / full-width; таблицы в scroll; избегать жёсткого `100vh` в формах; tap-target **~40px+**.
- **≤480px:** меньше padding у карточек и topbar; вторичный текст в тулбаре можно свести к иконкам.
- **≤360px:** уплотнить `gv-admin-head` и shell; заголовки чуть меньше без потери контраста; группы действий — один контрол в ряд.

Уже учтено в `app.vue` и `layouts/admin.vue` для admin foundation.

---

## 9. Do / Don't

**Do:** токены `--gv-*`, foundation-классы, проверка 360–390px, `GvButton` / `GvPagination` для новых списков.

**Don't:** дублировать локальные «карточечные» системы в каждом файле; произвольные accent hex вместо онтологии; ломать таблицы принудительным stacked-layout без необходимости.

---

## 10. Чеклист перед PR (UI)

- Цвета и фон согласованы с `--gv-*` и градиентом холста.
- Карточки / таблицы / формы — единый ритм.
- Таблицы не ломаются на телефоне.
- Интерактивные элементы доступны большим пальцем.
- Тёмная тема без потери контраста; focus виден.

---

## 11. Связанные файлы (кратко)

- `app.vue` — токены, `gv-public-layout`, глобальные GV-классы.
- `layouts/default.vue` — публичная оболочка.
- `layouts/admin.vue` — админ-shell.
- `components/GvButton.vue`, `components/GvPagination.vue`.
- `components/knowledge/KnowledgeIndexLayout.vue` — индексы и акценты.
- `assets/css/admin-about-cards.css` — `.admin-gv-skin`.
