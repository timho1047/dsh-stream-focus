/** CSS Custom Highlight based fade for streamed text without DOM mutation. */

const FADE_MS = 240
const MAX_GLYPHS = 160
const STEPS = 12
const ALPHAS = [0.03, 0.06, 0.1, 0.16, 0.24, 0.34, 0.46, 0.6, 0.74, 0.86, 0.95, 1]
const SKIP = 'code,pre,a,.katex,script,style'

interface HighlightLike {
  add(range: Range): void
  delete(range: Range): void
}

interface HighlightCtor {
  new (...ranges: Range[]): HighlightLike
}

interface HighlightRealm {
  Highlight?: HighlightCtor
  CSS?: { highlights?: Map<string, HighlightLike> }
}

interface Glyph {
  readonly range: Range
  readonly text: string
  readonly born: number
  bucket: number
}

/**
 * Fade newly appended text by highlighting its grapheme ranges.
 *
 * The browser's highlight registry styles text ranges without changing the
 * DOM, so React ownership, Markdown structure, selection, and copy semantics
 * stay untouched. Unsupported browsers simply see the normal output.
 */
export class HighlightFade {
  private readonly realm: HighlightRealm
  private readonly highlights: HighlightLike[] = []
  private readonly observer: MutationObserver | null
  private readonly roots = new Set<HTMLElement>()
  private readonly texts = new WeakMap<HTMLElement, string>()
  private readonly glyphs: Glyph[] = []
  private frame: number | null = null

  /**
   * @param doc - document owning the text.
   * @param win - window exposing CSS.highlights.
   * @param name - unique highlight namespace for this fade instance.
   */
  constructor(
    private readonly doc: Document = document,
    private readonly win: Window & typeof globalThis = window,
    private readonly name = 'dsh-stream-fade',
  ) {
    this.realm = win as unknown as HighlightRealm
    const registry = this.realm.CSS?.highlights
    const Ctor = this.realm.Highlight
    if (registry === undefined || Ctor === undefined) {
      this.observer = null
      return
    }
    for (let index = 0; index < STEPS; index += 1) {
      const highlight = new Ctor()
      this.highlights.push(highlight)
      registry.set(`${name}-${index}`, highlight)
    }
    this.installStyle()
    this.observer = new this.win.MutationObserver(() => { this.scan() })
  }

  /** Observe a root and start fading its newly appended text. */
  observe(root: HTMLElement): void {
    if (this.observer === null || this.roots.has(root)) return
    this.roots.add(root)
    root.dataset.highlightFade = this.name
    this.texts.set(root, this.textOf(root))
    this.observer.observe(root, { subtree: true, childList: true, characterData: true })
  }

  /** Stop observing one root and drop its pending ranges. */
  unobserve(root: HTMLElement): void {
    this.roots.delete(root)
    delete root.dataset.highlightFade
    this.dropRanges(root)
    if (this.roots.size === 0) this.observer?.disconnect()
  }

  /** Stop observing everything and clear the registry. */
  stop(): void {
    for (const root of this.roots) delete root.dataset.highlightFade
    this.roots.clear()
    this.glyphs.length = 0
    this.clearHighlights()
    this.observer?.disconnect()
    if (this.frame !== null) {
      this.win.cancelAnimationFrame(this.frame)
      this.frame = null
    }
    const registry = this.realm.CSS?.highlights
    if (registry !== undefined) for (let index = 0; index < STEPS; index += 1) registry.delete(`${this.name}-${index}`)
  }

  private installStyle(): void {
    const id = `dsh-stream-focus-${this.name}`
    if (this.doc.getElementById(id) !== null) return
    const style = this.doc.createElement('style')
    style.id = id
    style.textContent = ALPHAS.map((alpha, index) => (
      `::highlight(${this.name}-${index}){color:color-mix(in srgb,currentColor ${Math.round(alpha * 100)}%,transparent)}`
    )).join('\n')
    this.doc.head.append(style)
  }

  private scan(): void {
    for (const root of this.roots) this.scanRoot(root)
  }

  /** Diff one root's visible text and fade only a genuinely appended suffix. */
  private scanRoot(root: HTMLElement): void {
    const nodes = this.textNodes(root)
    const next = nodes.map(entry => entry.text).join('')
    const previous = this.texts.get(root)
    this.texts.set(root, next)
    if (previous === undefined || !next.startsWith(previous)) {
      this.dropRanges(root)
      return
    }
    const start = previous.length
    if (start >= next.length) return
    const segmenter = typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null
    const now = this.win.performance.now()
    if (segmenter === null) {
      for (let index = start; index < next.length; index += 1) this.pushOffset(nodes, index, index + 1, now)
    } else {
      for (const part of segmenter.segment(next.slice(start))) {
        const from = start + part.index
        this.pushOffset(nodes, from, from + part.segment.length, now)
      }
    }
    while (this.glyphs.length > MAX_GLYPHS) {
      const dropped = this.glyphs.shift()
      if (dropped !== undefined) this.setBucket(dropped, STEPS - 1)
    }
    this.schedule()
  }

  /** Collect visible text nodes and their offsets in one pass. */
  private textNodes(root: HTMLElement): { node: Text; start: number; text: string }[] {
    const walker = this.doc.createTreeWalker(root, 4)
    const nodes: { node: Text; start: number; text: string }[] = []
    let offset = 0
    let node = walker.nextNode()
    while (node !== null) {
      const text = node as Text
      if (text.parentElement?.closest(SKIP) === null) {
        const data = text.data
        nodes.push({ node: text, start: offset, text: data })
        offset += data.length
      }
      node = walker.nextNode()
    }
    return nodes
  }

  private textOf(root: HTMLElement): string {
    return this.textNodes(root).map(entry => entry.text).join('')
  }

  private pushOffset(
    nodes: readonly { node: Text; start: number; text: string }[], from: number, to: number, born: number,
  ): void {
    for (const entry of nodes) {
      const end = entry.start + entry.text.length
      const start = Math.max(from, entry.start)
      const finish = Math.min(to, end)
      if (start >= finish) continue
      this.pushGlyph(entry.node, start - entry.start, finish - entry.start, born)
    }
  }

  private pushGlyph(node: Text, start: number, end: number, born: number): void {
    if (start >= end) return
    const range = this.doc.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    this.glyphs.push({ range, text: range.toString(), born, bucket: 0 })
    this.highlights[0]?.add(range)
  }

  private schedule(): void {
    if (this.frame !== null) return
    this.frame = this.win.requestAnimationFrame(() => {
      this.frame = null
      this.update()
    })
  }

  private update(): void {
    const now = this.win.performance.now()
    let pending = false
    for (let index = this.glyphs.length - 1; index >= 0; index -= 1) {
      const glyph = this.glyphs[index]
      if (glyph === undefined) continue
      // React can reuse a Text node while changing its content. The Range then
      // still points at an offset that now names a different character; drop it
      // instead of leaving that character transparent while its neighbour shows.
      if (!glyph.range.startContainer.isConnected || glyph.range.toString() !== glyph.text
        || now - glyph.born >= FADE_MS) {
        this.setBucket(glyph, STEPS - 1)
        this.glyphs.splice(index, 1)
        continue
      }
      const bucket = Math.min(STEPS - 1, Math.floor(((now - glyph.born) / FADE_MS) * STEPS))
      if (bucket !== glyph.bucket) this.setBucket(glyph, bucket)
      pending = true
    }
    if (pending) this.schedule()
    else this.clearHighlights()
  }

  private setBucket(glyph: Glyph, bucket: number): void {
    this.highlights[glyph.bucket]?.delete(glyph.range)
    glyph.bucket = bucket
    if (bucket < STEPS - 1) this.highlights[bucket]?.add(glyph.range)
  }

  private clearHighlights(): void {
    for (const highlight of this.highlights) {
      for (const glyph of this.glyphs) highlight.delete(glyph.range)
    }
  }

  private dropRanges(root: HTMLElement): void {
    for (let index = this.glyphs.length - 1; index >= 0; index -= 1) {
      const glyph = this.glyphs[index]
      if (glyph !== undefined && root.contains(glyph.range.startContainer)) {
        this.setBucket(glyph, STEPS - 1)
        this.glyphs.splice(index, 1)
      }
    }
  }
}
