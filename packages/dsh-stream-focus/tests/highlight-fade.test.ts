import { afterEach, describe, expect, it, vi } from 'vitest'
import { HighlightFade } from '../src/client/highlight-fade.ts'

class FakeHighlight extends Set<Range> {}

function install(): Map<string, FakeHighlight> {
  const registry = new Map<string, FakeHighlight>()
  vi.stubGlobal('Highlight', FakeHighlight)
  vi.stubGlobal('CSS', { highlights: registry, supports: () => false })
  return registry
}

function faded(registry: Map<string, FakeHighlight>): string {
  return [...registry.values()].flatMap(highlight => [...highlight]).map(range => range.toString()).join('')
}

describe('HighlightFade', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('fades only the appended suffix of an existing text node', async () => {
    const registry = install()
    document.body.innerHTML = '<div id="root">already visible</div>'
    const root = document.querySelector<HTMLElement>('#root')
    if (root === null) throw new Error('missing root')
    const fade = new HighlightFade(document, window)
    fade.observe(root)
    root.firstChild!.textContent = 'already visible plus new'
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(faded(registry)).toBe(' plus new')
    fade.stop()
  })

  it('fades only the appended tail when Markdown replaces the text node', async () => {
    const registry = install()
    document.body.innerHTML = '<div id="root"><p><span>already visible</span></p></div>'
    const root = document.querySelector<HTMLElement>('#root')
    if (root === null) throw new Error('missing root')
    const fade = new HighlightFade(document, window)
    fade.observe(root)
    root.innerHTML = '<p><span>already visible</span> plus new</p>'
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(faded(registry)).toBe(' plus new')
    fade.stop()
  })

  it('does not fade a replacement that contains no new text', async () => {
    const registry = install()
    document.body.innerHTML = '<div id="root"><p><span>already visible</span></p></div>'
    const root = document.querySelector<HTMLElement>('#root')
    if (root === null) throw new Error('missing root')
    const fade = new HighlightFade(document, window)
    fade.observe(root)
    root.innerHTML = '<p><span>already visible</span></p>'
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(faded(registry)).toBe('')
    fade.stop()
  })
})
