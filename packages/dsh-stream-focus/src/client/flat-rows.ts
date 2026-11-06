import { DISCLOSURE_MOTION_MS, closeDisclosure, openDisclosure } from './disclosure-motion.ts'
import { FollowSteward } from './follow-steward.ts'
import { RowDisclosureController } from './row-disclosure.ts'
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
const FLOW_ROW = '[data-chat-flow-key]'
const ATTRIBUTE_FILTER = [
  'aria-expanded',
  'data-chat-following-tail',
  'data-chat-running',
  'data-expanded',
  'data-state',
] as const

function containsFlowRow(nodes: NodeList): boolean {
  for (const node of nodes) {
    if (node.nodeType !== 1) continue
    const element = node as Element
    if (element.matches(FLOW_ROW) || element.querySelector(FLOW_ROW) !== null) return true
  }
  return false
}

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
  private readonly rows: RowDisclosureController
  private readonly pendingClose = new Set<HTMLElement>()
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
  ) {
    this.rows = new RowDisclosureController(doc, win, false)
  }

  /** Start observing flat process rows. Idempotent. */
  start(): void {
    if (this.active) return
    this.active = true
    this.rows.start()
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
    this.rows.stop()
    this.observer?.disconnect()
    this.observer = null
    if (this.frame !== null) {
      this.win.cancelAnimationFrame(this.frame)
      this.frame = null
    }
    this.detachOuterFollow()
    this.rows.reset()
    this.pendingClose.clear()
  }

  /** Reconcile the newest Turn's flat rows. Public for tests. */
  sync(): void {
    if (!this.active) return
    const flow = runningFlow(this.doc)
    if (flow === null) {
      if (this.mode === 'detailed') this.resetAutoRows()
      return
    }
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
    // Cross-fade: the new row opens while the old one collapses, so there is no
    // frame with neither the thinking nor the Tool body mounted.
    for (const candidate of opens) {
      this.openRow(candidate.element)
      this.rows.markAuto(candidate.key)
    }
    if (this.mode === 'detailed') {
      const targets = new Set(decision.targets)
      for (const key of decision.close) {
        const candidate = elements.get(key)
        if (candidate === undefined || !candidate.open || !candidate.element.isConnected) continue
        // Tool bodies can be expensive to animate and a lingering old tool is
        // more disruptive than an instant close; thinking rows keep the fade.
        this.closeRow(candidate.element, candidate.kind === 'tool')
      }
      this.closeStaleRows(flow, targets)
      this.closeOpenTools(targets)
    }
    this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
  }

  /** Restore official collapsed rows when the running Turn ends. */
  private resetAutoRows(): void {
    for (const row of this.doc.querySelectorAll<HTMLElement>('[data-chat-flow-kind]')) {
      const candidate = this.candidate(row, 0)
      if (candidate === undefined || !candidate.open || candidate.manual === 'open') continue
      this.closeRow(candidate.element, true)
    }
    this.rows.reset()
    this.pendingClose.clear()
  }

  /**
   * Directly reconcile open Tool disclosures against the current targets.
   * PTC nests Bash controls inside a Code row, so the candidate walk can pick a
   * different disclosure than the visible open one; this sweep uses the open
   * control itself.
   */
  private closeOpenTools(targets: ReadonlySet<string>): void {
    for (const disclosure of this.doc.querySelectorAll<HTMLElement>('[data-tool] [data-disclosure-row][aria-expanded="true"]')) {
      const key = disclosure.closest<HTMLElement>('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key')
      if (key === null || key === undefined || targets.has(key) || this.rows.manual(key) === 'open') continue
      this.click(disclosure)
    }
  }

  /** Close automatic rows left open outside the current decision, including older Turns. */
  private closeStaleRows(flow: HTMLElement, targets: ReadonlySet<string>): void {
    for (const row of flow.querySelectorAll<HTMLElement>('[data-chat-flow-kind]')) {
      const candidate = this.candidate(row, 0)
      if (candidate === undefined || targets.has(candidate.key) || !candidate.open
        || candidate.active || candidate.manual === 'open') continue
      this.closeRow(candidate.element, true)
    }
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

  private openRow(element: HTMLElement): void {
    openDisclosure(element, this.win, () => this.click(element))
    this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
  }

  private closeRow(element: HTMLElement, immediate = false): boolean {
    if (immediate) {
      this.click(element)
      this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
      return false
    }
    const animated = closeDisclosure(element, this.win, () => {
      if (this.active) this.click(element)
    }, this.pendingClose)
    this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 90)
    return animated
  }

  private click(element: HTMLElement): void {
    this.rows.runAutomatic(() => { element.click() })
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
      // A PTC run_code row contains nested Bash subcalls. The outer tool
      // disclosure owns the visible Code row; the nested Bash control is not
      // the row this conductor should toggle.
      : tool?.querySelector<HTMLElement>(DISCLOSURE_SELECTOR) ?? bash
    if (disclosure === null || disclosure === undefined) return undefined
    const state = kind === 'reasoning'
      ? thinking?.getAttribute('data-state')
      : tool?.getAttribute('data-state') ?? bash?.getAttribute('data-state')
    return {
      key,
      kind,
      order,
      open: disclosure.getAttribute('aria-expanded') === 'true',
      active: state === 'running' || state === 'preparing',
      auto: this.rows.isAuto(key),
      manual: this.rows.manual(key),
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
          && target.closest('[data-chat-turn], [data-chat-flow]') !== null) {
          this.schedule()
          return
        }
        continue
      }
      if (record.type === 'childList') {
        const flowChanged = containsFlowRow(record.addedNodes) || containsFlowRow(record.removedNodes)
        if (!flowChanged && target.closest('[data-chat-flow]') === null) continue
        // Token and Markdown churn inside an open body must not schedule a sync,
        // but a newly inserted/removed flow row still can change ownership.
        if (!flowChanged && target.closest('[data-open]') !== null) continue
        this.follow?.noteGrowth()
        this.schedule()
        return
      }
    }
  }

}
