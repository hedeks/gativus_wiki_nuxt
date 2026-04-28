/**
 * Gativus Wiki — Admin Stats API
 * Сводка по сущностям и метрики, согласованные с публичным knowledge-graph.
 */

import type { AdminDashboardStats } from '~/types'

function count(row: { count?: unknown } | null | undefined): number {
  const v = row?.count
  if (v == null) return 0
  return typeof v === 'number' ? v : Number(v)
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')
  const db = useDatabase()

  const [
    articlesTotal,
    articlesPublishedContent,
    articlesUnpublished,
    articlesTerm,
    terms,
    categories,
    books,
    users,
    articleRevisions,
    edgesCategoryHierarchy,
    edgesArticleToCategory,
    edgesArticleToBook,
    edgesBookToCategory,
    edgesTermToArticle,
    edgesArticleTermRows,
    lastArticleRow,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM articles').get(),
    db.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE is_published = 1 AND is_term_article = 0'
    ).get(),
    db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_published = 0').get(),
    db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_term_article = 1').get(),
    db.prepare('SELECT COUNT(*) as count FROM terms').get(),
    db.prepare('SELECT COUNT(*) as count FROM categories').get(),
    db.prepare('SELECT COUNT(*) as count FROM books').get(),
    db.prepare('SELECT COUNT(*) as count FROM users').get(),
    db.prepare('SELECT COUNT(*) as count FROM article_revisions').get(),
    db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id IS NOT NULL').get(),
    db.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE is_published = 1 AND is_term_article = 0 AND category_id IS NOT NULL'
    ).get(),
    db.prepare(
      'SELECT COUNT(*) as count FROM articles WHERE is_published = 1 AND is_term_article = 0 AND book_id IS NOT NULL'
    ).get(),
    db.prepare('SELECT COUNT(*) as count FROM book_categories').get(),
    db.prepare('SELECT COUNT(*) as count FROM terms WHERE term_article_id IS NOT NULL').get(),
    db.prepare('SELECT COUNT(*) as count FROM article_terms').get(),
    db.prepare(
      'SELECT MAX(updated_at) as updated_at FROM articles'
    ).get(),
  ])

  const cArticlesTotal = count(articlesTotal as { count?: unknown })
  const cArticlesPublishedContent = count(articlesPublishedContent as { count?: unknown })
  const cTerms = count(terms as { count?: unknown })
  const cCategories = count(categories as { count?: unknown })
  const cBooks = count(books as { count?: unknown })
  const eCat = count(edgesCategoryHierarchy as { count?: unknown })
  const eArtCat = count(edgesArticleToCategory as { count?: unknown })
  const eArtBook = count(edgesArticleToBook as { count?: unknown })
  const eBookCat = count(edgesBookToCategory as { count?: unknown })
  const eTermArt = count(edgesTermToArticle as { count?: unknown })
  const eArtTerm = count(edgesArticleTermRows as { count?: unknown })

  const structural = eCat + eArtCat + eArtBook + eBookCat + eTermArt

  const payload: AdminDashboardStats = {
    articles: cArticlesTotal,
    articlesPublishedContent: cArticlesPublishedContent,
    articlesUnpublished: count(articlesUnpublished as { count?: unknown }),
    articlesTerm: count(articlesTerm as { count?: unknown }),
    terms: cTerms,
    categories: cCategories,
    books: cBooks,
    users: count(users as { count?: unknown }),
    articleRevisions: count(articleRevisions as { count?: unknown }),
    graph: {
      nodeCount: cCategories + cBooks + cArticlesPublishedContent + cTerms,
      edgesCategoryHierarchy: eCat,
      edgesArticleToCategory: eArtCat,
      edgesArticleToBook: eArtBook,
      edgesBookToCategory: eBookCat,
      edgesTermToArticle: eTermArt,
      edgesArticleTermRows: eArtTerm,
      edgesStructuralSum: structural,
    },
    meta: {
      lastArticleUpdatedAt:
        (lastArticleRow as { updated_at?: string | null })?.updated_at ?? null,
    },
  }

  return payload
})
