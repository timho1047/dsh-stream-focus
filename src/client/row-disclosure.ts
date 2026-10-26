import type { ManualChoice } from './decision.ts'

const DISCLOSURE = '[data-disclosure-row][aria-expanded]'
const BASH = '[data-sample="bash"][aria-expanded]'

/** Shared row ownership, manual-choice tracking and disclosure clicks. */
export class RowDisclosureController {
  private readonly autoKeys = new Set<string>()
  private readonly manualRows = new Map<string, Exclude<ManualChoice, undefined>>()
  private depth = 0

  constructor(
    private readonly doc: Document = document,
    private readonly win: Window & typeof globalThis = window,
    private readonly restoreFocus = false,
  ) {}

  start(): void { this.doc.addEventListener('click', this.onClick, true) }

  stop(): void {
    this.doc.removeEventListener('click', this.onClick, true)
    this.reset()
  }

  reset(): void {
    this.autoKeys.clear()
    this.manualRows.clear()
  }

  isAuto(key: string): boolean { return this.autoKeys.has(key) }
  manual(key: string): Exclude<ManualChoice, undefined> | undefined { return this.manualRows.get(key) }
  markAuto(key: string): void { this.autoKeys.add(key) }
  forgetAuto(key: string): void { this.autoKeys.delete(key) }

  /** Run an official click without recording it as a manual choice. */
  runAutomatic(action: () => void): void {
    this.depth += 1
    try { action() } finally { this.depth -= 1 }
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (this.depth > 0) return
    const target = event.target
    if (!(target instanceof Element)) return
    const disclosure = target.closest<HTMLElement>(DISCLOSURE)
      ?? target.closest<HTMLElement>(BASH)
    if (disclosure === null) return
    const nested = target.closest('a, button, input, textarea, select, [contenteditable="true"]')
    if (this.restoreFocus && nested !== null && nested !== disclosure) return
    const key = disclosure.closest<HTMLElement>('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key')
    if (key === null || key === undefined) return
    this.manualRows.set(key, disclosure.getAttribute('aria-expanded') === 'true' ? 'closed' : 'open')
    this.autoKeys.delete(key)
  }

  private click(element: HTMLElement): void {
    const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null
    const focus = element.focus
    element.focus = () => {}
    try { element.click() } finally { element.focus = focus }
    if (!this.restoreFocus) return
    if (this.doc.activeElement !== element || previous === element) return
    if (previous !== null && previous !== this.doc.body && previous.isConnected) previous.focus({ preventScroll: true })
    if (this.doc.activeElement === element) element.blur()
  }
}
