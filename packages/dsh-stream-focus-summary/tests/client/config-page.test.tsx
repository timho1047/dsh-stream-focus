// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react'
import React, { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ModelCatalog, SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ConfigPageForm } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { SummaryModelStatus } from '../../src/shared/protocol.ts'
import { SummaryConfigPage, type SummaryConfigPageProps } from '../../src/client/config-page.tsx'
import { en, type SummaryLocaleKey } from '../../src/client/locales.ts'

const roots: Root[] = []

function renderPage(element: ReactElement): { rerender: (next: ReactElement) => void } {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  act(() => { root.render(element) })
  return {
    rerender: (next: ReactElement) => { act(() => { root.render(next) }) },
  }
}

function clickElement(element: Element): void {
  act(() => { (element as HTMLElement).click() })
}

function changeInput(element: Element, value: string): void {
  if (!(element instanceof HTMLInputElement)) throw new Error('expected an input')
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function pressKey(element: Element, key: string): void {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  })
}

function unmountAll(): void {
  act(() => { for (const root of roots) root.unmount() })
  roots.length = 0
  document.body.innerHTML = ''
}

const CATALOG: ModelCatalog = {
  default: { provider: 'deepseek-official', model: 'v4-flash' },
  routableProviders: ['deepseek-official', 'external'],
  groups: [
    {
      id: 'deepseek-official',
      name: 'DeepSeek',
      models: [
        {
          id: 'v4-flash',
          name: 'DeepSeek V4 Flash',
          badge: { text: { en: 'Fast', zh: '快速' }, tone: 'info' },
        },
        { id: 'v4-pro', name: 'DeepSeek V4 Pro' },
      ],
    },
    {
      id: 'external',
      name: 'External Provider',
      models: [{ id: 'external-one', name: 'External One' }],
    },
  ],
  failures: [],
}

const STATUS: SummaryModelStatus = {
  active: { provider: 'deepseek-official', model: 'v4-flash' },
  activeSource: 'session',
  override: null,
  effective: { provider: 'deepseek-official', model: 'v4-flash' },
}

function translate(key: SummaryLocaleKey, params: Record<string, unknown> = {}): string {
  return en[key].replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
}

function snapshot(
  value: Record<string, unknown>,
  overrides: Partial<ConfigFormSnapshot<Record<string, unknown>>> = {},
): ConfigFormSnapshot<Record<string, unknown>> {
  return {
    status: 'ready',
    value,
    base: undefined,
    user: undefined,
    revision: 3,
    writable: true,
    ...overrides,
  }
}

type Mutate = ConfigPageForm['mutate']

function pageProps(options: {
  value?: Record<string, unknown>
  formState?: ConfigFormSnapshot<Record<string, unknown>>
  view?: 'page' | 'summary'
  catalog?: () => Promise<ModelCatalog>
  status?: () => Promise<SummaryModelStatus>
  mutate?: (ops: readonly SettingsPathOpView[], revision?: number) => Promise<boolean>
  activeSessionId?: () => string | undefined
  subscribeModelUpdates?: (listener: () => void) => () => void
} = {}): SummaryConfigPageProps {
  const state = options.formState ?? snapshot(options.value ?? { maxChars: 30, maxTokens: 800 })
  const form: ConfigPageForm = {
    state,
    mutate: options.mutate ?? vi.fn<Mutate>(async () => true),
  }
  return {
    view: options.view ?? 'page',
    form,
    t: translate,
    loadCatalog: options.catalog ?? vi.fn(async () => CATALOG),
    loadStatus: options.status ?? vi.fn(async () => STATUS),
    activeSessionId: options.activeSessionId ?? (() => 'session-1'),
    subscribeActiveSession: () => () => {},
    subscribeModelUpdates: options.subscribeModelUpdates ?? (() => () => {}),
    subscribeLocale: () => () => {},
    resolveText: text => typeof text === 'string' ? text : text.en,
  }
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => { unmountAll() })

describe('SummaryConfigPage', () => {
  it('shows the active source, effective route, and localizes the limits section', async () => {
    renderPage(<SummaryConfigPage {...pageProps()} />)
    await screen.findByText('Current Session model')
    expect(screen.getByText('Current status')).toBeTruthy()
    expect(screen.getByText('Current Session model')).toBeTruthy()
    expect(screen.getByText('Effective')).toBeTruthy()
    expect(screen.getByText('Limits')).toBeTruthy()
    expect(screen.queryByText('Summary model')).toBeTruthy()
    expect(screen.queryByText('No active Session; showing the deployment default model.')).toBeNull()
  })

  it('saves numeric fields and a complete model override atomically', async () => {
    const mutate = vi.fn<Mutate>(async () => true)
    renderPage(<SummaryConfigPage {...pageProps({ mutate })} />)
    await screen.findByText('Current Session model')

    changeInput(screen.getByLabelText(/Maximum characters/), '40')
    changeInput(screen.getByLabelText(/Maximum tokens/), '1000')
    clickElement(screen.getByLabelText(/Use a specific model/))
    clickElement(screen.getByRole('button', { name: /Choose model/ }))
    const search = screen.getByRole('combobox', { name: 'Search models or providers' })
    changeInput(search, 'pro')
    clickElement(screen.getByRole('option', { name: /DeepSeek V4 Pro/ }))
    clickElement(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => { expect(mutate).toHaveBeenCalledTimes(1) })
    expect(mutate.mock.calls[0]?.[0]).toEqual([
      { op: 'set', path: ['maxChars'], value: 40 },
      { op: 'set', path: ['maxTokens'], value: 1000 },
      { op: 'set', path: ['modelOverride'], value: { provider: 'deepseek-official', model: 'v4-pro' } },
    ])
  })

  it('clears an override with an atomic unset when following the Session model', async () => {
    const mutate = vi.fn<Mutate>(async () => true)
    renderPage(<SummaryConfigPage {...pageProps({
      value: {
        maxChars: 30,
        maxTokens: 800,
        modelOverride: { provider: 'deepseek-official', model: 'v4-pro' },
      },
      mutate,
    })} />)
    await screen.findAllByText(/v4-pro/)
    clickElement(screen.getByLabelText(/Follow the current Session model/))
    clickElement(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => { expect(mutate).toHaveBeenCalledTimes(1) })
    expect(mutate.mock.calls[0]?.[0]).toEqual([
      { op: 'set', path: ['maxChars'], value: 30 },
      { op: 'set', path: ['maxTokens'], value: 800 },
      { op: 'unset', path: ['modelOverride'] },
    ])
  })

  it('treats a partial Host override as invalid and cannot save it', async () => {
    const mutate = vi.fn(async () => true)
    renderPage(<SummaryConfigPage {...pageProps({
      value: { maxChars: 30, maxTokens: 800, modelOverride: { provider: 'deepseek-official' } },
      mutate,
    })} />)
    await screen.findByText('Current status')
    expect((screen.getByLabelText(/Use a specific model/) as HTMLInputElement).checked).toBe(true)
    changeInput(screen.getByLabelText(/Maximum characters/), '35')
    expect(screen.getByRole('alert').textContent).toContain('Choose a complete provider and model')
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('keeps save possible when the catalogue fails and retries the load', async () => {
    const catalog = vi.fn()
      .mockRejectedValueOnce(new Error('catalogue offline'))
      .mockResolvedValueOnce(CATALOG)
    const mutate = vi.fn(async () => true)
    renderPage(<SummaryConfigPage {...pageProps({ catalog, mutate })} />)
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('The model catalogue could not be loaded')
    changeInput(screen.getByLabelText(/Maximum characters/), '35')
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false)
    clickElement(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => { expect(catalog).toHaveBeenCalledTimes(2) })
  })

  it('warns about a selected route missing from the catalogue but still saves it', async () => {
    const mutate = vi.fn(async () => true)
    renderPage(<SummaryConfigPage {...pageProps({
      value: {
        maxChars: 30,
        maxTokens: 800,
        modelOverride: { provider: 'retired-provider', model: 'retired-model' },
      },
      mutate,
    })} />)
    await screen.findAllByText('retired-provider/retired-model')
    expect(screen.getByRole('alert').textContent).toContain('not in the current catalogue')
    changeInput(screen.getByLabelText(/Maximum tokens/), '900')
    clickElement(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => { expect(mutate).toHaveBeenCalledTimes(1) })
  })

  it('shows the latest runtime fallback and an unavailable-model error', async () => {
    const fallback: SummaryModelStatus = {
      ...STATUS,
      lastFallback: {
        at: Date.UTC(2026, 9, 31, 6, 0, 0),
        from: { provider: 'deepseek-official', model: 'removed-model' },
        to: { provider: 'deepseek-official', model: 'v4-flash' },
        reason: 'UNKNOWN_MODEL',
      },
    }
    renderPage(<SummaryConfigPage {...pageProps({ status: async () => fallback })} />)
    await screen.findByText(/fell back from deepseek-official\/removed-model/)
    expect(screen.getByRole('alert').textContent).toContain('UNKNOWN_MODEL')
  })

  it('keeps an in-progress draft across a catalogue refresh', async () => {
    let refresh: (() => void) | undefined
    const catalog = vi.fn(async () => CATALOG)
    renderPage(<SummaryConfigPage {...pageProps({
      catalog,
      subscribeModelUpdates: (listener) => { refresh = listener; return () => {} },
    })} />)
    await screen.findByText('Current Session model')
    await waitFor(() => { expect(catalog).toHaveBeenCalledTimes(1) })
    changeInput(screen.getByLabelText(/Maximum characters/), '42')
    act(() => { refresh?.() })
    await waitFor(() => { expect(catalog).toHaveBeenCalledTimes(2) })
    expect((screen.getByLabelText(/Maximum characters/) as HTMLInputElement).value).toBe('42')
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('validates the numeric bounds before enabling save', async () => {
    renderPage(<SummaryConfigPage {...pageProps()} />)
    await screen.findByText('Current status')
    const chars = screen.getByLabelText(/Maximum characters/)
    changeInput(chars, '9')
    expect(screen.getByText('Enter a whole number from 10 to 80.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
    changeInput(chars, '10')
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false)

    const tokens = screen.getByLabelText(/Maximum tokens/)
    changeInput(tokens, '255')
    expect(screen.getByText('Enter a whole number from 256 to 4,000.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
    changeInput(tokens, '4000')
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows provider failures with a retry control inside the selector', async () => {
    const catalog: ModelCatalog = {
      ...CATALOG,
      groups: [],
      failures: [{ id: 'external', name: 'External Provider', message: 'provider offline' }],
    }
    const loadCatalog = vi.fn(async () => catalog)
    renderPage(<SummaryConfigPage {...pageProps({ catalog: loadCatalog })} />)
    await screen.findByText('Current status')
    clickElement(screen.getByLabelText(/Use a specific model/))
    clickElement(screen.getByRole('button', { name: /Choose model/ }))
    await screen.findByText(/Could not load models for External Provider: provider offline/)
    clickElement(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => { expect(loadCatalog).toHaveBeenCalledTimes(2) })
  })

  it('labels an unbound Session as showing the deployment default model', async () => {
    renderPage(<SummaryConfigPage {...pageProps({
      activeSessionId: () => undefined,
      status: async () => ({
        active: { provider: 'deepseek-official', model: 'v4-flash' },
        activeSource: 'default',
        override: null,
        effective: { provider: 'deepseek-official', model: 'v4-flash' },
      }),
    })} />)
    await screen.findByText('No active Session; showing the deployment default model.')
    expect(screen.getByText('Deployment default model')).toBeTruthy()
  })

  it('reports when no model is available for summaries', async () => {
    renderPage(<SummaryConfigPage {...pageProps({
      status: async () => ({ active: null, activeSource: 'none', override: null, effective: null }),
    })} />)
    await screen.findByText(/No summary model is available/)
  })

  it('supports keyboard search, arrow navigation, Enter, and Escape in the picker', async () => {
    renderPage(<SummaryConfigPage {...pageProps()} />)
    await screen.findByText('Current Session model')
    clickElement(screen.getByLabelText(/Use a specific model/))
    clickElement(screen.getByRole('button', { name: /Choose model/ }))
    const search = await screen.findByRole('combobox', { name: 'Search models or providers' })
    changeInput(search, 'deepseek')
    expect(await screen.findByRole('option', { name: /DeepSeek V4 Flash/ })).toBeTruthy()
    pressKey(search, 'ArrowDown')
    pressKey(search, 'Enter')
    await waitFor(() => {
      expect(screen.queryByRole('combobox', { name: 'Search models or providers' })).toBeNull()
    })
    expect(screen.getByRole('button', { name: /Change model/ })).toBeTruthy()

    clickElement(screen.getByRole('button', { name: /Change model/ }))
    pressKey(screen.getByRole('combobox'), 'Escape')
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('reports Host rejection, conflict, and transport failure states', async () => {
    const pending = deferred<boolean>()
    const formState = snapshot({ maxChars: 30, maxTokens: 800 })
    const mutate = vi.fn(() => pending.promise)
    const first = pageProps({ formState, mutate })
    const view = renderPage(<SummaryConfigPage {...first} />)
    await screen.findByText('Current status')
    changeInput(screen.getByLabelText(/Maximum characters/), '31')
    clickElement(screen.getByRole('button', { name: 'Save' }))
    view.rerender(<SummaryConfigPage {...pageProps({
      formState: snapshot({ maxChars: 30, maxTokens: 800 }, { revision: 4 }),
      mutate,
    })} />)
    pending.resolve(false)
    await screen.findByText(/Configuration changed while this page was open/)

    const rejectedMutate = vi.fn<Mutate>(async () => false)
    unmountAll()
    renderPage(<SummaryConfigPage {...pageProps({ mutate: rejectedMutate })} />)
    await screen.findByText('Current status')
    changeInput(screen.getByLabelText(/Maximum characters/), '32')
    clickElement(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('The Host did not accept these values.')

    unmountAll()
    const failedNotify = vi.fn<Mutate>(async () => { throw new Error('transport down') })
    renderPage(<SummaryConfigPage {...pageProps({ mutate: failedNotify })} />)
    await screen.findByText('Current status')
    changeInput(screen.getByLabelText(/Maximum characters/), '33')
    clickElement(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Could not save the configuration.')
  })

  it('renders a concise summary view', () => {
    renderPage(<SummaryConfigPage {...pageProps({
      view: 'summary',
      value: {
        maxChars: 30,
        maxTokens: 800,
        modelOverride: { provider: 'deepseek-official', model: 'v4-pro' },
      },
    })} />)
    expect(screen.getByText('Progress phrases use deepseek-official/v4-pro.')).toBeTruthy()
  })
})

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => { resolve = settle })
  return { promise, resolve }
}
