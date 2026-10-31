// @vitest-environment jsdom
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../../src/client/index.ts'

interface RegisteredSlot {
  readonly options: Record<string, unknown>
  readonly component: unknown
}

function createContext() {
  const cleanups: Array<() => void> = []
  const registered: RegisteredSlot[] = []
  const dictionaries: Array<{ ns: string; locale: string; dict: Record<string, string> }> = []
  const row = document.createElement('div')
  row.setAttribute('data-variant', 'think')
  row.setAttribute('data-state', 'ok')
  row.innerHTML = '<span class="x_title">Think</span><span class="x_summaryText">Line</span>'
  const owner = document.createElement('div')
  owner.setAttribute('data-chat-node-key', 'node-1')
  owner.append(row)
  document.body.append(owner)

  const connection = {
    rpc: {
      call: vi.fn(async (_channel, endpoint: string) => ({
        ok: true,
        value: endpoint.endsWith('/phrases') ? [] : { key: 'k', phrase: 'p' },
      })),
    },
  }
  const sessions = {
    list: {
      getSnapshot: () => ({
        ids: ['session-1'],
        byId: { 'session-1': { retainedBy: { mainView: 1 } } },
      }),
      subscribe: () => () => {},
    },
  }
  const locale = {
    register: (ns: string, language: string, dict: Record<string, string>) => {
      dictionaries.push({ ns, locale: language, dict })
      return () => {}
    },
    bind: () => (key: string) => key,
    getSnapshot: () => ({ active: 'en', locales: [], revision: 0 }),
    subscribe: () => () => {},
    resolveText: (text: string | { readonly en: string }) => typeof text === 'string' ? text : text.en,
  }
  const remote = {
    $on: () => () => {},
    session: { modelCatalog: async () => ({ ok: true, value: { groups: [], failures: [] } }) },
  }
  const slots = {
    inject: (_name: string, contribution: () => unknown) => { contribution() },
    register: (options: Record<string, unknown>, component: unknown) => {
      registered.push({ options, component })
      return () => {}
    },
  }
  const context = {
    effect: (callback: () => unknown) => {
      const result = callback()
      if (typeof result === 'function') cleanups.push(result as () => void)
      else if (Array.isArray(result)) cleanups.push(...result as Array<() => void>)
      return () => {}
    },
    get: (name: string) => name === 'connection' ? connection : name === 'sessions' ? sessions : undefined,
    on: () => () => {},
    locale,
    remote,
    slots,
  }
  return {
    ctx: context as unknown as ClientContext,
    cleanups,
    registered,
    dictionaries,
    connection,
    sessions,
  }
}

let liveCleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of liveCleanups) cleanup()
  liveCleanups = []
  document.body.innerHTML = ''
  document.head.querySelectorAll('style[data-plugin-css]').forEach(style => { style.remove() })
})

describe('summary browser entry', () => {
  it('declares the required services and registers the keyed row configuration', () => {
    const fake = createContext()
    apply(fake.ctx)
    liveCleanups = fake.cleanups
    expect(inject).toEqual(['connection', 'sessions', 'locale', 'slots', 'remote', 'remote.session'])
    expect(fake.dictionaries.map(entry => entry.locale).sort()).toEqual(['en', 'zh'])
    expect(fake.dictionaries.every(entry => entry.ns === 'streamFocusSummary')).toBe(true)
    expect(fake.registered).toHaveLength(1)
    expect(fake.registered[0]?.options).toMatchObject({
      name: 'plugins.row.config',
      key: 'dsh-stream-focus#dsh-stream-focus-summary',
    })
    expect(typeof fake.registered[0]?.component).toBe('function')
    const injected = (fake.registered[0]?.options.inject as () => Record<string, unknown>)()
    expect(typeof injected.t).toBe('function')
    expect(injected.activeSessionId).toBeTypeOf('function')
    expect((injected.activeSessionId as () => string | undefined)()).toBe('session-1')
  })

  it('starts the presenter inside an effect and removes its stylesheet on cleanup', () => {
    const fake = createContext()
    apply(fake.ctx)
    liveCleanups = fake.cleanups
    expect(document.head.querySelector('style[data-plugin-css="dsh-stream-focus-summary/progress"]')).not.toBeNull()
    for (const cleanup of fake.cleanups) cleanup()
    liveCleanups = []
    expect(document.head.querySelector('style[data-plugin-css="dsh-stream-focus-summary/progress"]')).toBeNull()
  })
})
