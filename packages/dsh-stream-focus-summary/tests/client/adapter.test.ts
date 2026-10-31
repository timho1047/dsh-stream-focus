// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  anchorOf,
  latestCompletedParagraph,
  limitSegment,
  readThinkRow,
  thinkRows,
  titleOf,
} from '../../src/client/adapter.ts'
import { mountRows } from './fixture.ts'

describe('ThinkRowAdapter', () => {
  it('finds the disclosure title with hashed product classes, never the preview or body', () => {
    const [root] = mountRows([{ running: true, preview: 'A finished line', paragraphs: [] }])
    expect(root).toBeDefined()
    if (root === undefined) return
    const title = titleOf(root)
    expect(title?.textContent).toBe('Think')
    expect(title?.className).toContain('_title')
    expect(title?.className).not.toContain('summary')
    expect(readThinkRow(root)?.preview).toBe('A finished line')
  })

  it('uses the collapsed preview as the completed paragraph when the body is unavailable', () => {
    const [root] = mountRows([{ running: true, preview: 'First completed paragraph' }])
    if (root === undefined) return
    const snapshot = readThinkRow(root)
    expect(snapshot?.running).toBe(true)
    expect(snapshot?.bodyText).toBe('')
    expect(snapshot?.paragraphText).toBe('First completed paragraph')
  })

  it('extracts the latest completed paragraph from expanded Markdown blocks', () => {
    const [root] = mountRows([{
      running: true,
      expanded: true,
      paragraphs: ['Completed paragraph', 'Still streaming line\nwith more text'],
    }])
    if (root === undefined) return
    const snapshot = readThinkRow(root)
    expect(snapshot?.bodyText).toContain('Completed paragraph')
    expect(snapshot?.bodyText).toContain('Still streaming line')
    expect(snapshot?.paragraphText).toBe('Completed paragraph')
  })

  it('prefers the preview line to identify the latest completed paragraph', () => {
    expect(latestCompletedParagraph(
      ['First paragraph', 'Second paragraph\nstill going'],
      'Second paragraph',
      true,
    )).toBe('Second paragraph\nstill going')
    expect(latestCompletedParagraph(['First paragraph', 'Second paragraph'], 'Missing preview', true))
      .toBe('Missing preview')
  })

  it('reads a stable row anchor from the ChatNodeSeat wrapper and its reasoning index', () => {
    const rows = mountRows([
      { nodeKey: 'node-7', running: false, preview: 'One' },
    ])
    const [root] = rows
    if (root === undefined) return
    const owner = root.closest('[data-chat-node-key]')
    owner?.insertAdjacentHTML('beforeend', '<div data-variant="think" data-state="ok"></div>')
    const second = thinkRows(document)[1]
    expect(second).toBeDefined()
    if (second === undefined) return
    expect(anchorOf(root)).toEqual({ nodeKey: 'node-7', rowIndex: 0 })
    expect(anchorOf(second)).toEqual({ nodeKey: 'node-7', rowIndex: 1 })
  })

  it('falls back to data-chat-anchor-key and keeps groupPart only when present', () => {
    document.body.innerHTML = `
      <div data-chat-anchor-key="group:anchor" data-chat-group-part="reasoning">
        <div data-variant="think" data-state="ok"></div>
      </div>`
    const [root] = thinkRows(document)
    if (root === undefined) return
    expect(anchorOf(root)).toEqual({ nodeKey: 'group:anchor', groupPart: 'reasoning', rowIndex: 0 })
  })

  it('caps segment input at 8,000 characters and leaves content below the cap alone', () => {
    expect(limitSegment('x'.repeat(9_000))).toHaveLength(8_000)
    expect(limitSegment('short')).toBe('short')
  })

  it('does not invent a completed paragraph while the only paragraph is still streaming', () => {
    expect(latestCompletedParagraph(['Only line'], '', true)).toBe('')
    expect(latestCompletedParagraph(['Completed', 'Streaming'], '', true)).toBe('Completed')
    expect(latestCompletedParagraph(['Completed', 'Settled'], '', false)).toBe('Settled')
  })
})
