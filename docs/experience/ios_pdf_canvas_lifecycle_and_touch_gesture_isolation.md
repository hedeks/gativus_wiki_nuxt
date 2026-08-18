# Отключение свайпов смены глав в статьях, устранение белого Canvas в PDF Viewer (iOS Safari) и мультираскладочный поиск

## Проблема

В ходе практического тестирования на мобильных устройствах (iOS Safari) и десктопе были выявлены следующие проблемы:

1. **Конфликт свайпов глав со скроллом контента и таблиц:**
   * При чтении статей со смартфона попытка прокрутить широкую таблицу или пролистать текст приводила к нежелательному переходу на следующую/предыдущую главу.
   * Наличие CSS-свойства `touch-action: pan-y` на карточке статьи запрещало горизонтальную прокрутку таблиц на уровне браузерного движка.
   * Пользователь принял решение полностью отключить функцию смены глав по свайпу (`useMobileChapterSwipe`), оставив только нативный скролл.

2. **Белый лист в PDF Viewer на iOS Safari:**
   * Просмотрщик успешно определял количество страниц (`1 / N`), спиннер завершал работу, но на экране оставался белый прямоугольник без содержимого.
   * **Корневые причины:**
     1. *Рендеринг в PDF.js 5.x:* В `PdfPage.vue` вызывался устаревший паттерн `page.render({ canvasContext: ctx })` без передачи свойства `canvas: canvas.value`. В PDF.js 5.x движок ожидает нативный Canvas-элемент для корректного управления контекстом и буферами в WebKit.
     2. *Маскирующая заливка `ctx.fillRect('#ffffff')`:* Ручная заливка белым цветом в сочетании с незавершённым или фоновым рендером оставляла белый холст.
     3. *Конфликт CSS `transform: scale(s)`:* Динамический `transform: scale(...)` с `transform-origin: top left` внутри flex-контейнера в WebKit вызывал смещение холста за пределы видимой области.
     4. *Несовместимость современного воркера с JavaScriptCore:* Сборка `pdf.worker.mjs` требовала ES2024 фич. Использование официальной legacy-сборки `pdfjs-dist/legacy/build/pdf.worker.min.mjs` восстановило полную совместимость с Safari на iOS.

3. **Сбой хоткея `Ctrl+K` / `Cmd+K` на других языковых раскладках:**
   * В русской раскладке `e.key` равен `'л'`, что блокировало открытие модалки поиска.

---

## Решение

### 1. Полное отключение свайпа смены глав
* В [`pages/articles/[slug].vue`](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/pages/articles/[slug].vue) удален вызов `useMobileChapterSwipe`, а с карточки `articleMainCardRef` удален ограничивающий атрибут `style="touch-action: pan-y..."`.
* В [`composables/useMobileChapterSwipe.ts`](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/composables/useMobileChapterSwipe.ts) модуль превращен в безопасный `no-op`.

### 2. Канонический рендеринг PDF.js 5 в `PdfPage.vue`
* Прямая передача `canvas: canvas.value` в `page.render`:
  ```typescript
  const renderContext = {
    canvas: canvas.value,
    canvasContext: ctx,
    viewport: scaledViewport
  }
  activeRenderTask = page.render(renderContext)
  await activeRenderTask.promise
  ```
* Убраны ручные заливки `ctx.fillRect('#ffffff')` и промежуточные CSS-матрицы `transform: scale(s)`. Холст отрисовывается с явными физическими и CSS-размерами (`displayWidth` / `displayHeight`).
* Подключен официальный `pdfjs-dist/legacy/build/pdf.worker.min.mjs` в [`public/workers/pdf.worker.js`](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/public/workers/pdf.worker.js) с полифилами `URL.parse` и `Promise.withResolvers`.

### 3. Мультираскладочный перехват поиска в `TheSearch.vue`
* Проверка скан-кода `e.code === 'KeyK' || e.key?.toLowerCase() === 'k' || e.key === 'л' || e.key === 'Л'` на фазе `{ capture: true }`.

---

## Извлеченные уроки (Gotchas)

1. **PDF.js 5 Canvas Parameter:**
   В PDF.js 5.x для рендеринга на Canvas всегда следует передавать `canvas: canvas.value` в `renderContext`. Передача одного лишь `canvasContext` считается устаревшим механизмом и приводит к сбоям синхронизации контекста в Safari.
2. **`touch-action: pan-y` на родительских элементах:**
   Никогда не следует вешать `touch-action: pan-y` на верхнеуровневые контейнеры, внутри которых предполагается горизонтальный скролл дочерних элементов (например, таблиц с `overflow-x: auto`), так как это ломает обработку горизонтального перемещения в браузерах.
3. **Legacy Worker для Safari/WebKit:**
   Для надёжной работы PDF.js на мобильных устройствах Apple следует использовать сборку `pdfjs-dist/legacy`, лишённую несовместимых ES2024 конструкций в потоке Web Worker.
