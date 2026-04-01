# Дизайн-система (Design System Manifest)

Этот манифест описывает основные визуальные принципы, цветовую палитру, типографику, стили компонентов и спецификации анимаций, которые применяются в проекте `web-security-courses` для достижения "премиального" (Premium) и минималистичного вида. 

Документ создан на основе анализа существующей кодовой базы проекта (компоненты навигации, лейауты, Vue-переходы и Tailwind-классы).

---

## 1. Цветовая палитра (Color Palette)

Проект строго поддерживает две темы (Светлая и Темная). Основной цветовой профиль опирается на монохромные и ахроматические шкалы TailwindCSS (`gray`, `zinc`). 

> [!WARNING]
> Во время разработки в проекте возникли небольшие противоречия в выборе фоновых оттенков (например, смешивание `zinc-900` из `app.vue` и `gray-950` из `[...slug].vue`). Данный манифест предписывает **стандартизировать** использование палитры `zinc` для тёмной темы, так как она дает более глубокий, холодный оттенок, характерный для премиум-дизайна.

### Светлая тема (Light Mode)
- **Базовый фон страницы:** `bg-gray-50` (Очень светлый, почти белый, не режет глаза).
- **Фон компонентов (карточки, markdown):** `bg-gray-100` или чистый `#ffffff` (белый).
- **Первичный текст:** `text-black` (для заголовков), `text-gray-800` (для основного текста).
- **Вторичный текст:** `text-gray-500` (для дополнительных примечаний или глубокой вложенности).
- **Границы и разделители:** `border-gray-200` (тонкие, едва заметные линии).

### Темная тема (Dark Mode)
- **Базовый фон страницы:** `bg-zinc-900` (Основной, глубокий фон) или `bg-zinc-950` для максимального контраста.
- **Фон компонентов:** `bg-zinc-800` (Выделяющиеся блоки, карточки, код).
- **Первичный текст:** `text-white` (заголовки), `text-gray-200` / `text-gray-300` (читаемый текст, снижающий напряжение с глаз).
- **Вторичный текст:** `text-gray-400`.
- **Границы и разделители:** `border-gray-700` или `border-gray-800`.
- *(Устаревший/нерекомендованный цвет)*: `bg-gray-950`, стоит постепенно заменять на `zinc-950` для единства температуры цвета.

---

## 2. Формы и контейнеры (Shapes & Elevations)

Премиальность достигается за счет баланса между острыми минималистичными формами и очень мягкими скруглениями у интерактивных элементов.

- **Скругления (Border Radius):**
  - Кнопки-плашки (например, "Наверх"): `rounded-2xl` — вытянутые капсулы. Заменяет стандартные круги (`rounded-full`) для более дорогого и современного вида.
  - Скроллбары: Строго прямоугольные (Острые углы, `border-radius: 0`).
  - Плашки (карточки лекций): Большие скругления для больших блоков, либо полное их отсутствие, если блок привязан к краям.

- **Тени (Shadows):**
  - Статика: `shadow-lg` или `shadow-xl`. (Например, летающие кнопки). Тени мягкие, но глубокие.
  - Интерактив (Hover): `hover:shadow-2xl` — при наведении элемент "поднимается" к пользователю, тень значительно увеличивается.

- **Эффект стекла (Glassmorphism):**
  - Применяется повсеместно для залипающих (sticky) элементов: шапки сайта, заголовка меню, кнопок.
  - Реализация: Полупрозрачный фон (`bg-white/90` или `bg-zinc-900/90`) в связке с тяжелым размытием заднего фона (`backdrop-blur-md` или `backdrop-blur-xl`).

---

## 3. Анимации и Кривые (Motion & Easing)

Вместо стандартных линейных анимаций, в дизайне проекта используются кастомные кривые Безье. Это делает движения "резкими в начале и плавными в конце", симулируя физику реальных интерфейсов класса "Apple/Vercel".

### Кривые Безье (Графики)
1. **Глобальный Page Transition**
   - **Timing-function:** `cubic-bezier(0.705, 0.010, 0.000, 0.915)`
   - **Скорость:** `0.4s`
   - **How it feels:** Очень динамичный и резкий старт (element rushes in), который драматично тормозит и плавно доходит до конечной точки. Идеально для смены тяжеловесных страниц.

2. **Аккордеоны и списки (Expand)**
   - **Timing-function:** `cubic-bezier(0, 1, 0, 1)` для высоты, и `ease` для прозрачности.
   - **Скорость:** `0.4s`
   - **How it feels:** Экстремально резкое раскрытие/скрытие контейнера (`max-height`), мгновенно освобождающее место. При этом контент внутри проявляется/исчезает очень плавно (`opacity`), не режа глаз.

### Микро-интеракции (Micro-animations)
Все интерактивные элементы (кнопки, плашки в оглавлении) обязаны иметь мягкий транзишен на изменение состояния:
- **Hover-эффекты:** `transition-all duration-300 ease`. Резкая реакция, но с микро-задержкой отпускания.
- **Поднятие при клике/наведении:** `transform hover:-translate-y-1`. Элемент должен физически реагировать на присутствие курсора.

---

## 4. Типографика и Микро-типографика

- **Семейство шрифтов (Font Family):** Системные шрифты по умолчанию (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`). Это гарантирует нулевую задержку загрузки и "родное" отображение (San Francisco на MacOS, Segoe на Windows).
- **Заголовки-лейблы:** Часто используется стиль "Надбровного заголовка" (Eyebrow text) — надписи вроде "СОДЕРЖАНИЕ" или "ОТ ТЕОРИИ".
  - Классы: `text-sm tracking-widest font-bold uppercase`. Разрядка (`tracking-widest`) делает текст премиальным и легко читаемым.
- **Иерархия размеров:** Строгий контроль за спадением шрифта. Пример из компонента TOC:
  - Уровень 0 (Базовый): `text-[14px]`
  - Уровень 1 (Вложенный): `text-[13px]`
  - Уровень 2 (Глубокий): `text-[12px]` с серым оттенком (`text-gray-500`).

---

## 5. UI Элементы Управления

- **Скроллбары (Scrollbars):**
  - Ультра-минималистичные (ширина `4px`).
  - Радикальные монохромные контрасты. Никаких серых тонов для ползунка: чисто черный (`#000000`) на светлой теме, чисто белый (`#ffffff`) на темной теме. С легким затемнением при наведении (`hover`).
  - Строгая поддержка Firefox через новые CSS Variable (Scrollbar-color).
  
- **Layout Patterns (Организация пространства):**
  - Контент выравнивается по ассиметричной (или, напротив, идеальной симметричной) грид-сетке (`grid-cols-10` или `12`).
  - Сайдбары (`theToc` и `theLeftQuizSelector`) занимают по 2 колонки из 10/12, оставляя 8 колонок `max-w-none prose` для центрального чтения. Это дает প্রচুর "воздуха" (White space) по краям экрана. На мобильных устройствах контент сворачивается в аккордеоны для экономии вертикального пространства.

---
---

# Система дизайна для основных страниц (Gativus Cards)

> **Версия**: 1.0  
> **Дата**: 2026-04-01  
> **Источник стиля**: [Gativus Demo](https://gativus-demo.vercel.app) + `pages/about.vue`  
> **Область применения**: Публичные страницы — About, Glossary, Books, Knowledge Graph

---

## 6. Цветовая палитра карточек (Gativus Pages)

### Light Mode

| Токен | HEX | Использование |
|:------|:----|:-------------|
| `--gp-bg-page` | `#ffffff` | Фон страницы |
| `--gp-bg-card` | `#ffffff` | Фон секционных карточек |
| `--gp-bg-card-header` | `#f9f9f9` | Фон заголовков карточек |
| `--gp-bg-subtle` | `#fafafa` | Фон вторичных элементов (goal-item, arch-block) |
| `--gp-bg-badge` | `linear-gradient(135deg, #f0f0f0, #dedede)` | Фон бейджей / иконок-врапперов |
| `--gp-bg-icon-circle` | `linear-gradient(135deg, #ededed, #ddd)` | Фон круглых иконок |
| `--gp-border` | `#c8c8c8` | Основной бордер карточек |
| `--gp-border-inner` | `#e9e9e9` | Внутренний бордер (вложенные элементы) |
| `--gp-border-inner-light` | `#ececec` | Бордер для SVA/NDDI блоков |
| `--gp-border-accent` | `#bababa` | Декоративные линии (hero, CTA) |
| `--gp-text-primary` | `#333333` | Заголовки, основной текст |
| `--gp-text-secondary` | `#555555` | Описания, body text |
| `--gp-text-muted` | `#666666` | Подписи, мелкий текст |
| `--gp-text-faint` | `#777777` | Субтитры |
| `--gp-text-icon` | `#454545` | Текст внутри иконок (аббревиатуры) |
| `--gp-shadow-soft` | `rgba(119, 119, 119, 0.1)` | Box-shadow в покое |
| `--gp-shadow-hover` | `rgba(119, 119, 119, 0.15)` | Box-shadow при hover |
| `--gp-shadow-item` | `rgba(34, 60, 80, 0.1)` | Box-shadow вложенных карточек |
| `--gp-shadow-item-hover` | `rgba(34, 60, 80, 0.12)` | Box-shadow при hover |

### Dark Mode

| Токен | HEX | Использование |
|:------|:----|:-------------|
| `--gp-bg-card` | `#1a1a1a` | Фон карточек |
| `--gp-bg-card-header` | `#222222` | Фон заголовков |
| `--gp-bg-subtle` | `#252525` | Фон вторичных элементов |
| `--gp-bg-badge` | `linear-gradient(135deg, #333, #444)` | Фон бейджей |
| `--gp-bg-inner` | `#2a2a2a` | Фон SVA/NDDI блоков |
| `--gp-border` | `#333333` | Основной бордер |
| `--gp-border-inner` | `#3a3a3a` | Внутренний бордер |
| `--gp-text-primary` | `#e5e5e5` / `#e0e0e0` | Заголовки |
| `--gp-text-secondary` | `#aaaaaa` | Body text |
| `--gp-text-muted` | `#999999` | Подписи |
| `--gp-text-icon` | `#dddddd` | Текст внутри иконок |
| `--gp-shadow-soft` | `rgba(50, 50, 50, 0.3)` | Box-shadow |
| `--gp-shadow-hover` | `rgba(0, 0, 0, 0.4)` | Box-shadow при hover |

---

## 7. Типографика карточек

| Элемент | Размер | Вес | Spacing | Дополнительно |
|:--------|:-------|:----|:--------|:-------------|
| Hero title (h1) | `48px` (mobile: `32px`) | `700` | `letter-spacing: 6px` (mobile: `4px`) | `border-bottom: 1px solid #bababa`, `drop-shadow(0 0 2px #bababa)` |
| Hero subtitle | `16px` | `400` | `letter-spacing: 2px` | `text-transform: uppercase` |
| Hero description | `17px` | `400` | — | `line-height: 1.7`, `max-width: 700px` |
| Card header (h2) | `20px` | `500` | `letter-spacing: 1px` | — |
| Card body text (p) | `16px` | `400` | — | `line-height: 1.75`, `text-align: justify` |
| Concept title (h3) | `15px` | `600` | — | — |
| Concept description | `13px` | `400` | — | `line-height: 1.5` |
| Goal title | `16px` | `600` | — | — |
| Goal description | `14px` | `400` | — | `line-height: 1.6` |
| Badge / Abbr text | `14px` | `700` | `letter-spacing: 1px` | — |
| SVA letter | `16px` | `700` | — | — |
| CTA title | `26px` | `600` | `letter-spacing: 1px` | — |
| CTA text | `15px` | `400` | — | `line-height: 1.7` |
| Button text | `15px` | `600` | — | — |

---

## 8. Компоненты карточек

### 8.1 Section Card (основной контейнер)

Структура:
```
┌─────────────────────────────────┐
│ card-header (#f9f9f9)           │ ← border-bottom: 1px solid #c8c8c8
├─────────────────────────────────┤
│                                 │
│ card-body (padding: 24px)       │
│                                 │
└─────────────────────────────────┘
```

```css
.section-card {
  width: 100%;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 0 1px 1px rgba(119, 119, 119, 0.1);
  overflow: hidden;
  transition: box-shadow 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}
.section-card:hover {
  box-shadow: 0 2px 12px rgba(119, 119, 119, 0.15);
}
.card-header {
  padding: 14px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #c8c8c8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-body {
  padding: 24px;
}
```

### 8.2 Inner Card (вложенный элемент)

```css
.inner-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 0 2px rgba(34, 60, 80, 0.1);
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}
.inner-card:hover {
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
  transform: translateY(-2px);
}
```

### 8.3 Icon Wrapper (квадрат)

```css
.icon-wrapper {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0f0f0, #dedede);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 8.4 Icon Circle (круг)

```css
.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ededed, #ddd);
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-circle svg { width: 22px; height: 22px; color: #555; }
```

### 8.5 Badge

```css
.badge {
  background: linear-gradient(90deg, #ededed, #ddd);
  color: #333;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
}
```

### 8.6 Letter Block (SVA/NDDI)

```css
.letter-block {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ededed, #d5d5d5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: #454545;
}
```

### 8.7 Tag / Pill

```css
.tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid #ececec;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #555;
  transition: all 0.2s ease;
}
.tag:hover { background: #f5f5f5; }
```

### 8.8 CTA Buttons

```css
.btn-primary {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: 10px;
  font-size: 15px; font-weight: 600;
  background: #454545; color: #fff; border: 1px solid #333;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}
.btn-primary:hover {
  background: #333; transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: 10px;
  font-size: 15px; font-weight: 600;
  background: transparent; color: #555; border: 1px solid #c8c8c8;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}
.btn-secondary:hover {
  background: #f5f5f5; transform: translateY(-1px);
}
```

---

## 9. Layout карточек

### Page Container

```css
.page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  padding: 20px 10px 60px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}
```

### Grids

| Тип | Колонки | Gap | Mobile |
|:----|:--------|:----|:-------|
| Concepts (2 col) | `repeat(2, 1fr)` | `16px` | `1fr` при `≤640px` |
| Goals (3 col) | `repeat(3, 1fr)` | `16px` | `1fr` при `≤768px` |
| Tags (flex-wrap) | `flex-wrap: wrap` | `8px` | wrap |

---

## 10. Border Radius (карточки)

| Элемент | Radius |
|:--------|:-------|
| Section Card (внешний) | `15px` |
| Inner Card | `12px` |
| Icon Wrapper (квадрат) | `10px` |
| Icon Circle | `50%` |
| Button | `10px` |
| Tag / Pill | `8px` |
| Letter Block | `8px` |
| Logo | `8px` |
| Badge | `6px` |

---

## 11. Правила применения (карточки)

1. **Все интерактивные карточки** используют `transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915)` и hover-паттерн с `translateY(-2px)`.

2. **Иерархия бордеров**: внешний контейнер `#c8c8c8` → вложенные `#e9e9e9` → мелкие детали `#ececec`.

3. **Градиенты** — только для фонов иконок и бейджей: `linear-gradient(135deg, lighter, darker)`.

4. **Box-shadow** в покое subtle (`0 0 1-2px`), при hover — выраженный (`0 4px 16px`).

5. **Dark mode** — все цвета имеют тёмный аналог. Градиенты иконок: `#333 → #444`.

6. **Текст** — никогда `#000`, максимум `#333`. Никогда `#fff` для текста, максимум `#e5e5e5`.

7. **Max-width**: `960px` для контентных страниц, полная ширина для графа знаний.

---

> **TODO**: В будущем объединить секции 1–5 (Tailwind/TOC/курсы) и 6–11 (Gativus Cards) в единую консистентную систему.
