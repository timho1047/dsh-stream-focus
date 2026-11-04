import { HighlightFade } from './highlight-fade.ts'
import { FollowSteward } from './follow-steward.ts'
import { outerScroller, streamingAssistantRoots } from './live-transcript.ts'

/**
 * Line-edge fade for streaming Assistant prose.
 *
 * Normal assistant Markdown has no content Factory, so it cannot be paced
 * without duplicating Chat's renderer. A mask on the streaming root instead
 * softens the newest line while leaving the official renderer untouched.
 */
export class NormalOutputSmoother {
  private active = false
  private observer: MutationObserver | null = null
  private readonly roots = new Set<HTMLElement>()
  private readonly previous = new WeakMap<HTMLElement, { mask: string; webkit: string }>()
  private readonly fade: HighlightFade
  private outerFollow: { scroll: HTMLElement; steward: FollowSteward } | null = null

  /**
   * @param doc - document that owns the transcript.
   * @param win - window supplying MutationObserver.
   */
  constructor(
    private readonly doc: Document = document,
    private readonly win: Window & typeof globalThis = window,
  ) {
    this.fade = new HighlightFade(doc, win, 'dsh-stream-fade')
  }

  /** Observe streaming assistant roots. Idempotent. */
  start(): void {
    if (this.active) return
    this.active = true
    const body = this.doc.body
    if (body !== null) {
      this.observer = new this.win.MutationObserver(records => {
        if (records.some(record => record.target instanceof Element && record.target.closest('[data-streaming]') !== null)) {
          this.pinOuter()
        }
        this.reconcile()
      })
      this.observer.observe(body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-streaming'],
      })
    }
    this.reconcile()
  }

  /** Remove every mask and stop observing. */
  stop(): void {
    if (!this.active) return
    this.active = false
    this.observer?.disconnect()
    this.observer = null
    for (const root of this.roots) this.clear(root)
    this.roots.clear()
    this.fade.stop()
    this.outerFollow?.steward.release()
    this.outerFollow = null
  }

  /** Reconcile masks against the currently streaming Assistant roots. Public for tests. */
  sync(): void {
    this.reconcile()
  }

  private pinOuter(): void {
    if (this.doc.querySelector('[data-chat-following-tail]') === null) return
    const outer = outerScroller(this.doc)
    if (outer === null) return
    if (this.outerFollow?.scroll !== outer) {
      this.outerFollow?.steward.release()
      this.outerFollow = { scroll: outer, steward: FollowSteward.acquire(outer, this.win) }
    }
    this.outerFollow.steward.pinIfFollowing()
  }

  private reconcile(): void {
    if (!this.active) return
    const current = new Set<HTMLElement>()
    for (const root of streamingAssistantRoots(this.doc)) current.add(root)
    for (const root of this.roots) {
      if (!current.has(root) || !root.isConnected) this.clear(root)
    }
    for (const root of current) {
      if (this.roots.has(root)) continue
      this.roots.add(root)
      this.previous.set(root, {
        mask: root.style.getPropertyValue('mask-image'),
        webkit: root.style.getPropertyValue('-webkit-mask-image'),
      })
      root.dataset.streamFade = ''
      this.fade.observe(root)
      const mask = 'linear-gradient(to bottom, #000 calc(100% - 20px), rgba(0, 0, 0, 0.4) 100%)'
      root.style.setProperty('mask-image', mask)
      root.style.setProperty('-webkit-mask-image', mask)
    }
  }

  private clear(root: HTMLElement): void {
    this.roots.delete(root)
    this.fade.unobserve(root)
    const previous = this.previous.get(root)
    delete root.dataset.streamFade
    if (previous?.mask === undefined || previous.mask === '') root.style.removeProperty('mask-image')
    else root.style.setProperty('mask-image', previous.mask)
    if (previous?.webkit === '' || previous?.webkit === undefined) {
      root.style.removeProperty('-webkit-mask-image')
    } else {
      root.style.setProperty('-webkit-mask-image', previous.webkit)
    }
  }
}
