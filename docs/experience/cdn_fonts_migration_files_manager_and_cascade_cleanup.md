# Переход на локальные шрифты, Менеджер файлов на сервере и Каскадная очистка

Этот документ конспектирует архитектурные изменения и решения, принятые в ходе сессии от 4 июля 2026 года, посвященной оптимизации загрузки ресурсов, управлению файловым хранилищем на сервере и контролю целостности связанных данных.

---

## 1. Отказ от внешних CDN Google Fonts

* **Проблема**: Загрузка шрифтов (`Poppins`, `Open Sans`) с серверов Google Fonts (`fonts.googleapis.com`) замедляла рендеринг первой страницы и нарушала требование автономности проекта (отсутствие внешних CDN-зависимостей).
* **Решение**:
  1. В [app.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/app.vue) удалены директивы `preconnect` и внешние стили из `useHead`.
  2. Добавлены локальные правила `@font-face` для семейства `"Gill Sans"`, ссылающиеся на имеющиеся файлы в `public/fonts/` для всех начертаний:
     * Regular (400) → `GillSansC.woff2`
     * Italic (400) → `GillSansC-Italic.woff2`
     * Bold (700) → `GillSansC-Bold.woff2`
     * Bold Italic (700) → `GillSansC-BoldItalic.woff2`
     * Light (300) → `GillSansLightC.woff2`
     * Light Italic (300) → `GillSansLightC-Italic.woff2`
  3. В [landing-home.css](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/assets/css/landing-home.css), [LandingBlockLinkGrid.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/landing/LandingBlockLinkGrid.vue) и [HomeAboutDetail.vue](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/components/home/HomeAboutDetail.vue) шрифты `Poppins`/`Open Sans` заменены на стек `"Gill Sans", system-ui, -apple-system, sans-serif`.

---

## 2. Менеджер файлов на сервере (Server Files Manager)

Для администрирования файлового хранилища `server/storage/` разработан новый Workspace управления ресурсами:

### А. Бэкенд-сканер (`GET /api/admin/files`)
* Сканирует директории на сервере и распределяет файлы по подгруппам:
  1. **Covers** (`uploads/covers/`)
  2. **Presentations** (`uploads/presentations/`)
  3. **Article Media** (`uploads/articles/`)
  4. **Glossary Media** (`uploads/terms/`)
  5. **ODT Documents** (`odt/`)
  6. **ODM Documents** (`odm/`)
  7. **Landing Media** (`uploads/landing/`)
  8. **Previews/Other** (`uploads/preview/`)
* Сопоставляет файлы с записями в SQLite, определяя связи (`referencedEntity`):
  * Обложки → `books.cover_image`
  * Презентации → `articles.presentation_path*`, `terms.presentation_path*`
  * Медиа статей/терминов → поиск имени файла подстрокой в `html_content*`, `definition*`, `image_url`, `video_url`
  * ODM/ODT → `odm_projects`, `odm_project_parts`, `articles.raw_odt_path`
  * **Ревизии** → поиск вхождения имени файла в историю изменений `article_revisions.html_content` (предотвращает битые ссылки в истории правок).
* Вычисляет флаг `isOrphaned` (сиротский/неиспользуемый файл), если связей с БД не обнаружено.

### Б. Интерфейс Workspace (`/pages/admin/files.vue`)
* Показывает общую статистику: количество файлов, объём занятого места и размер неиспользуемых файлов.
* Группирует файлы по вкладкам с предпросмотром эскизов для картинок/видео.
* Отображает интерактивные ссылки на сущности (книги/статьи/термины), к которым привязан файл.
* Блокирует удаление для используемых файлов (удалить можно только «сиротские» файлы).
* Дает возможность массово очистить все неиспользуемые файлы одной кнопкой.

---

## 3. Замена файлов и каскадные обновления БД

Разработана функция бесшовного обновления медиаресурсов (например, замена картинки на более качественную):
* Эндпоинт [replace.post.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/server/api/admin/files/replace.post.ts) загружает новый файл, перезаписывает его на сервере (сохраняя ту же директорию), удаляет старый файл.
* Если расширение или имя нового файла изменилось, бэкенд в рамках транзакции выполняет автозамену (SQL `replace()`) путей и URL-адресов во всех таблицах:
  `books`, `articles`, `terms`, `landing_blocks`, `odm_projects`, `odm_project_parts`, а также в исторических версиях `article_revisions`.

---

## 4. Каскадная очистка при удалении сущностей

Для предотвращения накапливания мусора на сервере при удалении контента доработаны эндпоинты удаления:
* **Удаление статей** (`DELETE /api/articles/:slug`):
  * Удаляет связанные ODT-файлы и презентации.
  * Регулярным выражением `/\/api\/uploads\/[^\s"'>]+/g` парсит HTML-контент статьи на всех языках, находит локальные изображения и стирает их с диска.
* **Удаление терминов** (`DELETE /api/terms/:slug`):
  * Удаляет файлы картинок/видео термина, его презентации.
  * Каскадно вызывает очистку файлов для привязанной статьи глоссария.
* **Удаление книг** (`DELETE /api/books/:slug`):
  * Удаляет файл обложки книги.
  * Каскадно вызывает очистку файлов для всех статей книги при флаге `delete_articles=true`.
* **Удаление блоков лендинга** (`DELETE /api/admin/landing/:id`):
  * Находит блок, парсит `image_path` и `payload_json`, удаляет связанные файлы с сервера.

---

## 5. Исключение хранения ODT на сервере

* Выявлено, что `.odt` файлы глав после импорта в HTML больше не требуются для работы сайта.
* Импорт переписан: `.odt` файлы парсятся библиотекой `AdmZip` напрямую из буфера в памяти без вызова `fs.writeFileSync`.
* В базу данных в поле `odt_storage_path` пишется `NULL`, разгружая дисковое пространство сервера. Оригинальное имя сохраняется для индикации в Books Workspace.

---

## 6. Валидация и самовосстановление скелета глав

* В API получения проекта структуры книги [[id].get.ts](file:///c:/Users/sv653/Desktop/coding/gativus-wiki-nuxt/server/api/import/odm/project/[id].get.ts) добавлена проверка ссылочной целостности: если связанные с главой статьи были удалены из БД, эндпоинт автоматически очищает `imported_article_ids` и сбрасывает слот главы в статус `pending` (Ожидает загрузки).
