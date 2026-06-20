/**
 * GET /api/admin/terms/export-template
 * Возвращает шаблон JSON файла для импорта/перевода терминов через LLM (версия 1.3).
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin')

  const dump = {
    version: '1.3',
    timestamp: new Date().toISOString(),
    terms: [
      {
        slug: 'example-term',
        slug_ru: 'primer-termina',
        slug_zh: 'shili-shuyu',
        title: 'Example Term',
        title_ru: 'Пример термина',
        title_zh: '示例术语',
        aliases: '["example", "sample"]',
        aliases_ru: '["пример", "образец"]',
        aliases_zh: '["示例", "样本"]',
        definition: 'This is an example term definition. You can use markdown like **bold** or *italic* text.',
        definition_ru: 'Это пример определения термина. Можно использовать маркдаун для **жирного** или *курсивного* текста.',
        definition_zh: '这是一个示例术语的定义。您可以使用 **粗体** 或 *斜体* 等 markdown 语法。',
        image_url: null,
        video_url: null,
        presentation_path: null,
        presentation_path_ru: null,
        presentation_path_zh: null,
        term_article_slug: 'example-term-article',
        translation_valid_en: 1,
        translation_valid_ru: 1,
        translation_valid_zh: 1,
      }
    ],
    articles: [
      {
        slug: 'example-term-article',
        slug_ru: 'primer-stati-termina',
        slug_zh: 'shili-wenzhang',
        title: 'Example Term Article',
        title_ru: 'Пример статьи термина',
        title_zh: '示例术语文章',
        excerpt: 'Short excerpt describing the article',
        excerpt_ru: 'Краткая выдержка, описывающая статью',
        excerpt_zh: '描述文章的简短摘录',
        html_content: '<h2>Header</h2><p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p><ul><li>List item 1</li><li>List item 2</li></ul>',
        html_content_ru: '<h2>Заголовок</h2><p>Это абзац с <strong>жирным</strong> и <em>курсивным</em> текстом.</p><ul><li>Элемент списка 1</li><li>Элемент списка 2</li></ul>',
        html_content_zh: '<h2>标题</h2><p>这是一个包含<strong>粗体</strong>和<em>斜体</em>文本的段落。</p><ul><li>列表项1</li><li>列表项2</li></ul>',
        category_slug: null,
        book_slug: null,
        is_published: 1,
        is_term_article: 1,
        translation_valid_en: 1,
        translation_valid_ru: 1,
        translation_valid_zh: 1
      }
    ]
  }

  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="gativus-import-template.json"')
  setResponseHeader(event, 'Content-Type', 'application/json')
  
  return dump
})
