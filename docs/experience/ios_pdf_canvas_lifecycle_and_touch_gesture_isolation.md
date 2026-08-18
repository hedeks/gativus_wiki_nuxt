# Изоляция мобильных жестов на таблицах, окончательное устранение белого Canvas в iOS Safari и мультираскладочный перехват горячих клавиш

## Проблема

В ходе эксплуатации приложения на мобильных устройствах и десктопе были выявлены три критические проблемы взаимодействия и рендеринга:

1. **Конфликт мобильных свайпов со скроллом таблиц и блоков кода:**
   * В статьях при чтении со смартфона пользователь пытается прокрутить широкую таблицу или блок программного кода (`<pre><code>`) по горизонтали.
   * Слушатель жестов `useMobileChapterSwipe` перехватывал любое горизонтальное перемещение пальца по экрану, из-за чего попытка просмотреть правую часть таблицы приводила к мгновенному случайному переходу на следующую/предыдущую главу книги.
   * На iOS Safari свайп от самого левого края экрана конфликтовал со встроенным системным свайпом истории браузера.

2. **Персистирующая проблема белого Canvas в PDF Viewer на iOS Safari:**
   * Несмотря на предыдущие фиксы, на мобильных устройствах Apple (iOS Safari и Chrome на WebKit) просмотрщик PDF-презентаций часто открывался как пустой белый прямоугольник без текста и векторной графики.
   * **Корневые причины:**
     1. *Рендеринг в скрытом DOM:* По умолчанию статья открывается в режиме текста (`isTheory = true`). Блок презентации в `pages/articles/[slug].vue` смонтирован, но скрыт CSS-классом `.inactive` (`position: absolute; width: 0; height: 0; overflow: hidden; opacity: 0;`). Дочерние компоненты `ThePdfViewer.vue` и `PdfPage.vue` монтировались и немедленно вызывали `page.render()`. Движок WebKit в целях экономии оперативной памяти мобильных устройств **полностью сбрасывает растрированный GPU-буфер Canvas, если отрисовка происходит в невидимом дереве (0x0 / opacity: 0)**. Когда пользователь переключался на вкладку «Презентация», `PdfPage` не перерисовывался (так как номер страницы и масштаб не менялись), и на экране оставался пустой залитый белым холст.
     2. *Несовместимость полифила `URL.parse`:* Вызов `URL.parse(url, base)` в JavaScriptCore (Safari 15–17) бросал исключение `TypeError: Invalid base URL: undefined` при вызове `new URL(url, undefined)`, из-за чего парсинг путей к шрифтам `/pdfjs/cmaps/` и `/pdfjs/standard_fonts/` возвращал `null`, и текст PDF не загружался.
     3. *Конфликт матрицы преобразования `transform` в PDF.js 5.x:* Передача отдельного массива `transform: [outputScale, ...]` вместе с немасштабированным `viewport` вызывала некорректный расчет координат и clipping в 0x0 в 2D-контексте WebKit.
     4. *Passive Event Listeners:* Шаблонные директивы `@wheel` и `@touchmove` во Vue по умолчанию регистрируются браузером как пассивные (`{ passive: true }`), из-за чего `e.preventDefault()` блокировался браузерной интервенцией `Unable to preventDefault inside passive event listener invocation`.

3. **Сбой перехвата горячих клавиш поиска (`Ctrl + K` / `Cmd + K`):**
   * В `TheSearch.vue` проверка `if ((e.metaKey || e.ctrlKey) && e.key === 'k')` ориентировалась на `e.key`.
   * При активной русской раскладке клавиатуры нажатие давало `e.key === 'л'` (или `'Л'`). Проверка не проходила, `preventDefault()` не вызывался, и браузер Chrome открывал свой собственный Omnibox поиска по странице.

---

## Решение

### 1. Полная изоляция таблиц и блоков кода от свайпов глав (`composables/useMobileChapterSwipe.ts`)
В обработчик `onTouchStart(e)` внедрена строгая многоуровневая фильтрация:
```typescript
function onTouchStart(e: TouchEvent) {
  if (!isMobileViewport() || !isEnabled()) return
  if (!e.touches.length) return
  const t = e.touches[0]

  // 1. Игнорируем зону системных свайпов iOS «Назад / Вперёд» у кромок экрана (24px)
  if (t.clientX <= 24 || (typeof window !== 'undefined' && t.clientX >= window.innerWidth - 24)) {
    touchId = null
    return
  }

  // 2. Полностью игнорируем касания внутри таблиц, блоков кода, поиска и интерактивных контролов
  const target = e.target as HTMLElement | null
  if (target?.closest('.article-table-scroll, table, thead, tbody, tr, td, th, pre, code, .gv-article-search-context-row, input, textarea, button, a, select, [data-prevent-swipe]')) {
    touchId = null
    return
  }

  touchId = t.identifier
  startX = t.clientX
  startY = t.clientY
  startT = Date.now()
}
```
Пользователь может свободно прокручивать широкие таблицы и код горизонтально и вертикально — свайп смены глав внутри них полностью заблокирован.

### 2. Жизненный цикл Canvas, отложенный рендеринг и PDF.js 5 (`ThePdfViewer.vue`, `PdfPage.vue`, `thePresentationView.vue`)
* **Проброс флага активности:** В `pages/articles/[slug].vue` и `thePresentationView.vue` добавлен проп `:is-active="!isTheory"`.
* **Слежение за видимостью и `IntersectionObserver`:** В `PdfPage.vue` рендеринг заблокирован при `isActive: false`. Дополнительно подключен `IntersectionObserver`: если холст монтируется в невидимом состоянии, при первом пересечении видимого экрана гарантированно вызывается `renderPage()` в уже активном окне WebKit.
* **Канонический scaled viewport рендеринг PDF.js 5:**
  Убран конфликтный массив `transform`, масштаб высокого разрешения заложен непосредственно во `viewport`:
  ```typescript
  let outputScale = Math.min(window.devicePixelRatio || 1, 2)
  const MAX_CANVAS_DIMENSION = 2048 // Потолок разрешения для стабильности WebKit GPU

  let scaledViewport = page.getViewport({ scale: currentScale * outputScale })
  if (scaledViewport.width > MAX_CANVAS_DIMENSION || scaledViewport.height > MAX_CANVAS_DIMENSION) {
    const maxDim = Math.max(scaledViewport.width, scaledViewport.height)
    const downFactor = MAX_CANVAS_DIMENSION / maxDim
    outputScale = outputScale * downFactor
    scaledViewport = page.getViewport({ scale: currentScale * outputScale })
  }

  canvas.value.width = Math.floor(scaledViewport.width)
  canvas.value.height = Math.floor(scaledViewport.height)
  canvas.value.style.width = `${Math.floor(scaledViewport.width / outputScale)}px`
  canvas.value.style.height = `${Math.floor(scaledViewport.height / outputScale)}px`

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

  const renderContext = {
    canvasContext: ctx,
    viewport: scaledViewport,
    background: 'rgb(255,255,255)'
  }
  activeRenderTask = page.render(renderContext)
  await activeRenderTask.promise
  ```
* **Non-passive слушатели:** В `ThePdfViewer.vue` слушатели `wheel` и `touchmove` сняты с шаблона и зарегистрированы в `onMounted` через `addEventListener(..., { passive: false })`.

### 3. Исправление полифила `URL.parse` (`plugins/pdf-polyfills.client.ts`, `public/workers/pdf.worker.js`)
Полифил защищен от передачи `undefined` вторым аргументом:
```javascript
if (typeof URL !== 'undefined' && typeof URL.parse !== 'function') {
  URL.parse = function(url, base) {
    try {
      return base !== undefined ? new URL(url, base) : new URL(url);
    } catch (e) {
      return null;
    }
  };
}
```

### 4. Мультираскладочный перехват горячих клавиш (`TheSearch.vue`)
Проверка переведена на физический скан-код клавиши:
```typescript
function onCmdKOpenSearch(e: KeyboardEvent) {
  const isK = e.code === 'KeyK' || e.key?.toLowerCase() === 'k' || e.key === 'л' || e.key === 'Л'
  if ((e.metaKey || e.ctrlKey) && isK) {
    e.preventDefault()
    isOpen.value = true
  }
}
```
Слушатель регистрируется с флагом `{ capture: true }`, перехватывая сочетание клавиш до того, как браузер обработает его для системного интерфейса.

---

## Извлеченные уроки (Gotchas)

1. **Сброс буфера Canvas при скрытом DOM в WebKit (iOS):**
   Если компонент с HTML5 `<canvas>` рисует графику в момент, когда родительский элемент скрыт через `display: none`, `opacity: 0` или `height: 0; width: 0; overflow: hidden`, Safari/WebKit не сохраняет видеопамять буфера CoreAnimation. Холст выглядит «выполненным» в JS, но на экране остается пустым. Рендеринг Canvas обязан инициироваться **только после** того, как контейнер получил ненулевые физические размеры и стал видимым в DOM (`is-active` / `IntersectionObserver`).
2. **Селекторное исключение в глобальных Touch-обработчиках:**
   При добавлении глобальных свайпов для навигации (например, перелистывание глав) необходимо явно исключать все интерактивные и скроллируемые области (`table`, `pre`, `code`, `input`) через проверку `e.target.closest(...)` в момент `touchstart`, а также отступать от системных кромок экрана (`24px`).
3. **Разрешение базового URL в JavaScriptCore:**
   В отличие от V8 (Chrome), вызов `new URL(url, undefined)` в JavaScriptCore (Safari 15–17) выбрасывает `TypeError`. Любые полифилы `URL.parse` обязаны проверять `base !== undefined`.
4. **Масштабирование Viewport в PDF.js 5.x:**
   Для корректного рендеринга на Retina/HiDPI экранах в PDF.js 5 не следует использовать отдельный параметр `transform` с немасштабированным `viewport`. Единственно надежный способ — рассчитывать `viewport = page.getViewport({ scale: currentScale * outputScale })`.
