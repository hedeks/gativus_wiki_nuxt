# Отключение свайпов смены глав в статьях, устранение белого Canvas в PDF Viewer (iOS Safari) и мультираскладочный поиск

## Проблема

В ходе практического тестирования на мобильных устройствах (iOS Safari / WebKit) и десктопе были выявлены следующие проблемы:

1. **Конфликт свайпов глав со скроллом контента и таблиц:**
   * При чтении со смартфона горизонтальная прокрутка широких таблиц или случайные диагональные свайпы вызывали перелистывание глав книги (`useMobileChapterSwipe`).
   * Наличие CSS-свойства `touch-action: pan-y` на карточке статьи запрещало горизонтальную прокрутку таблиц на уровне браузерного движка WebKit/Blink.
   * Пользователь принял решение полностью отключить функцию смены глав по свайпу, оставив исключительно нативный скролл.

2. **Белый лист в PDF Viewer на iOS Safari (почему предыдущие попытки не давали эффекта):**
   * Вьювер определял количество страниц (`1 / N`), спиннер завершал работу, но на экране оставался белый лист.
   * **Анализ неудачных подходов и их причин:**
     1. *Рассинхрон сборок PDF.js:* Главный поток импортировал современный `import('pdfjs-dist')`, а воркер был заменен на `legacy`. Разные структуры внутренней сериализации вызывали сбой при передаче команд отрисовки. Переход на `import('pdfjs-dist/legacy/build/pdf.mjs')` обеспечил 100% совместимость.
     2. *CSS Matrix Clipping в WebKit:* Предыдущее решение использовало динамический `transform: scale(s)` с `transform-origin: top left` внутри flex-контейнера. В Safari это вызывало смещение Canvas за пределы контейнера (`overflow: hidden`).
     3. *Маскирующая заливка `ctx.fillRect('#ffffff')`:* Ручное закрашивание холста белым фоном до завершения рендера PDF.js маскировало векторные слои.
     4. *Нюанс процесса деплоя:* Скрипт `upload.mjs` упаковывает папку `dist_deploy`. Если перед деплоем не выполнить `npm run package` (который запускает `nuxt build` и `make-deploy.ps1`), на сервер отправляются старые скомпилированные `.output/public/_nuxt/` бандлы.

3. **Сбой хоткея `Ctrl+K` / `Cmd+K` на других языковых раскладках:**
   * В русской раскладке `e.key` равен `'л'`, что блокировало открытие модалки поиска.

---

## Решение

### 1. Полное отключение свайпа смены глав
* В [`pages/articles/[slug].vue`](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/pages/articles/[slug].vue) удален вызов `useMobileChapterSwipe`, а с карточки `articleMainCardRef` удален ограничивающий атрибут `style="touch-action: pan-y..."`.
* В [`composables/useMobileChapterSwipe.ts`](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/composables/useMobileChapterSwipe.ts) модуль превращен в безопасный `no-op`.

### 2. Канонический рендеринг PDF.js 5 в `PdfPage.vue` и `ThePdfViewer.vue`
* В `ThePdfViewer.vue` подключен `import('pdfjs-dist/legacy/build/pdf.mjs')` в связке с `legacy/build/pdf.worker.min.mjs` в [`public/workers/pdf.worker.js`](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/public/workers/pdf.worker.js).
* В `PdfPage.vue` рендеринг переведен на канонический `page.render({ canvasContext: ctx, viewport: scaledViewport })`.
* Убраны ручные заливки `ctx.fillRect('#ffffff')` и промежуточные CSS-матрицы `transform: scale(s)`. Холст отрисовывается с явными физическими и CSS-размерами (`displayWidth` / `displayHeight`).
* Налажен пайплайн пересборки через `npm run package` перед отправкой в `upload.mjs`.

### 3. Мультираскладочный перехват поиска в `TheSearch.vue`
* Проверка физического кода клавиши: `e.code === 'KeyK' || e.key?.toLowerCase() === 'k' || e.key === 'л' || e.key === 'Л'` на фазе захвата `{ capture: true }`.

---

## Извлеченные уроки (Gotchas)

1. **Синхронизация Legacy версий PDF.js:**
   Нельзя смешивать `pdfjs-dist` (main) и `pdfjs-dist/legacy` (worker). И клиентский код, и воркер обязаны использовать сборку `legacy/build/` для стабильной работы под Safari/WebKit.
2. **`touch-action: pan-y` на родительских элементах:**
   Никогда не следует вешать `touch-action: pan-y` на верхнеуровневые контейнеры, внутри которых предполагается горизонтальный скролл дочерних элементов (например, таблиц с `overflow-x: auto`), так как это ломает обработку горизонтального перемещения в браузерах.
3. **Пайплайн деплоя через `dist_deploy`:**
   При работе со скриптом `upload.mjs` обязательным шагом является предварительный запуск `npm run package` (компиляция Nuxt + наполнение папки `dist_deploy`). Без этого любые правки во Vue-компонентах не попадают в деплой.
