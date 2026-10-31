import { afterEach, describe, expect, it } from 'vitest'
import { FlatRowConductor } from '../src/client/flat-rows.ts'

function reasoning(key: string, state: 'running' | 'ok' = 'running'): string {
  return `
    <div data-chat-turn="1" data-chat-flow-kind="assistant-step" data-chat-flow-key="${key}">
      <div data-variant="think" data-state="${state}">
        <div data-disclosure-row="true" role="button" aria-expanded="false"></div>
      </div>
    </div>`
}

function tool(key: string, state: 'running' | 'ok' = 'running'): string {
  return `
    <div data-chat-turn="1" data-chat-flow-kind="tool-call" data-chat-flow-key="${key}">
      <div data-tool="bash" data-state="${state}">
        <div data-disclosure-row="true" role="button" aria-expanded="false"></div>
      </div>
    </div>`
}

function mount(rows: string): void {
  document.body.innerHTML = `
    <div data-chat-following-tail>
      <div data-conversation-scroll>
        <div data-chat-flow>
          <div data-chat-running></div>
          <div data-slot="conversation.chat.flow">${rows}</div>
        </div>
      </div>
    </div>`
}

let wired = false
function wireDocument(): void {
  if (wired) return
  wired = true
  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const row = target.closest<HTMLElement>('[data-disclosure-row]')
    if (row === null) return
    row.setAttribute('aria-expanded', String(row.getAttribute('aria-expanded') !== 'true'))
  })
}

function open(key: string): boolean {
  return document.querySelector<HTMLElement>(`[data-chat-flow-key="${key}"] [data-disclosure-row]`)
    ?.getAttribute('aria-expanded') === 'true'
}

describe('FlatRowConductor', () => {
  let conductor: FlatRowConductor | null = null

  afterEach(() => {
    conductor?.stop()
    conductor = null
    document.body.innerHTML = ''
  })

  it('opens the running reasoning row in Detailed', () => {
    wireDocument()
    mount(reasoning('r1'))
    conductor = new FlatRowConductor('detailed', document, window)
    conductor.start()
    expect(open('r1')).toBe(true)
  })

  it('switches Detailed to the tool batch and closes the previous row', () => {
    wireDocument()
    mount(reasoning('r1'))
    conductor = new FlatRowConductor('detailed', document, window)
    conductor.start()
    expect(open('r1')).toBe(true)

    const slot = document.querySelector('[data-slot="conversation.chat.flow"]')
    if (slot === null) throw new Error('missing slot')
    document.querySelector('[data-chat-flow-key="r1"] [data-variant="think"]')?.setAttribute('data-state', 'ok')
    slot.insertAdjacentHTML('beforeend', tool('t1'))
    conductor.sync()

    expect(open('r1')).toBe(false)
    expect(open('t1')).toBe(true)
  })

  it('keeps older rows open in Verbose', () => {
    wireDocument()
    mount(reasoning('r1'))
    conductor = new FlatRowConductor('verbose', document, window)
    conductor.start()
    expect(open('r1')).toBe(true)

    const slot = document.querySelector('[data-slot="conversation.chat.flow"]')
    if (slot === null) throw new Error('missing slot')
    document.querySelector('[data-chat-flow-key="r1"] [data-variant="think"]')?.setAttribute('data-state', 'ok')
    slot.insertAdjacentHTML('beforeend', tool('t1'))
    conductor.sync()

    expect(open('r1')).toBe(true)
    expect(open('t1')).toBe(true)
  })

  it('finds process rows inside a Detailed hidden-header group', () => {
    wireDocument()
    mount(`
      <div data-chat-group-key="g1" data-chat-turn="1" data-group-expanded-mode="true">
        <div hidden><button type="button" aria-expanded="false"></button></div>
        <div data-step-process-body>
          <div data-step-process-content data-chat-flow>${reasoning('r1')}</div>
        </div>
      </div>`)
    conductor = new FlatRowConductor('detailed', document, window)
    conductor.start()
    expect(open('r1')).toBe(true)
  })

  it('re-anchors outer follow after layout growth in Detailed', async () => {
    wireDocument()
    mount(reasoning('r1'))
    const outer = document.querySelector<HTMLElement>('[data-conversation-scroll]')
    if (outer === null) throw new Error('missing outer scroller')
    let scrollTop = 400
    let scrollHeight = 800
    Object.defineProperty(outer, 'clientHeight', { configurable: true, value: 400 })
    Object.defineProperty(outer, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    Object.defineProperty(outer, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => { scrollTop = value },
    })

    conductor = new FlatRowConductor('detailed', document, window)
    conductor.start()
    scrollHeight = 900
    conductor.sync()
    await new Promise<void>(resolve => { setTimeout(resolve, 420) })
    expect(scrollTop).toBe(500)
  })

  it('does not touch a settled row when no turn is running', () => {
    wireDocument()
    mount(reasoning('r1', 'ok'))
    document.querySelector('[data-chat-running]')?.remove()
    conductor = new FlatRowConductor('detailed', document, window)
    conductor.start()
    expect(open('r1')).toBe(false)
  })
})
