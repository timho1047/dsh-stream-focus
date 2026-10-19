import { afterEach, describe, expect, it, vi } from 'vitest'
import { closeDisclosure, findDisclosureBody, isOuterHeld, openDisclosure } from '../src/client/disclosure-motion.ts'

class FakeAnimation {
  private readonly listeners = new Map<string, () => void>()

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener)
  }

  fire(type: 'finish' | 'cancel'): void {
    this.listeners.get(type)?.()
  }
}

function fixture(): { row: HTMLElement; body: HTMLElement; animation: FakeAnimation } {
  document.body.innerHTML = `
    <div data-conversation-scroll style="height: 400px">
      <div>
        <div>
          <div data-disclosure-row="true" aria-expanded="false"></div>
        </div>
        <div id="body">answer</div>
      </div>
    </div>`
  const row = document.querySelector<HTMLElement>('[data-disclosure-row]')
  const body = document.querySelector<HTMLElement>('#body')
  if (row === null || body === null) throw new Error('missing fixture')
  Object.defineProperty(body, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ height: 120 } as DOMRect),
  })
  const animation = new FakeAnimation()
  Object.defineProperty(body, 'animate', {
    configurable: true,
    value: vi.fn(() => animation),
  })
  return { row, body, animation }
}

describe('disclosure motion', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('finds the body beside the header wrapper', () => {
    const { row, body } = fixture()
    expect(findDisclosureBody(row)).toBe(body)
  })

  it('animates open from zero height and clears temporary styles', () => {
    const { row, body, animation } = fixture()
    openDisclosure(row, window, () => { row.setAttribute('aria-expanded', 'true') })
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(body.style.height).toBe('0px')
    expect(body.animate).toHaveBeenCalled()
    animation.fire('finish')
    expect(body.style.height).toBe('')
    expect(body.style.opacity).toBe('')
  })

  it('holds the outer scroll while a disclosure animates', () => {
    const { row, animation } = fixture()
    const outer = document.querySelector<HTMLElement>('[data-conversation-scroll]')
    if (outer === null) throw new Error('missing outer')
    openDisclosure(row, window, () => { row.setAttribute('aria-expanded', 'true') })
    expect(isOuterHeld(outer)).toBe(true)
    animation.fire('finish')
    expect(isOuterHeld(outer)).toBe(false)
  })

  it('delays close until the shrink animation finishes', () => {
    const { row, animation } = fixture()
    const pending = new Set<HTMLElement>()
    const toggle = vi.fn()
    expect(closeDisclosure(row, window, toggle, pending)).toBe(true)
    expect(toggle).not.toHaveBeenCalled()
    expect(pending.has(row)).toBe(true)
    animation.fire('finish')
    expect(toggle).toHaveBeenCalledOnce()
    expect(pending.has(row)).toBe(false)
  })

  it('still closes when the shrink animation is canceled', () => {
    const { row, animation } = fixture()
    const toggle = vi.fn()
    const pending = new Set<HTMLElement>()
    closeDisclosure(row, window, toggle, pending)
    animation.fire('cancel')
    expect(toggle).toHaveBeenCalledOnce()
    expect(pending.has(row)).toBe(false)
  })

  it('falls back to an immediate toggle without animation support', () => {
    const { row } = fixture()
    Object.defineProperty(document.querySelector('#body') as HTMLElement, 'animate', {
      configurable: true,
      value: undefined,
    })
    const toggle = vi.fn()
    expect(closeDisclosure(row, window, toggle, new Set())).toBe(false)
    expect(toggle).toHaveBeenCalledOnce()
  })
})
