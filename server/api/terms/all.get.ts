// server/api/terms/all.get.ts

/**
 * GET /api/terms/all
 * Returns ALL glossary terms for client-side filtering.
 */

export default defineEventHandler(async (event) => {
    const db = useDatabase()
    const query = getQuery(event)

    const lang = (query.lang as string) || 'ru'

    const items = await db.prepare(`
      SELECT
        t.id,
        t.slug,
        t.slug_ru,
        t.slug_zh,
        t.title,
        t.title_ru,
        t.title_zh,
        t.aliases,
        t.definition,
        t.definition_ru,
        t.definition_zh,
        t.term_article_id,
        t.created_at,
        t.updated_at,
        t.image_url,
        t.video_url,
        t.presentation_path,
        a.category_id,
        c.title AS category_title,
        c.title_ru AS category_title_ru,
        c.title_zh AS category_title_zh,
        c.slug AS category_slug,
        c.slug_ru AS category_slug_ru,
        c.slug_zh AS category_slug_zh,
        c.icon AS category_icon,
        c.color AS category_color
      FROM terms t
      LEFT JOIN articles a ON t.term_article_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY
        CASE 
          WHEN ? = 'ru' AND t.title_ru IS NOT NULL AND t.title_ru != ''
            THEN t.title_ru
          WHEN ? = 'zh' AND t.title_zh IS NOT NULL AND t.title_zh != ''
            THEN t.title_zh
          ELSE t.title
        END ASC
    `).all(lang, lang) as any[]

    const isRu = lang === 'ru'
    const isZh = lang === 'zh'

    return (items || []).map((t) => ({
        id: t.id,
        slug: t.slug,
        title: resolveLocalized(t.title, t.title_ru, t.title_zh, isRu, isZh),
        definition:
            resolveLocalized(t.definition, t.definition_ru, t.definition_zh, isRu, isZh) || '',
        aliases: t.aliases ? safeParseJson(t.aliases) : [],
        term_article_id: t.term_article_id,
        has_article: Boolean(t.term_article_id),
        category_id: t.category_id || null,
        category_title: resolveLocalized(
            t.category_title,
            t.category_title_ru,
            t.category_title_zh,
            isRu,
            isZh
        ),
        category_slug: resolveLocalized(
            t.category_slug,
            t.category_slug_ru,
            t.category_slug_zh,
            isRu,
            isZh
        ),
        category_icon: t.category_icon || null,
        category_color: t.category_color || null,
        image_url: t.image_url || null,
        video_url: t.video_url || null,
        presentation_path: t.presentation_path || null,
        created_at: t.created_at,
        updated_at: t.updated_at,
    }))
})

function resolveLocalized(
    en: string | null,
    ru: string | null | undefined,
    zh: string | null | undefined,
    isRu: boolean,
    isZh: boolean
): string | null {
    if (isRu && ru) return ru
    if (isZh && zh) return zh
    return en || null
}

function safeParseJson(str: string | null): any {
    if (!str) return []
    try {
        return JSON.parse(str)
    } catch {
        return [str]
    }
}