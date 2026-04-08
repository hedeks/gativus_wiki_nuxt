/**
 * Gativus Wiki — ODT Parser
 * Converts ODT (OpenDocument Text) files to HTML.
 * 
 * MVP scope: headings, paragraphs, lists, tables, images, bold/italic/underline.
 * Draw objects, OLE, and SVG conversion are planned for future iterations.
 */

import AdmZip from 'adm-zip'
import { DOMParser } from '@xmldom/xmldom'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { slugify } from './slugify'

// ─── Types ───

export interface ParsedOdt {
  fullHtml: string
  articles: ParsedArticleResult[]
  images: { originalPath: string; savedPath: string }[]
}

export interface ParsedArticleResult {
  title: string
  slug: string
  html: string
  excerpt: string
}

interface StyleInfo {
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  fontName?: string
  fontSize?: string
  parentStyleName?: string // Track hierarchy for semantic detection (e.g., Quotations)
  // Graphic properties
  fillColor?: string
  strokeColor?: string
  strokeWidth?: string
  fill?: string
}

// ─── Main Entry Point ───

/**
 * Parse an ODT file buffer and convert to HTML.
 * Extracts images to `server/storage/uploads/<subDir>/`.
 */
export async function parseOdtBuffer(
  buffer: Buffer,
  subDir: string = 'articles'
): Promise<ParsedOdt> {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  // 1. Extract and save images
  const images = extractImages(zip, entries, subDir)

  // 2. Parse content.xml
  const contentEntry = zip.getEntry('content.xml')
  if (!contentEntry) {
    throw new Error('ODT file does not contain content.xml')
  }

  const contentXml = contentEntry.getData().toString('utf-8')
  const doc = new DOMParser().parseFromString(contentXml, 'text/xml') as any

  // 3. Parse styles (content.xml + styles.xml)
  const styles = parseAutomaticStyles(doc as any)
  
  const stylesEntry = zip.getEntry('styles.xml')
  if (stylesEntry) {
    const stylesXml = stylesEntry.getData().toString('utf-8')
    const stylesDoc = new DOMParser().parseFromString(stylesXml, 'text/xml') as any
    const commonStyles = parseAutomaticStyles(stylesDoc)
    // Merge common styles: automatic styles take precedence
    commonStyles.forEach((val, key) => {
      if (!styles.has(key)) styles.set(key, val)
    })
  }

  // 4. Find the document body
  const body = doc.getElementsByTagName('office:body')[0]
  const textNode = body?.getElementsByTagName('office:text')[0]

  if (!textNode) {
    throw new Error('ODT file does not contain office:text element')
  }

  // 5. Convert XML nodes to HTML
  const imageMap = new Map(images.map(img => [img.originalPath, img.savedPath]))
  const fullHtml = convertChildren(textNode, styles, imageMap)

  return {
    fullHtml,
    articles: [], // Will be populated by splitIntoArticles
    images,
  }
}

// ─── Image Extraction ───

function extractImages(
  zip: AdmZip,
  entries: AdmZip.IZipEntry[],
  subDir: string
): { originalPath: string; savedPath: string }[] {
  const results: { originalPath: string; savedPath: string }[] = []
  const uploadDir = join(process.cwd(), 'server', 'storage', 'uploads', subDir)

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }

  for (const entry of entries) {
    if (entry.entryName.startsWith('Pictures/') && !entry.isDirectory) {
      const fileName = `${Date.now()}-${basename(entry.entryName)}`
      const savePath = join(uploadDir, fileName)
      const data = entry.getData()
      writeFileSync(savePath, new Uint8Array(data.buffer, data.byteOffset, data.byteLength))

      results.push({
        originalPath: entry.entryName,
        savedPath: `/api/uploads/${subDir}/${fileName}`,
      })
    }
  }

  return results
}

// ─── Style Parsing ───

function parseAutomaticStyles(doc: any): Map<string, StyleInfo> {
  const styles = new Map<string, StyleInfo>()

  const styleNodes = doc.getElementsByTagName('style:style')
  for (let i = 0; i < styleNodes.length; i++) {
    const styleNode = styleNodes[i]
    const name = styleNode.getAttribute('style:name')
    if (!name) continue

    const parentName = styleNode.getAttribute('style:parent-style-name')
    const textProps = styleNode.getElementsByTagName('style:text-properties')[0]
    
    const info: StyleInfo = {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      parentStyleName: parentName || undefined,
    }

    if (textProps) {
      const fontWeight = textProps.getAttribute('fo:font-weight')
      info.bold = fontWeight === 'bold'

      const fontStyle = textProps.getAttribute('fo:font-style')
      info.italic = fontStyle === 'italic'

      const underlineStyle = textProps.getAttribute('style:text-underline-style')
      info.underline = underlineStyle !== null && underlineStyle !== 'none'

      const strikeStyle = textProps.getAttribute('style:text-line-through-style')
      info.strikethrough = strikeStyle !== null && strikeStyle !== 'none'

      info.fontName = textProps.getAttribute('style:font-name') || undefined
      info.fontSize = textProps.getAttribute('fo:font-size') || undefined
    }

    const graphicProps = styleNode.getElementsByTagName('style:graphic-properties')[0]
    if (graphicProps) {
      info.fillColor = graphicProps.getAttribute('draw:fill-color') || undefined
      info.strokeColor = graphicProps.getAttribute('svg:stroke-color') || undefined
      info.strokeWidth = graphicProps.getAttribute('svg:stroke-width') || undefined
      info.fill = graphicProps.getAttribute('draw:fill') || undefined
    }

    styles.set(name, info)
  }

  return styles
}

// ─── XML → HTML Conversion ───

function convertChildren(
  node: any,
  styles: Map<string, StyleInfo>,
  imageMap: Map<string, string>
): string {
  let html = ''
  const children = node.childNodes
  if (!children) return html

  for (let i = 0; i < children.length; i++) {
    html += convertNode(children[i], styles, imageMap)
  }

  return html
}

function convertNode(
  node: any,
  styles: Map<string, StyleInfo>,
  imageMap: Map<string, string>
): string {
  // Text node
  if (node.nodeType === 3) {
    return escapeHtml(node.textContent || '')
  }

  // Element node
  if (node.nodeType !== 1) return ''

  const tagName = node.localName || node.nodeName?.split(':').pop() || ''
  const nsPrefix = node.prefix || node.nodeName?.split(':')[0] || ''
  const fullTag = node.nodeName || ''

  switch (fullTag) {
    // ─── Headings ───
    case 'text:h': {
      const level = parseInt(node.getAttribute('text:outline-level') || '1', 10)
      // Shift down by 1: h1→h2, h2→h3, etc. (h1 is reserved for the article title)
      const clampedLevel = Math.min(Math.max(level + 1, 2), 6)
      const content = convertChildren(node, styles, imageMap)
      if (!content.trim()) return ''
      
      // Generate stable ID from content
      const id = slugify(stripHtml(content))
      return `<h${clampedLevel} id="${id}">${content}</h${clampedLevel}>\n`
    }

    // ─── Paragraphs ───
    case 'text:p': {
      const styleName = node.getAttribute('text:style-name')
      const content = convertChildren(node, styles, imageMap)
      // Don't emit empty paragraphs
      if (!content.trim()) return ''

      // Detect if this paragraph should be a blockquote
      if (isQuoteStyle(styleName, styles)) {
        return `<blockquote>${content}</blockquote>\n`
      }
      
      return `<p>${content}</p>\n`
    }

    // ─── Text spans (bold, italic, etc.) ───
    case 'text:span': {
      const styleName = node.getAttribute('text:style-name')
      const content = convertChildren(node, styles, imageMap)
      if (!content) return ''

      const style = styleName ? styles.get(styleName) : null
      let result = content

      if (style?.bold) result = `<strong>${result}</strong>`
      if (style?.italic) result = `<em>${result}</em>`
      if (style?.underline) result = `<u>${result}</u>`
      if (style?.strikethrough) result = `<s>${result}</s>`

      return result
    }

    // ─── Lists ───
    case 'text:list': {
      const content = convertChildren(node, styles, imageMap)
      // Determine if ordered or unordered based on list style
      // Default to unordered; ODT list-style-name could indicate numbered
      const listStyleName = node.getAttribute('text:style-name') || ''
      const isOrdered = listStyleName.toLowerCase().includes('number') ||
                         listStyleName.toLowerCase().includes('ordered') ||
                         listStyleName.match(/L\d+/) // Common ODT auto-naming

      // Check for xml:id which often indicates continuation numbering
      return isOrdered
        ? `<ol>${content}</ol>\n`
        : `<ul>${content}</ul>\n`
    }

    case 'text:list-item': {
      const content = convertChildren(node, styles, imageMap)
      return `<li>${content}</li>\n`
    }

    // ─── Tables ───
    case 'table:table': {
      const content = convertChildren(node, styles, imageMap)
      return `<table>${content}</table>\n`
    }

    case 'table:table-header-rows': {
      const content = convertChildren(node, styles, imageMap)
      return `<thead>${content}</thead>\n`
    }

    case 'table:table-row': {
      const content = convertChildren(node, styles, imageMap)
      return `<tr>${content}</tr>\n`
    }

    case 'table:table-cell': {
      const colspan = node.getAttribute('table:number-columns-spanned')
      const rowspan = node.getAttribute('table:number-rows-spanned')
      let attrs = ''
      if (colspan && parseInt(colspan) > 1) attrs += ` colspan="${colspan}"`
      if (rowspan && parseInt(rowspan) > 1) attrs += ` rowspan="${rowspan}"`

      const content = convertChildren(node, styles, imageMap)
      return `<td${attrs}>${content}</td>\n`
    }

    case 'table:covered-table-cell': {
      // Skip cells covered by colspan/rowspan
      return ''
    }

    case 'table:table-column': {
      // Column definitions — skip
      return ''
    }

    // ─── Images & Graphics (draw:frame) ───
    case 'draw:frame': {
      // 1. Check for Image
      const imageNode = node.getElementsByTagName('draw:image')[0]
      if (imageNode) {
        const href = imageNode.getAttribute('xlink:href')
        if (href) {
          const mappedSrc = imageMap.get(href) || href
          const width = node.getAttribute('svg:width')
          const height = node.getAttribute('svg:height')
          let style = ''
          if (width) style += `max-width: ${convertUnit(width)};`
          if (height) style += `max-height: ${convertUnit(height)};`

          return `<img src="${mappedSrc}" alt="" style="${style}" loading="lazy" />\n`
        }
      }

      // 2. Check for Text Box
      const textBox = node.getElementsByTagName('draw:text-box')[0]
      if (textBox) {
        const content = convertChildren(textBox, styles, imageMap)
        return `<div class="odt-textbox">${content}</div>\n`
      }

      // 3. Check for Drawing Primitives (SVG conversion)
      const width = node.getAttribute('svg:width') || '100%'
      const height = node.getAttribute('svg:height') || 'auto'
      const drawSvg = renderSingleDrawNode(node, styles, imageMap)
      
      if (drawSvg) {
        const style = `width: ${convertUnit(width)}; height: ${convertUnit(height)}; display: block;`
        return `<svg style="${style}" class="odt-svg">${drawSvg}</svg>\n`
      }
      return convertChildren(node, styles, imageMap)
    }

    // ─── Top-level Drawing Elements ───
    case 'draw:rect':
    case 'draw:ellipse':
    case 'draw:line':
    case 'draw:path':
    case 'draw:polyline':
    case 'draw:polygon':
    case 'draw:custom-shape':
    case 'draw:connector':
    case 'draw:g': {
      const width = node.getAttribute('svg:width') || '100%'
      const height = node.getAttribute('svg:height') || 'auto'
      const drawSvg = renderSingleDrawNode(node, styles, imageMap)
      
      if (drawSvg) {
        const style = `width: ${convertUnit(width)}; height: ${convertUnit(height)}; display: block;`
        return `<svg style="${style}" class="odt-svg">${drawSvg}</svg>\n`
      }
      return convertChildren(node, styles, imageMap)
    }

    // ─── Line breaks ───
    case 'text:line-break':
      return '<br />'

    // ─── Tabs ───
    case 'text:tab':
      return '&emsp;'

    // ─── Multiple spaces ───
    case 'text:s': {
      const count = parseInt(node.getAttribute('text:c') || '1', 10)
      return '&nbsp;'.repeat(count)
    }

    // ─── Bookmarks (anchors) ───
    case 'text:bookmark':
    case 'text:bookmark-start': {
      const name = node.getAttribute('text:name')
      return name ? `<a id="${slugify(name)}"></a>` : ''
    }

    case 'text:bookmark-end':
      return ''

    // ─── Links ───
    case 'text:a': {
      const href = node.getAttribute('xlink:href') || '#'
      const content = convertChildren(node, styles, imageMap)
      return `<a href="${href}">${content}</a>`
    }

    // ─── Notes (footnotes/endnotes) ───
    case 'text:note': {
      const noteBody = node.getElementsByTagName('text:note-body')[0]
      if (noteBody) {
        const content = convertChildren(noteBody, styles, imageMap)
        return `<aside class="odt-note">${content}</aside>`
      }
      return ''
    }

    // ─── Soft hyphens ───
    case 'text:soft-hyphen':
      return '&shy;'

    // ─── Sections ───
    case 'text:section': {
      return convertChildren(node, styles, imageMap)
    }

    // ─── Default: recurse into children ───
    default:
      if (nsPrefix === 'draw' || nsPrefix === 'dr3d' || nsPrefix === 'office') {
        console.log(`[ODT-DEBUG] Unhandled tag: ${fullTag}`)
      }
      return convertChildren(node, styles, imageMap)
  }
}

/**
 * Determine if a style represents a quotation.
 * Recursively checks parent styles.
 */
function isQuoteStyle(styleName: string | null, styles: Map<string, StyleInfo>): boolean {
  if (!styleName) return false
  
  const lowerName = styleName.toLowerCase()
  if (lowerName.includes('quote') || lowerName.includes('quotation')) return true
  
  const style = styles.get(styleName)
  if (style?.parentStyleName) {
    return isQuoteStyle(style.parentStyleName, styles)
  }
  
  return false
}

// ─── Post-Processing ───

/**
 * Split a single HTML document into multiple articles based on heading level.
 */
export function splitIntoArticles(
  html: string,
  level: 'h1' | 'h2' | 'h3' = 'h2'
): ParsedArticleResult[] {
  const tag = level
  const regex = new RegExp(`(<${tag}[^>]*>)(.*?)(<\\/${tag}>)`, 'gi')
  const articles: ParsedArticleResult[] = []

  // Find all positions of the splitting heading
  const matches: { index: number; title: string }[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const title = stripHtml(match[2]).trim()
    if (title) {
      matches.push({ index: match.index, title })
    }
  }

  if (matches.length === 0) {
    // No headings found — entire document is one article
    const title = extractFirstHeading(html) || 'Untitled'
    return [{
      title,
      slug: slugify(title),
      html: html.trim(),
      excerpt: generateExcerpt(html),
    }]
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i < matches.length - 1 ? matches[i + 1].index : html.length
    const articleHtml = html.slice(start, end).trim()
    const title = matches[i].title

    articles.push({
      title,
      slug: slugify(title),
      html: articleHtml,
      excerpt: generateExcerpt(articleHtml),
    })
  }

  // If there's content before the first heading, prepend it to the first article
  if (matches.length > 0 && matches[0].index > 0) {
    const preamble = html.slice(0, matches[0].index).trim()
    if (preamble && articles.length > 0) {
      articles[0].html = preamble + '\n' + articles[0].html
    }
  }

  return articles
}

/**
 * Generate a text excerpt from HTML.
 */
export function generateExcerpt(html: string, maxLength: number = 200): string {
  const text = stripHtml(html).trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}

// ─── Helpers ───

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Extract the text of the first heading found in the HTML.
 */
export function extractFirstHeading(html: string): string | null {
  const match = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i)
  return match ? stripHtml(match[1]).trim() : null
}

function renderSingleDrawNode(
  node: any,
  styles: Map<string, StyleInfo>,
  imageMap: Map<string, string>
): string {
  const fullTag = node.nodeName || ''
  const styleName = node.getAttribute('draw:style-name')
  const style = styleName ? styles.get(styleName) : null
  const styleAttr = getSvgStyle(style)

  switch (fullTag) {
    case 'draw:rect': {
      const x = convertUnit(node.getAttribute('svg:x') || '0')
      const y = convertUnit(node.getAttribute('svg:y') || '0')
      const w = convertUnit(node.getAttribute('svg:width') || '0')
      const h = convertUnit(node.getAttribute('svg:height') || '0')
      const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${styleAttr} />\n`
      const text = renderTextInsideShape(node, x, y, w, h, styles, imageMap)
      return rect + text
    }
    case 'draw:ellipse': {
      const x = convertUnit(node.getAttribute('svg:x') || '0')
      const y = convertUnit(node.getAttribute('svg:y') || '0')
      const w = convertUnit(node.getAttribute('svg:width') || '0')
      const h = convertUnit(node.getAttribute('svg:height') || '0')
      const cx = `calc(${x} + (${w} / 2))`
      const cy = `calc(${y} + (${h} / 2))`
      const ellipse = `<ellipse cx="${cx}" cy="${cy}" rx="calc(${w} / 2)" ry="calc(${h} / 2)" ${styleAttr} />\n`
      const text = renderTextInsideShape(node, x, y, w, h, styles, imageMap)
      return ellipse + text
    }
    case 'draw:line': {
      const x1 = convertUnit(node.getAttribute('svg:x1') || '0')
      const y1 = convertUnit(node.getAttribute('svg:y1') || '0')
      const x2 = convertUnit(node.getAttribute('svg:x2') || '0')
      const y2 = convertUnit(node.getAttribute('svg:y2') || '0')
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${styleAttr} />\n`
    }
    case 'draw:path': {
      const d = node.getAttribute('svg:d')
      return d ? `<path d="${d}" ${styleAttr} />\n` : ''
    }
    case 'draw:polyline':
    case 'draw:polygon': {
      const points = node.getAttribute('draw:points')
      if (points) {
        const tag = fullTag === 'draw:polygon' ? 'polygon' : 'polyline'
        return `<${tag} points="${points}" ${styleAttr} />\n`
      }
      return ''
    }
    case 'draw:connector': {
      const d = node.getAttribute('svg:d')
      if (d) return `<path d="${d}" ${styleAttr} />\n`
      const x1 = convertUnit(node.getAttribute('svg:x1') || '0'), y1 = convertUnit(node.getAttribute('svg:y1') || '0')
      const x2 = convertUnit(node.getAttribute('svg:x2') || '0'), y2 = convertUnit(node.getAttribute('svg:y2') || '0')
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${styleAttr} />\n`
    }
    case 'draw:custom-shape': {
      const x = convertUnit(node.getAttribute('svg:x') || '0')
      const y = convertUnit(node.getAttribute('svg:y') || '0')
      const w = convertUnit(node.getAttribute('svg:width') || '0')
      const h = convertUnit(node.getAttribute('svg:height') || '0')
      
      const geometry = node.getElementsByTagName('draw:enhanced-geometry')[0]
      const path = geometry?.getAttribute('draw:enhanced-path')
      let shapeHtml = ''
      if (path) {
        shapeHtml = `<path d="${path}" ${styleAttr} />\n`
      } else {
        shapeHtml = `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${styleAttr} />\n`
      }
      
      const text = renderTextInsideShape(node, x, y, w, h, styles, imageMap)
      return shapeHtml + text
    }
    case 'draw:g': {
      const groupInfo = renderDrawChildren(node, styles, imageMap)
      return groupInfo.hasContent ? `<g>${groupInfo.svg}</g>\n` : ''
    }
    default:
      return ''
  }
}

/**
 * Render text content inside an SVG shape using <foreignObject>.
 */
function renderTextInsideShape(
  node: any,
  x: string,
  y: string,
  w: string,
  h: string,
  styles: Map<string, StyleInfo>,
  imageMap: Map<string, string>
): string {
  const content = convertChildren(node, styles, imageMap).trim()
  if (!content) return ''

  // Wrap in a div with centered text for better appearance
  const bodyStyle = `
    width: 100%; 
    height: 100%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    text-align: center;
    overflow: hidden;
    padding: 2px;
    box-sizing: border-box;
    font-size: 10px;
    line-height: 1.2;
    color: inherit;
  `.replace(/\s+/g, ' ')

  return `
    <foreignObject x="${x}" y="${y}" width="${w}" height="${h}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="${bodyStyle}">
        <div style="width: 100%">${content}</div>
      </div>
    </foreignObject>
  `.trim() + '\n'
}

/**
 * Render children of a draw:frame into SVG elements if applicable.
 */
function renderDrawChildren(
  parent: any,
  styles: Map<string, StyleInfo>,
  imageMap: Map<string, string>
): { svg: string; hasContent: boolean } {
  let svg = ''
  let hasContent = false
  const children = parent.childNodes
  if (!children) return { svg, hasContent }

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.nodeType !== 1) continue

    const fullTag = node.nodeName || ''
    const styleName = node.getAttribute('draw:style-name')
    const style = styleName ? styles.get(styleName) : null
    const styleAttr = getSvgStyle(style)

    switch (fullTag) {
      case 'draw:g': {
        const groupInfo = renderDrawChildren(node, styles, imageMap)
        if (groupInfo.hasContent) {
          svg += `<g>${groupInfo.svg}</g>\n`
          hasContent = true
        }
        break
      }
      case 'draw:custom-shape': {
        const geometry = node.getElementsByTagName('draw:enhanced-geometry')[0]
        const path = geometry?.getAttribute('draw:enhanced-path')
        if (path) {
          // ODT enhanced paths are very close to SVG paths
          svg += `<path d="${path}" ${styleAttr} />\n`
          hasContent = true
        } else {
          // Fallback to coordinates if no path (treat as rect)
          const x = convertUnit(node.getAttribute('svg:x') || '0')
          const y = convertUnit(node.getAttribute('svg:y') || '0')
          const w = convertUnit(node.getAttribute('svg:width') || '0')
          const h = convertUnit(node.getAttribute('svg:height') || '0')
          svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${styleAttr} />\n`
          hasContent = true
        }
        break
      }
      case 'draw:rect': {
        const x = convertUnit(node.getAttribute('svg:x') || '0')
        const y = convertUnit(node.getAttribute('svg:y') || '0')
        const w = convertUnit(node.getAttribute('svg:width') || '0')
        const h = convertUnit(node.getAttribute('svg:height') || '0')
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${styleAttr} />\n`
        hasContent = true
        break
      }
      case 'draw:ellipse': {
        const x = convertUnit(node.getAttribute('svg:x') || '0')
        const y = convertUnit(node.getAttribute('svg:y') || '0')
        const w = convertUnit(node.getAttribute('svg:width') || '0')
        const h = convertUnit(node.getAttribute('svg:height') || '0')
        // SVG ellipse uses cx, cy and rx, ry
        const cx = `calc(${x} + (${w} / 2))`
        const cy = `calc(${y} + (${h} / 2))`
        svg += `<ellipse cx="${cx}" cy="${cy}" rx="calc(${w} / 2)" ry="calc(${h} / 2)" ${styleAttr} />\n`
        hasContent = true
        break
      }
      case 'draw:connector': {
        const x1 = convertUnit(node.getAttribute('svg:x1') || '0')
        const y1 = convertUnit(node.getAttribute('svg:y1') || '0')
        const x2 = convertUnit(node.getAttribute('svg:x2') || '0')
        const y2 = convertUnit(node.getAttribute('svg:y2') || '0')
        const d = node.getAttribute('svg:d')
        if (d) {
          svg += `<path d="${d}" ${styleAttr} />\n`
        } else {
          svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${styleAttr} />\n`
        }
        hasContent = true
        break
      }
      case 'draw:line': {
        const x1 = convertUnit(node.getAttribute('svg:x1') || '0')
        const y1 = convertUnit(node.getAttribute('svg:y1') || '0')
        const x2 = convertUnit(node.getAttribute('svg:x2') || '0')
        const y2 = convertUnit(node.getAttribute('svg:y2') || '0')
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${styleAttr} />\n`
        hasContent = true
        break
      }
      case 'draw:path': {
        const d = node.getAttribute('svg:d')
        if (d) {
          svg += `<path d="${d}" ${styleAttr} />\n`
          hasContent = true
        }
        break
      }
      case 'draw:polyline':
      case 'draw:polygon': {
        const points = node.getAttribute('draw:points')
        if (points) {
          const tag = fullTag === 'draw:polygon' ? 'polygon' : 'polyline'
          svg += `<${tag} points="${points}" ${styleAttr} />\n`
          hasContent = true
        }
        break
      }
    }
  }

  return { svg, hasContent }
}

function getSvgStyle(style: StyleInfo | null | undefined): string {
  if (!style) return 'fill="none" stroke="black" stroke-width="1"'
  
  let fill = 'none'
  if (style.fill === 'solid' && style.fillColor) {
    fill = style.fillColor
  }
  
  const stroke = style.strokeColor || 'black'
  const strokeWidth = convertUnit(style.strokeWidth || '0.02cm')
  
  return `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"`
}

/**
 * Convert ODT units (e.g., "5.08cm", "2in") to CSS-friendly values.
 */
function convertUnit(value: string): string {
  if (value.endsWith('cm')) {
    const cm = parseFloat(value)
    return `${Math.round(cm * 37.8)}px`
  }
  if (value.endsWith('mm')) {
    const mm = parseFloat(value)
    return `${Math.round(mm * 3.78)}px`
  }
  if (value.endsWith('in')) {
    const inch = parseFloat(value)
    return `${Math.round(inch * 96)}px`
  }
  return value
}
