/** Frame-level pacing math shared by text reveal and window following. */
/**
 * Reveal the next character slice on one animation frame.
 *
 * The step adapts to the backlog, so a normal chunk catches up in roughly six
 * frames while a large burst is spread over the same short interval instead of
 * appearing all at once. Surrogate pairs stay intact, avoiding one-frame
 * replacement glyphs for non-BMP text.
 *
 * @param current - currently revealed UTF-16 length.
 * @param target - complete text being revealed.
 * @returns the next revealed UTF-16 length.
 */
export declare function nextRevealLength(current: number, target: string): number;
/**
 * Move the window one frame toward its newest content.
 *
 * A proportional step plus a small floor makes the window feel attached to the
 * text without reproducing every content jump as an instant scroll. Overshoot
 * and movement away from the floor are impossible.
 *
 * @param current - current scroll offset.
 * @param floor - maximum scroll offset for the current content.
 * @returns the next scroll offset.
 */
export declare function nextFollowTop(current: number, floor: number): number;
