/** Height/opacity motion around the official conditional disclosure bodies. */
export const DISCLOSURE_MOTION_MS = 180;
const MOTION_MS = DISCLOSURE_MOTION_MS;
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const SIZE_TRANSITION = `height ${MOTION_MS}ms ${EASING}, opacity ${MOTION_MS}ms ${EASING}`;
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
export function openDisclosure(element, win, toggle) {
    toggle();
    const body = findDisclosureBody(element);
    if (body === null || !canAnimate(body, win))
        return;
    if (canUseCssSize(win)) {
        body.style.setProperty('interpolate-size', 'allow-keywords');
        body.style.overflow = 'hidden';
        body.style.transition = 'none';
        body.style.height = '0px';
        body.style.opacity = '0';
        void body.offsetHeight;
        body.style.transition = SIZE_TRANSITION;
        body.style.height = 'auto';
        body.style.opacity = '1';
        let settled = false;
        let timer = null;
        const finish = () => {
            if (settled)
                return;
            settled = true;
            if (timer !== null)
                win.clearTimeout(timer);
            body.removeEventListener('transitionend', onEnd);
            clearBody(body);
        };
        const onEnd = (event) => {
            if (event.propertyName === 'height')
                finish();
        };
        body.addEventListener('transitionend', onEnd);
        timer = win.setTimeout(finish, MOTION_MS + 60);
        return;
    }
    const height = body.getBoundingClientRect().height;
    if (height <= 0)
        return;
    body.style.overflow = 'hidden';
    body.style.height = '0px';
    body.style.opacity = '0';
    const animation = body.animate([{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }], { duration: MOTION_MS, easing: EASING });
    animation.addEventListener('finish', () => { clearBody(body); }, { once: true });
    animation.addEventListener('cancel', () => { clearBody(body); }, { once: true });
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
export function closeDisclosure(element, win, toggle, pending) {
    if (pending.has(element))
        return false;
    const body = findDisclosureBody(element);
    if (body === null || !canAnimate(body, win)) {
        toggle();
        return false;
    }
    const height = body.getBoundingClientRect().height;
    if (height <= 0) {
        toggle();
        return false;
    }
    pending.add(element);
    if (canUseCssSize(win)) {
        body.style.setProperty('interpolate-size', 'allow-keywords');
        body.style.overflow = 'hidden';
        body.style.transition = 'none';
        body.style.height = `${height}px`;
        body.style.opacity = '1';
        void body.offsetHeight;
        body.style.transition = SIZE_TRANSITION;
        body.style.height = '0px';
        body.style.opacity = '0';
        let settled = false;
        let timer = null;
        const finish = () => {
            if (settled)
                return;
            settled = true;
            if (timer !== null)
                win.clearTimeout(timer);
            body.removeEventListener('transitionend', onEnd);
            clearBody(body);
            pending.delete(element);
            toggle();
        };
        const onEnd = (event) => {
            if (event.propertyName === 'height')
                finish();
        };
        body.addEventListener('transitionend', onEnd);
        timer = win.setTimeout(finish, MOTION_MS + 60);
        return true;
    }
    body.style.overflow = 'hidden';
    body.style.height = `${height}px`;
    body.style.opacity = '1';
    const animation = body.animate([{ height: `${height}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: MOTION_MS, easing: EASING });
    let settled = false;
    const finish = () => {
        if (settled)
            return;
        settled = true;
        clearBody(body);
        pending.delete(element);
        toggle();
    };
    animation.addEventListener('finish', finish, { once: true });
    animation.addEventListener('cancel', finish, { once: true });
    return true;
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
export function findDisclosureBody(element) {
    let node = element;
    for (let depth = 0; depth < 3; depth += 1) {
        const parent = node.parentElement;
        if (parent === null)
            break;
        for (const child of parent.children) {
            if (!(child instanceof HTMLElement) || child === node || child.contains(element))
                continue;
            if (child.matches('script, style'))
                continue;
            if (child.getBoundingClientRect().height > 0)
                return child;
        }
        node = parent;
    }
    return null;
}
function clearBody(body) {
    body.style.removeProperty('transition');
    body.style.removeProperty('height');
    body.style.removeProperty('opacity');
    body.style.removeProperty('overflow');
    body.style.removeProperty('interpolate-size');
}
function canUseCssSize(win) {
    const css = win.CSS;
    return typeof css?.supports === 'function' && css.supports('interpolate-size', 'allow-keywords');
}
function canAnimate(body, win) {
    return typeof body.animate === 'function'
        && (typeof win.matchMedia !== 'function' || !win.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
//# sourceMappingURL=disclosure-motion.js.map