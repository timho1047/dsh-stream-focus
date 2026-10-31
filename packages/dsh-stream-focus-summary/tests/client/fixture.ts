/** Realistic product markup shared by the browser-facing specs. */
import type { AnchorIdentity } from '../../src/shared/protocol.ts'

export interface ThinkRowFixture {
  readonly nodeKey?: string
  readonly anchorKey?: string
  readonly groupPart?: string
  readonly running?: boolean
  readonly expanded?: boolean
  readonly preview?: string
  readonly paragraphs?: readonly string[]
  readonly legacy?: boolean
  readonly extraRow?: boolean
}

/** One reasoning row inside the stable ChatNodeSeat wrapper. */
export function thinkRowMarkup(options: ThinkRowFixture = {}): string {
  const {
    nodeKey = 'node-1', anchorKey = 'anchor-1', groupPart, running = true, expanded = false,
    preview = '', paragraphs = [], legacy = false, extraRow = false,
  } = options
  const title = hash('title')
  const summary = hash('summary')
  const body = hash('thinkBody')
  const content = expanded
    ? `<div class="${body}"><div class="${hash('markdown')}" data-markdown-variant="compact">${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></div>`
    : ''
  const collapsed = expanded ? '' : `
        <span class="${hash('separator')}" data-shimmer-decoration aria-hidden="true"></span>
        <span class="${summary}"${running ? ' data-streaming="true"' : ''}>
          <span class="${hash('summaryText')}">${escapeHtml(preview)}</span>
        </span>`
  const row = `
    <div class="${hash('root')}">
      <div class="${hash('header')}">
        <div class="${hash('row')}" data-disclosure-row data-expandable role="button"
          aria-expanded="${expanded}" tabindex="0">
          <span class="${hash('leading')}"><span class="${hash('iconIdle')}"></span></span>
          <span class="${hash('shimmer')}" data-shimmer>
            <span class="${hash('content')}">
              <span class="${hash('title')}">Think</span>${collapsed}
            </span>
            ${running ? `<span class="${hash('decoration')}" aria-hidden="true" inert=""><span class="${hash('sweep')}">Think</span></span>` : ''}
          </span>
        </div>
      </div>
      ${content}
    </div>`
  const outer = `
    <div data-chat-node-key="${nodeKey}" data-chat-anchor-key="${anchorKey}"
      ${groupPart === undefined ? '' : `data-chat-group-part="${groupPart}"`} data-chat-flow-kind="assistant-step">
      <div data-variant="think" data-state="${running ? 'running' : 'ok'}"
        ${expanded ? 'data-expanded="true"' : ''} ${preview === '' ? '' : 'data-preview="true"'}
        ${legacy ? 'data-dtp=""' : ''}>
        ${row}
      </div>
      ${extraRow ? `
      <div data-variant="think" data-state="ok">
        <div class="${hash('root')}"><div class="${hash('header')}">
          <div class="${hash('row')}" data-disclosure-row role="button" aria-expanded="false">
            <span class="${hash('leading')}"></span>
            <span class="${hash('content')}"><span class="${hash('title')}">Think</span></span>
          </div>
        </div></div>
      </div>` : ''}
    </div>`
  return outer
}

/** Mount one or more rows into `document.body`. */
export function mountRows(fixtures: readonly ThinkRowFixture[]): HTMLElement[] {
  document.body.innerHTML = `
    <div data-chat-following-tail>
      <div data-chat-flow>
        ${fixtures.map(fixture => thinkRowMarkup(fixture)).join('')}
      </div>
    </div>`
  return Array.from(document.querySelectorAll<HTMLElement>('[data-variant="think"]'))
}

/** Product rows deliberately use hashed class tokens. */
export function hash(local: string): string {
  return `abc123_${local}`
}

/** Read the stable anchor identity of one row for boundary assertions. */
export function expectedAnchor(nodeKey: string, rowIndex = 0, groupPart?: string): AnchorIdentity {
  return { nodeKey, rowIndex, ...groupPart === undefined ? {} : { groupPart } }
}

/** Escape product-like text without relying on the DOM. */
export function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
