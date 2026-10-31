import { afterEach, describe, expect, it } from 'vitest'
import { NormalOutputSmoother } from '../src/client/normal-smoothing.ts'
import { HighlightFade } from '../src/client/highlight-fade.ts'

describe('HighlightFade fallback', () => {
  it('does not throw when the Highlight API is unavailable', () => {
    const root = document.createElement('div')
    root.textContent = 'hello'
    document.body.append(root)
    const fade = new HighlightFade(document, window)
    fade.observe(root)
    root.textContent = 'hello world'
    fade.unobserve(root)
    fade.stop()
    expect(root.dataset.highlightFade).toBeUndefined()
  })
})

describe('NormalOutputSmoother', () => {
  let smoother: NormalOutputSmoother | null = null

  afterEach(() => {
    smoother?.stop()
    smoother = null
    document.body.innerHTML = ''
  })

  it('masks only the streaming Assistant response root', () => {
    document.body.innerHTML = `
      <div data-chat-flow-kind="assistant-step" data-chat-group-part="response">
        <div data-streaming><p>answer</p></div>
      </div>
      <div data-chat-flow-kind="assistant-step" data-chat-group-part="reasoning">
        <div data-streaming><p>thought</p></div>
      </div>`
    smoother = new NormalOutputSmoother(document, window)
    smoother.start()
    const roots = document.querySelectorAll<HTMLElement>('[data-streaming]')
    expect(roots[0]?.hasAttribute('data-stream-fade')).toBe(true)
    expect(roots[1]?.hasAttribute('data-stream-fade')).toBe(false)
  })

  it('removes the mask when streaming settles or the smoother stops', () => {
    document.body.innerHTML = `
      <div data-chat-flow-kind="assistant-step" data-chat-group-part="response">
        <div data-streaming><p>answer</p></div>
      </div>`
    smoother = new NormalOutputSmoother(document, window)
    smoother.start()
    const root = document.querySelector<HTMLElement>('[data-streaming]')
    if (root === null) throw new Error('missing streaming root')

    root.removeAttribute('data-streaming')
    smoother.sync()
    expect(root.hasAttribute('data-stream-fade')).toBe(false)

    root.setAttribute('data-streaming', '')
    smoother.sync()
    expect(root.hasAttribute('data-stream-fade')).toBe(true)
    smoother.stop()
    smoother = null
    expect(root.hasAttribute('data-stream-fade')).toBe(false)
  })
})
