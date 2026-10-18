/** Frame-level pacing math shared by text reveal and window following. */
/** Frames used to catch up with newly arrived text; keeps latency near 100ms. */
const CATCH_UP_FRAMES = 6;
/** Fraction of the remaining scroll distance consumed per frame. */
const FOLLOW_EASING = 0.22;
/** Smallest scroll movement that still reads as motion rather than a snap. */
const FOLLOW_MIN_STEP = 1;
/** Remaining distance treated as already at the bottom. */
const FOLLOW_SNAP_PX = 0.25;
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
export function nextRevealLength(current, target) {
    if (current >= target.length)
        return target.length;
    const step = Math.max(1, Math.ceil((target.length - current) / CATCH_UP_FRAMES));
    let next = Math.min(target.length, current + step);
    if (next < target.length
        && isHighSurrogate(target.charCodeAt(next - 1))
        && isLowSurrogate(target.charCodeAt(next))) {
        next += 1;
    }
    return advanceGrapheme(target, next);
}
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
export function nextFollowTop(current, floor) {
    if (floor <= current)
        return floor;
    const delta = floor - current;
    if (delta <= FOLLOW_SNAP_PX)
        return floor;
    return Math.min(floor, current + Math.max(FOLLOW_MIN_STEP, delta * FOLLOW_EASING));
}
function advanceGrapheme(target, start) {
    let next = start;
    while (next < target.length) {
        const code = target.charCodeAt(next);
        if (isExtend(code) || code === 0x200D) {
            next += 1;
            continue;
        }
        if (target.charCodeAt(next - 1) === 0x200D) {
            next += isHighSurrogate(code) && isLowSurrogate(target.charCodeAt(next + 1)) ? 2 : 1;
            continue;
        }
        break;
    }
    return next;
}
function isExtend(code) {
    return (code >= 0x0300 && code <= 0x036F)
        || (code >= 0x1AB0 && code <= 0x1AFF)
        || (code >= 0x1DC0 && code <= 0x1DFF)
        || (code >= 0x20D0 && code <= 0x20FF)
        || (code >= 0xFE00 && code <= 0xFE0F)
        || (code >= 0xFE20 && code <= 0xFE2F)
        || (code >= 0x1F3FB && code <= 0x1F3FF)
        || (code >= 0xE0100 && code <= 0xE01EF);
}
function isHighSurrogate(code) {
    return code !== undefined && code >= 0xD800 && code <= 0xDBFF;
}
function isLowSurrogate(code) {
    return code !== undefined && code >= 0xDC00 && code <= 0xDFFF;
}
//# sourceMappingURL=pacing.js.map