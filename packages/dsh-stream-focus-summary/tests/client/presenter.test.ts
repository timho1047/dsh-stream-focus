// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhraseHit, PhraseQuery, SummaryReply, SummaryRequest } from '../../src/shared/protocol.ts'
import { SummaryPresenter, type SummaryPresenterApi } from '../../src/client/presenter.ts'
import { mountRows, thinkRowMarkup } from './fixture.ts'

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((settle, fail) => { resolve = settle; reject = fail })
  return { promise, resolve, reject }
}

function phraseFor(request: SummaryRequest): SummaryReply {
  return { key: `key:${request.mode}`, phrase: `Phrase ${request.mode}` }
}

function bench(options: {
  readonly locale?: () => string
  readonly sessionId?: string
  readonly unbound?: boolean
  readonly phrases?: (queries: readonly PhraseQuery[]) => Promise<readonly PhraseHit[]>
  readonly summarize?: (request: SummaryRequest, signal: AbortSignal) => Promise<SummaryReply>
} = {}) {
  const warnings: string[] = []
  const phrases = vi.fn<SummaryPresenterApi['phrases']>(async (queries) => options.phrases?.(queries) ?? [])
  const summarize = vi.fn<SummaryPresenterApi['summarize']>(
    options.summarize ?? (async (request: SummaryRequest) => phraseFor(request)),
  )
  const api: SummaryPresenterApi = { phrases, summarize }
  const presenter = new SummaryPresenter({
    document,
    api,
    activeLocale: options.locale ?? (() => 'en'),
    activeSessionId: () => options.unbound === true ? undefined : options.sessionId ?? 'session-1',
    styleText: '[data-dshsf-progress]{color:inherit}',
    onWarning: message => { warnings.push(message) },
  })
  return { presenter, api: { phrases, summarize }, warnings }
}

function titlePhrase(root: HTMLElement): string | null {
  return root.querySelector<HTMLElement>('[data-dshsf-phrase]')?.getAttribute('data-dshsf-phrase') ?? null
}

async function tick(): Promise<void> {
  await new Promise(resolve => { setTimeout(resolve, 0) })
  await Promise.resolve()
}

let presenter: SummaryPresenter | undefined

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  document.documentElement.lang = 'en'
})

afterEach(() => {
  presenter?.stop()
  presenter = undefined
  vi.restoreAllMocks()
})

describe('SummaryPresenter', () => {
  it('decorates a running row, shows a neutral placeholder, and cleans every attribute on stop', async () => {
    const [root] = mountRows([{ running: true, preview: 'First completed line' }])
    expect(root).toBeDefined()
    if (root === undefined) return
    const reply = deferred<SummaryReply>()
    const b = bench({ summarize: () => reply.promise })
    presenter = b.presenter
    const beforeChildren = root.children.length
    const beforeClass = root.className
    b.presenter.start()

    await vi.waitFor(() => {
      expect(b.api.summarize).toHaveBeenCalledTimes(1)
      expect(root.hasAttribute('data-dshsf-progress')).toBe(true)
      expect(root.hasAttribute('data-dshsf-pending')).toBe(true)
    })
    const request = b.api.summarize.mock.calls[0]?.[0]
    expect(request).toEqual({
      text: 'First completed line',
      mode: 'paragraph',
      locale: 'en',
      sessionId: 'session-1',
      anchor: { nodeKey: 'node-1', rowIndex: 0 },
    })
    expect(root.children.length).toBe(beforeChildren)
    expect(root.className).toBe(beforeClass)
    expect(root.hasAttribute('style')).toBe(false)
    expect(root.querySelector('[class*="separator"]')).not.toBeNull()
    expect(root.querySelector('[class*="summary"]')).not.toBeNull()

    reply.resolve({ key: 'k', phrase: '检查插槽定义' })
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('检查插槽定义') })
    expect(root.hasAttribute('data-dshsf-pending')).toBe(false)

    b.presenter.stop()
    presenter = undefined
    expect(root.hasAttribute('data-dshsf-progress')).toBe(false)
    expect(root.querySelector('[data-dshsf-phrase]')).toBeNull()
    expect(document.querySelector('style[data-plugin-css]')).toBeNull()
  })

  it('re-applies the phrase after React recreates the title without asking the Host again', async () => {
    const [root] = mountRows([{ running: true, preview: 'One' }])
    if (root === undefined) return
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Phrase paragraph') })
    const calls = b.api.summarize.mock.calls.length
    const title = root.querySelector<HTMLElement>('[class*="_title"]')
    title?.removeAttribute('data-dshsf-phrase')
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Phrase paragraph') })
    expect(b.api.summarize).toHaveBeenCalledTimes(calls)
  })

  it('omits sessionId from requests when the active Session is ambiguous or absent', async () => {
    const [root] = mountRows([{ running: true, preview: 'Unbound paragraph' }])
    if (root === undefined) return
    const b = bench({ unbound: true })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(b.api.summarize).toHaveBeenCalledTimes(1) })
    expect(b.api.summarize.mock.calls[0]?.[0]).toMatchObject({
      text: 'Unbound paragraph',
      mode: 'paragraph',
    })
    expect(b.api.summarize.mock.calls[0]?.[0]).not.toHaveProperty('sessionId')
  })

  it('hydrates a settled collapsed row through the preview anchor and does not generate', async () => {
    const [root] = mountRows([{ running: false, preview: 'Whole stretch first line' }])
    if (root === undefined) return
    const b = bench({
      phrases: async (queries) => queries.map(query => ({
        id: query.id,
        key: 'anchor-key',
        phrase: '旧的整段短语',
        locale: 'zh',
      })),
    })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('旧的整段短语') })
    expect(b.api.summarize).not.toHaveBeenCalled()
    const queries = b.api.phrases.mock.calls[0]?.[0]
    expect(queries).toHaveLength(1)
    expect(queries?.[0]).toMatchObject({
      text: 'Whole stretch first line',
      mode: 'segment',
      locale: 'en',
      sessionId: 'session-1',
      anchor: { nodeKey: 'node-1', rowIndex: 0 },
    })
  })

  it('defers segment generation when a settled row exposes no body and no running body was captured', async () => {
    const [root] = mountRows([{ running: false, preview: 'Only a preview line' }])
    if (root === undefined) return
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    await tick()
    await new Promise(resolve => { setTimeout(resolve, 200) })
    expect(b.api.phrases).toHaveBeenCalled()
    expect(b.api.summarize).not.toHaveBeenCalled()
    expect(root.hasAttribute('data-dshsf-progress')).toBe(false)
  })

  it('promotes a settled row to a whole-stretch phrase and ignores a late paragraph reply', async () => {
    const [root] = mountRows([{
      running: true,
      expanded: true,
      paragraphs: ['Completed paragraph', 'Streaming paragraph'],
    }])
    if (root === undefined) return
    const paragraph = deferred<SummaryReply>()
    const segment = deferred<SummaryReply>()
    const b = bench({
      summarize: (request) => request.mode === 'paragraph' ? paragraph.promise : segment.promise,
    })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(b.api.summarize).toHaveBeenCalledTimes(1) })
    expect(b.api.summarize.mock.calls[0]?.[0].text).toBe('Completed paragraph')

    // The product removes the body when the row settles; the presenter must
    // use the body captured while it was running.
    root.querySelector('[class*="thinkBody"]')?.remove()
    root.setAttribute('data-state', 'ok')
    await vi.waitFor(() => {
      expect(b.api.summarize).toHaveBeenCalledTimes(2)
      expect(b.api.summarize.mock.calls[1]?.[0].mode).toBe('segment')
    }, { timeout: 2_000 })
    expect(b.api.summarize.mock.calls[1]?.[0].text).toContain('Streaming paragraph')

    segment.resolve({ key: 'segment-key', phrase: 'Whole stretch' })
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Whole stretch') })
    paragraph.resolve({ key: 'paragraph-key', phrase: 'Late paragraph' })
    await tick()
    expect(titlePhrase(root)).toBe('Whole stretch')
  })

  it('drops a stale same-mode reply when a newer paragraph request owns the token', async () => {
    const [root] = mountRows([{
      running: true,
      expanded: true,
      paragraphs: ['One', 'Two'],
    }])
    if (root === undefined) return
    const first = deferred<SummaryReply>()
    const second = deferred<SummaryReply>()
    let calls = 0
    const b = bench({
      summarize: () => {
        calls += 1
        return calls === 1 ? first.promise : second.promise
      },
    })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(b.api.summarize).toHaveBeenCalledTimes(1) })

    root.querySelector('[class*="markdown"]')?.insertAdjacentHTML('beforeend', '<p>Three</p>')
    await vi.waitFor(() => {
      expect(b.api.summarize.mock.calls.length).toBe(2)
    }, { timeout: 2_000 })
    first.resolve({ key: 'old', phrase: 'Stale one' })
    await tick()
    expect(titlePhrase(root)).toBeNull()

    second.resolve({ key: 'new', phrase: 'Fresh two' })
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Fresh two') })
  })

  it('clears the placeholder and leaves the product preview when generation fails', async () => {
    const [root] = mountRows([{ running: true, preview: 'Product preview' }])
    if (root === undefined) return
    const failure = deferred<SummaryReply>()
    const b = bench({ summarize: () => failure.promise })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => {
      expect(root.hasAttribute('data-dshsf-progress')).toBe(true)
      expect(root.hasAttribute('data-dshsf-pending')).toBe(true)
    })
    failure.reject(new Error('transport down'))
    await vi.waitFor(() => {
      expect(root.hasAttribute('data-dshsf-progress')).toBe(false)
    })
    expect(root.hasAttribute('data-dshsf-pending')).toBe(false)
    expect(titlePhrase(root)).toBeNull()
    expect(b.warnings.some(message => message.includes('transport down'))).toBe(true)
  })

  it('lets a resumed row take over with a paragraph phrase', async () => {
    const [root] = mountRows([{
      running: true,
      expanded: true,
      paragraphs: ['One', 'Two'],
    }])
    if (root === undefined) return
    const b = bench({
      summarize: async (request) => ({
        key: request.mode,
        phrase: request.mode === 'segment' ? 'Whole' : `Paragraph: ${request.text}`,
      }),
    })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Paragraph: One') })

    root.setAttribute('data-state', 'ok')
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Whole') }, { timeout: 2_000 })

    root.querySelector('[class*="markdown"]')?.insertAdjacentHTML('beforeend', '<p>Three</p>')
    root.setAttribute('data-state', 'running')
    await vi.waitFor(() => {
      expect(b.api.summarize.mock.calls.at(-1)?.[0]).toMatchObject({ mode: 'paragraph', text: 'Two' })
      expect(titlePhrase(root)).toBe('Paragraph: Two')
    }, { timeout: 2_000 })
  })

  it('keeps a finished phrase across a locale switch and sends the new locale for a new paragraph', async () => {
    let locale = 'en'
    const [root] = mountRows([{
      running: true,
      expanded: true,
      paragraphs: ['First paragraph', 'Second paragraph'],
    }])
    if (root === undefined) return
    const b = bench({
      locale: () => locale,
      summarize: async (request) => ({ key: request.mode, phrase: `${request.locale}:${request.mode}:${request.text}` }),
    })
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('en:paragraph:First paragraph') })

    locale = 'zh'
    await new Promise(resolve => { setTimeout(resolve, 150) })
    expect(titlePhrase(root)).toBe('en:paragraph:First paragraph')

    root.querySelector('[class*="markdown"]')?.insertAdjacentHTML('beforeend', '<p>Third paragraph</p>')
    await vi.waitFor(() => {
      expect(b.api.summarize.mock.calls.at(-1)?.[0]).toMatchObject({ locale: 'zh', text: 'Second paragraph' })
      expect(titlePhrase(root)).toBe('zh:paragraph:Second paragraph')
    }, { timeout: 2_000 })
  })

  it('skips legacy-decorated rows and warns once', async () => {
    mountRows([
      { running: true, preview: 'Legacy one', legacy: true },
      { running: true, preview: 'Legacy two', legacy: true },
    ])
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    await new Promise(resolve => { setTimeout(resolve, 250) })
    expect(b.api.phrases).not.toHaveBeenCalled()
    expect(b.api.summarize).not.toHaveBeenCalled()
    expect(b.warnings.filter(message => message.includes('legacy'))).toHaveLength(1)
  })

  it('removes decoration and stops requests when data-dtp appears late', async () => {
    const [root] = mountRows([{ running: true, preview: 'First' }])
    if (root === undefined) return
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Phrase paragraph') })
    const calls = b.api.summarize.mock.calls.length

    root.setAttribute('data-dtp', '')
    await vi.waitFor(() => {
      expect(root.hasAttribute('data-dshsf-progress')).toBe(false)
      expect(root.querySelector('[data-dshsf-phrase]')).toBeNull()
    })

    const preview = root.querySelector<HTMLElement>('[class*="summaryText"]')
    if (preview !== null) preview.textContent = 'Changed'
    await new Promise(resolve => { setTimeout(resolve, 250) })
    expect(b.api.summarize).toHaveBeenCalledTimes(calls)
  })

  it('restores a phrase through Host hydration after remount and keeps no browser cache', async () => {
    const [root] = mountRows([{ running: false, preview: 'Restored line', expanded: false }])
    if (root === undefined) return
    const first = bench()
    presenter = first.presenter
    first.presenter.start()
    await vi.waitFor(() => { expect(first.api.phrases).toHaveBeenCalled() })
    first.presenter.stop()
    presenter = undefined
    expect(localStorage.length).toBe(0)

    const second = bench({
      phrases: async (queries) => queries.map(query => ({
        id: query.id, key: 'k', phrase: 'Restored phrase', locale: 'zh',
      })),
    })
    presenter = second.presenter
    second.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).toBe('Restored phrase') })
    expect(second.api.summarize).not.toHaveBeenCalled()
    expect(localStorage.length).toBe(0)
  })

  it('waits for a settled historical row to approach the viewport before generating', async () => {
    const [root] = mountRows([{ running: false, expanded: true, paragraphs: ['Historical body'] }])
    if (root === undefined) return
    Object.defineProperty(root, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 2_000, bottom: 2_100, left: 0, right: 100, width: 100, height: 100 } as DOMRect),
    })
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(b.api.phrases).toHaveBeenCalled() })
    expect(b.api.summarize).not.toHaveBeenCalled()

    Object.defineProperty(root, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100 } as DOMRect),
    })
    window.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      expect(b.api.summarize).toHaveBeenCalledTimes(1)
      expect(b.api.summarize.mock.calls[0]?.[0].mode).toBe('segment')
    }, { timeout: 2_000 })
  })

  it('does not write a reusable cache to localStorage', async () => {
    const [root] = mountRows([{ running: true, preview: 'No cache' }])
    if (root === undefined) return
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    await vi.waitFor(() => { expect(titlePhrase(root)).not.toBeNull() })
    expect(localStorage.length).toBe(0)
    expect(root.hasAttribute('data-dshsf-progress')).toBe(true)
  })

  it('reuses the product node through the adapter without replacing its markup', () => {
    const markup = thinkRowMarkup({ running: true, preview: 'Untouched' })
    document.body.innerHTML = markup
    const before = document.body.innerHTML
    const b = bench()
    presenter = b.presenter
    b.presenter.start()
    b.presenter.stop()
    expect(document.body.innerHTML).toBe(before)
  })
})
