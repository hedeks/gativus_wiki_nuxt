/**
 * GET /api/admin/articles/export-template
 * Возвращает шаблон JSON файла для импорта/перевода статей через LLM (версия 1.3).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')

  const dump = {
    version: '1.3',
    timestamp: new Date().toISOString(),
    articles: [
      {
        slug: 'example-article',
        slug_ru: 'primer-stati',
        slug_zh: 'shili-wenzhang',
        title: 'Example Article',
        title_ru: 'Пример статьи',
        title_zh: '示例文章',
        excerpt: 'Short excerpt describing the article',
        excerpt_ru: 'Краткая выдержка, описывающая статью',
        excerpt_zh: '描述文章的简短摘录',
        html_content: '<h2>Header</h2><p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p><ul><li>List item 1</li><li>List item 2</li></ul>',
        html_content_ru: '<h2>Заголовок</h2><p>Это абзац с <strong>жирным</strong> и <em>курсивным</em> текстом.</p><ul><li>Элемент списка 1</li><li>Элемент списка 2</li></ul>',
        html_content_zh: '<h2>标题</h2><p>这是一个包含<strong>粗体</strong>和<em>斜体</em>文本的段落。</p><ul><li>列表项1</li><li>列表项2</li></ul>',
        category_slug: null,
        book_slug: null,
        is_published: 1,
        is_term_article: 0,
        translation_valid_en: 1,
        translation_valid_ru: 1,
        translation_valid_zh: 1
      }
    ]
  }

  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="gativus-article-import-template.json"')
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  return dump
})
