export function generateImportGraphPreview(dump: any, currentLang: string = 'en') {
  const nodes: any[] = []
  const links: any[] = []
  const linksSet = new Set<string>()
  
  function addLink(source: string, target: string, type: string) {
    const key = `${source}|${target}|${type}`
    if (!linksSet.has(key)) {
      linksSet.add(key)
      links.push({ source, target, type })
    }
  }

  function loc(en?: string | null, ru?: string | null, zh?: string | null): string {
    const e = en?.trim() || ''
    if (currentLang === 'zh') return (zh && zh.trim()) || (ru && ru.trim()) || e
    if (currentLang === 'ru') return (ru && ru.trim()) || e
    return e
  }

  dump.categories?.forEach((c: any) => {
    const title = loc(c.title, c.title_ru, c.title_zh)
    const description = loc(c.description, c.description_ru, c.description_zh)
    nodes.push({ id: `cat-${c.slug}`, title, description, icon: c.icon, type: 'category', slug: c.slug })
    if (c.parent_slug) addLink(`cat-${c.slug}`, `cat-${c.parent_slug}`, 'parent')
  })
  
  dump.books?.forEach((b: any) => {
    const title = loc(b.title, b.title_ru, b.title_zh)
    const description = loc(b.description, b.description_ru, b.description_zh)
    nodes.push({ id: `book-${b.slug}`, title, description, type: 'book', slug: b.slug })
    b.category_slugs?.forEach((cs: string) => addLink(`book-${b.slug}`, `cat-${cs}`, 'category'))
  })
  
  const termArticleToTermSlug = new Map<string, string>()
  
  dump.articles?.forEach((a: any) => {
    if (a.is_term_article !== 1) {
      const title = loc(a.title, a.title_ru, a.title_zh)
      const description = loc(a.excerpt, a.excerpt_ru, a.excerpt_zh)
      nodes.push({ id: `art-${a.slug}`, title, description, type: 'article', slug: a.slug })
      
      if (a.category_slug) addLink(`art-${a.slug}`, `cat-${a.category_slug}`, 'category')
      if (a.book_slug) addLink(`art-${a.slug}`, `book-${a.book_slug}`, 'book')
    }

    if (a.is_term_article === 1 && a.slug) {
      termArticleToTermSlug.set(a.slug, '')
    }
  })
  
  dump.terms?.forEach((t: any) => {
    const title = loc(t.title, t.title_ru, t.title_zh)
    const description = loc(t.definition, t.definition_ru, t.definition_zh)
    nodes.push({ id: `term-${t.slug}`, title, description, type: 'term', slug: t.slug })
    if (t.term_article_slug) {
      termArticleToTermSlug.set(t.term_article_slug, t.slug)
      const hasPublicArticleNode = nodes.some(n => n.id === `art-${t.term_article_slug}`)
      if (hasPublicArticleNode) {
        addLink(`term-${t.slug}`, `art-${t.term_article_slug}`, 'article')
      }
    }
  })
  
  dump.article_mentions?.forEach((m: any) => {
    const sourceTermSlug = termArticleToTermSlug.get(m.article_slug)
    if (sourceTermSlug) {
      addLink(`term-${sourceTermSlug}`, `term-${m.term_slug}`, 'reference')
    } else {
      addLink(`art-${m.article_slug}`, `term-${m.term_slug}`, 'mention')
    }
  })
  
  const nodeIds = new Set(nodes.map(n => n.id))
  return {
    nodes: nodes,
    links: links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
  }
}
