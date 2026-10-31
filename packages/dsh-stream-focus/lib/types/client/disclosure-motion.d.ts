/** Height/opacity motion around the official conditional disclosure bodies. */
export declare const DISCLOSURE_MOTION_MS = 180;
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
export declare function openDisclosure(element: HTMLElement, win: Window & typeof globalThis, toggle: () => void): void;
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
export declare function closeDisclosure(element: HTMLElement, win: Window & typeof globalThis, toggle: () => void, pending: Set<HTMLElement>): boolean;
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
export declare function findDisclosureBody(element: HTMLElement): HTMLElement | null;
