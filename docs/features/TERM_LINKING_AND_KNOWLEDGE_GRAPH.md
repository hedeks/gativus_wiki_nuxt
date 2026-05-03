# Автоссылки терминов и граф знаний

Связь между телом статей, таблицей `article_terms` и публичным API графа.

---

## 1. Модуль `server/utils/termLinker.ts`

Ответственность:

1. **`buildTermsMap(db)`** — карта текстовых совпадений (названия, алиасы, локализованные варианты) → `{ id, slug }`.
2. **`linkTermsInHtml(html, termsMap)`** — разбор HTML по сегментам текста вне «защищённых» тегов (`a`, `code`, `pre`, заголовки), вставка ссылок вида `<a class="wiki-term" data-term-slug="…" href="…">`.
3. **`mergeMentionCountMaps`** — объединение счётчиков по нескольким полям HTML (EN/RU/ZH).
4. **`replaceArticleTermMentions(db, articleId, counts)`** — полная замена строк в `article_terms` для статьи.
5. **`syncArticleTermsFromArticleRow(db, articleId, termsMap)`** — читает из БД `html_content`, `html_content_ru`, `html_content_zh`, считает якоря `wiki-term` через **`countWikiTermMentionsInHtml`**, затем вызывает `replaceArticleTermMentions`.

Источник истины для графа после сохранения статьи — **фактический HTML в БД**, поэтому после любого сохранения с изменением HTML предпочтительно вызывать **`syncArticleTermsFromArticleRow`** (как при `PUT`), чтобы не расходиться со счётчиками из промежуточного merge.

---

## 2. Где вызывается линковка и синхронизация

| Событие | Файл | Заметки |
|---------|------|---------|
| Создание статьи | `server/api/articles/index.post.ts` | `linkTermsInHtml` по локалям → сохранение → **`syncArticleTermsFromArticleRow`** |
| Обновление статьи | `server/api/articles/[slug].put.ts` | То же по изменённым полям → **`syncArticleTermsFromArticleRow`** |
| Создание термина с телом статьи | `server/api/terms/index.post.ts` | Статья термина публикуется → **`syncArticleTermsFromArticleRow`** |
| Импорт ODT | `server/api/import/odt.post.ts` | На каждую статью |
| Импорт слота ODM | `server/api/import/odm/project/[id]/part/[partId].post.ts` | На каждую статью |
| Обновление термина (статья термина) | `server/api/terms/[slug].put.ts` | По месту изменения HTML |

Массовая перелинковка админом:

- `POST /api/admin/relink` — пересборка HTML и `article_terms` по текущему глоссарию.

---

## 3. Таблица `article_terms`

- Первичный ключ `(article_id, term_id)`.
- Колонка **`mention_count`** (INTEGER, по умолчанию 1) — число якорей `wiki-term` для данной пары в сумме по всем сохранённым полям HTML статьи (после `sync`).

Удаление статьи/термина каскадно чистит связи (см. миграции).

---

## 4. Публичный граф: `GET /api/knowledge-graph`

Файл: `server/api/knowledge-graph.get.ts`.

- Параметр запроса **`lang`**: `en` | `ru` | `zh` — локализованные подписи узлов (книги, категории, термины, статьи через excerpt).
- Узлы статей включаются с фильтром **`is_published = 1`**.
- Рёбра типа «упоминание» строятся из **`article_terms`** только для статей с **`is_published = 1`**.

Следствие: черновики и только что импортированные главы ODM (до публикации) **не создают видимых рёбер упоминаний** на публичном графе, хотя строки в `article_terms` могут уже существовать.

Кластеризация по **`origin_id`** (несколько строк одной логической статьи): см. комментарии в обработчике — слияние узлов для отображения.

---

## 5. UI графа

- Страница: `pages/knowledge-graph.vue`, layout `graph`.
- Визуализация: `components/KnowledgeGraphVisualizer.vue` (D3 force).
- На узких экранах (**`max-width: 640px`**) панель **«Сводка»** (`.graph-stats-panel`) позиционируется у **левого нижнего края** с учётом `safe-area-inset`; блок зума остаётся по центру снизу.

---

## 6. Связь с поиском и страницами статей

- Поиск по тексту статей может подсвечивать совпадения в HTML (клиентская логика на `[slug].vue`).
- Клики по терминам в тексте обрабатываются делегированием (`wiki-term`), см. код страниц статей и глоссария.
