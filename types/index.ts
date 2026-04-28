export type Quiz = {
  course_id: number,
  questions: Object[],
  title: string
}

export interface UserLogin {
  email: string,
  password: string
}

export interface User {
  id?: number,
  login: string,
  email: string,
  role: 'user' | 'editor' | 'admin',
  created_at: string,
  last_visited?: string,
  encrypted_password?: string,
  uuid: string
}

export interface AuthResponse {
  access_token: string,
  token_type: 'bearer',
  user: User
}

// Legacy alias — keep for backward compatibility
export type Response = AuthResponse

// ─── Phase 2: Content System ───

export interface Article {
  id: number
  slug: string
  title: string
  html_content: string
  raw_odt_path?: string
  category_id?: number
  book_id?: number
  sort_order: number
  excerpt?: string
  locale?: string
  created_at: string
  updated_at: string
  created_by?: number
  is_published: boolean
}

export interface ArticleListItem {
  id: number
  slug: string
  title: string
  excerpt?: string
  book_id?: number
  book_title?: string
  category_id?: number
  category_title?: string
  locale: string
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Book {
  id: number
  slug: string
  title: string
  description?: string
  cover_image?: string
  sort_order: number
  locale?: string
  created_at: string
  article_count?: number
}

export interface ArticleRevision {
  id: number
  article_id: number
  html_content: string
  revision_num: number
  change_summary?: string
  created_at: string
  created_by?: number
  created_by_login?: string
}

export interface Category {
  id: number
  slug: string
  title: string
  parent_id?: number
  description?: string
  icon?: string
  sort_order: number
  color?: string
  created_at: string
}

export interface OdtImportOptions {
  book_id?: number
  category_id?: number
  split_level: 'h1' | 'h2'
  locale: string
  auto_link_terms: boolean
}

export interface ParsedArticle {
  title: string
  slug: string
  html: string
  excerpt: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pages: number
}
