/**
 * GET /api/admin/books/export-template
 * Возвращает шаблон JSON файла для импорта/перевода книг через LLM (версия 1.3).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')

  const dump = {
    version: '1.3',
    timestamp: new Date().toISOString(),
    books: [
      {
        slug: 'example-book',
        slug_ru: 'primer-knigi',
        slug_zh: 'shili-shuji',
        title: 'Example Book',
        title_ru: 'Пример книги',
        title_zh: '示例书籍',
        description: 'Example book description.',
        description_ru: 'Описание примера книги.',
        description_zh: '示例书籍描述。',
        cover_image: null,
        category_slugs: [],
        translation_valid_en: 1,
        translation_valid_ru: 1,
        translation_valid_zh: 1,
      }
    ],
    articles: [] // Можно добавить пример статьи, но для книг достаточно самой книги
  }

  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="gativus-book-import-template.json"')
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  return dump
})
