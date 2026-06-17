# План миграции Gativus Wiki на Nuxt 4

В этом документе описаны шаги, риски и рекомендации по обновлению проекта `gativus-wiki-nuxt` с Nuxt 3 на Nuxt 4.

---

## 1. Общая оценка сложности: **Средне-высокая (Medium-High)**

Основную сложность представляет не сам фреймворк Nuxt 4, а UI-слой: **зависимость от `@nuxt/ui` v2 и TailwindCSS v3**.

* **Сложность**: Компоненты `@nuxt/ui` (элементы `<U...>`, такие как кнопки, инпуты, модальные окна, слайдоверы, выпадающие списки и иконки) активно используются в более чем **50+ файлах** (включая всю админ-панель `pages/admin/*` и интерфейсы чтения).
* **Несовместимость `@nuxt/ui` v2 с Nuxt 4**: Для перехода потребуется обновить `@nuxt/ui` до версии **v4**. Это мажорное обновление с полным переписыванием библиотеки (переход с Headless UI на Radix Vue / Reka UI, а также Tailwind CSS v4). Props-архитектура, темизация и разметка компонентов существенно изменились, поэтому каждый UI-компонент придется проверять и адаптировать вручную.

---

## 2. Архитектурные изменения и риски

### 📂 Файловая структура (Изменение средней сложности)
В Nuxt 4 исходный код приложения должен находиться во внутренней директории `/app` (компоненты, страницы, composables, layouts, plugins, assets, middleware, а также `app.vue` и `app.config.ts`).
* **Решение**: Использовать официальный codemod `npx codemod@latest nuxt/4/file-structure`, который автоматически перенесет структуру. 
* **Что остаётся в корне**: Nitro-сервер (`server/`), статические файлы (`public/`), конфигурационные файлы и базы данных SQLite. API-эндпоинты (`server/api/*`) не пострадают.

### 🔌 Лишние зависимости (Упрощение проекта)
В [package.json](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/package.json) и [nuxt.config.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/nuxt.config.ts) объявлены `@nuxt/content` и `nuxt-markdown-render`. 
Поиск по кодовой базе показал, что они **не используются** (контент рендерится через `v-html="articleBodyHighlightHtml"`, подгружая готовый HTML из SQLite).
* **Решение**: Полностью удалить эти модули перед началом миграции.

### 🎨 Стили и Tailwind CSS v4
В TailwindCSS v4 больше не нужен [tailwind.config.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/tailwind.config.ts). Настройки описываются непосредственно в CSS через директиву `@theme`.
Кастомные анимации и тени из [tailwind.config.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/tailwind.config.ts) нужно будет перенести в основной файл стилей (например, `assets/css/main.css`):
```css
@theme {
  --animate-slide: slide 0.4s ease-in-out;
  --shadow-darkShadow: 0 1px 3px 0 rgb(255 255 255 / 0.6), 0 1px 2px -1px rgb(255 255 255 / 0.6);

  @keyframes slide {
    0% { transform: translateX(5px); }
    50% { transform: translateX(-5px); }
    100% { transform: translateX(0); }
  }
}
```

### 🗄️ База данных и Системные библиотеки
Использование SQLite (`better-sqlite3`), Nitro Database (`useDatabase()`), D3.js для графа знаний, `pdfjs-dist`, `adm-zip`, bcrypt и JWT полностью совместимо с Nuxt 4 и не вызовет проблем.

---

## 3. Рекомендуемый пошаговый план миграции

### Этап 1: Подготовка (в рамках текущей версии Nuxt 3)
1. **Удаление мёртвых модулей**: Удалите `@nuxt/content` и `nuxt-markdown-render` из [package.json](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/package.json) и [nuxt.config.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/nuxt.config.ts). Запустите `npm install`.
2. **Включение флага совместимости**: Добавьте в [nuxt.config.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/nuxt.config.ts):
   ```typescript
   export default defineNuxtConfig({
     future: {
       compatibilityVersion: 4,
     },
     // ...
   })
   ```
3. **Реструктуризация папок**: Запустите codemod для автоматического перемещения папок в `/app`:
   ```bash
   npx codemod@latest nuxt/4/file-structure
   ```
   Проверьте запуск dev-сервера в этом режиме.

### Этап 2: Обновление ядра (Nuxt 4)
1. Обновите версию `nuxt` в [package.json](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/package.json) до `^4.0.0` (или через `npx nuxi upgrade`).
2. Обновите `@pinia/nuxt` и `pinia` до актуальных версий.

### Этап 3: Обновление UI-слоя
1. Удалите `@nuxtjs/tailwindcss` и обновите `@nuxt/ui` до версии `^4.0.0` (или актуальной стабильной v4).
2. Настройте Tailwind CSS v4 в вашем основном CSS-файле с помощью `@import "tailwindcss"; @import "@nuxt/ui";`.
3. Перенесите переменные из [tailwind.config.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/tailwind.config.ts) в блок `@theme` основного CSS-файла.
4. **Рефакторинг UI-компонентов**: Адаптируйте разметку под новые API компонентов `@nuxt/ui` v4 во всех `.vue`-файлах.
