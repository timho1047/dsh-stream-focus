import { DISCLOSURE_MOTION_MS, closeDisclosure, openDisclosure } from './disclosure-motion.ts'
import { FollowSteward } from './follow-steward.ts'
import { latestTurnRows, outerScroller, runningFlow } from './live-transcript.ts'
import {
  decideWindow,
  type CandidateKind,
  type ManualChoice,
  type WindowCandidate,
} from './decision.ts'

const FLOW_SELECTOR = '[data-chat-flow]:not([data-step-process-content])'
const FLOW_SLOT_SELECTOR = '[data-slot="conversation.chat.flow"]'
const RUNNING_SELECTOR = '[data-chat-running]'
const DISCLOSURE_SELECTOR = '[data-disclosure-row][aria-expanded]'
const BASH_SELECTOR = '[data-sample="bash"][aria-expanded]'
const ATTRIBUTE_FILTER = [
  'aria-expanded',
  'data-chat-following-tail',
  'data-chat-running',
  'data-expanded',
  'data-state',
] as const

interface FlatCandidate extends WindowCandidate {
  readonly element: HTMLElement
}

/**
 * Row-level enhancement for Detailed and Verbose Turns.
 *
 * Those modes intentionally render process rows flat, without a group body to
 * cap or scroll. This conductor only opens the current reasoning/tool rows and
 * respects the mode's collapse semantics: Detailed may fold older automatic
 * rows, Verbose never does.
 */
export class FlatRowConductor {
  private active = false
  private frame: number | null = null
  private observer: MutationObserver | null = null
  private autoClickDepth = 0
  private readonly autoKeys = new Set<string>()
  private readonly manualRows = new Map<string, Exclude<ManualChoice, undefined>>()
  private readonly pendingClose = new Set<HTMLElement>()
  private transitionTimer: number | null = null
  private follow: FollowSteward | null = null

  /**
   * @param mode - Detailed or Verbose.
   * @param doc - document owning the transcript.
   * @param win - window supplying observers and animation frames.
   */
  constructor(
    private readonly mode: 'detailed' | 'verbose',
    private readonly doc: Document = document,
    private readonly win: Window & typeof globalThis = window,
  ) {}

  /** Start observing flat process rows. Idempotent. */
  start(): void {
    if (this.active) return
    this.active = true
    this.doc.addEventListener('click', this.onClick, true)
    const body = this.doc.body
    if (body !== null) {
      this.observer = new this.win.MutationObserver(records => { this.onMutations(records) })
      this.observer.observe(body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [...ATTRIBUTE_FILTER],
      })
    }
    this.attachOuterFollow()
    this.sync()
  }

  /** Stop observing. Verbose rows that were opened stay open by design. */
  stop(): void {
    if (!this.active) return
    this.active = false
    this.doc.removeEventListener('click', this.onClick, true)
    this.observer?.disconnect()
    this.observer = null
    if (this.frame !== null) {
      this.win.cancelAnimationFrame(this.frame)
      this.frame = null
    }
    if (this.transitionTimer !== null) {
      this.win.clearTimeout(this.transitionTimer)
      this.transitionTimer = null
    }
    this.detachOuterFollow()
    this.pendingClose.clear()
    this.autoKeys.clear()
    this.manualRows.clear()
  }

  /** Reconcile the newest Turn's flat rows. Public for tests. */
  sync(): void {
    if (!this.active || this.transitionTimer !== null) return
    const flow = runningFlow(this.doc)
    if (flow === null) return
    const rows = latestTurnRows(flow)
    if (rows.length === 0) return

    const elements = new Map<string, FlatCandidate>()
    const candidates: WindowCandidate[] = []
    let order = 0
    for (const row of rows) {
      const candidate = this.candidate(row, order++)
      if (candidate === undefined) continue
      elements.set(candidate.key, candidate)
      const { element: _element, ...model } = candidate
      candidates.push(model)
    }
    const decision = decideWindow({ open: true, suppressed: false, candidates })
    const opens = decision.open
      .map(key => elements.get(key))
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        candidate !== undefined && !candidate.open && candidate.element.isConnected)
    let closeAnimated = false
    if (this.mode === 'detailed') {
      for (const key of decision.close) {
        const candidate = elements.get(key)
        if (candidate === undefined || !candidate.open || !candidate.element.isConnected) continue
        if (this.closeRow(candidate.element)) closeAnimated = true
        this.autoKeys.delete(key)
      }
    }
    if (closeAnimated && opens.length > 0) {
      this.deferSync()
      return
    }
    for (const candidate of opens) {
      this.openRow(candidate.element)
      this.autoKeys.add(candidate.key)
    }
    this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
  }

  private attachOuterFollow(): void {
    const outer = outerScroller(this.doc)
    if (outer === null) return
    this.follow?.release()
    this.follow = FollowSteward.acquire(outer, this.win)
  }

  private detachOuterFollow(): void {
    this.follow?.release()
    this.follow = null
  }

  private deferSync(): void {
    if (this.transitionTimer !== null) return
    this.transitionTimer = this.win.setTimeout(() => {
      this.transitionTimer = null
      this.sync()
    }, DISCLOSURE_MOTION_MS + 30)
  }

  private candidate(row: HTMLElement, order: number): FlatCandidate | undefined {
    const key = row.getAttribute('data-chat-flow-key')
    if (key === null) return undefined
    const thinking = row.querySelector<HTMLElement>('[data-variant="think"]')
    const bash = row.querySelector<HTMLElement>('[data-sample="bash"]')
    const tool = row.querySelector<HTMLElement>('[data-tool]')
    const kind: CandidateKind | undefined = thinking !== null
      ? 'reasoning'
      : bash !== null || tool !== null ? 'tool' : undefined
    if (kind === undefined) return undefined
    const disclosure = kind === 'reasoning'
      ? thinking?.querySelector<HTMLElement>(DISCLOSURE_SELECTOR)
      : bash ?? tool?.querySelector<HTMLElement>(DISCLOSURE_SELECTOR)
    if (disclosure === null || disclosure === undefined) return undefined
    const state = kind === 'reasoning'
      ? thinking?.getAttribute('data-state')
      : bash?.getAttribute('data-state') ?? tool?.getAttribute('data-state')
    return {
      key,
      kind,
      order,
      open: disclosure.getAttribute('aria-expanded') === 'true',
      active: state === 'running' || state === 'preparing',
      auto: this.autoKeys.has(key),
      manual: this.manualRows.get(key),
      element: disclosure,
    }
  }

  private schedule(): void {
    if (!this.active || this.frame !== null) return
    this.frame = this.win.requestAnimationFrame(() => {
      this.frame = null
      this.sync()
    })
  }

  private onMutations(records: readonly MutationRecord[]): void {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      if (target === null) continue
      if (record.type === 'attributes') {
        const name = record.attributeName
        if (name === 'data-chat-running' || name === 'data-chat-following-tail') {
          this.schedule()
          return
        }
        if (name !== null && ATTRIBUTE_FILTER.includes(name as typeof ATTRIBUTE_FILTER[number])
          && target.closest('[data-chat-flow]') !== null) {
          this.schedule()
          return
        }
        continue
      }
      if (record.type === 'childList' && target.closest('[data-chat-flow]') !== null) {
        if (target.closest('[data-open]') !== null) continue
        this.follow?.noteGrowth()
        this.schedule()
        return
      }
    }
  }

  private onClick = (event: MouseEvent): void => {
    if (this.autoClickDepth > 0) return
    const target = event.target
    if (!(target instanceof Element)) return
    const disclosure = target.closest<HTMLElement>(DISCLOSURE_SELECTOR)
      ?? target.closest<HTMLElement>(BASH_SELECTOR)
    if (disclosure === null) return
    const key = disclosure.closest<HTMLElement>('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key')
    if (key === null || key === undefined) return
    this.manualRows.set(key, disclosure.getAttribute('aria-expanded') === 'true' ? 'closed' : 'open')
    this.autoKeys.delete(key)
  }

  private openRow(element: HTMLElement): void {
    openDisclosure(element, this.win, () => this.click(element))
    this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
  }

  private closeRow(element: HTMLElement): boolean {
    const animated = closeDisclosure(element, this.win, () => {
      if (this.active) this.click(element)
    }, this.pendingClose)
    this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
    return animated
  }

  private click(element: HTMLElement): void {
    const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null
    const focus = element.focus
    element.focus = () => {}
    this.autoClickDepth += 1
    try {
      element.click()
    } finally {
      this.autoClickDepth -= 1
      element.focus = focus
    }
    if (this.doc.activeElement !== element || previous === element) return
    if (previous !== null && previous !== this.doc.body && previous.isConnected) {
      previous.focus({ preventScroll: true })
    }
    if (this.doc.activeElement === element) element.blur()
  }

}
