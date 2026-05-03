/**
 * Gativus Wiki — Slug Generator
 * Converts Russian/English titles to URL-safe slugs.
 * Transliterates Cyrillic → Latin, lowercases, replaces spaces with hyphens.
 */

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  // Uppercase mapped through toLowerCase
}

/**
 * Transliterate a string from Cyrillic to Latin characters.
 */
function transliterate(str: string): string {
  return str
    .split('')
    .map(char => {
      const lower = char.toLowerCase()
      return CYRILLIC_MAP[lower] !== undefined ? CYRILLIC_MAP[lower] : char
    })
    .join('')
}

/**
 * Generate a URL-safe slug from a title string.
 * Handles both Cyrillic and Latin characters.
 *
 * @example
 *   slugify('b-вектор сплайса') // → 'b-vektor-splaysa'
 *   slugify('SRNT Protocol')    // → 'srnt-protocol'
 *   slugify('EVL3 — Третий порог') // → 'evl3-tretiy-porog'
 */
export function slugify(str: string): string {
  const slug = transliterate(str)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')     // Remove non-word chars (except hyphens)
    .replace(/[\s_]+/g, '-')      // Replace spaces & underscores with hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '')      // Trim leading/trailing hyphens

  return slug || Math.random().toString(36).substring(2, 7) || 'id'
}

/**
 * Ensure slug is unique by appending a suffix if needed.
 * Checks against existing slugs in the database.
 */
export async function ensureUniqueSlug(
  db: any,
  table: 'articles' | 'terms' | 'books' | 'categories',
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    let query = `SELECT id FROM ${table} WHERE slug = ?`
    const params: any[] = [slug]

    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }

    const existing = await db.prepare(query).get(...params)
    if (!existing) return slug

    counter++
    slug = `${baseSlug}-${counter}`
  }
}

/**
 * Уникальный slug для статьи с учётом колонок slug, slug_ru, slug_zh (любая из них занята — конфликт).
 */
export async function ensureUniqueArticleAnySlug(
  db: any,
  baseSlug: string,
  excludeId?: number,
): Promise<string> {
  let slug = baseSlug
  let counter = 1
  while (true) {
    let query = `SELECT id FROM articles WHERE slug = ? OR slug_ru = ? OR slug_zh = ?`
    const params: any[] = [slug, slug, slug]
    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }
    const existing = await db.prepare(query).get(...params)
    if (!existing)
      return slug
    counter++
    slug = `${baseSlug}-${counter}`
  }
}
