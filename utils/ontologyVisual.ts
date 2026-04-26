/**
 * Visual tokens aligned with manifests/ontology-philosophy.md
 */
export const ONTOLOGY_COLORS = {
  category: '#ef4444',
  book: '#0ea5e9',
  article: '#6366f1',
  term: '#10b981',
} as const

export type KnowledgeEntityVariant = 'book' | 'article' | 'term'

/** Category → child: dashed (virtual). Book/Article → child: solid (structural). */
export type CategoryLinkKind = 'virtual' | 'structural'

/** Page-level theme: layout gradients and scoped --gv-primary on knowledge index */
export type KnowledgeIndexAccent = KnowledgeEntityVariant

export const KNOWLEDGE_INDEX_ACCENT: Record<
  KnowledgeIndexAccent,
  { primary: string; primaryHover: string; rgb: string }
> = {
  book: { primary: '#0284c7', primaryHover: '#0369a1', rgb: '14, 165, 233' },
  article: { primary: '#4f46e5', primaryHover: '#4338ca', rgb: '99, 102, 241' },
  term: { primary: '#059669', primaryHover: '#047857', rgb: '16, 185, 129' },
}
