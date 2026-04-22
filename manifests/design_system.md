# Дизайн-система (Design System Manifest)

Этот манифест описывает основные визуальные принципы, цветовую палитру, типографику и стили компонентов, которые применяются в проекте Gativus Wiki для достижения "премиального" (Premium) и современного вида с использованием акцентного синего цвета.

---

## 1. Цветовая палитра (Color Palette)

Проект строго поддерживает две темы (Светлая и Темная). Основной цветовой профиль опирается на монохромные шкалы TailwindCSS (`zinc`) с активным использованием `sky` в качестве основного акцентного цвета.

### 1.1 Основные цвета (Core Colors)

| Токен | Светлая тема (Light) | Темная тема (Dark) | Использование |
|:------|:--------------------|:-------------------|:--------------|
| **Primary** | `sky-600` (#0284c7) | `sky-500` (#0ea5e9) | Кнопки, активные ссылки, акценты |
| **Primary Hovered** | `sky-700` | `sky-400` | Состояние при наведении |
| **Surface** | `white` (#ffffff) | `zinc-900` (#18181b) | Фон страниц и крупных блоков |
| **Surface Card** | `white` (#ffffff) | `zinc-800` / `#1a1a1a` | Фон карточек и модальных окон |
| **Surface Header** | `#f9f9f9` | `#222222` | Шапки карточек, второстепенные блоки |
| **Text Primary** | `zinc-900` / `#333` | `zinc-100` / `#e5e5e5` | Заголовки, основной текст |
| **Text Secondary** | `zinc-600` / `#555` | `zinc-400` / `#aaaaaa` | Описания, body text |
| **Border Principal** | `zinc-200` / `#c8c8c8` | `zinc-800` / `#333333` | Границы карточек и секций |
| **Border Subtle** | `zinc-100` / `#e9e9e9` | `zinc-700` / `#3a3a3a` | Внутренние разделители |

---

## 2. Формы и контейнеры (Shapes & Elevations)

### 2.1 Скругления (Border Radius)

| Элемент | Радиус | Tailwind Класс |
|:--------|:-------|:---------------|
| **Контейнеры (Cards, Modals)** | `15px` | `rounded-2xl` (approx) |
| **Кнопки и Инпуты** | `12px` | `rounded-xl` |
| **Внутренние карточки** | `12px` | `rounded-xl` |
| **Бейджи, Теги, Иконки** | `8px` | `rounded-lg` |

### 2.2 Тени (Shadows)
- **Статика:** `shadow-sm` или `0 1px 3px rgba(0,0,0,0.05)`.
- **Интерактив (Hover):** `shadow-md` и `translateY(-2px)`. Для премиальных блоков — `0 10px 25px -5px rgba(0, 0, 0, 0.1)`.

### 2.3 Эффект стекла (Glassmorphism)
Применяется для фиксированных (sticky) элементов:
- **BG:** `bg-white/80` (Light) / `bg-zinc-900/80` (Dark).
- **Effect:** `backdrop-blur-md`.

---

## 3. Кнопки и Интерактивность (Buttons & Interaction)

Все кнопки должны иметь плавный переход `transition-all duration-300 ease`.

### 3.1 Кнопки (Buttons)

1.  **Главная (Primary):**
    - **Стиль:** Фон `sky-600` (Light) / `sky-500` (Dark), текст белый.
    - **Nuxt UI:** `<UButton color="primary" variant="solid" />`.
    - *Использование:* Основные целевые действия (Сохранить, Создать, Отправить).

2.  **Второстепенная (Secondary):**
    - **Стиль:** Мягкий серый фон.
    - **Nuxt UI:** `<UButton color="gray" variant="soft" />`.

3.  **Контурная/Призрачная (Outline/Ghost):**
    - **Стиль:** Без фона, только текст или границы.
    - **Nuxt UI:** `<UButton color="gray" variant="ghost" />`.

---

## 4. Типографика (Typography)

- **Шрифты:** Системные (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`).
- **H1 (Hero):** 48px, Bold, `letter-spacing: 6px`, UPPERCASE.
- **H2 (Card Header):** 20px, Medium, `letter-spacing: 1px`.
- **Eyebrow Text (Надписи):** `text-xs tracking-widest font-bold uppercase` (цвет `sky-600` или `zinc-500`).

---

## 5. Анимации (Motion)

- **Page Transitions:** `cubic-bezier(0.705, 0.010, 0.000, 0.915)`, `0.4s`.
- **Micro-interactions:** `transform hover:-translate-y-1`.

---

## 6. Специальные компоненты

### 6.1 Section Card
```css
.section-card {
  border: 1px solid var(--border-principal);
  border-radius: 15px;
  background: var(--surface-card);
  overflow: hidden;
}
.card-header {
  background: var(--surface-header);
  border-bottom: 1px solid var(--border-principal);
  padding: 14px 20px;
}
```

---
> **Примечание:** Данная система является единой для публичной части и админ-панели. Все новые компоненты должны следовать этим правилам.
