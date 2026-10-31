/** The active process window's smooth replacement for the native scrollbar thumb. */

const STYLE_ID = 'dsh-stream-focus-native-scrollbar'

export class ProcessProgress {
  private body: HTMLElement | null = null
  private track: HTMLElement | null = null
  private thumb: HTMLElement | null = null
  private frame: number | null = null
  private height = 0
  private top = 0
  private time: number | null = null
  private initialized = false

  /**
   * @param doc - document owning the active process group.
   * @param win - window supplying animation frames.
   * @param onAtBottom - reports when the scrollport is within two pixels of its floor.
   */
  constructor(
    private readonly doc: Document = document,
    private readonly win: Window & typeof globalThis = window,
    private readonly onAtBottom?: () => void,
  ) {}

  /** Attach the indicator to one process body. Replaces any previous attachment. */
  attach(group: HTMLElement, body: HTMLElement): void {
    this.stop()
    if (this.doc.getElementById(STYLE_ID) === null) {
      const style = this.doc.createElement('style')
      style.id = STYLE_ID
      style.textContent = [
        '[data-stream-native-scrollbar]::-webkit-scrollbar-thumb{background:transparent!important}',
        '[data-stream-native-scrollbar]{scrollbar-color:transparent transparent!important}',
      ].join('\n')
      this.doc.head.append(style)
    }
    body.setAttribute('data-stream-native-scrollbar', '')
    const track = this.doc.createElement('div')
    track.dataset.streamProgress = ''
    track.setAttribute('aria-hidden', 'true')
    track.style.cssText = 'position:absolute;right:2px;top:8px;bottom:8px;width:3px;pointer-events:none;'
      + 'z-index:2;opacity:0;transition:opacity 160ms ease;'
    const thumb = this.doc.createElement('div')
    thumb.dataset.streamProgressThumb = ''
    thumb.style.cssText = 'position:absolute;right:0;top:0;width:3px;min-height:18px;border-radius:999px;'
      + 'background:color-mix(in srgb, currentColor 34%, transparent);'
      + 'will-change:height,transform'
    track.append(thumb)
    group.append(track)
    this.body = body
    this.track = track
    this.thumb = thumb
    this.height = 0
    this.top = 0
    this.time = null
    this.initialized = false
    this.schedule()
  }

  /** Remove the indicator and cancel its frame. */
  stop(): void {
    if (this.frame !== null) {
      this.win.cancelAnimationFrame(this.frame)
      this.frame = null
    }
    this.body?.removeAttribute('data-stream-native-scrollbar')
    this.track?.remove()
    this.body = null
    this.track = null
    this.thumb = null
    this.height = 0
    this.top = 0
    this.time = null
    this.initialized = false
  }

  /** Coalesce a geometry update into one animation frame. */
  schedule(): void {
    if (this.frame !== null) return
    this.frame = this.win.requestAnimationFrame(time => {
      this.frame = null
      this.update(time)
    })
  }

  private update(time: number): void {
    const body = this.body
    const track = this.track
    const thumb = this.thumb
    if (body === null || track === null || thumb === null) return
    const trackHeight = track.clientHeight
    const contentHeight = body.scrollHeight
    const clientHeight = body.clientHeight
    if (trackHeight <= 0) return
    if (body.scrollHeight - body.clientHeight - body.scrollTop <= 2) this.onAtBottom?.()
    if (contentHeight <= clientHeight + 1) {
      track.style.opacity = '0'
      this.time = null
      this.initialized = false
      return
    }
    track.style.opacity = '1'
    const targetHeight = Math.max(18, Math.round(trackHeight * (clientHeight / contentHeight)))
    const travel = Math.max(0, trackHeight - targetHeight)
    const maxScroll = Math.max(1, contentHeight - clientHeight)
    const targetTop = Math.round((body.scrollTop / maxScroll) * travel)
    if (!this.initialized) {
      this.initialized = true
      this.height = targetHeight
      this.top = targetTop
      this.time = time
      thumb.style.height = `${targetHeight}px`
      thumb.style.transform = `translateY(${targetTop}px)`
      return
    }
    const elapsed = this.time === null ? 1000 / 60 : Math.min(32, time - this.time)
    this.time = time
    // Frequent line growth must not restart a CSS transition on the thumb.
    const factor = 1 - Math.exp(-elapsed / 90)
    this.height += (targetHeight - this.height) * factor
    this.top += (targetTop - this.top) * factor
    const heightSettled = Math.abs(targetHeight - this.height) <= 0.25
    const topSettled = Math.abs(targetTop - this.top) <= 0.25
    if (heightSettled) this.height = targetHeight
    if (topSettled) this.top = targetTop
    thumb.style.height = `${this.height.toFixed(2)}px`
    thumb.style.transform = `translateY(${this.top.toFixed(2)}px)`
    if (!heightSettled || !topSettled) this.schedule()
    else this.time = null
  }
}
