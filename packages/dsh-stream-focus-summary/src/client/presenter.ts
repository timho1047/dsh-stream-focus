/** Compose row discovery, scheduling, Host hydration, and CSS-only painting. */
import type {
  PhraseHit,
  PhraseQuery,
  SummaryReply,
  SummaryRequest,
} from '../shared/protocol.ts'
import {
  limitSegment,
  readThinkRow,
  thinkRows,
  titleOf,
  type ThinkRowSnapshot,
} from './adapter.ts'
import { clearRow, paintPending, paintPhrase } from './painter.ts'
import { SummaryQueue, type SummaryQueueJob } from './queue.ts'
import { PROGRESS_STYLE } from './progress-style.ts'

const SCAN_MS = 120
const VIEWPORT_MARGIN = 200
const HYDRATION_BATCH = 24
const STYLE_ID = 'dsh-stream-focus-summary/progress'

/** Host calls used by the presenter. */
export interface SummaryPresenterApi {
  summarize(request: SummaryRequest, signal: AbortSignal): Promise<SummaryReply>
  phrases(queries: readonly PhraseQuery[], signal: AbortSignal): Promise<readonly PhraseHit[]>
}

/** Dependencies and diagnostics for one presenter lifetime. */
export interface SummaryPresenterOptions {
  readonly document: Document
  readonly api: SummaryPresenterApi
  /** Active DSH locale; the presenter falls back to `<html lang>` then `zh-CN`. */
  readonly activeLocale: () => string
  /** Unambiguous main-view Session identity, when one exists. */
  readonly activeSessionId: () => string | undefined
  /** Diagnostic sink; defaults to `console.warn`. */
  readonly onWarning?: (message: string) => void
  /** Inline stylesheet; tests may supply an empty string. */
  readonly styleText?: string
  /** Clock override for scan throttling and queue spacing. */
  readonly now?: () => number
}

type RowPhase = 'running' | 'settled'
type RowRank = 0 | 1 | 2

interface RowState {
  phase: RowPhase
  epoch: number
  rank: RowRank
  phrase: string
  paintedPhrase: string
  paintedPending: boolean
  paintedTitle: HTMLElement | null
  capturedBody: string
  hydrated: boolean
  hydrating: boolean
  hydrationRetryAt: number
  paragraphAttempt: string
  segmentAttempt: string
  pendingModes: Set<'paragraph' | 'segment'>
  tokens: Record<'paragraph' | 'segment', number>
  inViewport: boolean
  observed: boolean
  legacy: boolean
}

interface HydrationEntry {
  readonly root: HTMLElement
  readonly query: PhraseQuery
  readonly state: RowState
  readonly epoch: number
}

/**
 * Observes product reasoning rows and decorates them with Host phrases. The
 * presenter owns no reusable phrase cache: row state exists only while that
 * DOM row exists, and every fresh row restores its phrase through `phrases()`.
 */
export class SummaryPresenter {
  private readonly queue: SummaryQueue<SummaryReply>
  private readonly styleText: string
  private readonly onWarning: (message: string) => void
  private readonly now: () => number
  private rows = new WeakMap<HTMLElement, RowState>()
  private observer: MutationObserver | null = null
  private viewportObserver: IntersectionObserver | null = null
  private styleElement: HTMLStyleElement | null = null
  private scrollView: Window | null = null
  private scanTimer: ReturnType<typeof setTimeout> | null = null
  private hydrationTimer: ReturnType<typeof setTimeout> | null = null
  private hydrationController: AbortController | null = null
  private hydrationEntries = new Map<number, HydrationEntry>()
  private hydrationId = 0
  private viewportPoll: ReturnType<typeof setInterval> | null = null
  private readonly dirtyRows = new Set<HTMLElement>()
  private scanAll = true
  private lastScanAt = Number.NEGATIVE_INFINITY
  private started = false
  private legacyWarned = false
  private domWarned = false

  /**
   * @param options - document, Host calls, active identity reads, and diagnostics.
   */
  constructor(private readonly options: SummaryPresenterOptions) {
    this.styleText = options.styleText ?? PROGRESS_STYLE
    this.onWarning = options.onWarning ?? (message => { console.warn(message) })
    this.now = options.now ?? Date.now
    this.queue = new SummaryQueue<SummaryReply>({
      run: (job, signal) => this.options.api.summarize(job.request, signal),
      onSuccess: (job, reply) => { this.accept(job, reply) },
      onError: (job, error) => { this.fail(job, error) },
      now: this.now,
    })
  }

  /** Start observation, install the owned stylesheet, and scan current rows. */
  start(): void {
    if (this.started) return
    this.started = true
    this.queue.restart()
    this.scanAll = true
    this.dirtyRows.clear()
    this.installStyle()
    this.attachViewportObserver()
    const body = this.options.document.body
    if (body !== null && typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver(records => { this.handleMutations(records) })
      this.observer.observe(body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['data-state', 'data-dtp', 'data-dshsf-progress', 'data-dshsf-phrase', 'data-dshsf-pending'],
      })
    }
    this.scan()
  }

  /** Disconnect every observer, cancel timers and requests, and remove decoration. */
  stop(): void {
    if (!this.started) return
    this.started = false
    this.observer?.disconnect()
    this.observer = null
    this.viewportObserver?.disconnect()
    this.viewportObserver = null
    if (this.viewportPoll !== null) clearInterval(this.viewportPoll)
    this.viewportPoll = null
    if (this.scrollView !== null) {
      this.scrollView.removeEventListener('scroll', this.handleScroll, { capture: true })
      this.scrollView = null
    }
    if (this.scanTimer !== null) clearTimeout(this.scanTimer)
    this.scanTimer = null
    if (this.hydrationTimer !== null) clearTimeout(this.hydrationTimer)
    this.hydrationTimer = null
    this.hydrationController?.abort()
    this.hydrationController = null
    this.hydrationEntries.clear()
    this.queue.clear()
    this.dirtyRows.clear()
    this.scanAll = true
    this.styleElement?.remove()
    this.styleElement = null
    for (const root of thinkRows(this.options.document)) clearRow(root)
    this.rows = new WeakMap()
  }

  private installStyle(): void {
    const doc = this.options.document
    if (doc.head === null || this.styleText === '') return
    const existing = doc.head.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)
    if (existing !== null) return
    const style = doc.createElement('style')
    style.dataset.pluginCss = STYLE_ID
    style.textContent = this.styleText
    doc.head.appendChild(style)
    this.styleElement = style
  }

  private attachViewportObserver(): void {
    const view = this.options.document.defaultView
    if (view === null) return
    this.scrollView = view
    view.addEventListener('scroll', this.handleScroll, { passive: true, capture: true })
    const Observer = view.IntersectionObserver
    if (Observer === undefined) {
      // Without IntersectionObserver, a bounded poll catches historical rows
      // that entered the viewport after their first scan. It never changes
      // scroll position or owns a scroll gesture.
      this.viewportPoll = setInterval(() => { this.pollViewport() }, 1_000)
      return
    }
    this.viewportObserver = new Observer(entries => {
      let visible = false
      for (const entry of entries) {
        const root = entry.target as HTMLElement
        const state = this.rows.get(root)
        if (state === undefined) continue
        state.inViewport = entry.isIntersecting
        if (entry.isIntersecting) visible = true
      }
      if (visible) this.scheduleScan(true)
    })
  }

  private readonly handleScroll = (): void => {
    this.scanAll = true
    this.scheduleScan()
  }

  private scan(): void {
    if (!this.started) return
    const targets = this.scanAll ? thinkRows(this.options.document) : [...this.dirtyRows]
    this.scanAll = false
    this.dirtyRows.clear()
    this.lastScanAt = this.now()
    for (const root of targets) {
      if (!root.isConnected) continue
      try {
        this.scanRow(root)
      } catch (error) {
        this.warn(`[stream-focus-summary] row scan failed: ${String(error)}`)
      }
    }
  }

  private scanRow(root: HTMLElement): void {
    const existing = this.rows.get(root)
    if (root.hasAttribute('data-dtp')) {
      if (existing === undefined) {
        this.warnLegacyOnce()
        return
      }
      if (!existing.legacy) this.blockLegacy(root, existing)
      return
    }
    const snapshot = readThinkRow(root)
    if (snapshot === undefined) {
      this.warnDomOnce()
      return
    }
    const state = existing ?? this.createState(snapshot)
    if (existing === undefined) this.rows.set(root, state)
    if (state.legacy) return

    const phase: RowPhase = snapshot.running ? 'running' : 'settled'
    if (state.phase !== phase) this.transition(root, state, phase)
    if (snapshot.running && snapshot.bodyText !== '') state.capturedBody = limitSegment(snapshot.bodyText)
    this.repaint(root, state)

    if (!state.hydrated) {
      if (state.hydrating) return
      if (state.hydrationRetryAt <= this.now() && this.queueHydration(root, state, snapshot)) return
    }
    this.requestForRow(root, state, snapshot)
  }

  private createState(snapshot: ThinkRowSnapshot): RowState {
    const state: RowState = {
      phase: snapshot.running ? 'running' : 'settled',
      epoch: 0,
      rank: 0,
      phrase: '',
      paintedPhrase: '',
      paintedPending: false,
      paintedTitle: null,
      capturedBody: '',
      hydrated: false,
      hydrating: false,
      hydrationRetryAt: 0,
      paragraphAttempt: '',
      segmentAttempt: '',
      pendingModes: new Set(),
      tokens: { paragraph: 0, segment: 0 },
      inViewport: this.isNearViewport(snapshot.element),
      observed: false,
      legacy: false,
    }
    if (!snapshot.running && !state.inViewport) this.observeViewport(snapshot.element, state)
    return state
  }

  private transition(root: HTMLElement, state: RowState, phase: RowPhase): void {
    state.phase = phase
    state.epoch += 1
    this.queue.abortRow(root)
    state.pendingModes.clear()
    state.tokens.paragraph = 0
    state.tokens.segment = 0
    if (phase === 'running') {
      // A resumed row returns to paragraph rank; the previous whole-stretch
      // phrase stays visible until the new paragraph arrives.
      state.rank = state.phrase === '' ? 0 : 1
      state.segmentAttempt = ''
    } else if (state.rank < 2) {
      state.segmentAttempt = ''
    }
  }

  private repaint(root: HTMLElement, state: RowState): void {
    const title = titleOf(root)
    const pending = state.phrase === '' && state.pendingModes.size > 0
    const phraseAttribute = state.phrase === '' ? null : title?.getAttribute('data-dshsf-phrase')
    if (title !== undefined && title === state.paintedTitle
      && state.paintedPhrase === state.phrase
      && state.paintedPending === pending
      && (state.phrase === '' || phraseAttribute === state.phrase)) return

    if (state.phrase !== '') {
      if (paintPhrase(root, state.phrase)) {
        state.paintedPhrase = state.phrase
        state.paintedPending = false
        state.paintedTitle = titleOf(root) ?? null
      }
      return
    }
    if (pending) {
      if (paintPending(root)) {
        state.paintedPhrase = ''
        state.paintedPending = true
        state.paintedTitle = titleOf(root) ?? null
      }
      return
    }
    clearRow(root)
    state.paintedPhrase = ''
    state.paintedPending = false
    state.paintedTitle = title ?? null
  }

  private requestForRow(root: HTMLElement, state: RowState, snapshot: ThinkRowSnapshot): void {
    if (snapshot.running) {
      const text = snapshot.paragraphText
      if (text === '' || state.paragraphAttempt === text) return
      state.paragraphAttempt = text
      this.enqueue(root, state, snapshot, 'paragraph', text, 'active')
      return
    }
    const segment = state.capturedBody !== '' ? state.capturedBody : snapshot.bodyText
    if (segment === '') {
      if (!state.observed) this.observeViewport(root, state)
      return
    }
    if (state.rank >= 2 && state.phrase !== '') return
    state.inViewport = this.isNearViewport(root)
    if (!state.inViewport) {
      this.observeViewport(root, state)
      return
    }
    const text = limitSegment(segment)
    if (text === '' || state.segmentAttempt === text) return
    state.segmentAttempt = text
    this.enqueue(root, state, snapshot, 'segment', text, 'historical')
  }

  private enqueue(
    root: HTMLElement,
    state: RowState,
    snapshot: ThinkRowSnapshot,
    mode: 'paragraph' | 'segment',
    text: string,
    priority: 'active' | 'historical',
  ): void {
    const sessionId = this.options.activeSessionId()
    const request: SummaryRequest = {
      text,
      mode,
      locale: this.currentLocale(),
      ...sessionId === undefined ? {} : { sessionId },
      ...snapshot.anchor === undefined ? {} : { anchor: snapshot.anchor },
    }
    state.tokens[mode] = this.queue.enqueue({
      row: root,
      epoch: state.epoch,
      priority,
      request,
    })
    state.pendingModes.add(mode)
    if (state.phrase === '') this.repaint(root, state)
  }

  private accept(job: SummaryQueueJob, reply: SummaryReply): void {
    if (!this.started || !job.row.isConnected) return
    const state = this.rows.get(job.row)
    if (state === undefined || state.legacy || state.epoch !== job.epoch) return
    const mode = job.request.mode
    if (state.tokens[mode] !== job.token) return
    if (reply.phrase.trim() === '') {
      this.fail(job, new Error('empty summary reply'))
      return
    }
    if (mode === 'paragraph') {
      if (state.phase !== 'running' || state.rank >= 2) return
      state.rank = state.rank >= 1 ? state.rank : 1
      // A later settlement must be allowed to request the whole stretch again.
      state.segmentAttempt = ''
    } else {
      if (state.phase !== 'settled') return
      state.rank = 2
    }
    state.phrase = reply.phrase
    state.pendingModes.delete(mode)
    paintPhrase(job.row, reply.phrase)
  }

  private fail(job: SummaryQueueJob, error: unknown): void {
    if (!this.started || !job.row.isConnected) return
    const state = this.rows.get(job.row)
    if (state === undefined || state.legacy || state.epoch !== job.epoch) return
    if (state.tokens[job.request.mode] !== job.token) return
    state.pendingModes.delete(job.request.mode)
    if (state.phrase !== '') {
      paintPhrase(job.row, state.phrase)
      return
    }
    if (state.pendingModes.size === 0) {
      clearRow(job.row)
      if (error instanceof Error && error.name !== 'AbortError') {
        this.warn(`[stream-focus-summary] summary request failed: ${error.message}`)
      }
    }
  }

  private queueHydration(root: HTMLElement, state: RowState, snapshot: ThinkRowSnapshot): boolean {
    const queries = this.queriesFor(snapshot, state)
    if (queries.length === 0) return false
    state.hydrating = true
    const epoch = state.epoch
    for (const query of queries) {
      this.hydrationEntries.set(Number(query.id), { root, query, state, epoch })
    }
    this.scheduleHydration()
    return true
  }

  private queriesFor(snapshot: ThinkRowSnapshot, state: RowState): PhraseQuery[] {
    const locale = this.currentLocale()
    const sessionId = this.options.activeSessionId()
    const shared = {
      locale,
      ...sessionId === undefined ? {} : { sessionId },
      ...snapshot.anchor === undefined ? {} : { anchor: snapshot.anchor },
    }
    const queries: PhraseQuery[] = []
    if (snapshot.running) {
      if (snapshot.paragraphText === '') return queries
      queries.push({
        ...shared,
        id: String(++this.hydrationId),
        text: snapshot.paragraphText,
        mode: 'paragraph',
      })
      return queries
    }
    // Lookup-only fallback: a settled row's collapsed preview is the whole
    // stretch's first line, so it matches the anchor's first-line hash. It is
    // never used as generation text; generation requires body/capturedBody.
    const text = snapshot.bodyText !== '' ? snapshot.bodyText
      : state.capturedBody !== '' ? state.capturedBody : snapshot.preview
    if (text === '') return queries
    queries.push({
      ...shared,
      id: String(++this.hydrationId),
      text: limitSegment(text),
      mode: 'segment',
    })
    return queries
  }

  private scheduleHydration(): void {
    if (this.hydrationTimer !== null || this.hydrationEntries.size === 0) return
    this.hydrationTimer = setTimeout(() => {
      this.hydrationTimer = null
      this.flushHydration()
    }, 0)
  }

  private flushHydration(): void {
    if (!this.started || this.hydrationEntries.size === 0) return
    const entries = [...this.hydrationEntries.entries()].slice(0, HYDRATION_BATCH).map(([, entry]) => entry)
    for (const entry of entries) this.hydrationEntries.delete(Number(entry.query.id))
    const controller = new AbortController()
    this.hydrationController = controller
    const queries = entries.map(entry => entry.query)
    let succeeded = false
    void this.options.api.phrases(queries, controller.signal)
      .then((hits) => {
        this.applyHydration(entries, hits)
        succeeded = true
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          this.warn(`[stream-focus-summary] phrase hydration failed: ${String(error)}`)
        }
      })
      .finally(() => {
        if (this.hydrationController === controller) this.hydrationController = null
        if (!this.started) return
        for (const entry of entries) {
          entry.state.hydrating = false
          if (succeeded) entry.state.hydrated = true
          else entry.state.hydrationRetryAt = this.now() + 5_000
        }
        this.scanAll = true
        if (this.hydrationEntries.size > 0) this.scheduleHydration()
        this.scheduleScan()
      })
  }

  private applyHydration(entries: readonly HydrationEntry[], hits: readonly PhraseHit[]): void {
    if (!this.started) return
    const index = new Map(hits.map(hit => [hit.id, hit]))
    for (const entry of entries) {
      if (entry.state.epoch !== entry.epoch || entry.state.legacy) continue
      const hit = index.get(entry.query.id)
      if (hit === undefined || hit.phrase.trim() === '') continue
      const rank: RowRank = entry.query.mode === 'segment' ? 2 : 1
      if (entry.state.phrase !== '' && rank <= entry.state.rank) continue
      entry.state.phrase = hit.phrase
      entry.state.rank = rank
      entry.state.pendingModes.delete(entry.query.mode)
      if (entry.query.mode === 'segment') entry.state.segmentAttempt = entry.query.text
      else entry.state.paragraphAttempt = entry.query.text
      if (entry.root.isConnected) this.repaint(entry.root, entry.state)
    }
  }

  private handleMutations(records: readonly MutationRecord[]): void {
    if (!this.started) return
    let immediate = false
    let coalesced = false
    for (const record of records) {
      const target = record.target
      const element = target.nodeType === 1 ? target as Element : target.parentElement
      const row = element === null ? null : element.closest<HTMLElement>('[data-variant="think"]')
      if (record.type === 'attributes') {
        if (record.attributeName === 'data-dtp') {
          if (row !== null) this.handleLegacyAttribute(row)
          continue
        }
        if (record.attributeName === 'data-state') {
          if (row !== null) this.dirtyRows.add(row)
          immediate = true
          continue
        }
        if (record.attributeName?.startsWith('data-dshsf-') === true) {
          // A removed plugin attribute means React recreated the title. The
          // plugin's own paint records add attributes, which need no scan.
          if (record.oldValue !== null && row !== null && !row.hasAttribute(record.attributeName)) {
            this.dirtyRows.add(row)
            coalesced = true
          }
          continue
        }
        continue
      }
      if (row !== null) {
        this.dirtyRows.add(row)
        coalesced = true
        continue
      }
      if (record.type === 'childList') {
        for (const node of record.addedNodes) {
          if (!containsThinkRow(node)) continue
          if (node.nodeType === 1 && (node as Element).matches('[data-variant="think"]')) {
            this.dirtyRows.add(node as HTMLElement)
          } else if (node.nodeType === 1) {
            for (const child of (node as Element).querySelectorAll<HTMLElement>('[data-variant="think"]')) {
              this.dirtyRows.add(child)
            }
          }
          coalesced = true
        }
      }
    }
    if (immediate) this.scanNow()
    else if (coalesced) this.scheduleScan()
  }

  private handleLegacyAttribute(root: HTMLElement): void {
    const state = this.rows.get(root)
    if (state === undefined || state.legacy) return
    this.blockLegacy(root, state)
  }

  private blockLegacy(root: HTMLElement, state: RowState): void {
    this.warnLegacyOnce()
    state.legacy = true
    state.phrase = ''
    state.paintedPhrase = ''
    state.paintedPending = false
    state.paintedTitle = null
    state.pendingModes.clear()
    state.tokens.paragraph = 0
    state.tokens.segment = 0
    this.queue.abortRow(root)
    clearRow(root)
  }

  private scheduleScan(immediate = false): void {
    if (!this.started) return
    if (immediate) {
      this.scanNow()
      return
    }
    if (this.scanTimer !== null) return
    const wait = SCAN_MS - (this.now() - this.lastScanAt)
    if (wait <= 0) {
      this.scanNow()
      return
    }
    this.scanTimer = setTimeout(() => {
      this.scanTimer = null
      this.scan()
    }, wait)
  }

  private scanNow(): void {
    if (!this.started) return
    if (this.scanTimer !== null) clearTimeout(this.scanTimer)
    this.scanTimer = null
    this.scan()
  }

  private pollViewport(): void {
    if (!this.started) return
    let wake = false
    for (const root of thinkRows(this.options.document)) {
      const state = this.rows.get(root)
      if (state === undefined || state.legacy || state.phase !== 'settled' || state.phrase !== '') continue
      state.inViewport = this.isNearViewport(root)
      if (!state.inViewport) {
        this.observeViewport(root, state)
        continue
      }
      state.observed = false
      wake = true
    }
    if (wake) this.scheduleScan(true)
  }

  private isNearViewport(root: HTMLElement): boolean {
    const view = this.options.document.defaultView
    if (view === null) return true
    const rect = root.getBoundingClientRect()
    return rect.bottom >= -VIEWPORT_MARGIN && rect.top <= view.innerHeight + VIEWPORT_MARGIN
  }

  private observeViewport(root: HTMLElement, state: RowState): void {
    if (state.observed) return
    state.observed = true
    this.viewportObserver?.observe(root)
  }

  private currentLocale(): string {
    const active = this.options.activeLocale().trim()
    if (active !== '') return active
    const declared = this.options.document.documentElement.lang.trim()
    return declared !== '' ? declared : 'zh-CN'
  }

  private warnLegacyOnce(): void {
    if (this.legacyWarned) return
    this.legacyWarned = true
    this.warn('[stream-focus-summary] detected the legacy thinking-progress plugin (data-dtp); leaving its rows untouched. Remove the old plugin to use summary phrases.')
  }

  private warnDomOnce(): void {
    if (this.domWarned) return
    this.domWarned = true
    this.warn('[stream-focus-summary] could not find a reasoning row title; decoration is paused for product-markup changes.')
  }

  private warn(message: string): void {
    this.onWarning(message)
  }
}

function containsThinkRow(node: Node): boolean {
  if (node.nodeType !== 1) return false
  const element = node as Element
  return element.matches('[data-variant="think"]') || element.querySelector('[data-variant="think"]') !== null
}
