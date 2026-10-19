import { afterEach, describe, expect, it } from 'vitest'
import { JumpSmoother } from '../src/client/jump-smoother.ts'

describe('JumpSmoother', () => {
  const smoother = new JumpSmoother(window)

  afterEach(() => { smoother.stop(); document.body.innerHTML = '' })

  it('compensates one upward line jump and restores the content on stop', () => {
    const scroll = document.createElement('div')
    const content = document.createElement('div')
    scroll.append(content)
    document.body.append(scroll)
    let top = 100
    Object.defineProperty(scroll, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value: number) => { top = value },
    })
    smoother.observe(scroll, content)
    top = 124
    scroll.dispatchEvent(new Event('scroll'))
    expect(content.style.getPropertyValue('translate')).toBe('0 24.00px')
    smoother.stop()
    expect(content.style.getPropertyValue('translate')).toBe('')
  })
})
