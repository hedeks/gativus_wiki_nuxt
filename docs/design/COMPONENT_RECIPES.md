# Design Component Recipes

Практические рецепты для новых экранов и компонентов в стиле текущего foundation.

## 1. Page Head Recipe

Используй для шапки любой admin-страницы:

- контейнер: `gv-admin-head`
- надзаголовок: `gv-admin-eyebrow`
- заголовок: `gv-admin-title`
- подзаголовок: `gv-admin-subtitle`

Мини-шаблон:
- `<div class="gv-admin-head"> ... </div>`
- внутри только смысловые уровни текста и без лишних декоративных рамок

## 2. Surface/Card Recipe

Для секций с контентом:

- внешний блок: `gv-admin-surface`
- внутренний отступ: 14-18px desktop, меньше на mobile
- не добавляй отдельный цвет фона, если подходит базовый `--gv-surface-card`

Правило: сначала foundation-класс, потом локальная специфика.

## 3. Table Recipe

- обертка: блок с `overflow-x: auto`
- таблица: `min-width` для desktop-структуры
- на мобиле не удаляй колонки силой; пускай работает горизонтальный scroll

Рекомендуемые минимумы:
- обычные admin-таблицы: 760px
- dense таблицы на very-small: можно опустить до 680px

## 4. Form Recipe

- форма разбивается на секции-карточки
- у каждой секции есть явный заголовок
- primary action должен оставаться заметным внизу на маленьких экранах

Для `<=360px`:
- кнопки в action-группах делай full-width
- избегай горизонтальных рядов из 3+ контролов

## 5. Action Group Recipe

Классы для групп действий:
- `header-actions`
- `page-actions`
- `form-actions`
- `modal-actions`
- `import-actions`

Поведение:
- `<=768px`: wrap + full-width контейнер
- `<=360px`: каждый child-элемент группы на всю ширину

## 6. Very Small Screens Recipe (320-360px)

Базовые правила:
- уменьшить отступы shell (`admin-content`, `admin-topbar`)
- уменьшить typographic scale в заголовках
- оставить touch targets удобными (около 36-40px)
- скрыть вторичный текст в toolbar, оставив иконки

Где уже реализовано:
- `app.vue` — общий `@media (max-width: 360px)` для admin foundation
- `layouts/admin.vue` — shell/topbar/sidebar адаптация для 360px

## 7. Do / Don't

Do:
- использовать `--gv-*` токены
- переиспользовать foundation-классы
- проверять минимум в 360px и 320px viewport

Don't:
- дублировать новый визуальный язык локальными `card-*` в каждом файле
- возвращать hardcoded accent цвета вместо `--gv-primary`
- ломать таблицы в stacked-mode, если можно оставить scroll
