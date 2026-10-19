/** Height/opacity motion around the official conditional disclosure bodies. */

export const DISCLOSURE_MOTION_MS = 180
const MOTION_MS = DISCLOSURE_MOTION_MS
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

/**
 * Animate a disclosure open after its official click.
 *
 * Disclosure bodies are conditionally mounted, so there is no persistent
 * height to transition. The new body is measured, pinned to zero for one
 * commit, then animated to its natural height while fading in.
 *
 * @param element - disclosure control that was clicked.
 * @param win - window owning animation and reduced-motion preferences.
 * @param toggle - official click action.
 */
export function openDisclosure(
  element: HTMLElement,
  win: Window & typeof globalThis,
  toggle: () => void,
): void {
  toggle()
  const body = findDisclosureBody(element)
  if (body === null || !canAnimate(body, win)) return
  const height = body.getBoundingClientRect().height
  if (height <= 0) return
  body.style.overflow = 'hidden'
  body.style.height = '0px'
  body.style.opacity = '0'
  const animation = body.animate(
    [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }],
    { duration: MOTION_MS, easing: EASING },
  )
  const stopGuard = holdOuterScroll(element, win)
  const clear = (): void => {
    stopGuard()
    body.style.overflow = ''
    body.style.height = ''
    body.style.opacity = ''
  }
  animation.addEventListener('finish', clear, { once: true })
  animation.addEventListener('cancel', clear, { once: true })
}

/**
 * Animate a disclosure closed, then run the official click.
 *
 * The body stays mounted during the shrink. A pending set prevents the next
 * reconciliation from starting a second close on the same row.
 *
 * @param element - disclosure control that would be clicked.
 * @param win - window owning animation and reduced-motion preferences.
 * @param toggle - official click action.
 * @param pending - rows currently waiting for their close animation.
 */
export function closeDisclosure(
  element: HTMLElement,
  win: Window & typeof globalThis,
  toggle: () => void,
  pending: Set<HTMLElement>,
): boolean {
  if (pending.has(element)) return false
  const body = findDisclosureBody(element)
  if (body === null || !canAnimate(body, win)) {
    toggle()
    return false
  }
  const height = body.getBoundingClientRect().height
  if (height <= 0) {
    toggle()
    return false
  }
  pending.add(element)
  body.style.overflow = 'hidden'
  body.style.height = `${height}px`
  body.style.opacity = '1'
  const animation = body.animate(
    [{ height: `${height}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
    { duration: MOTION_MS, easing: EASING },
  )
  const stopGuard = holdOuterScroll(element, win)
  let settled = false
  const finish = (): void => {
    stopGuard()
    if (settled) return
    settled = true
    body.style.overflow = ''
    body.style.height = ''
    body.style.opacity = ''
    pending.delete(element)
    toggle()
  }
  animation.addEventListener('finish', finish, { once: true })
  animation.addEventListener('cancel', finish, { once: true })
  return true
}

/**
 * Find the body belonging to a disclosure control.
 *
 * Standard disclosures put the body beside the header wrapper; Bash puts its
 * body next to the clickable row inside the card. Walking a few ancestors and
 * taking the first non-containing sibling covers both shapes.
 *
 * @param element - clicked disclosure control.
 * @returns the mounted body, if any.
 */
export function findDisclosureBody(element: HTMLElement): HTMLElement | null {
  let node: HTMLElement = element
  for (let depth = 0; depth < 3; depth += 1) {
    const parent = node.parentElement
    if (parent === null) break
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement) || child === node || child.contains(element)) continue
      if (child.matches('script, style')) continue
      if (child.getBoundingClientRect().height > 0) return child
    }
    node = parent
  }
  return null
}

const outerHolds = new WeakMap<HTMLElement, number>()

/** Whether a disclosure transition is currently holding an outer scroll container. */
export function isOuterHeld(outer: HTMLElement): boolean {
  return (outerHolds.get(outer) ?? 0) > 0
}

/**
 * Freeze the outer transcript while a disclosure height animation runs.
 *
 * Pinning to the bottom here would move the content above the collapsing row
 * down, then move it up again when the next row opens. Holding the scroll
 * offset instead anchors everything above the transition in place.
 */
function holdOuterScroll(element: HTMLElement, win: Window & typeof globalThis): () => void {
  const outer = element.closest<HTMLElement>('[data-conversation-scroll]')
  if (outer === null) return () => {}
  const top = outer.scrollTop
  outerHolds.set(outer, (outerHolds.get(outer) ?? 0) + 1)
  let frame = 0
  const tick = (): void => {
    if (Math.abs(outer.scrollTop - top) > 0.5) outer.scrollTop = top
    frame = win.requestAnimationFrame(tick)
  }
  frame = win.requestAnimationFrame(tick)
  return () => {
    win.cancelAnimationFrame(frame)
    const count = (outerHolds.get(outer) ?? 1) - 1
    if (count <= 0) outerHolds.delete(outer)
    else outerHolds.set(outer, count)
  }
}

function canAnimate(body: HTMLElement, win: Window & typeof globalThis): boolean {
  return typeof body.animate === 'function'
    && (typeof win.matchMedia !== 'function' || !win.matchMedia('(prefers-reduced-motion: reduce)').matches)
}
