# Полное устранение проблемы пустого Canvas в PDF Viewer на iOS (Safari и Chrome)

## Проблема

При открытии презентаций и PDF-документов в статьях (`/articles/[slug]`) и терминах глоссария (`/glossary/[slug]`) на устройствах Apple iOS (как в Safari, так и в Chrome, который на iOS работает на том же движке WebKit / Apple JavaScriptCore) отображался пустой белый прямоугольный лист с тенью без содержимого (текста, схем и векторной графики PDF).

### Корневые причины сбоя

1. **Инициализация в скрытом DOM и расчет отрицательного масштаба (`baseScale`):**
   * При загрузке страницы статьи состояние по умолчанию `isTheory = true` (открыта теория/текст).
   * Контейнер презентации в разметке монтируется сразу из-за `v-if="hasPresentation"`, но скрыт CSS-классом `.inactive` (`height: 0; width: 0; position: absolute; overflow: hidden;`).
   * Дочерний компонент `ThePdfViewer.vue` при монтировании в `loadPdf()` вычислял базовый масштаб:
     ```typescript
     const availableHeight = container.value.clientHeight - padding // 0 - 40 = -40 !
     if (vp.height > 0) {
       baseScale.value = availableHeight / vp.height // -40 / 842 = -0.0475
     }
     ```
   * Переменная `baseScale` становилась отрицательным числом (`-0.0475`). Этот масштаб передавался в `PdfPage.vue` (`:scale="scale * baseScale"`), где `page.getViewport({ scale: currentScale })` получал отрицательные размеры. Установка отрицательных значений в `canvas.width` сбрасывала холст HTML5 в 0x0.
   * При нажатии пользователем кнопки «Перейти к презентации» (`isTheory = false`) контейнер становился видимым, но из-за отсутствия `ResizeObserver` пересчет масштаба не запускался — холст оставался пустым.

2. **Несовместимость ES2024 `URL.parse` в Web Worker на iOS < 18:**
   * Библиотека `pdfjs-dist: 5.6.205` и файл `public/workers/pdf.worker.js` использовали метод `URL.parse()`, добавленный только в Safari 18 (iOS 18+).
   * На устройствах с iOS 15, 16, 17 парсинг строк внутри Web Worker приводил к `TypeError: URL.parse is not a function`, что аварийно завершало процесс воркера в фоне.
   * Вызовы `Promise.withResolvers` (добавлен в Safari 17.4) также приводили к падению на iOS < 17.4.

3. **Сброс видеопамяти Canvas в WebKit (GPU Process Context Loss):**
   * В `PdfPage.vue` на Canvas были установлены CSS-свойства `transform: translateZ(0)` и `will-change: transform, opacity`.
   * При динамическом масштабировании или рендеринге в момент анимации перехода WebKit создавал композитный слой CoreAnimation с нулевым или невалидным буфером и молча сбрасывал 2D-контекст холста для экономии мобильной памяти RAM.
   * При этом CSS-класс `bg-white` и тень `shadow-2xl` продолжали отрисовываться браузером, создавая визуальный эффект «белого пустого листа».

4. **Относительные пути к шрифтам CMaps и Standard Fonts:**
   * Относительные пути `/pdfjs/cmaps/` и `/pdfjs/standard_fonts/` при обращении из Web Worker на некоторых версиях WebKit не могли корректно разрешиться без абсолютного origin.

---

## Решение

### 1. Клиентские полифилы (`plugins/pdf-polyfills.client.ts`)
Создан Nuxt-плагин для инициализации полифилов в глобальном контексте браузера:
```typescript
export default defineNuxtPlugin(() => {
  if (typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: any) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }

  if (typeof (URL as any).parse !== 'function') {
    (URL as any).parse = function (url: string | URL, base?: string | URL) {
      try {
        return new URL(url, base)
      } catch {
        return null
      }
    }
  }

  if (typeof Object.hasOwn !== 'function') {
    Object.hasOwn = function (object: any, key: PropertyKey) {
      return Object.prototype.hasOwnProperty.call(object, key)
    }
  }
})
```

### 2. Полифилы в Web Worker (`public/workers/pdf.worker.js`)
В верхнюю часть скрипта воркера перед инициализацией PDF.js внедрены проверки:
```javascript
if (typeof self !== 'undefined') {
  if (typeof URL !== 'undefined' && typeof URL.parse !== 'function') {
    URL.parse = function(url, base) {
      try { return new URL(url, base); } catch (e) { return null; }
    };
  }
  if (typeof Promise !== 'undefined' && typeof Promise.withResolvers !== 'function') {
    Promise.withResolvers = function() {
      var resolve, reject;
      var promise = new Promise(function(res, rej) {
        resolve = res;
        reject = rej;
      });
      return { promise: promise, resolve: resolve, reject: reject };
    };
  }
}
```

### 3. Защита от нулевого масштаба и динамический `ResizeObserver` (`components/ThePdfViewer.vue`)
* Функция `updateBaseScale` проверяет минимальные габариты контейнера (`h > 50 && w > 50`), полностью блокируя вычисление при скрытом DOM:
  ```typescript
  const updateBaseScale = async () => {
    if (!container.value || !pdfDoc.value) return
    const h = container.value.clientHeight
    const w = container.value.clientWidth
    if (h <= 50 || w <= 50) return

    try {
      const page = await pdfDoc.value.getPage(pageNum.value || 1)
      const vp = page.getViewport({ scale: 1.0 })
      const paddingY = 40
      const paddingX = isIos.value ? 16 : 40
      const availableHeight = Math.max(0, h - paddingY)
      const availableWidth = Math.max(0, w - paddingX)
      
      if (vp.height > 0 && vp.width > 0 && availableHeight > 50) {
        const scaleH = availableHeight / vp.height
        const scaleW = availableWidth > 0 ? availableWidth / vp.width : scaleH
        const fitScale = Math.min(scaleH, scaleW)
        if (fitScale > 0.05 && !isNaN(fitScale)) {
          baseScale.value = fitScale
        }
      }
    } catch (err) {
      console.warn('Failed to update baseScale:', err)
    }
  }
  ```
* В `onMounted` подключен `ResizeObserver` на `container.value`, который автоматически обновляет `baseScale` при смене вкладки, изменении ориентации устройства или скрытии мобильного тулбара Safari.
* В `loadPdf` сформированы абсолютные URL для шрифтов через `window.location.origin`:
  ```typescript
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const cMapUrl = `${origin}/pdfjs/cmaps/`
  const standardFontDataUrl = `${origin}/pdfjs/standard_fonts/`
  ```

### 4. Стабилизация рендеринга страницы (`components/PdfPage.vue`)
* Удалены аппаратные 3D-хаки `translateZ(0)` и `will-change`, вызывавшие GPU context loss в WebKit.
* Защита входящего масштаба: `currentScale = Math.max(0.1, props.scale || 1.0)`.
* Добавлена предварительная заливка фона холста `ctx.fillRect(0, 0, canvasWidth, canvasHeight)` цветом `#ffffff`.
* Добавлены безопасные `min-width: 100px; min-height: 100px` для обертки страницы, предотвращающие сжатие контейнера в 0x0 при смене страниц.

---

## Извлеченные уроки (Gotchas)

1. **Движок браузеров на iOS (WebKit):**
   Все сторонние браузеры на iOS (Chrome, Firefox, Edge, Opera) обязаны использовать системный WebKit/WKWebView. Баги рендеринга в мобильном Chrome на iPhone полностью идентичны багам в Safari.
2. **Расчет размеров во Vue-компонентах внутри скрытых родительских блоков:**
   Если компонент монтируется внутри родителя со стилями `height: 0` или `display: none`, свойства `clientHeight` и `clientWidth` равны `0`. Любая математика деления габаритов (`availableHeight / vp.height`) без проверки `clientHeight > 0` дает отрицательные или некорректные масштабы. Решением всегда является связка: минимальный порог (`h > 50`) + `ResizeObserver`.
3. **Современные стандарты JavaScript в Web Worker (PDF.js 5.x):**
   Новые версии библиотек (такие как `pdfjs-dist` 4.x и 5.x) используют спецификации ES2023–ES2024 (`URL.parse`, `Promise.withResolvers`, `Array.toReversed`). Если воркер загружается как отдельный файл, глобальные полифилы основного потока туда не попадают — полифилы необходимо внедрять непосредственно в тело воркера `pdf.worker.js`.
4. **Опасность 3D-ускорения для Canvas в WebKit:**
   Свойства `transform: translateZ(0)` и `will-change: transform` для Canvas-элементов в мобильном Safari могут приводить к сбросу видеопамяти 2D-контекста, оставляя на экране только CSS-фон родителя.
