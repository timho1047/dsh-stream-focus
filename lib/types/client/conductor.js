import { DISCLOSURE_MOTION_MS, closeDisclosure, openDisclosure } from "./disclosure-motion.js";
import { HighlightFade } from "./highlight-fade.js";
import { JumpSmoother } from "./jump-smoother.js";
import { decideWindow, } from "./decision.js";
const GROUP_SELECTOR = '[data-chat-group-key]';
const GROUP_CONTENT_SELECTOR = '[data-step-process-content]';
const RUNNING_SELECTOR = '[data-chat-running]';
const DISCLOSURE_SELECTOR = '[data-disclosure-row][aria-expanded]';
const OPEN_FADE_MS = 180;
const ATTRIBUTE_FILTER = [
    'aria-expanded',
    'data-chat-following-tail',
    'data-chat-running',
    'data-expanded',
    'data-state',
    'hidden',
];
/**
 * Keep the running Turn's process disclosures in one reader-controlled window.
 *
 * The conductor never renders. It reads the semantically attributed Chat DOM,
 * toggles the same disclosure controls a reader would click, and keeps the
 * window pinned to its newest row while the reader has not scrolled away.
 */
export class StreamWindowConductor {
    doc;
    win;
    active = false;
    root = null;
    activeGroup = null;
    frame = null;
    followObserver = null;
    followBody = null;
    followBodyOverflowX = '';
    followBodyMaskImage = '';
    followBodyMinHeight = '';
    followBodyHeight = '';
    followBodyMaxHeight = '';
    heightFrozen = false;
    lastUserGesture = 0;
    followRepairTimer = null;
    fadeElement = null;
    fadeGroup = null;
    fadeGroupPosition = '';
    progressTrack = null;
    progressThumb = null;
    progressFrame = null;
    progressHeight = 0;
    progressTop = 0;
    progressTime = null;
    progressInitialized = false;
    lastContentGrowth = 0;
    followIntent = false;
    contentRepairTimer = null;
    textFade = null;
    jumpSmoother = null;
    outerGuard = null;
    openAnimation = null;
    observer = null;
    /** Rows this plugin opened and is therefore allowed to close later. */
    autoKeys = new Set();
    /** Process groups this plugin opened. */
    autoGroups = new Set();
    /** Group keys the reader deliberately closed. */
    suppressedGroups = new Set();
    /** Reader's explicit open/closed choice per row key. */
    manualRows = new Map();
    pendingClose = new Set();
    transitionTimer = null;
    autoClickDepth = 0;
    /**
     * @param doc - document that owns the running Chat.
     * @param win - window supplying MutationObserver and rAF.
     */
    constructor(doc = document, win = window) {
        this.doc = doc;
        this.win = win;
    }
    /** Start observing the Chat. Idempotent. */
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
        this.sync();
    }
    /** Stop observing and restore every automatic open state. */
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
        this.resetWindow();
        this.root = null;
    }
    /** Reconcile the current DOM with the window decision. Public for tests. */
    sync() {
        if (!this.active || this.transitionTimer !== null)
            return;
        const running = this.doc.querySelector(RUNNING_SELECTOR);
        if (running === null) {
            this.resetWindow();
            return;
        }
        const root = running.closest('[data-chat-flow]:not([data-step-process-content])')
            ?? running.closest('[data-chat-flow]');
        if (root === null) {
            this.resetWindow();
            return;
        }
        if (root !== this.root) {
            this.resetWindow();
            this.root = root;
        }
        const groups = [...root.querySelectorAll(GROUP_SELECTOR)];
        const group = groups.at(-1);
        if (group === undefined)
            return;
        if (!this.isLatestTurn(root, group)) {
            this.resetWindow();
            return;
        }
        if (group !== this.activeGroup) {
            this.cancelOpenAnimation();
            this.detachFollow();
            this.closeOtherWindows(group);
            this.activeGroup = group;
            this.attachFollow(group);
        }
        const snapshot = this.snapshot(group);
        if (snapshot === null)
            return;
        const decision = decideWindow(snapshot.model);
        if (decision.openGroup) {
            this.autoOpen(snapshot.header, group, snapshot.key);
            return;
        }
        const opens = decision.open
            .map(key => snapshot.elements.get(key))
            .filter((candidate) => candidate !== undefined && !candidate.open && candidate.element.isConnected);
        const closes = decision.close
            .map(key => snapshot.elements.get(key))
            .filter((candidate) => candidate !== undefined && candidate.open && candidate.element.isConnected);
        const wasAtBottom = this.followBody !== null && this.nearBottomElement(this.followBody);
        if (opens.length > 0 && closes.length > 0)
            this.freezeWindowHeight();
        let closeAnimated = false;
        for (const candidate of closes) {
            if (this.closeRow(candidate.element))
                closeAnimated = true;
            this.autoKeys.delete(candidate.key);
        }
        if (closeAnimated && opens.length > 0) {
            this.deferSync();
        }
        else {
            for (const candidate of opens) {
                this.openRow(candidate.element);
                this.autoKeys.add(candidate.key);
            }
        }
        if (wasAtBottom && (opens.length > 0 || closes.length > 0))
            this.scheduleFollowRepair();
    }
    /** Bind bottom following and its reader-override signals to the active window. */
    attachFollow(group) {
        const body = group.querySelector('[data-step-process-body]');
        if (body === null)
            return;
        const content = group.querySelector(GROUP_CONTENT_SELECTOR);
        this.followBody = body;
        this.followBodyOverflowX = body.style.overflowX;
        this.followBodyMaskImage = body.style.maskImage;
        this.followBodyMinHeight = body.style.minHeight;
        this.followBodyHeight = body.style.height;
        this.followBodyMaxHeight = body.style.maxHeight;
        // Keep the active window horizontally contained. Official edge fades are
        // suppressed here because they also fade the scrollbar on every follow tick.
        body.style.overflowX = 'hidden';
        body.style.maskImage = 'none';
        this.attachFade(group);
        this.attachProgress(group, body);
        this.textFade = new HighlightFade(this.doc, this.win, 'dsh-stream-process');
        this.textFade.observe(content ?? group);
        this.jumpSmoother = new JumpSmoother(this.win);
        if (content !== null)
            this.jumpSmoother.observe(body, content);
        body.addEventListener('scroll', this.onProgressScroll, { passive: true });
        body.addEventListener('scrollend', this.onFollowSettled);
        body.addEventListener('wheel', this.onReaderGesture, { passive: true });
        body.addEventListener('touchstart', this.onReaderGesture, { passive: true });
        body.addEventListener('pointerdown', this.onReaderGesture, { passive: true });
        body.addEventListener('keydown', this.onReaderGesture);
        if (typeof this.win.ResizeObserver === 'function') {
            this.followObserver = new this.win.ResizeObserver(() => {
                this.lastContentGrowth = this.win.Date.now();
                this.rememberHeight();
                this.scheduleProgress();
                this.scheduleContentRepair();
            });
            this.followObserver.observe(body);
            if (content !== null)
                this.followObserver.observe(content);
        }
    }
    /** Release the active window's observer and reader signals. */
    detachFollow() {
        const body = this.followBody;
        if (body !== null) {
            body.removeEventListener('scroll', this.onProgressScroll);
            body.removeEventListener('scrollend', this.onFollowSettled);
            body.removeEventListener('wheel', this.onReaderGesture);
            body.removeEventListener('touchstart', this.onReaderGesture);
            body.removeEventListener('pointerdown', this.onReaderGesture);
            body.removeEventListener('keydown', this.onReaderGesture);
            body.style.overflowX = this.followBodyOverflowX;
            body.style.maskImage = this.followBodyMaskImage;
            body.style.minHeight = this.followBodyMinHeight;
            body.style.height = this.followBodyHeight;
            body.style.maxHeight = this.followBodyMaxHeight;
        }
        this.removeProgress();
        this.followObserver?.disconnect();
        this.followObserver = null;
        this.followBody = null;
        this.followBodyOverflowX = '';
        this.followBodyMaskImage = '';
        this.followBodyMinHeight = '';
        this.followBodyHeight = '';
        this.followBodyMaxHeight = '';
        this.heightFrozen = false;
        this.followIntent = false;
        this.jumpSmoother?.stop();
        this.jumpSmoother = null;
        if (this.contentRepairTimer !== null) {
            this.win.clearTimeout(this.contentRepairTimer);
            this.contentRepairTimer = null;
        }
        if (this.followRepairTimer !== null) {
            this.win.clearTimeout(this.followRepairTimer);
            this.followRepairTimer = null;
        }
        this.removeFade();
    }
    /** Pin the outer transcript on each height step while the window reveals. */
    startOuterGuard(group) {
        this.stopOuterGuard();
        const outer = group.closest('[data-conversation-scroll]');
        if (outer === null || this.doc.querySelector('[data-chat-following-tail]') === null)
            return;
        if (typeof this.win.ResizeObserver !== 'function')
            return;
        const observer = new this.win.ResizeObserver(() => { this.pinOuterNow(group); });
        observer.observe(group);
        this.outerGuard = { observer, group };
        this.pinOuterNow(group);
    }
    stopOuterGuard() {
        this.outerGuard?.observer.disconnect();
        this.outerGuard = null;
    }
    /** Keep the outer transcript at its floor without waiting a frame for Chat's follow. */
    pinOuterNow(group) {
        const outer = group.closest('[data-conversation-scroll]');
        if (outer === null || this.doc.querySelector('[data-chat-following-tail]') === null)
            return;
        const floor = Math.max(0, outer.scrollHeight - outer.clientHeight);
        if (Math.abs(floor - outer.scrollTop) > 0.5)
            outer.scrollTop = floor;
    }
    /** Fade the lowest content edge so new lines enter instead of popping. */
    attachFade(group) {
        this.removeFade();
        this.fadeGroup = group;
        this.fadeGroupPosition = group.style.position;
        if (this.win.getComputedStyle(group).position === 'static')
            group.style.position = 'relative';
        const fade = this.doc.createElement('div');
        fade.dataset.streamFade = '';
        fade.setAttribute('aria-hidden', 'true');
        fade.style.cssText = 'position:absolute;left:0;right:12px;bottom:0;height:16px;pointer-events:none;'
            + 'background:linear-gradient(to bottom, transparent, color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent));z-index:1';
        group.append(fade);
        this.fadeElement = fade;
    }
    removeFade() {
        this.fadeElement?.remove();
        this.fadeElement = null;
        if (this.fadeGroup !== null)
            this.fadeGroup.style.position = this.fadeGroupPosition;
        this.fadeGroup = null;
        this.fadeGroupPosition = '';
    }
    onReaderGesture = () => { this.lastUserGesture = this.win.Date.now(); };
    onProgressScroll = () => {
        const body = this.followBody;
        if (body !== null) {
            if (this.nearBottomElement(body))
                this.followIntent = true;
            else if (this.win.Date.now() - this.lastUserGesture < 1200)
                this.followIntent = false;
        }
        this.scheduleProgress();
    };
    /** A delayed, one-shot fallback for growth where no reliable scrollend arrives. */
    scheduleContentRepair() {
        if (!this.followIntent || this.contentRepairTimer !== null)
            return;
        this.contentRepairTimer = this.win.setTimeout(() => {
            this.contentRepairTimer = null;
            const body = this.followBody;
            if (body === null || !body.isConnected || !this.followIntent)
                return;
            if (this.win.Date.now() - this.lastUserGesture < 1000)
                return;
            const floor = Math.max(0, body.scrollHeight - body.clientHeight);
            if (floor - body.scrollTop <= 1)
                return;
            body.scrollTop = floor;
            body.dispatchEvent(new Event('scroll'));
            this.win.requestAnimationFrame(() => {
                if (body.isConnected)
                    body.dispatchEvent(new Event('scrollend'));
            });
        }, 350);
    }
    /**
     * Official smooth follow targets the floor measured when growth starts. If content
     * grows again before scrollend, settle can release follow intent even though the
     * reader never moved. Re-anchor once and let the official scrollend sampler adopt
     * the new bottom position.
     */
    onFollowSettled = () => {
        const body = this.followBody;
        if (body === null || !body.isConnected)
            return;
        const now = this.win.Date.now();
        if (now - this.lastUserGesture < 1000)
            return;
        if (now - this.lastContentGrowth > 1500)
            return;
        const floor = Math.max(0, body.scrollHeight - body.clientHeight);
        const delta = floor - body.scrollTop;
        if (delta <= 1 || delta > 120)
            return;
        body.scrollTop = floor;
        body.dispatchEvent(new Event('scroll'));
        this.win.requestAnimationFrame(() => {
            if (body.isConnected)
                body.dispatchEvent(new Event('scrollend'));
        });
    };
    attachProgress(group, body) {
        this.removeProgress();
        const doc = this.doc;
        if (doc.getElementById('dsh-stream-focus-native-scrollbar') === null) {
            const style = doc.createElement('style');
            style.id = 'dsh-stream-focus-native-scrollbar';
            style.textContent = [
                '[data-stream-native-scrollbar]::-webkit-scrollbar-thumb{background:transparent!important}',
                '[data-stream-native-scrollbar]{scrollbar-color:transparent transparent!important}',
            ].join('\n');
            doc.head.append(style);
        }
        body.setAttribute('data-stream-native-scrollbar', '');
        const track = doc.createElement('div');
        track.dataset.streamProgress = '';
        track.setAttribute('aria-hidden', 'true');
        track.style.cssText = 'position:absolute;right:2px;top:8px;bottom:8px;width:3px;pointer-events:none;'
            + 'z-index:2;opacity:0;transition:opacity 160ms ease;';
        const thumb = doc.createElement('div');
        thumb.dataset.streamProgressThumb = '';
        thumb.style.cssText = 'position:absolute;right:0;top:0;width:3px;min-height:18px;border-radius:999px;'
            + 'background:color-mix(in srgb, currentColor 34%, transparent);'
            + 'will-change:height,transform';
        track.append(thumb);
        group.append(track);
        this.progressTrack = track;
        this.progressThumb = thumb;
        this.progressHeight = 0;
        this.progressTop = 0;
        this.progressTime = null;
        this.progressInitialized = false;
        this.scheduleProgress();
    }
    removeProgress() {
        if (this.progressFrame !== null) {
            this.win.cancelAnimationFrame(this.progressFrame);
            this.progressFrame = null;
        }
        this.followBody?.removeAttribute('data-stream-native-scrollbar');
        this.progressTrack?.remove();
        this.progressTrack = null;
        this.progressThumb = null;
        this.progressHeight = 0;
        this.progressTop = 0;
        this.progressTime = null;
        this.progressInitialized = false;
    }
    scheduleProgress() {
        if (this.progressFrame !== null)
            return;
        this.progressFrame = this.win.requestAnimationFrame(time => {
            this.progressFrame = null;
            this.updateProgress(time);
        });
    }
    updateProgress(time) {
        const body = this.followBody;
        const track = this.progressTrack;
        const thumb = this.progressThumb;
        if (body === null || track === null || thumb === null)
            return;
        const trackHeight = track.clientHeight;
        const contentHeight = body.scrollHeight;
        const clientHeight = body.clientHeight;
        if (trackHeight <= 0)
            return;
        if (this.nearBottomElement(body))
            this.followIntent = true;
        if (contentHeight <= clientHeight + 1) {
            track.style.opacity = '0';
            this.progressTime = null;
            this.progressInitialized = false;
            return;
        }
        track.style.opacity = '1';
        const targetHeight = Math.max(18, Math.round(trackHeight * (clientHeight / contentHeight)));
        const travel = Math.max(0, trackHeight - targetHeight);
        const maxScroll = Math.max(1, contentHeight - clientHeight);
        const targetTop = Math.round((body.scrollTop / maxScroll) * travel);
        if (!this.progressInitialized) {
            this.progressInitialized = true;
            this.progressHeight = targetHeight;
            this.progressTop = targetTop;
            this.progressTime = time;
            thumb.style.height = `${targetHeight}px`;
            thumb.style.transform = `translateY(${targetTop}px)`;
            return;
        }
        const elapsed = this.progressTime === null ? 1000 / 60 : Math.min(32, time - this.progressTime);
        this.progressTime = time;
        // Ease the displayed geometry on a time constant so frequent line-height
        // updates cannot restart a CSS transition and make the thumb flicker.
        const factor = 1 - Math.exp(-elapsed / 90);
        this.progressHeight += (targetHeight - this.progressHeight) * factor;
        this.progressTop += (targetTop - this.progressTop) * factor;
        const heightSettled = Math.abs(targetHeight - this.progressHeight) <= 0.25;
        const topSettled = Math.abs(targetTop - this.progressTop) <= 0.25;
        if (heightSettled)
            this.progressHeight = targetHeight;
        if (topSettled)
            this.progressTop = targetTop;
        thumb.style.height = `${this.progressHeight.toFixed(2)}px`;
        thumb.style.transform = `translateY(${this.progressTop.toFixed(2)}px)`;
        if (!heightSettled || !topSettled)
            this.scheduleProgress();
        else
            this.progressTime = null;
    }
    nearBottomElement(body) {
        return body.scrollHeight - body.clientHeight - body.scrollTop <= 2;
    }
    /**
     * Re-arm official follow after a row transition when the reader never touched
     * the window and it was following before the transition. This is a one-shot
     * repair, not a second follow loop.
     */
    scheduleFollowRepair() {
        if (this.followRepairTimer !== null)
            this.win.clearTimeout(this.followRepairTimer);
        this.followRepairTimer = this.win.setTimeout(() => {
            this.followRepairTimer = null;
            const body = this.followBody;
            if (body === null || !body.isConnected)
                return;
            if (this.win.Date.now() - this.lastUserGesture < 1000)
                return;
            if (this.nearBottomElement(body))
                return;
            body.scrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
            this.win.requestAnimationFrame(() => {
                body.dispatchEvent(new Event('scrollend'));
            });
        }, DISCLOSURE_MOTION_MS + 420);
    }
    /** Freeze the window height for a row-to-row transition so outer follow has no floor change. */
    freezeWindowHeight() {
        const body = this.followBody;
        if (body === null || this.heightFrozen)
            return;
        const height = body.getBoundingClientRect().height;
        if (height <= 0)
            return;
        this.heightFrozen = true;
        const fixed = `${Math.ceil(height)}px`;
        body.style.height = fixed;
        body.style.maxHeight = fixed;
        body.style.minHeight = fixed;
    }
    /** Keep the active window from shrinking below the height it has already shown. */
    rememberHeight() {
        const body = this.followBody;
        if (body === null)
            return;
        const height = body.getBoundingClientRect().height;
        const held = Number.parseFloat(body.style.minHeight) || 0;
        if (height > held)
            body.style.minHeight = `${height}px`;
    }
    /** Whether this is the newest Turn, so a stale group cannot capture a new turn. */
    isLatestTurn(root, group) {
        const groupTurn = group.getAttribute('data-chat-turn');
        if (groupTurn === null)
            return false;
        let latest = Number.NEGATIVE_INFINITY;
        for (const element of root.querySelectorAll('[data-chat-turn]')) {
            const turn = Number(element.getAttribute('data-chat-turn'));
            if (Number.isFinite(turn) && turn > latest)
                latest = turn;
        }
        return Number(groupTurn) === latest;
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
            if (record.type === 'attributes') {
                const name = record.attributeName;
                if (name === null || !(record.target instanceof Element))
                    continue;
                if (name === 'data-chat-running' || name === 'data-chat-following-tail') {
                    this.schedule();
                    return;
                }
                if (!ATTRIBUTE_FILTER.includes(name))
                    continue;
                if (record.target.closest(GROUP_SELECTOR) !== null) {
                    this.schedule();
                    return;
                }
                continue;
            }
            if (record.type !== 'childList')
                continue;
            const target = record.target instanceof Element ? record.target : record.target.parentElement;
            if (target === null)
                continue;
            // Token and Markdown churn inside an already open body cannot change ownership.
            if (target.closest('[data-open]') !== null
                && target.closest('[data-variant="think"], [data-tool]') !== null)
                continue;
            if (target.closest(GROUP_CONTENT_SELECTOR) !== null
                || containsRunningRoot(record.addedNodes)
                || containsRunningRoot(record.removedNodes)) {
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
            ?? target.closest('[data-sample="bash"][aria-expanded]');
        if (disclosure !== null && this.root?.contains(disclosure) === true) {
            const nestedControl = target.closest('a, button, input, textarea, select, [contenteditable="true"]');
            if (nestedControl !== null && nestedControl !== disclosure)
                return;
            const key = disclosure.closest('[data-chat-flow-key]')?.getAttribute('data-chat-flow-key');
            if (key === null || key === undefined)
                return;
            this.manualRows.set(key, disclosure.getAttribute('aria-expanded') === 'true' ? 'closed' : 'open');
            this.autoKeys.delete(key);
            return;
        }
        const group = target.closest(GROUP_SELECTOR);
        if (group === null || this.root?.contains(group) !== true)
            return;
        this.cancelOpenAnimation();
        const header = this.groupHeader(group);
        if (header === null || (target !== header && !header.contains(target)))
            return;
        const key = group.getAttribute('data-chat-group-key');
        if (key === null)
            return;
        if (header.getAttribute('aria-expanded') === 'true') {
            this.suppressedGroups.add(key);
            this.autoGroups.delete(key);
        }
        else {
            this.suppressedGroups.delete(key);
            this.autoGroups.delete(key);
        }
        // A pointer click should not leave the browser's focus ring on the toggle.
        // Keyboard activation (detail 0) keeps the official focus behavior.
        if (event.detail > 0) {
            this.win.queueMicrotask(() => {
                if (this.doc.activeElement === header)
                    header.blur();
            });
        }
    };
    /** Close the plugin's automatic rows and groups in non-active groups. */
    closeOtherWindows(active) {
        if (this.root === null)
            return;
        for (const group of this.root.querySelectorAll(GROUP_SELECTOR)) {
            if (group === active)
                continue;
            const snapshot = this.snapshot(group);
            if (snapshot !== null) {
                for (const candidate of snapshot.elements.values()) {
                    if (candidate.open && this.autoKeys.has(candidate.key)
                        && candidate.manual !== 'open' && candidate.element.isConnected) {
                        this.click(candidate.element);
                    }
                }
                for (const candidate of snapshot.elements.values())
                    this.autoKeys.delete(candidate.key);
            }
            const key = group.getAttribute('data-chat-group-key');
            if (key !== null && this.autoGroups.has(key)
                && snapshot?.header.getAttribute('aria-expanded') === 'true' && snapshot.header.isConnected) {
                this.click(snapshot.header);
            }
            if (key !== null)
                this.autoGroups.delete(key);
        }
    }
    /** Read one group's header and top-level reasoning/Tool disclosures. */
    snapshot(group) {
        const header = this.groupHeader(group);
        const key = group.getAttribute('data-chat-group-key');
        const content = group.querySelector(GROUP_CONTENT_SELECTOR);
        if (header === null || key === null || content === null)
            return null;
        const elements = new Map();
        const candidates = [];
        let order = 0;
        for (const member of content.children) {
            if (member.nodeType !== 1)
                continue;
            const row = member;
            const flowKey = row.getAttribute('data-chat-flow-key');
            if (flowKey === null)
                continue;
            const kind = this.candidateKind(row);
            if (kind === undefined)
                continue;
            const bash = kind === 'tool' ? row.querySelector('[data-sample="bash"]') : null;
            const genericTool = kind === 'tool' ? row.querySelector('[data-tool]') : null;
            const disclosure = kind === 'reasoning'
                ? row.querySelector(DISCLOSURE_SELECTOR)
                : bash ?? genericTool?.querySelector(DISCLOSURE_SELECTOR) ?? null;
            if (disclosure === null)
                continue;
            const state = kind === 'reasoning'
                ? row.querySelector('[data-variant="think"]')?.getAttribute('data-state')
                : bash?.getAttribute('data-state') ?? genericTool?.getAttribute('data-state');
            const candidate = {
                key: flowKey,
                kind,
                order: order++,
                open: disclosure.getAttribute('aria-expanded') === 'true',
                active: state === 'running' || state === 'preparing',
                auto: this.autoKeys.has(flowKey),
                manual: this.manualRows.get(flowKey),
                element: disclosure,
            };
            elements.set(flowKey, candidate);
            const { element: _element, ...modelCandidate } = candidate;
            candidates.push(modelCandidate);
        }
        return {
            key,
            header,
            model: {
                open: header.getAttribute('aria-expanded') === 'true',
                suppressed: this.suppressedGroups.has(key),
                candidates,
            },
            elements,
        };
    }
    candidateKind(row) {
        if (row.querySelector('[data-variant="think"]') !== null)
            return 'reasoning';
        if (row.querySelector('[data-tool], [data-sample="bash"]') !== null)
            return 'tool';
        return undefined;
    }
    groupHeader(group) {
        return group.querySelector(':scope > div > button[aria-expanded]')
            ?? group.querySelector('button[aria-expanded]');
    }
    openRow(element) {
        openDisclosure(element, this.win, () => this.click(element));
    }
    closeRow(element) {
        return closeDisclosure(element, this.win, () => {
            if (this.active)
                this.click(element);
        }, this.pendingClose);
    }
    deferSync() {
        if (this.transitionTimer !== null)
            return;
        this.transitionTimer = this.win.setTimeout(() => {
            this.transitionTimer = null;
            this.sync();
        }, DISCLOSURE_MOTION_MS + 30);
    }
    click(element) {
        const previous = this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
        // The official process-group header calls focus() inside its click handler.
        // Suppress only that occurrence so an automatic open cannot leave a focus
        // ring behind or pull focus out of the composer.
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
        this.restoreFocus(element, previous);
        this.win.queueMicrotask(() => { this.restoreFocus(element, previous); });
    }
    restoreFocus(element, previous) {
        if (this.doc.activeElement !== element || previous === element)
            return;
        if (previous !== null && previous !== this.doc.body && previous.isConnected) {
            previous.focus({ preventScroll: true });
        }
        if (this.doc.activeElement === element)
            element.blur();
    }
    /**
     * Open the process group at full height with a short opacity fade.
     *
     * The window must not collapse to zero and re-expand; the outer transcript is
     * kept on the floor by its own guard while the group appears at its real size.
     */
    autoOpen(header, group, key) {
        const body = group.querySelector('[data-step-process-body]');
        const reduced = typeof this.win.matchMedia === 'function'
            && this.win.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (body === null || reduced) {
            this.click(header);
            this.autoGroups.add(key);
            this.pinOuterNow(group);
            return;
        }
        this.cancelOpenAnimation();
        const animation = {
            body,
            frame: null,
            timer: null,
            opacity: body.style.opacity,
            transition: body.style.transition,
        };
        this.openAnimation = animation;
        this.startOuterGuard(group);
        body.style.opacity = '0';
        body.style.transition = `opacity ${OPEN_FADE_MS}ms ease-out`;
        this.click(header);
        this.autoGroups.add(key);
        this.pinOuterNow(group);
        animation.frame = this.win.requestAnimationFrame(() => {
            animation.frame = null;
            body.style.opacity = '1';
            animation.timer = this.win.setTimeout(() => this.finishOpenAnimation(animation), OPEN_FADE_MS + 30);
        });
    }
    finishOpenAnimation(animation) {
        if (this.openAnimation !== animation)
            return;
        if (animation.frame !== null)
            this.win.cancelAnimationFrame(animation.frame);
        if (animation.timer !== null)
            this.win.clearTimeout(animation.timer);
        animation.body.style.opacity = animation.opacity;
        animation.body.style.transition = animation.transition;
        this.openAnimation = null;
        this.stopOuterGuard();
    }
    cancelOpenAnimation() {
        const animation = this.openAnimation;
        if (animation === null)
            return;
        this.openAnimation = null;
        this.stopOuterGuard();
        if (animation.frame !== null)
            this.win.cancelAnimationFrame(animation.frame);
        if (animation.timer !== null)
            this.win.clearTimeout(animation.timer);
        animation.body.style.opacity = animation.opacity;
        animation.body.style.transition = animation.transition;
    }
    /** Close and forget every automatic open state. */
    resetWindow() {
        if (this.transitionTimer !== null) {
            this.win.clearTimeout(this.transitionTimer);
            this.transitionTimer = null;
        }
        this.cancelOpenAnimation();
        this.stopOuterGuard();
        this.detachFollow();
        if (this.root !== null) {
            for (const group of this.root.querySelectorAll(GROUP_SELECTOR)) {
                const snapshot = this.snapshot(group);
                if (snapshot !== null) {
                    for (const candidate of snapshot.elements.values()) {
                        if (candidate.open && this.autoKeys.has(candidate.key)
                            && candidate.manual !== 'open' && candidate.element.isConnected) {
                            this.click(candidate.element);
                        }
                    }
                    const key = snapshot.key;
                    if (snapshot.header.getAttribute('aria-expanded') === 'true'
                        && this.autoGroups.has(key) && snapshot.header.isConnected) {
                        this.click(snapshot.header);
                    }
                }
            }
        }
        this.pendingClose.clear();
        this.autoKeys.clear();
        this.autoGroups.clear();
        this.suppressedGroups.clear();
        this.manualRows.clear();
        this.activeGroup = null;
    }
}
/** Whether a child-list change can add or remove the running status or a group. */
function containsRunningRoot(nodes) {
    for (const node of nodes) {
        if (node.nodeType !== 1)
            continue;
        const element = node;
        if (element.matches(`${RUNNING_SELECTOR}, ${GROUP_SELECTOR}`)
            || element.querySelector(`${RUNNING_SELECTOR}, ${GROUP_SELECTOR}`) !== null)
            return true;
    }
    return false;
}
//# sourceMappingURL=conductor.js.map