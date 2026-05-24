/**
 * Renders inline markdown-like markup in definition/description text.
 * Safe: HTML is escaped before applying any markup, so v-html output is XSS-free.
 * Supported: **bold**, *italic*, _italic_, [text](https://url)
 */
export function renderInlineMarkup(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/\*(?!\*)(.+?)(?<!\*)\*/gs, '<em>$1</em>')
    .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}
