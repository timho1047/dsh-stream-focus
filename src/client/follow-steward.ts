/** One follow-intent and repair policy for a scroll surface. */

const GROWTH_DELAY = 350
const GESTURE_HOLD = 1000
const GROWTH_HOLD = 1500

/** Shared per-scrollport owners, so two modules cannot maintain different intent. */
export class FollowSteward {
  private static readonly pool = new WeakMap<HTMLElement, { steward: FollowSteward; refs: number }>()
  private readonly listeners = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
  private intent = false
  private gestureAt = 0
  private growthAt = 0
  private repairTimer: number | null = null

  private constructor(
    private readonly scroll: HTMLElement,
    private readonly win: Window & typeof globalThis,
  ) {
    const flag = scroll.ownerDocument.querySelector('[data-chat-following-tail]')
    this.intent = flag !== null || this.nearBottom()
    scroll.addEventListener('scroll', this.onScroll, { passive: true })
    scroll.addEventListener('scrollend', this.onScrollEnd)
    for (const type of this.listeners) scroll.addEventListener(type, this.onGesture, { passive: true, capture: true })
  }

  /** Acquire the single steward for this scrollport. */
  static acquire(scroll: HTMLElement, win: Window & typeof globalThis = window): FollowSteward {
    const existing = this.pool.get(scroll)
    if (existing !== undefined) {
      existing.refs += 1
      return existing.steward
    }
    const steward = new FollowSteward(scroll, win)
    this.pool.set(scroll, { steward, refs: 1 })
    return steward
  }

  /** Release one caller; listeners are removed when the last caller leaves. */
  release(): void {
    const entry = FollowSteward.pool.get(this.scroll)
    if (entry === undefined) return
    entry.refs -= 1
    if (entry.refs > 0) return
    FollowSteward.pool.delete(this.scroll)
    this.stop()
  }

  /** Pin immediately when the reader is following; used by prose growth. */
  pinIfFollowing(): void {
    if (!this.intent) return
    const floor = Math.max(0, this.scroll.scrollHeight - this.scroll.clientHeight)
    if (floor - this.scroll.scrollTop <= 1) return
    this.scroll.scrollTop = floor
    this.scroll.dispatchEvent(new Event('scroll'))
  }

  /** Record content growth and schedule one delayed repair. */
  noteGrowth(): void {
    this.growthAt = this.win.Date.now()
    if (this.intent) this.arm(GROWTH_DELAY)
  }

  /** Re-arm after an automatic row motion, so the check lands after the motion. */
  rearmAfterMotion(delay: number): void {
    if (this.intent) this.arm(delay)
  }

  /** Release the last reference explicitly. */
  stop(): void {
    this.scroll.removeEventListener('scroll', this.onScroll)
    this.scroll.removeEventListener('scrollend', this.onScrollEnd)
    for (const type of this.listeners) this.scroll.removeEventListener(type, this.onGesture, true)
    if (this.repairTimer !== null) {
      this.win.clearTimeout(this.repairTimer)
      this.repairTimer = null
    }
  }

  private nearBottom(): boolean {
    return Math.max(0, this.scroll.scrollHeight - this.scroll.clientHeight) - this.scroll.scrollTop <= 2
  }

  private readonly onGesture = (): void => { this.gestureAt = this.win.Date.now() }

  private readonly onScroll = (): void => {
    if (this.nearBottom()) this.intent = true
    else if (this.win.Date.now() - this.gestureAt < 1200) this.intent = false
  }

  private readonly onScrollEnd = (): void => {
    if (this.intent && this.nearBottom()) return
    if (this.win.Date.now() - this.gestureAt < GESTURE_HOLD) return
    if (this.win.Date.now() - this.growthAt > GROWTH_HOLD) return
    this.arm(0)
  }

  private arm(delay: number): void {
    if (this.repairTimer !== null) this.win.clearTimeout(this.repairTimer)
    this.repairTimer = this.win.setTimeout(() => {
      this.repairTimer = null
      if (!this.intent || !this.scroll.isConnected) return
      if (this.win.Date.now() - this.gestureAt < GESTURE_HOLD) return
      const floor = Math.max(0, this.scroll.scrollHeight - this.scroll.clientHeight)
      if (floor - this.scroll.scrollTop <= 1) return
      this.scroll.scrollTop = floor
      this.scroll.dispatchEvent(new Event('scroll'))
      this.win.requestAnimationFrame(() => {
        if (this.scroll.isConnected) this.scroll.dispatchEvent(new Event('scrollend'))
      })
    }, delay)
  }
}
