/**
 * Локально (в браузере) сохраняем последнюю открытую главу книги.
 */

const STORAGE_KEY = 'gativus_reading_progress_v1'

export interface ReadingProgress {
  bookSlug: string
  bookTitle: string
  articleSlug: string
  articleTitle: string
  sortOrder: number | null
  updatedAt: string
}

export type ArticleForProgress = {
  book_id?: number | null
  book_slug?: string | null
  book_title?: string | null
  slug: string
  title: string
  sort_order?: number | null
}

export function useReadingProgress() {
  const progress = useState<ReadingProgress | null>('gv-reading-progress', () => null)

  function hydrate(): void {
    if (!import.meta.client)
      return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        progress.value = null
        return
      }
      const p = JSON.parse(raw) as ReadingProgress
      if (p && p.bookSlug && p.articleSlug && p.articleTitle)
        progress.value = p
      else
        progress.value = null
    }
    catch {
      progress.value = null
    }
  }

  function saveFromArticle(article: ArticleForProgress): void {
    if (!import.meta.client)
      return
    if (!article.book_id || !article.book_slug)
      return
    const next: ReadingProgress = {
      bookSlug: article.book_slug,
      bookTitle: article.book_title || '',
      articleSlug: article.slug,
      articleTitle: article.title,
      sortOrder: article.sort_order ?? null,
      updatedAt: new Date().toISOString(),
    }
    progress.value = next
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { progress, hydrate, saveFromArticle }
}
