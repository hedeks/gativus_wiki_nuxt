# Оптимизация выборки статей из БД, фиксы iOS Safari PDF Viewer, изоляция свайпов и полировка UX поиска

## Проблема

В ходе аудита и использования базы знаний были выявлены следующие архитектурные и UX-проблемы:

1. **Производительность выборки статей из БД ($O(N^2)$ SQL Overhead):**
   При открытии любой статьи, принадлежащей книге, эндпоинт `server/api/articles/[slug].get.ts` выполнял множественные коррелированные подзапросы `COUNT(*)` для вычисления порядкового номера главы (`chapter_number`), соседних глав (`prev`, `next`) и полного списка глав книги (`book_chapters`). Для книг с десятками глав это создавало квадратичную сложность $O(N^2)$, приводя к задержкам на уровне SQLite.
2. **Safari iOS PDF Viewer (Белые пустые холсты Canvas):**
   На мобильных устройствах Apple (iPhone/iPad) в просмотрщике презентаций/PDF страницы периодически рендерились как пустые белые листы. Причинами были:
   * Отсутствие отмены предыдущей задачи рендеринга `RenderTask` в PDF.js при быстром зуме или смене страниц, что вызывало ошибки контекста Canvas.
   * Применение тяжелого CSS-фильтра `blur-lg` во время 3D-анимации перехода страниц.
   * Одновременное создание 3-х тяжелых Canvas-элементов высокого разрешения (`[pageNum - 1, pageNum, pageNum + 1]`), превышавшее жесткий лимит оперативной памяти WebKit Canvas (224 МБ) и вызывавшее сброс 2D-контекста.
3. **Конфликт мобильных жестов (Browser History Swipe):**
   При чтении статьи на смартфоне попытка прокрутить широкую таблицу или длинный блок кода вправо/влево перехватывалась мобильным браузером (Safari/Chrome) как системный жест свайпа «Назад / Вперёд» по истории переходов.
4. **Клавиатурная навигация глобального поиска (`TheSearch.vue`):**
   * Стрелки `↑`/`↓` и клавиша `Enter` управляли только статьями и полностью игнорировали термины онтологии (глоссарий).
   * Отсутствовал автоматический доскролл к выбранному результату (`scrollIntoView`).
   * Нажатие `Esc` сразу закрывало модальное окно вместо предварительной очистки поисковой строки.
5. **Ошибки серверного рендеринга (SSR) и реактивности Nuxt:**
   * Ошибки `Cannot read properties of undefined (reading 'length' / 'noContent')` возникали, когда top-level `await` в `<script setup>` блокировал инициализацию словарей (`uiDict`, `t`) и дочерних пропсов до завершения асинхронных вызовов.
   * Ошибка `[nuxt] [asyncData] key must be a string` возникала из-за передачи функции-геттера вместо строкового ключа в `useAsyncData`.

---

## Решение

### 1. Линейная $O(N)$ выборка глав и статей в SQLite
В эндпоинте `server/api/articles/[slug].get.ts` все коррелированные подзапросы `COUNT(*)` заменены **одним плоским индексированным SQL-запросом**:
```sql
SELECT id, slug, slug_ru, slug_zh, title, title_ru, title_zh, sort_order, is_published
FROM articles
WHERE book_id = ? AND (is_published = 1 OR ? = 1 OR id = ?)
ORDER BY sort_order ASC, id ASC
```
Порядковые номера глав, предыдущая и следующая главы вычисляются в памяти за $O(N)$ через линейный поиск по массиву.
Редакторы (`isEditor: true`) видят полный список глав книги с черновиками, а гости — строго опубликованные статьи.

### 2. Защита Canvas и жизненного цикла PDF на iOS
* **Отмена RenderTask:** В `components/PdfPage.vue` введена переменная `activeRenderTask`. При любом изменении масштаба или номера страницы вызывается `activeRenderTask.cancel()`, а ошибки `RenderingCancelledException` безопасно перехватываются.
* **Удаление CSS-фильтров:** В `components/ThePdfViewer.vue` убран фильтр `blur-lg`, вызывавший GPU context loss в WebKit.
* **Изоляция холста для iOS:**
  ```typescript
  const isIos = computed(() => isIosBrowser())
  const visiblePages = computed(() => {
    // На iOS рендерим строго 1 активную страницу во избежание превышения лимита памяти Canvas
    if (isIos.value) return [pageNum.value]
    const pages = []
    if (pageNum.value > 1) pages.push(pageNum.value - 1)
    pages.push(pageNum.value)
    if (pageNum.value < numPages.value) pages.push(pageNum.value + 1)
    return pages
  })
  ```

### 3. Изоляция жестов и скролла таблиц
В `assets/css/article-prose.css` и `pages/articles/[slug].vue` для `.article-table-scroll`, `pre` и `.article-prose` добавлены свойства:
```css
.article-prose .article-table-scroll,
.article-prose pre {
  overscroll-behavior-x: contain;
  touch-action: pan-x pan-y pinch-zoom;
}
```
Это изолирует 2D-скролл внутри области контента и полностью блокирует всплытие жеста горизонтального свайпа к окну браузера.

### 4. Унифицированная клавиатурная навигация в поиске
В `components/TheSearch.vue`:
* Создан общий массив `navigableHits = computed(() => [...groupedResults.article, ...groupedResults.term])`.
* Индексы активного элемента сквозные: статьи (`0..N-1`), термины (`N..N+M-1`).
* Добавлен `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.
* Реализован двухэтапный `Esc`: очистка текста при первом нажатии, закрытие модалки при повторном.
* Добавлены мерцающие Skeleton-карточки во время дебаунса ввода.

### 5. Мета-плашка чтения и Luxe-микроотклик
* В шапку [pages/articles/[slug].vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/pages/articles/[slug].vue) добавлена вычисляемая плашка `readingStats` (`~X мин чтения • Y слов • Z терминов`) с учетом специфики CJK/китайского текста (300 иероглифов/мин) и европейских языков (200 слов/мин).
* Карточки [BookCard.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/common/BookCard.vue) и [ListItemCard.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/common/ListItemCard.vue) получили анимацию подъема `transform: translateY(-2px)` с мягкой акцентной подсветкой рамки.

### 6. Стабилизация порядка объявлений в `<script setup>` и SSR
* Все статические словари (`uiDict`), реактивные переводы (`const t = computed(...)`) и базовые структуры данных вынесены в самый верх `<script setup>` до любых асинхронных операций.
* В шаблоне все обращения к переводам и пропсам защищены безопасными дефолтами (`t?.property || '...'`).
* Убран лишний `await` из `useFetch('/api/user/bookmarks', { server: false })`.
* Ключ `useAsyncData` приведен к строке: `useAsyncData(\`article-${slug.value}\`, () => ..., { watch: [...] })`.

---

## Извлеченные уроки (Gotchas)

1. **Vue 3 `<script setup>` Top-Level Await Scoping:**
   Если в `<script setup>` присутствует верхнеуровневый `await`, любая переменная, объявленная ниже по коду, физически отсутствует в области видимости до тех пор, пока промис не разрешится. Если в процессе асинхронного вызова произошла ошибка (например, `createError` или 404), серверный рендерер `server-renderer` при рендеринге шаблона упадет с ошибкой `Cannot read properties of undefined` при попытке прочитать необъявленные переменные. Все словари, локали и синхронные хелперы обязаны находиться на самом верху скрипта.
2. **Nuxt `useAsyncData` Key Types:**
   Первый аргумент `useAsyncData` должен быть строго строкой (`string`). Передача функции-геттера (`() => ...`) вызывает критическую ошибку `key must be a string`. Динамическая реактивность реализуется через передачу реактивных зависимостей в массив `watch: [...]`.
3. **Лимит памяти Canvas в мобильном WebKit:**
   iOS Safari имеет жесткий пул памяти под Canvas (около 224 МБ). Создание нескольких холстов с разрешением >2048px и применение CSS-фильтров (`filter: blur(...)`) форсируют сброс контекста GPU (белые листы). Для мобильных устройств необходимо жестко ограничивать количество одновременных холстов до 1 активного.
4. **Изоляция свайпов на мобильных экранах:**
   Одного `overflow-x: auto` недостаточно для предотвращения history-swipe в мобильном Safari. Требуется связка `overscroll-behavior-x: contain` и `touch-action: pan-x pan-y pinch-zoom` на уровне скроллируемого DOM-узла.
