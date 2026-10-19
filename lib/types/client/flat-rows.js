import { DISCLOSURE_MOTION_MS, closeDisclosure, openDisclosure } from "./disclosure-motion.js";
import { decideWindow, } from "./decision.js";
const FLOW_SELECTOR = '[data-chat-flow]:not([data-step-process-content])';
const FLOW_SLOT_SELECTOR = '[data-slot="conversation.chat.flow"]';
const RUNNING_SELECTOR = '[data-chat-running]';
const DISCLOSURE_SELECTOR = '[data-disclosure-row][aria-expanded]';
const BASH_SELECTOR = '[data-sample="bash"][aria-expanded]';
const ATTRIBUTE_FILTER = [
    'aria-expanded',
    'data-chat-following-tail',
    'data-chat-running',
    'data-expanded',
    'data-state',
];
/**
 * Row-level enhancement for Detailed and Verbose Turns.
 *
 * Those modes intentionally render process rows flat, without a group body to
 * cap or scroll. This conductor only opens the current reasoning/tool rows and
 * respects the mode's collapse semantics: Detailed may fold older automatic
 * rows, Verbose never does.
 */
export class FlatRowConductor {
    mode;
    doc;
    win;
    active = false;
    frame = null;
    observer = null;
    autoClickDepth = 0;
    autoKeys = new Set();
    manualRows = new Map();
    pendingClose = new Set();
    transitionTimer = null;
    outer = null;
    outerIntent = false;
    outerGestureAt = 0;
    outerCheckTimer = null;
    /**
     * @param mode - Detailed or Verbose.
     * @param doc - document owning the transcript.
     * @param win - window supplying observers and animation frames.
     */
    constructor(mode, doc = document, win = window) {
        this.mode = mode;
        this.doc = doc;
        this.win = win;
    }
    /** Start observing flat process rows. Idempotent. */
    start() {
        if (this.active)
            return;
        this.active = true;
        this.doc.addEventListener('click', this.onClick, true);
        const body = this.doc.body;
        if (body !== null) {
            this.observer = new this.win.MutationObserver(records => { this.onMutations(records); });
            this.observer.observe(body, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: [...ATTRIBUTE_FILTER],
            });
        }
        this.attachOuterFollow();
        this.sync();
    }
    /** Stop observing. Verbose rows that were opened stay open by design. */
    stop() {
        if (!this.active)
            return;
        this.active = false;
        this.doc.removeEventListener('click', this.onClick, true);
        this.observer?.disconnect();
        this.observer = null;
        if (this.frame !== null) {
            this.win.cancelAnimationFrame(this.frame);
            this.frame = null;
        }
        if (this.transitionTimer !== null) {
            this.win.clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        this.detachOuterFollow();
        this.pendingClose.clear();
        this.autoKeys.clear();
        this.manualRows.clear();
    }
    /** Reconcile the newest Turn's flat rows. Public for tests. */
    sync() {
        if (!this.active || this.transitionTimer !== null)
            return;
        const running = this.doc.querySelector(RUNNING_SELECTOR);
        if (running === null)
            return;
        if (this.doc.querySelector('[data-chat-following-tail]') !== null)
            this.outerIntent = true;
        const flow = running.closest(FLOW_SELECTOR);
        if (flow === null)
            return;
        const slot = flow.querySelector(FLOW_SLOT_SELECTOR) ?? flow;
        let latest = Number.NEGATIVE_INFINITY;
        for (const element of slot.querySelectorAll('[data-chat-turn]')) {
            const turn = Number(element.getAttribute('data-chat-turn'));
            if (Number.isFinite(turn) && turn > latest)
                latest = turn;
        }
        if (!Number.isFinite(latest))
            return;
        // Detailed keeps rows inside a group wrapper whose header is hidden and
        // whose body is directly visible. Verbose may render them flat. Selecting
        // every process row in the newest Turn covers both shapes.
        const rows = [...slot.querySelectorAll('[data-chat-flow-kind]')]
            .filter(row => Number(row.getAttribute('data-chat-turn')) === latest);
        const elements = new Map();
        const candidates = [];
        let order = 0;
        for (const row of rows) {
            const candidate = this.candidate(row, order++);
            if (candidate === undefined)
                continue;
            elements.set(candidate.key, candidate);
            const { element: _element, ...model } = candidate;
            candidates.push(model);
        }
        const decision = decideWindow({ open: true, suppressed: false, candidates });
        const opens = decision.open
            .map(key => elements.get(key))
            .filter((candidate) => candidate !== undefined && !candidate.open && candidate.element.isConnected);
        let closeAnimated = false;
        if (this.mode === 'detailed') {
            for (const key of decision.close) {
                const candidate = elements.get(key);
                if (candidate === undefined || !candidate.open || !candidate.element.isConnected)
                    continue;
                if (this.closeRow(candidate.element))
                    closeAnimated = true;
                this.autoKeys.delete(key);
            }
        }
        if (closeAnimated && opens.length > 0) {
            this.deferSync();
            return;
        }
        for (const candidate of opens) {
            this.openRow(candidate.element);
            this.autoKeys.add(candidate.key);
        }
        this.scheduleOuterCheck();
    }
    attachOuterFollow() {
        const outer = this.doc.querySelector('[data-conversation-scroll]');
        if (outer === null || outer === this.outer)
            return;
        this.detachOuterFollow();
        this.outer = outer;
        this.outerIntent = this.doc.querySelector('[data-chat-following-tail]') !== null || this.nearBottom(outer);
        outer.addEventListener('scroll', this.onOuterScroll, { passive: true });
        outer.addEventListener('scrollend', this.onOuterScrollEnd);
        for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
            outer.addEventListener(type, this.onOuterGesture, { passive: true, capture: true });
        }
    }
    detachOuterFollow() {
        const outer = this.outer;
        if (outer !== null) {
            outer.removeEventListener('scroll', this.onOuterScroll);
            outer.removeEventListener('scrollend', this.onOuterScrollEnd);
            for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
                outer.removeEventListener(type, this.onOuterGesture, true);
            }
        }
        this.outer = null;
        this.outerIntent = false;
        if (this.outerCheckTimer !== null) {
            this.win.clearTimeout(this.outerCheckTimer);
            this.outerCheckTimer = null;
        }
    }
    nearBottom(element) {
        return Math.max(0, element.scrollHeight - element.clientHeight) - element.scrollTop <= 2;
    }
    onOuterGesture = () => { this.outerGestureAt = this.win.Date.now(); };
    onOuterScroll = () => {
        const outer = this.outer;
        if (outer === null)
            return;
        if (this.nearBottom(outer))
            this.outerIntent = true;
        else if (this.win.Date.now() - this.outerGestureAt < 1200)
            this.outerIntent = false;
    };
    onOuterScrollEnd = () => { this.scheduleOuterCheck(0); };
    scheduleOuterCheck(delay = 350) {
        if (!this.outerIntent || this.outerCheckTimer !== null)
            return;
        this.startOuterCheck(delay);
    }
    /** Restart the check after an automatic row motion so it fires after that motion. */
    armOuterCheck(delay = 350) {
        if (!this.outerIntent)
            return;
        if (this.outerCheckTimer !== null) {
            this.win.clearTimeout(this.outerCheckTimer);
            this.outerCheckTimer = null;
        }
        this.startOuterCheck(delay);
    }
    startOuterCheck(delay) {
        this.outerCheckTimer = this.win.setTimeout(() => {
            this.outerCheckTimer = null;
            const outer = this.outer;
            if (outer === null || !outer.isConnected || !this.outerIntent)
                return;
            if (this.win.Date.now() - this.outerGestureAt < 1000)
                return;
            const floor = Math.max(0, outer.scrollHeight - outer.clientHeight);
            if (floor - outer.scrollTop <= 1)
                return;
            outer.scrollTop = floor;
            outer.dispatchEvent(new Event('scroll'));
            this.win.requestAnimationFrame(() => {
                if (outer.isConnected)
                    outer.dispatchEvent(new Event('scrollend'));
            });
        }, delay);
    }
    deferSync() {
        if (this.transitionTimer !== null)
            return;
        this.transitionTimer = this.win.setTimeout(() => {
            this.transitionTimer = null;
            this.sync();
        }, DISCLOSURE_MOTION_MS + 30);
    }
    candidate(row, order) {
        const key = row.getAttribute('data-chat-flow-key');
        if (key === null)
            return undefined;
        const thinking = row.querySelector('[data-variant="think"]');
        const bash = row.querySelector('[data-sample="bash"]');
        const tool = row.querySelector('[data-tool]');
        const kind = thinking !== null
            ? 'reasoning'
            : bash !== null || tool !== null ? 'tool' : undefined;
        if (kind === undefined)
            return undefined;
        const disclosure = kind === 'reasoning'
            ? thinking?.querySelector(DISCLOSURE_SELECTOR)
            : bash ?? tool?.querySelector(DISCLOSURE_SELECTOR);
        if (disclosure === null || disclosure === undefined)
            return undefined;
        const state = kind === 'reasoning'
            ? thinking?.getAttribute('data-state')
            : bash?.getAttribute('data-state') ?? tool?.getAttribute('data-state');
        return {
            key,
            kind,
            order,
            open: disclosure.getAttribute('aria-expanded') === 'true',
            active: state === 'running' || state === 'preparing',
            auto: this.autoKeys.has(key),
            manual: this.manualRows.get(key),
            element: disclosure,
        };
    }
    schedule() {
        if (!this.active || this.frame !== null)
            return;
        this.frame = this.win.requestAnimationFrame(() => {
            this.frame = null;
            this.sync();
        });
    }
    onMutations(records) {
        for (const record of records) {
            const target = record.target instanceof Element ? record.target : record.target.parentElement;
            if (target === null)
                continue;
            if (record.type === 'attributes') {
                const name = record.attributeName;
                if (name === 'data-chat-running' || name === 'data-chat-following-tail') {
                    this.schedule();
                    return;
                }
                if (name !== null && ATTRIBUTE_FILTER.includes(name)
                    && target.closest('[data-chat-flow]') !== null) {
                    this.schedule();
                    return;
                }
                continue;
            }
            if (record.type === 'childList' && target.closest('[data-chat-flow]') !== null) {
                if (target.closest('[data-open]') !== null)
                    continue;
                this.scheduleOuterCheck();
                this.schedule();
                return;
            }
        }
    }
    onClick = (event) => {
        if (this.autoClickDepth > 0)
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const disclosure = target.closest(DISCLOSURE_SELECTOR)
            ?? target.closest(BASH_SELECTOR);
        if (disclosure === null)
            return;
        const key = disclosure.closest('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key');
        if (key === null || key === undefined)
            return;
        this.manualRows.set(key, disclosure.getAttribute('aria-expanded') === 'true' ? 'closed' : 'open');
        this.autoKeys.delete(key);
    };
    openRow(element) {
        openDisclosure(element, this.win, () => this.click(element));
        this.armOuterCheck(DISCLOSURE_MOTION_MS + 90);
    }
    closeRow(element) {
        const animated = closeDisclosure(element, this.win, () => {
            if (this.active)
                this.click(element);
        }, this.pendingClose);
        this.armOuterCheck(DISCLOSURE_MOTION_MS + 90);
        return animated;
    }
    click(element) {
        const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
        const focus = element.focus;
        element.focus = () => { };
        this.autoClickDepth += 1;
        try {
            element.click();
        }
        finally {
            this.autoClickDepth -= 1;
            element.focus = focus;
        }
        if (this.doc.activeElement !== element || previous === element)
            return;
        if (previous !== null && previous !== this.doc.body && previous.isConnected) {
            previous.focus({ preventScroll: true });
        }
        if (this.doc.activeElement === element)
            element.blur();
    }
}
//# sourceMappingURL=flat-rows.js.map