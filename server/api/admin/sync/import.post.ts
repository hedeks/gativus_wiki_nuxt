/**
 * POST /api/admin/sync/import
 * Imports a JSON Knowledge Graph dump and reconstructs the database structure.
 * Replaces or upserts based on slugs.
 */

export default defineEventHandler(async (event) => {
  const auth = requireRole(event, 'admin') // require admin for full sync
  const db = useDatabase()

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const fileField = formData.find(f => f.name === 'file')
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'Field "file" not found' })
  }

  let dump
  try {
    dump = JSON.parse(fileField.data.toString('utf-8'))
  } catch (err) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON file' })
  }

  if (dump.version !== "1.1") {
    throw createError({ statusCode: 400, statusMessage: `Unsupported dump version: ${dump.version}` })
  }

  console.log('[sync] Starting Knowledge Graph import...')

  // To map slugs to IDs as we insert them
  const idMap = {
    cat: new Map<string, number>(),
    book: new Map<string, number>(),
    art: new Map<string, number>(),
    term: new Map<string, number>()
  }

  // --- 1. Categories ---
  for (const c of dump.categories || []) {
    // Parent resolution (must exist since they are ordered properly or we do two passes)
    // Actually, due to sort_order/parent relationships, a two-pass for parent_id is safer
    await db.prepare(`
      INSERT INTO categories (slug, slug_ru, title, title_ru, description, description_ru, icon, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
      ON CONFLICT(slug) DO UPDATE SET
        slug_ru = excluded.slug_ru, title = excluded.title, title_ru = excluded.title_ru,
        description = excluded.description, description_ru = excluded.description_ru,
        icon = excluded.icon, sort_order = excluded.sort_order, created_at = excluded.created_at
    `).run(c.slug, c.slug_ru || null, c.title, c.title_ru || null, c.description || null, c.description_ru || null, c.icon || null, c.sort_order || 0, c.created_at || null)

    const row = await db.prepare('SELECT id FROM categories WHERE slug = ?').get(c.slug) as any
    if (row) idMap.cat.set(c.slug, row.id)
  }

  // Two-pass for category parents
  for (const c of dump.categories || []) {
    if (c.parent_slug && idMap.cat.has(c.parent_slug)) {
      await db.prepare('UPDATE categories SET parent_id = ? WHERE slug = ?').run(idMap.cat.get(c.parent_slug), c.slug)
    }
  }
  console.log(`[sync] Imported ${dump.categories?.length || 0} categories.`)

  // --- 2. Books ---
  for (const b of dump.books || []) {
    await db.prepare(`
      INSERT INTO books (slug, title, title_ru, title_zh, description, description_ru, description_zh, cover_image, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title, title_ru = excluded.title_ru, title_zh = excluded.title_zh,
        description = excluded.description, description_ru = excluded.description_ru, description_zh = excluded.description_zh,
        cover_image = excluded.cover_image, sort_order = excluded.sort_order, created_at = excluded.created_at
    `).run(b.slug, b.title, b.title_ru || null, b.title_zh || null, b.description || null, b.description_ru || null, b.description_zh || null, b.cover_image || null, b.sort_order || 0, b.created_at || null)

    const row = await db.prepare('SELECT id FROM books WHERE slug = ?').get(b.slug) as any
    if (row) {
      const bookId = row.id
      idMap.book.set(b.slug, bookId)

      // Book categories
      await db.prepare('DELETE FROM book_categories WHERE book_id = ?').run(bookId)
      for (const catSlug of b.category_slugs || []) {
        if (idMap.cat.has(catSlug)) {
          await db.prepare('INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)').run(bookId, idMap.cat.get(catSlug))
        }
      }
    }
  }
  console.log(`[sync] Imported ${dump.books?.length || 0} books.`)

  // --- 3. Articles & Translations ---
  for (const a of dump.articles || []) {
    const catId = a.category_slug ? idMap.cat.get(a.category_slug) || null : null
    const bookId = a.book_slug ? idMap.book.get(a.book_slug) || null : null

    await db.prepare(`
      INSERT INTO articles (slug, locale, title, excerpt, html_content, raw_odt_path, presentation_path, category_id, book_id, is_published, is_term_article, sort_order, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
      ON CONFLICT(slug) DO UPDATE SET
        locale = excluded.locale, title = excluded.title, excerpt = excluded.excerpt, html_content = excluded.html_content,
        raw_odt_path = excluded.raw_odt_path, presentation_path = excluded.presentation_path, category_id = excluded.category_id,
        book_id = excluded.book_id, is_published = excluded.is_published, is_term_article = excluded.is_term_article, sort_order = excluded.sort_order,
        created_at = excluded.created_at, updated_at = excluded.updated_at
    `).run(a.slug, a.locale || 'en', a.title, a.excerpt || null, a.html_content || '', a.raw_odt_path || null, a.presentation_path || null, catId, bookId, a.is_published || 1, a.is_term_article || 0, a.sort_order || 0, auth.id, a.created_at || null, a.updated_at || null)

    const origRow = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(a.slug) as any
    if (!origRow) continue
    const origId = origRow.id
    idMap.art.set(a.slug, origId)

    // Make sure origin_id is mapped correctly to itself (or null, codebase uses either). 
    // Usually original has origin_id = id or IS NULL. We'll set it to NULL.
    await db.prepare('UPDATE articles SET origin_id = NULL WHERE id = ?').run(origId)

    // Upsert translations
    for (const t of a.translations || []) {
      await db.prepare(`
        INSERT INTO articles (slug, locale, title, excerpt, html_content, raw_odt_path, presentation_path, category_id, book_id, is_published, is_term_article, sort_order, origin_id, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
        ON CONFLICT(slug) DO UPDATE SET
          locale = excluded.locale, title = excluded.title, excerpt = excluded.excerpt, html_content = excluded.html_content,
          raw_odt_path = excluded.raw_odt_path, presentation_path = excluded.presentation_path, category_id = excluded.category_id,
          book_id = excluded.book_id, is_published = excluded.is_published, is_term_article = excluded.is_term_article, origin_id = excluded.origin_id,
          created_at = excluded.created_at, updated_at = excluded.updated_at
      `).run(t.slug, t.locale, t.title, t.excerpt || null, t.html_content || '', t.raw_odt_path || null, t.presentation_path || null, catId, bookId, a.is_published || 1, a.is_term_article || 0, a.sort_order || 0, origId, auth.id, t.created_at || null, t.updated_at || null)
      
      const tRow = await db.prepare('SELECT id FROM articles WHERE slug = ?').get(t.slug) as any
      if (tRow) idMap.art.set(t.slug, tRow.id)
    }
  }
  console.log(`[sync] Imported ${dump.articles?.length || 0} articles (and translations).`)

  // --- 4. Terms ---
  for (const t of dump.terms || []) {
    const termArtId = t.term_article_slug ? idMap.art.get(t.term_article_slug) || null : null

    await db.prepare(`
      INSERT INTO terms (slug, slug_ru, title, title_ru, aliases, definition, definition_ru, term_article_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
      ON CONFLICT(slug) DO UPDATE SET
        slug_ru = excluded.slug_ru, title = excluded.title, title_ru = excluded.title_ru,
        aliases = excluded.aliases, definition = excluded.definition, definition_ru = excluded.definition_ru,
        term_article_id = excluded.term_article_id, created_at = excluded.created_at, updated_at = excluded.updated_at
    `).run(t.slug, t.slug_ru || null, t.title, t.title_ru || null, t.aliases || null, t.definition, t.definition_ru || null, termArtId, auth.id, t.created_at || null, t.updated_at || null)

    const row = await db.prepare('SELECT id FROM terms WHERE slug = ?').get(t.slug) as any
    if (row) idMap.term.set(t.slug, row.id)
  }
  console.log(`[sync] Imported ${dump.terms?.length || 0} terms.`)

  // --- 5. Article Mentions ---
  // clear old mentions just in case? Actually it's an additive import, but to prevent stale ones, 
  // maybe we shouldn't wipe everything. Or maybe wipe for imported articles.
  for (const a of dump.articles || []) {
    const artId = idMap.art.get(a.slug)
    if (artId) {
      await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(artId)
    }
    for (const t of a.translations || []) {
      const tArtId = idMap.art.get(t.slug)
      if (tArtId) {
        await db.prepare('DELETE FROM article_terms WHERE article_id = ?').run(tArtId)
      }
    }
  }

  for (const m of dump.article_mentions || []) {
    const artId = idMap.art.get(m.article_slug)
    const termId = idMap.term.get(m.term_slug)
    if (artId && termId) {
      await db.prepare('INSERT OR IGNORE INTO article_terms (article_id, term_id) VALUES (?, ?)').run(artId, termId)
    }
  }
  console.log(`[sync] Imported ${dump.article_mentions?.length || 0} mentions.`)

  return { success: true, message: 'Синхронизация графа успешно завершена!' }
})
