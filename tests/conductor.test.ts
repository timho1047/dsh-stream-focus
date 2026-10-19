import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StreamWindowConductor } from '../src/client/conductor.ts'

class TestAnimation {
  private readonly listeners = new Map<string, () => void>()
  addEventListener(type: string, listener: () => void): void { this.listeners.set(type, listener) }
  fire(type: 'finish' | 'cancel'): void { this.listeners.get(type)?.() }
}

function animateBody(key: string): TestAnimation {
  const variant = document.querySelector<HTMLElement>(`[data-chat-flow-key="${key}"] [data-variant="think"], [data-chat-flow-key="${key}"] [data-tool]`)
  if (variant === null) throw new Error(`missing variant ${key}`)
  const body = document.createElement('div')
  variant.append(body)
  Object.defineProperty(body, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ height: 120 } as DOMRect),
  })
  const animation = new TestAnimation()
  Object.defineProperty(body, 'animate', {
    configurable: true,
    value: () => animation,
  })
  return animation
}

function reasoning(key: string, state: 'running' | 'ok' = 'running'): string {
  return `
    <div data-chat-flow-key="${key}" data-chat-flow-kind="assistant-step">
      <div data-variant="think" data-state="${state}">
        <div data-disclosure-row="true" role="button" aria-expanded="false"></div>
      </div>
    </div>`
}

function tool(key: string, state: 'running' | 'ok' = 'running'): string {
  return `
    <div data-chat-flow-key="${key}" data-chat-flow-kind="tool-call">
      <div data-tool="bash" data-state="${state}">
        <div data-disclosure-row="true" role="button" aria-expanded="false"></div>
      </div>
    </div>`
}

function bash(key: string, state: 'running' | 'ok' = 'running'): string {
  return `
    <div data-chat-flow-key="${key}" data-chat-flow-kind="tool-call">
      <div data-sample="bash" data-state="${state}" data-expandable="true" aria-expanded="false" role="button"></div>
    </div>`
}

function group(rows: string, open = false): string {
  return `
    <div data-chat-group-key="group-1" data-chat-turn="1">
      <div><button type="button" aria-expanded="${String(open)}"></button></div>
      <div data-step-process-body="true"${open ? '' : ' hidden="until-found"'}>
        <div data-step-process-content="true" data-chat-flow="">
          ${rows}
        </div>
      </div>
    </div>`
}

let wired = false

/** Mirror the two official click behaviors, including rows inserted after mount. */
function wireDocument(): void {
  if (wired) return
  wired = true
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest<HTMLElement>('[data-disclosure-row]')
    if (row !== null) {
      const open = row.getAttribute('aria-expanded') === 'true'
      row.setAttribute('aria-expanded', String(!open))
      return
    }
    const bash = target.closest<HTMLElement>('[data-sample="bash"][aria-expanded]')
    if (bash !== null) {
      const open = bash.getAttribute('aria-expanded') === 'true'
      bash.setAttribute('aria-expanded', String(!open))
      return
    }
    const button = target.closest<HTMLButtonElement>('[data-chat-group-key] > div > button[aria-expanded]')
    if (button !== null) {
      const body = button.closest('[data-chat-group-key]')?.querySelector<HTMLElement>('[data-step-process-body]') ?? null
      const open = button.getAttribute('aria-expanded') === 'true'
      button.focus()
      button.setAttribute('aria-expanded', String(!open))
      if (body !== null) {
        if (open) body.setAttribute('hidden', 'until-found')
        else body.removeAttribute('hidden')
      }
    }
  })
}

function mount(markup: string): void {
  wireDocument()
  document.body.innerHTML = `
    <div data-chat-following-tail>
      <div data-chat-flow>
        <div data-chat-running></div>
        ${markup}
      </div>
    </div>`
}

function groupButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>('[data-chat-group-key] > div > button')
  if (button === null) throw new Error('missing group header')
  return button
}

function row(key: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-chat-flow-key="${key}"] [data-disclosure-row]`)
  if (element === null) throw new Error(`missing row ${key}`)
  return element
}

function open(rowKey: string): boolean {
  return row(rowKey).getAttribute('aria-expanded') === 'true'
}

function bashOpen(key: string): boolean {
  return document.querySelector<HTMLElement>(`[data-chat-flow-key="${key}"] [data-sample="bash"]`)
    ?.getAttribute('aria-expanded') === 'true'
}

function bodyHidden(): boolean {
  return document.querySelector('[data-step-process-body]')?.hasAttribute('hidden') === true
}

class FakeResizeObserver {
  static last: FakeResizeObserver | undefined
  private readonly observed = new Set<Element>()

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.last = this
  }

  observe(target: Element): void { this.observed.add(target) }
  unobserve(target: Element): void { this.observed.delete(target) }
  disconnect(): void { this.observed.clear() }
  trigger(): void { this.callback([], this as unknown as ResizeObserver) }
}

const nativeResizeObserver = window.ResizeObserver
const nativeMatchMedia = window.matchMedia

function useFakeResizeObserver(): void {
  FakeResizeObserver.last = undefined
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: FakeResizeObserver,
  })
}

describe('StreamWindowConductor', () => {
  let conductor: StreamWindowConductor

  beforeEach(() => {
    mount(group(reasoning('r1')))
    conductor = new StreamWindowConductor(document, window)
  })

  afterEach(() => {
    conductor.stop()
    document.body.innerHTML = ''
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: nativeResizeObserver,
    })
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: nativeMatchMedia,
    })
  })

  it('opens the group, then the streaming reasoning row', () => {
    conductor.start()
    expect(groupButton().getAttribute('aria-expanded')).toBe('true')
    expect(bodyHidden()).toBe(false)
    expect(open('r1')).toBe(false)

    conductor.sync()
    expect(open('r1')).toBe(true)
  })

  it('switches from reasoning to the tool batch and back to the next reasoning', () => {
    conductor.start()
    conductor.sync()

    const content = document.querySelector('[data-step-process-content]')
    if (content === null) throw new Error('missing content')
    content.innerHTML = reasoning('r1', 'ok') + tool('t1')
    conductor.sync()

    expect(open('r1')).toBe(false)
    expect(open('t1')).toBe(true)

    content.innerHTML = reasoning('r1', 'ok') + tool('t1', 'ok') + reasoning('r2')
    conductor.sync()

    expect(open('t1')).toBe(false)
    expect(open('r2')).toBe(true)
  })

  it('freezes the window height for a row switch and restores it', () => {
    mount(group(reasoning('r1'), true))
    conductor = new StreamWindowConductor(document, window)
    conductor.start()
    const body = document.querySelector<HTMLElement>('[data-step-process-body]')
    if (body === null) throw new Error('missing body')
    Object.defineProperty(body, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ height: 320 } as DOMRect),
    })
    document.querySelector<HTMLElement>('[data-chat-flow-key="r1"] [data-variant="think"]')?.setAttribute('data-state', 'ok')
    const content = document.querySelector('[data-step-process-content]')
    if (content === null) throw new Error('missing content')
    content.insertAdjacentHTML('beforeend', tool('t1'))
    conductor.sync()
    expect(body.style.height).toBe('320px')
    expect(body.style.maxHeight).toBe('320px')
    conductor.stop()
    expect(body.style.height).toBe('')
    expect(body.style.maxHeight).toBe('')
  })

  it('waits for the old row to finish collapsing before opening the new one', async () => {
    mount(group(reasoning('r1'), true))
    conductor = new StreamWindowConductor(document, window)
    conductor.start()
    expect(open('r1')).toBe(true)

    const content = document.querySelector('[data-step-process-content]')
    if (content === null) throw new Error('missing content')
    document.querySelector<HTMLElement>('[data-chat-flow-key="r1"] [data-variant="think"]')?.setAttribute('data-state', 'ok')
    content.insertAdjacentHTML('beforeend', tool('t1'))
    const collapse = animateBody('r1')
    conductor.sync()

    expect(open('r1')).toBe(true)
    expect(open('t1')).toBe(false)

    collapse.fire('finish')
    await new Promise<void>(resolve => { setTimeout(resolve, 230) })
    expect(open('r1')).toBe(false)
    expect(open('t1')).toBe(true)
  })

  it('does not reopen a row the reader closed', () => {
    conductor.start()
    conductor.sync()
    row('r1').click()

    expect(open('r1')).toBe(false)
    conductor.sync()
    expect(open('r1')).toBe(false)
  })

  it('leaves a row the reader opened pinned across a later switch', () => {
    mount(group(reasoning('r1', 'ok') + tool('t1')))
    conductor.stop()
    conductor = new StreamWindowConductor(document, window)
    conductor.start()
    conductor.sync()
    expect(open('t1')).toBe(true)

    row('r1').click()
    expect(open('r1')).toBe(true)

    const content = document.querySelector('[data-step-process-content]')
    if (content === null) throw new Error('missing content')
    row('t1').closest<HTMLElement>('[data-tool]')?.setAttribute('data-state', 'ok')
    content.insertAdjacentHTML('beforeend', reasoning('r2'))
    conductor.sync()

    expect(open('r1')).toBe(true)
    expect(open('t1')).toBe(false)
    expect(open('r2')).toBe(true)
  })

  it('adds a bottom fade while the window is active', () => {
    conductor.start()
    const group = document.querySelector<HTMLElement>('[data-chat-group-key]')
    expect(group?.querySelector('[data-stream-fade]')).not.toBeNull()
    conductor.stop()
    expect(document.querySelector('[data-stream-fade]')).toBeNull()
  })

  it('keeps the active window height from shrinking during row switches', () => {
    useFakeResizeObserver()
    conductor.start()
    const body = document.querySelector<HTMLElement>('[data-step-process-body]')
    if (body === null) throw new Error('missing group body')
    let height = 320
    Object.defineProperty(body, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ height } as DOMRect),
    })
    FakeResizeObserver.last?.trigger()
    expect(body.style.minHeight).toBe('320px')

    height = 120
    FakeResizeObserver.last?.trigger()
    expect(body.style.minHeight).toBe('320px')

    conductor.stop()
    expect(body.style.minHeight).toBe('')
  })

  it('contains horizontal overflow and suppresses edge fades while active', () => {
    conductor.start()
    const body = document.querySelector<HTMLElement>('[data-step-process-body]')
    if (body === null) throw new Error('missing group body')
    expect(body.style.overflowX).toBe('hidden')
    expect(body.style.maskImage).toBe('none')

    conductor.stop()
    expect(body.style.overflowX).toBe('')
    expect(body.style.maskImage).toBe('')
  })

  it('reveals an automatically opened group and then restores its styles', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
    conductor.start()
    const body = document.querySelector<HTMLElement>('[data-step-process-body]')
    if (body === null) throw new Error('missing group body')
    expect(body.style.opacity).toBe('0')

    await new Promise<void>(resolve => { setTimeout(resolve, 30) })
    expect(body.style.opacity).toBe('1')
    expect(body.style.transition).toContain('opacity')

    await new Promise<void>(resolve => { setTimeout(resolve, 560) })
    expect(body.style.opacity).toBe('')
    expect(body.style.transition).toBe('')
  })

  it('does not leave focus on the group header it opened', () => {
    conductor.start()
    expect(document.activeElement).not.toBe(groupButton())
  })

  it('restores focus to the composer after opening the window', () => {
    const composer = document.createElement('textarea')
    document.body.append(composer)
    composer.focus()
    conductor.start()
    expect(document.activeElement).toBe(composer)
  })

  it('blurs a mouse-opened group header but keeps keyboard focus', async () => {
    conductor.start()
    groupButton().dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await Promise.resolve()
    expect(document.activeElement).not.toBe(groupButton())

    groupButton().dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    await Promise.resolve()
    expect(document.activeElement).toBe(groupButton())
  })

  it('opens a Bash tool row through its own row control', () => {
    mount(group(reasoning('r1', 'ok') + bash('b1')))
    conductor.stop()
    conductor = new StreamWindowConductor(document, window)
    conductor.start()
    conductor.sync()

    expect(bashOpen('b1')).toBe(true)
  })

  it('does not reopen a group the reader collapsed', () => {
    conductor.start()
    conductor.sync()
    expect(open('r1')).toBe(true)

    groupButton().click()
    expect(groupButton().getAttribute('aria-expanded')).toBe('false')

    conductor.sync()
    expect(groupButton().getAttribute('aria-expanded')).toBe('false')
  })

  it('does not adopt a group from an older turn when a newer turn is present', () => {
    const flow = document.querySelector('[data-chat-flow]')
    flow?.insertAdjacentHTML('beforeend', '<div data-chat-turn="2"></div>')
    conductor.start()
    expect(groupButton().getAttribute('aria-expanded')).toBe('false')
    expect(open('r1')).toBe(false)
  })

  it('keeps expanding the window even when the outer reader is away from the tail', () => {
    document.querySelector('[data-chat-following-tail]')?.removeAttribute('data-chat-following-tail')
    conductor.start()
    expect(groupButton().getAttribute('aria-expanded')).toBe('true')

    conductor.sync()
    expect(open('r1')).toBe(true)
  })

  it('restores the official closed state when the turn stops', () => {
    conductor.start()
    conductor.sync()
    expect(open('r1')).toBe(true)

    document.querySelector('[data-chat-running]')?.remove()
    conductor.sync()

    expect(open('r1')).toBe(false)
    expect(groupButton().getAttribute('aria-expanded')).toBe('false')
    expect(bodyHidden()).toBe(true)
  })

  it('reacts to a new row through the mutation observer', async () => {
    conductor.start()
    conductor.sync()
    const content = document.querySelector('[data-step-process-content]')
    if (content === null) throw new Error('missing content')

    content.insertAdjacentHTML('beforeend', reasoning('r2'))
    await new Promise<void>(resolve => { setTimeout(resolve, 40) })

    expect(open('r2')).toBe(true)
  })
})
