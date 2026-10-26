import { closeDisclosure, openDisclosure } from "./disclosure-motion.js";
const DISCLOSURE = '[data-disclosure-row][aria-expanded]';
const BASH = '[data-sample="bash"][aria-expanded]';
/** Shared row ownership, manual-choice tracking and disclosure clicks. */
export class RowDisclosureController {
    doc;
    win;
    restoreFocus;
    autoKeys = new Set();
    manualRows = new Map();
    pendingClose = new Set();
    depth = 0;
    constructor(doc = document, win = window, restoreFocus = false) {
        this.doc = doc;
        this.win = win;
        this.restoreFocus = restoreFocus;
    }
    start() { this.doc.addEventListener('click', this.onClick, true); }
    stop() {
        this.doc.removeEventListener('click', this.onClick, true);
        this.reset();
    }
    reset() {
        this.autoKeys.clear();
        this.manualRows.clear();
        this.pendingClose.clear();
    }
    isAuto(key) { return this.autoKeys.has(key); }
    manual(key) { return this.manualRows.get(key); }
    markAuto(key) { this.autoKeys.add(key); }
    forgetAuto(key) { this.autoKeys.delete(key); }
    /** Run an official click without recording it as a manual choice. */
    runAutomatic(action) {
        this.depth += 1;
        try {
            action();
        }
        finally {
            this.depth -= 1;
        }
    }
    /** Open a row and remember that the plugin owns it. */
    open(element, key) {
        openDisclosure(element, this.win, () => this.runAutomatic(() => this.click(element)));
        this.markAuto(key);
    }
    /** Close a row; returns whether a shrink animation is pending. */
    close(element, key) {
        this.forgetAuto(key);
        return closeDisclosure(element, this.win, () => this.runAutomatic(() => this.click(element)), this.pendingClose);
    }
    onClick = (event) => {
        if (this.depth > 0)
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const disclosure = target.closest(DISCLOSURE)
            ?? target.closest(BASH);
        if (disclosure === null)
            return;
        const nested = target.closest('a, button, input, textarea, select, [contenteditable="true"]');
        if (this.restoreFocus && nested !== null && nested !== disclosure)
            return;
        const key = disclosure.closest('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key');
        if (key === null || key === undefined)
            return;
        this.manualRows.set(key, disclosure.getAttribute('aria-expanded') === 'true' ? 'closed' : 'open');
        this.autoKeys.delete(key);
    };
    click(element) {
        const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
        const focus = element.focus;
        element.focus = () => { };
        try {
            element.click();
        }
        finally {
            element.focus = focus;
        }
        if (!this.restoreFocus)
            return;
        if (this.doc.activeElement !== element || previous === element)
            return;
        if (previous !== null && previous !== this.doc.body && previous.isConnected)
            previous.focus({ preventScroll: true });
        if (this.doc.activeElement === element)
            element.blur();
    }
}
//# sourceMappingURL=row-disclosure.js.map