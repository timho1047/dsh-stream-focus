import { DISCLOSURE_MOTION_MS, closeDisclosure, openDisclosure } from './disclosure-motion.ts'
import { HighlightFade } from './highlight-fade.ts'
import { ProcessProgress } from './process-progress.ts'
import { FollowSteward } from './follow-steward.ts'
import { groupContent, groupHeader, groupsIn, latestGroup, latestTurn, processBody, runningFlow } from './live-transcript.ts'
import {
  decideWindow,
  type CandidateKind,
  type ManualChoice,
  type WindowCandidate,
  type WindowGroup,
} from './decision.ts'

const GROUP_SELECTOR = '[data-chat-group-key]'
const DISCLOSURE_SELECTOR = '[data-disclosure-row][aria-expanded]'
const OPEN_FADE_MS = 180
const ATTRIBUTE_FILTER = [
  'aria-expanded',
  'data-chat-following-tail',
  'data-chat-running',
  'data-expanded',
  'data-state',
  'hidden',
] as const

/** A candidate plus the disclosure element the conductor clicks. */
interface CandidateElement extends WindowCandidate {
  readonly element: HTMLElement
}

/** One group snapshot with its clickable header and rows. */
interface GroupSnapshot {
  readonly key: string
  readonly header: HTMLButtonElement
  readonly model: WindowGroup
  readonly elements: ReadonlyMap<string, CandidateElement>
}

/**
 * Keep the running Turn's process disclosures in one reader-controlled window.
 *
 * The conductor never renders. It reads the semantically attributed Chat DOM,
 * toggles the same disclosure controls a reader would click, and keeps the
 * window pinned to its newest row while the reader has not scrolled away.
 */
export class StreamWindowConductor {
  private active = false
  private root: HTMLElement | null = null
  private activeGroup: HTMLElement | null = null
  private frame: number | null = null
  private followObserver: ResizeObserver | null = null
  private followBody: HTMLElement | null = null
  private followBodyOverflowX = ''
  private followBodyMaskImage = ''
  private followBodyMinHeight = ''
  private followBodyHeight = ''
  private followBodyMaxHeight = ''
  private heightFrozen = false
  private fadeElement: HTMLElement | null = null
  private fadeGroup: HTMLElement | null = null
  private fadeGroupPosition = ''
  private textFade: HighlightFade | null = null
  private progress: ProcessProgress | null = null
  private follow: FollowSteward | null = null
  private outerGuard: { observer: ResizeObserver; group: HTMLElement } | null = null
  private openAnimation: {
    body: HTMLElement
    frame: number | null
    timer: number | null
    opacity: string
    transition: string
  } | null = null
  private observer: MutationObserver | null = null
  /** Rows this plugin opened and is therefore allowed to close later. */
  private readonly autoKeys = new Set<string>()
  /** Process groups this plugin opened. */
  private readonly autoGroups = new Set<string>()
  /** Group keys the reader deliberately closed. */
  private readonly suppressedGroups = new Set<string>()
  /** Reader's explicit open/closed choice per row key. */
  private readonly manualRows = new Map<string, Exclude<ManualChoice, undefined>>()
  private readonly pendingClose = new Set<HTMLElement>()
  private transitionTimer: number | null = null
  private autoClickDepth = 0

  /**
   * @param doc - document that owns the running Chat.
   * @param win - window supplying MutationObserver and rAF.
   */
  constructor(
    private readonly doc: Document = document,
    private readonly win: Window & typeof globalThis = window,
  ) {}

  /** Start observing the Chat. Idempotent. */
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
    this.sync()
  }

  /** Stop observing and restore every automatic open state. */
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
    this.resetWindow()
    this.root = null
  }

  /** Reconcile the current DOM with the window decision. Public for tests. */
  sync(): void {
    if (!this.active || this.transitionTimer !== null) return
    const root = runningFlow(this.doc)
    if (root === null) {
      this.resetWindow()
      return
    }
    if (root !== this.root) {
      this.resetWindow()
      this.root = root
    }
    const group = latestGroup(root)
    if (group === null) return
    if (!this.isLatestTurn(root, group)) {
      this.resetWindow()
      return
    }
    if (group !== this.activeGroup) {
      this.cancelOpenAnimation()
      this.detachFollow()
      this.closeOtherWindows(group)
      this.activeGroup = group
      this.attachFollow(group)
    }

    const snapshot = this.snapshot(group)
    if (snapshot === null) return
    const decision = decideWindow(snapshot.model)
    if (decision.openGroup) {
      this.autoOpen(snapshot.header, group, snapshot.key)
      return
    }

    const opens = decision.open
      .map(key => snapshot.elements.get(key))
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        candidate !== undefined && !candidate.open && candidate.element.isConnected)
    const closes = decision.close
      .map(key => snapshot.elements.get(key))
      .filter((candidate): candidate is NonNullable<typeof candidate> =>
        candidate !== undefined && candidate.open && candidate.element.isConnected)
    if (opens.length > 0 && closes.length > 0) this.freezeWindowHeight()
    let closeAnimated = false
    for (const candidate of closes) {
      if (this.closeRow(candidate.element)) closeAnimated = true
      this.autoKeys.delete(candidate.key)
    }
    if (closeAnimated && opens.length > 0) {
      this.deferSync()
    } else {
      for (const candidate of opens) {
        this.openRow(candidate.element)
        this.autoKeys.add(candidate.key)
      }
    }
    if (opens.length > 0 || closes.length > 0) this.follow?.rearmAfterMotion(DISCLOSURE_MOTION_MS + 420)
  }

  /** Bind bottom following and its reader-override signals to the active window. */
  private attachFollow(group: HTMLElement): void {
    const body = processBody(group)
    if (body === null) return
    const content = groupContent(group)
    this.followBody = body
    this.followBodyOverflowX = body.style.overflowX
    this.followBodyMaskImage = body.style.maskImage
    this.followBodyMinHeight = body.style.minHeight
    this.followBodyHeight = body.style.height
    this.followBodyMaxHeight = body.style.maxHeight
    // Keep the active window horizontally contained. Official edge fades are
    // suppressed here because they also fade the scrollbar on every follow tick.
    body.style.overflowX = 'hidden'
    body.style.maskImage = 'none'
    this.attachFade(group)
    this.progress = new ProcessProgress(this.doc, this.win)
    this.progress.attach(group, body)
    this.follow = FollowSteward.acquire(body, this.win)
    this.textFade = new HighlightFade(this.doc, this.win, 'dsh-stream-process')
    this.textFade.observe(content ?? group)
    body.addEventListener('scroll', this.onProgressScroll, { passive: true })
    if (typeof this.win.ResizeObserver === 'function') {
      this.followObserver = new this.win.ResizeObserver(() => {
        this.rememberHeight()
        this.progress?.schedule()
        this.follow?.noteGrowth()
      })
      this.followObserver.observe(body)
      if (content !== null) this.followObserver.observe(content)
    }
  }

  /** Release the active window's observer and reader signals. */
  private detachFollow(): void {
    const body = this.followBody
    if (body !== null) {
      body.removeEventListener('scroll', this.onProgressScroll)
      body.style.overflowX = this.followBodyOverflowX
      body.style.maskImage = this.followBodyMaskImage
      body.style.minHeight = this.followBodyMinHeight
      body.style.height = this.followBodyHeight
      body.style.maxHeight = this.followBodyMaxHeight
    }
    this.progress?.stop()
    this.progress = null
    this.follow?.release()
    this.follow = null
    this.followObserver?.disconnect()
    this.followObserver = null
    this.followBody = null
    this.followBodyOverflowX = ''
    this.followBodyMaskImage = ''
    this.followBodyMinHeight = ''
    this.followBodyHeight = ''
    this.followBodyMaxHeight = ''
    this.heightFrozen = false
    this.removeFade()
  }

  /** Pin the outer transcript on each height step while the window reveals. */
  private startOuterGuard(group: HTMLElement): void {
    this.stopOuterGuard()
    const outer = group.closest<HTMLElement>('[data-conversation-scroll]')
    if (outer === null || this.doc.querySelector('[data-chat-following-tail]') === null) return
    if (typeof this.win.ResizeObserver !== 'function') return
    const observer = new this.win.ResizeObserver(() => { this.pinOuterNow(group) })
    observer.observe(group)
    this.outerGuard = { observer, group }
    this.pinOuterNow(group)
  }

  private stopOuterGuard(): void {
    this.outerGuard?.observer.disconnect()
    this.outerGuard = null
  }

  /** Keep the outer transcript at its floor without waiting a frame for Chat's follow. */
  private pinOuterNow(group: HTMLElement): void {
    const outer = group.closest<HTMLElement>('[data-conversation-scroll]')
    if (outer === null || this.doc.querySelector('[data-chat-following-tail]') === null) return
    const floor = Math.max(0, outer.scrollHeight - outer.clientHeight)
    if (Math.abs(floor - outer.scrollTop) > 0.5) outer.scrollTop = floor
  }

  /** Fade the lowest content edge so new lines enter instead of popping. */
  private attachFade(group: HTMLElement): void {
    this.removeFade()
    this.fadeGroup = group
    this.fadeGroupPosition = group.style.position
    if (this.win.getComputedStyle(group).position === 'static') group.style.position = 'relative'
    const fade = this.doc.createElement('div')
    fade.dataset.streamFade = ''
    fade.setAttribute('aria-hidden', 'true')
    fade.style.cssText = 'position:absolute;left:0;right:12px;bottom:0;height:16px;pointer-events:none;'
      + 'background:linear-gradient(to bottom, transparent, color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent));z-index:1'
    group.append(fade)
    this.fadeElement = fade
  }

  private removeFade(): void {
    this.fadeElement?.remove()
    this.fadeElement = null
    if (this.fadeGroup !== null) this.fadeGroup.style.position = this.fadeGroupPosition
    this.fadeGroup = null
    this.fadeGroupPosition = ''
  }

  private readonly onProgressScroll = (): void => { this.progress?.schedule() }

  /** Freeze the window height for a row-to-row transition so outer follow has no floor change. */
  private freezeWindowHeight(): void {
    const body = this.followBody
    if (body === null || this.heightFrozen) return
    const height = body.getBoundingClientRect().height
    if (height <= 0) return
    this.heightFrozen = true
    const fixed = `${Math.ceil(height)}px`
    body.style.height = fixed
    body.style.maxHeight = fixed
    body.style.minHeight = fixed
  }

  /** Keep the active window from shrinking below the height it has already shown. */
  private rememberHeight(): void {
    const body = this.followBody
    if (body === null) return
    const height = body.getBoundingClientRect().height
    const held = Number.parseFloat(body.style.minHeight) || 0
    if (height > held) body.style.minHeight = `${height}px`
  }

  /** Whether this is the newest Turn, so a stale group cannot capture a new turn. */
  private isLatestTurn(root: HTMLElement, group: HTMLElement): boolean {
    const groupTurn = group.getAttribute('data-chat-turn')
    if (groupTurn === null) return false
    return Number(groupTurn) === latestTurn(root)
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
      if (record.type === 'attributes') {
        const name = record.attributeName
        if (name === null || !(record.target instanceof Element)) continue
        if (name === 'data-chat-running' || name === 'data-chat-following-tail') {
          this.schedule()
          return
        }
        if (!ATTRIBUTE_FILTER.includes(name as typeof ATTRIBUTE_FILTER[number])) continue
        if (record.target.closest(GROUP_SELECTOR) !== null) {
          this.schedule()
          return
        }
        continue
      }
      if (record.type !== 'childList') continue
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      if (target === null) continue
      // Token and Markdown churn inside an already open body cannot change ownership.
      if (target.closest('[data-open]') !== null
        && target.closest('[data-variant="think"], [data-tool]') !== null) continue
      if (target.closest('[data-step-process-content]') !== null
        || containsRunningRoot(record.addedNodes)
        || containsRunningRoot(record.removedNodes)) {
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
      ?? target.closest<HTMLElement>('[data-sample="bash"][aria-expanded]')
    if (disclosure !== null && this.root?.contains(disclosure) === true) {
      const nestedControl = target.closest('a, button, input, textarea, select, [contenteditable="true"]')
      if (nestedControl !== null && nestedControl !== disclosure) return
      const key = disclosure.closest<HTMLElement>('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key')
      if (key === null || key === undefined) return
      this.manualRows.set(key, disclosure.getAttribute('aria-expanded') === 'true' ? 'closed' : 'open')
      this.autoKeys.delete(key)
      return
    }
    const group = target.closest<HTMLElement>(GROUP_SELECTOR)
    if (group === null || this.root?.contains(group) !== true) return
    this.cancelOpenAnimation()
    const header = this.groupHeader(group)
    if (header === null || (target !== header && !header.contains(target))) return
    const key = group.getAttribute('data-chat-group-key')
    if (key === null) return
    if (header.getAttribute('aria-expanded') === 'true') {
      this.suppressedGroups.add(key)
      this.autoGroups.delete(key)
    } else {
      this.suppressedGroups.delete(key)
      this.autoGroups.delete(key)
    }
    // A pointer click should not leave the browser's focus ring on the toggle.
    // Keyboard activation (detail 0) keeps the official focus behavior.
    if (event.detail > 0) {
      this.win.queueMicrotask(() => {
        if (this.doc.activeElement === header) header.blur()
      })
    }
  }

  /** Close the plugin's automatic rows and groups in non-active groups. */
  private closeOtherWindows(active: HTMLElement): void {
    if (this.root === null) return
    for (const group of this.root.querySelectorAll<HTMLElement>(GROUP_SELECTOR)) {
      if (group === active) continue
      const snapshot = this.snapshot(group)
      if (snapshot !== null) {
        for (const candidate of snapshot.elements.values()) {
          if (candidate.open && this.autoKeys.has(candidate.key)
            && candidate.manual !== 'open' && candidate.element.isConnected) {
            this.click(candidate.element)
          }
        }
        for (const candidate of snapshot.elements.values()) this.autoKeys.delete(candidate.key)
      }
      const key = group.getAttribute('data-chat-group-key')
      if (key !== null && this.autoGroups.has(key)
        && snapshot?.header.getAttribute('aria-expanded') === 'true' && snapshot.header.isConnected) {
        this.click(snapshot.header)
      }
      if (key !== null) this.autoGroups.delete(key)
    }
  }

  /** Read one group's header and top-level reasoning/Tool disclosures. */
  private snapshot(group: HTMLElement): GroupSnapshot | null {
    const header = this.groupHeader(group)
    const key = group.getAttribute('data-chat-group-key')
    const content = groupContent(group)
    if (header === null || key === null || content === null) return null

    const elements = new Map<string, CandidateElement>()
    const candidates: WindowCandidate[] = []
    let order = 0
    for (const member of content.children) {
      if (member.nodeType !== 1) continue
      const row = member as HTMLElement
      const flowKey = row.getAttribute('data-chat-flow-key')
      if (flowKey === null) continue
      const kind = this.candidateKind(row)
      if (kind === undefined) continue
      const bash = kind === 'tool' ? row.querySelector<HTMLElement>('[data-sample="bash"]') : null
      const genericTool = kind === 'tool' ? row.querySelector<HTMLElement>('[data-tool]') : null
      const disclosure = kind === 'reasoning'
        ? row.querySelector<HTMLElement>(DISCLOSURE_SELECTOR)
        : bash ?? genericTool?.querySelector<HTMLElement>(DISCLOSURE_SELECTOR) ?? null
      if (disclosure === null) continue
      const state = kind === 'reasoning'
        ? row.querySelector<HTMLElement>('[data-variant="think"]')?.getAttribute('data-state')
        : bash?.getAttribute('data-state') ?? genericTool?.getAttribute('data-state')
      const candidate: CandidateElement = {
        key: flowKey,
        kind,
        order: order++,
        open: disclosure.getAttribute('aria-expanded') === 'true',
        active: state === 'running' || state === 'preparing',
        auto: this.autoKeys.has(flowKey),
        manual: this.manualRows.get(flowKey),
        element: disclosure,
      }
      elements.set(flowKey, candidate)
      const { element: _element, ...modelCandidate } = candidate
      candidates.push(modelCandidate)
    }

    return {
      key,
      header,
      model: {
        open: header.getAttribute('aria-expanded') === 'true',
        suppressed: this.suppressedGroups.has(key),
        candidates,
      },
      elements,
    }
  }

  private candidateKind(row: HTMLElement): CandidateKind | undefined {
    if (row.querySelector('[data-variant="think"]') !== null) return 'reasoning'
    if (row.querySelector('[data-tool], [data-sample="bash"]') !== null) return 'tool'
    return undefined
  }

  private groupHeader(group: HTMLElement): HTMLButtonElement | null {
    return groupHeader(group)
      ?? group.querySelector<HTMLButtonElement>('button[aria-expanded]')
  }

  private openRow(element: HTMLElement): void {
    openDisclosure(element, this.win, () => this.click(element))
  }

  private closeRow(element: HTMLElement): boolean {
    return closeDisclosure(element, this.win, () => {
      if (this.active) this.click(element)
    }, this.pendingClose)
  }

  private deferSync(): void {
    if (this.transitionTimer !== null) return
    this.transitionTimer = this.win.setTimeout(() => {
      this.transitionTimer = null
      this.sync()
    }, DISCLOSURE_MOTION_MS + 30)
  }

  private click(element: HTMLElement): void {
    const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null
    // The official process-group header calls focus() inside its click handler.
    // Suppress only that occurrence so an automatic open cannot leave a focus
    // ring behind or pull focus out of the composer.
    const focus = element.focus
    element.focus = () => {}
    this.autoClickDepth += 1
    try {
      element.click()
    } finally {
      this.autoClickDepth -= 1
      element.focus = focus
    }
    this.restoreFocus(element, previous)
    this.win.queueMicrotask(() => { this.restoreFocus(element, previous) })
  }

  private restoreFocus(element: HTMLElement, previous: HTMLElement | null): void {
    if (this.doc.activeElement !== element || previous === element) return
    if (previous !== null && previous !== this.doc.body && previous.isConnected) {
      previous.focus({ preventScroll: true })
    }
    if (this.doc.activeElement === element) element.blur()
  }

  /**
   * Open the process group at full height with a short opacity fade.
   *
   * The window must not collapse to zero and re-expand; the outer transcript is
   * kept on the floor by its own guard while the group appears at its real size.
   */
  private autoOpen(header: HTMLButtonElement, group: HTMLElement, key: string): void {
    const body = group.querySelector<HTMLElement>('[data-step-process-body]')
    const reduced = typeof this.win.matchMedia === 'function'
      && this.win.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (body === null || reduced) {
      this.click(header)
      this.autoGroups.add(key)
      this.pinOuterNow(group)
        return
    }

    this.cancelOpenAnimation()
    const animation = {
      body,
      frame: null as number | null,
      timer: null as number | null,
      opacity: body.style.opacity,
      transition: body.style.transition,
    }
    this.openAnimation = animation
    this.startOuterGuard(group)
    body.style.opacity = '0'
    body.style.transition = `opacity ${OPEN_FADE_MS}ms ease-out`
    this.click(header)
    this.autoGroups.add(key)
    this.pinOuterNow(group)
    animation.frame = this.win.requestAnimationFrame(() => {
      animation.frame = null
      body.style.opacity = '1'
      animation.timer = this.win.setTimeout(() => this.finishOpenAnimation(animation), OPEN_FADE_MS + 30)
    })
  }

  private finishOpenAnimation(animation: NonNullable<StreamWindowConductor['openAnimation']>): void {
    if (this.openAnimation !== animation) return
    if (animation.frame !== null) this.win.cancelAnimationFrame(animation.frame)
    if (animation.timer !== null) this.win.clearTimeout(animation.timer)
    animation.body.style.opacity = animation.opacity
    animation.body.style.transition = animation.transition
    this.openAnimation = null
    this.stopOuterGuard()
  }

  private cancelOpenAnimation(): void {
    const animation = this.openAnimation
    if (animation === null) return
    this.openAnimation = null
    this.stopOuterGuard()
    if (animation.frame !== null) this.win.cancelAnimationFrame(animation.frame)
    if (animation.timer !== null) this.win.clearTimeout(animation.timer)
    animation.body.style.opacity = animation.opacity
    animation.body.style.transition = animation.transition
  }

  /** Close and forget every automatic open state. */
  private resetWindow(): void {
    if (this.transitionTimer !== null) {
      this.win.clearTimeout(this.transitionTimer)
      this.transitionTimer = null
    }
    this.cancelOpenAnimation()
    this.stopOuterGuard()
    this.detachFollow()
    if (this.root !== null) {
      for (const group of this.root.querySelectorAll<HTMLElement>(GROUP_SELECTOR)) {
        const snapshot = this.snapshot(group)
        if (snapshot !== null) {
          for (const candidate of snapshot.elements.values()) {
            if (candidate.open && this.autoKeys.has(candidate.key)
              && candidate.manual !== 'open' && candidate.element.isConnected) {
              this.click(candidate.element)
            }
          }
          const key = snapshot.key
          if (snapshot.header.getAttribute('aria-expanded') === 'true'
            && this.autoGroups.has(key) && snapshot.header.isConnected) {
            this.click(snapshot.header)
          }
        }
      }
    }
    this.pendingClose.clear()
    this.autoKeys.clear()
    this.autoGroups.clear()
    this.suppressedGroups.clear()
    this.manualRows.clear()
    this.activeGroup = null
  }
}

/** Whether a child-list change can add or remove the running status or a group. */
function containsRunningRoot(nodes: NodeList): boolean {
  for (const node of nodes) {
    if (node.nodeType !== 1) continue
    const element = node as Element
    if (element.matches(`[data-chat-running], ${GROUP_SELECTOR}`)
      || element.querySelector(`[data-chat-running], ${GROUP_SELECTOR}`) !== null) return true
  }
  return false
}
