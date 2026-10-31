/** Read one product reasoning row without owning or rewriting its DOM. */
import type { AnchorIdentity } from '../shared/protocol.ts'

/** Maximum paragraph text sent to the Host. */
export const PARAGRAPH_LIMIT = 4_000

/** Maximum whole-stretch text sent to the Host. */
export const SEGMENT_LIMIT = 8_000

const BLOCK_TAGS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD', 'FIELDSET', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN',
  'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TD', 'TH', 'TR', 'UL',
])

/** One product reasoning row and the content the presenter may use. */
export interface ThinkRowSnapshot {
  readonly element: HTMLElement
  readonly title: HTMLElement
  readonly running: boolean
  readonly preview: string
  readonly bodyText: string
  readonly paragraphs: readonly string[]
  /** Latest completed paragraph, or the product's collapsed preview line. */
  readonly paragraphText: string
  readonly anchor: AnchorIdentity | undefined
}

/** Find every product reasoning row in one document pass. */
export function thinkRows(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>('[data-variant="think"]'))
}

/** The title is the disclosure label, never the collapsed preview or body copy. */
export function titleOf(root: HTMLElement): HTMLElement | undefined {
  const candidates = root.querySelectorAll<HTMLElement>('[class]')
  for (const candidate of candidates) {
    if (candidate.closest('[class*="thinkBody"]') !== null) continue
    if (candidate.closest('[class*="summary"]') !== null) continue
    const tokens = (candidate.getAttribute('class') ?? '').split(/\s+/)
    if (tokens.some(token => /(?:^|_)title$/u.test(token))) return candidate
  }
  const fallback = root.querySelector<HTMLElement>('[class*="_title"]')
  if (fallback !== null && fallback.closest('[class*="thinkBody"]') === null
    && fallback.closest('[class*="summary"]') === null) return fallback
  return undefined
}

/** Read the product's collapsed preview without confusing it with body text. */
export function previewOf(root: HTMLElement): string {
  const element = root.querySelector<HTMLElement>('[class*="summaryText"]')
    ?? root.querySelector<HTMLElement>('[class*="summary"]')
  return element === null ? '' : normalizeInline(element.textContent ?? '')
}

/** Read the expanded reasoning body, if the row still exposes it. */
export function bodyOf(root: HTMLElement): HTMLElement | undefined {
  return root.querySelector<HTMLElement>('[class*="thinkBody"]') ?? undefined
}

/** Whether the product marks this row as the streaming tail. */
export function isRunning(root: HTMLElement): boolean {
  return root.getAttribute('data-state') === 'running'
}

/**
 * Read one reasoning row. A row without a title has no product surface this
 * plugin can decorate and is reported as absent.
 * @param root - `[data-variant="think"]` root.
 * @returns current title, state, preview, body paragraphs, and stable anchor.
 */
export function readThinkRow(root: HTMLElement): ThinkRowSnapshot | undefined {
  const title = titleOf(root)
  if (title === undefined) return undefined
  const preview = previewOf(root)
  const body = bodyOf(root)
  const bodyText = body === undefined ? '' : readBodyText(body)
  const paragraphs = paragraphsOf(bodyText === '' ? preview : bodyText)
  const running = isRunning(root)
  return {
    element: root,
    title,
    running,
    preview,
    bodyText,
    paragraphs,
    paragraphText: limitParagraph(latestCompletedParagraph(paragraphs, preview, running)),
    anchor: anchorOf(root),
  }
}

/**
 * Extract the latest completed paragraph. The product's collapsed preview
 * names that paragraph's first line, so a match wins over positional guesses;
 * without a preview the streaming tail is treated as incomplete.
 * @param paragraphs - normalized body paragraphs in display order.
 * @param preview - product collapsed preview, possibly empty when expanded.
 * @param running - whether the row is still streaming.
 * @returns the paragraph text, without a trailing newline.
 */
export function latestCompletedParagraph(paragraphs: readonly string[], preview: string, running: boolean): string {
  const line = normalizeInline(preview)
  if (line !== '') {
    const matched = paragraphs.find(paragraph => firstLine(paragraph) === line)
    return matched ?? line
  }
  if (!running) return paragraphs.at(-1) ?? ''
  return paragraphs.length > 1 ? paragraphs[paragraphs.length - 2] ?? '' : ''
}

/**
 * Split body text on one or more blank lines.
 * @param text - normalized reasoning text.
 * @returns non-empty normalized paragraphs.
 */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n[ \t]*\n+/u)
    .map(paragraph => normalizeParagraph(paragraph))
    .filter(paragraph => paragraph !== '')
}

/**
 * Extract text from the rendered Markdown body. `innerText` preserves the
 * browser's visual line breaks; the fallback serializer inserts paragraph
 * breaks between block elements, which `textContent` alone would lose.
 * @param body - product reasoning body element.
 * @returns normalized body text.
 */
export function readBodyText(body: HTMLElement): string {
  const inner = (body as HTMLElement & { readonly innerText?: string }).innerText
  if (typeof inner === 'string' && inner.trim() !== '') return normalizeText(inner)
  const parts: string[] = []
  for (let child = body.firstChild; child !== null; child = child.nextSibling) appendText(child, parts)
  return normalizeText(parts.join(''))
}

/**
 * Read the stable row identity the Host uses for locale-neutral anchors.
 * Missing product identity yields undefined; the plugin never fabricates it.
 * @param root - reasoning row root.
 * @returns node key, optional group part, and reasoning-row index.
 */
export function anchorOf(root: HTMLElement): AnchorIdentity | undefined {
  const owner = root.closest<HTMLElement>('[data-chat-node-key]')
    ?? root.closest<HTMLElement>('[data-chat-anchor-key]')
  if (owner === null) return undefined
  const nodeKey = (owner.getAttribute('data-chat-node-key') ?? owner.getAttribute('data-chat-anchor-key') ?? '').trim()
  if (nodeKey === '') return undefined
  const rows = Array.from(owner.querySelectorAll<HTMLElement>('[data-variant="think"]'))
  const rowIndex = rows.indexOf(root)
  if (rowIndex < 0) return undefined
  const groupPart = owner.getAttribute('data-chat-group-part')?.trim()
  return {
    nodeKey,
    ...groupPart === undefined || groupPart === '' ? {} : { groupPart },
    rowIndex,
  }
}

/** Truncate paragraph input to the Host's cap. */
export function limitParagraph(text: string): string {
  return text.length > PARAGRAPH_LIMIT ? text.slice(0, PARAGRAPH_LIMIT) : text
}

/** Truncate segment input to the Host's cap. */
export function limitSegment(text: string): string {
  return text.length > SEGMENT_LIMIT ? text.slice(0, SEGMENT_LIMIT) : text
}

/** Normalize one inline phrase or preview line. */
export function normalizeInline(text: string): string {
  return text.replaceAll('**', '').replace(/\s+/gu, ' ').trim()
}

function firstLine(text: string): string {
  const newline = text.indexOf('\n')
  return normalizeInline(newline < 0 ? text : text.slice(0, newline))
}

function normalizeParagraph(text: string): string {
  return text
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/[ \t]+\n/gu, '\n')
    .trim()
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function appendText(node: Node, out: string[]): void {
  if (node.nodeType === 3) {
    out.push(node.nodeValue ?? '')
    return
  }
  if (node.nodeType !== 1) return
  const element = node as Element
  if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return
  if (element.tagName === 'BR') {
    out.push('\n')
    return
  }
  const block = BLOCK_TAGS.has(element.tagName)
  if (block && out.length > 0) out.push('\n\n')
  for (let child = element.firstChild; child !== null; child = child.nextSibling) appendText(child, out)
  if (block) out.push('\n\n')
}
