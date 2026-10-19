/** Visual-only compensation for discrete scroll jumps; never writes scrollTop. */

const MIN_JUMP = 8
const MAX_JUMP = 80
const MAX_OFFSET = 24
const DECAY_MS = 55

/**
 * Soften a line-height scroll jump by translating the content down by the
 * observed jump, then easing the translation back to zero. The real scroll
 * position and its owner stay untouched.
 */
export class JumpSmoother {
  private attach: { scroll: HTMLElement; content: HTMLElement; original: string } | null = null
  private offset = 0
  private lastTop = 0
  private lastTime = 0
  private frame: number | null = null
  private gestureAt = 0

  constructor(
    private readonly win: Window & typeof globalThis = window,
  ) {}

  /** Bind to one scrollport/content pair. */
  observe(scroll: HTMLElement, content: HTMLElement): void {
    this.stop()
    this.attach = { scroll, content, original: content.style.getPropertyValue('translate') }
    this.lastTop = scroll.scrollTop
    this.gestureAt = 0
    scroll.addEventListener('scroll', this.onScroll, { passive: true })
    for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
      scroll.addEventListener(type, this.onGesture, { passive: true, capture: true })
    }
  }

  /** Restore the content translation and detach. */
  stop(): void {
    const attached = this.attach
    if (attached !== null) {
      attached.scroll.removeEventListener('scroll', this.onScroll)
      for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
        attached.scroll.removeEventListener(type, this.onGesture, true)
      }
      if (attached.original === '') attached.content.style.removeProperty('translate')
      else attached.content.style.setProperty('translate', attached.original)
    }
    this.attach = null
    this.offset = 0
    this.lastTop = 0
    this.lastTime = 0
    if (this.frame !== null) {
      this.win.cancelAnimationFrame(this.frame)
      this.frame = null
    }
  }

  private readonly onGesture = (): void => {
    this.gestureAt = this.win.Date.now()
    this.reset()
  }

  private readonly onScroll = (): void => {
    const attached = this.attach
    if (attached === null) return
    const top = attached.scroll.scrollTop
    const delta = top - this.lastTop
    this.lastTop = top
    if (this.win.Date.now() - this.gestureAt < 1000) return
    if (delta <= 0 || delta < MIN_JUMP || delta > MAX_JUMP) {
      if (delta < 0) this.reset()
      return
    }
    this.offset = Math.min(MAX_OFFSET, this.offset + delta)
    attached.content.style.setProperty('translate', `0 ${this.offset.toFixed(2)}px`)
    this.schedule()
  }

  private reset(): void {
    this.offset = 0
    if (this.attach !== null) this.attach.content.style.setProperty('translate', '0 0px')
  }

  private schedule(): void {
    if (this.frame !== null) return
    this.frame = this.win.requestAnimationFrame(this.tick)
  }

  private readonly tick = (time: number): void => {
    this.frame = null
    const attached = this.attach
    if (attached === null) return
    const elapsed = this.lastTime === 0 ? 16.67 : Math.min(32, time - this.lastTime)
    this.lastTime = time
    this.offset *= Math.exp(-elapsed / DECAY_MS)
    if (this.offset < 0.2) {
      this.offset = 0
      attached.content.style.setProperty('translate', '0 0px')
      this.lastTime = 0
      return
    }
    attached.content.style.setProperty('translate', `0 ${this.offset.toFixed(2)}px`)
    this.schedule()
  }
}
