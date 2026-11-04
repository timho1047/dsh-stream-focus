import { HighlightFade } from "./highlight-fade.js";
import { FollowSteward } from "./follow-steward.js";
import { outerScroller, streamingAssistantRoots } from "./live-transcript.js";
/**
 * Line-edge fade for streaming Assistant prose.
 *
 * Normal assistant Markdown has no content Factory, so it cannot be paced
 * without duplicating Chat's renderer. A mask on the streaming root instead
 * softens the newest line while leaving the official renderer untouched.
 */
export class NormalOutputSmoother {
    doc;
    win;
    active = false;
    observer = null;
    roots = new Set();
    previous = new WeakMap();
    fade;
    outerFollow = null;
    /**
     * @param doc - document that owns the transcript.
     * @param win - window supplying MutationObserver.
     */
    constructor(doc = document, win = window) {
        this.doc = doc;
        this.win = win;
        this.fade = new HighlightFade(doc, win, 'dsh-stream-fade');
    }
    /** Observe streaming assistant roots. Idempotent. */
    start() {
        if (this.active)
            return;
        this.active = true;
        const body = this.doc.body;
        if (body !== null) {
            this.observer = new this.win.MutationObserver(records => {
                if (records.some(record => record.target instanceof Element && record.target.closest('[data-streaming]') !== null)) {
                    this.pinOuter();
                }
                this.reconcile();
            });
            this.observer.observe(body, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['data-streaming'],
            });
        }
        this.reconcile();
    }
    /** Remove every mask and stop observing. */
    stop() {
        if (!this.active)
            return;
        this.active = false;
        this.observer?.disconnect();
        this.observer = null;
        for (const root of this.roots)
            this.clear(root);
        this.roots.clear();
        this.fade.stop();
        this.outerFollow?.steward.release();
        this.outerFollow = null;
    }
    /** Reconcile masks against the currently streaming Assistant roots. Public for tests. */
    sync() {
        this.reconcile();
    }
    pinOuter() {
        if (this.doc.querySelector('[data-chat-following-tail]') === null)
            return;
        const outer = outerScroller(this.doc);
        if (outer === null)
            return;
        if (this.outerFollow?.scroll !== outer) {
            this.outerFollow?.steward.release();
            this.outerFollow = { scroll: outer, steward: FollowSteward.acquire(outer, this.win) };
        }
        this.outerFollow.steward.pinIfFollowing();
    }
    reconcile() {
        if (!this.active)
            return;
        const current = new Set();
        for (const root of streamingAssistantRoots(this.doc))
            current.add(root);
        for (const root of this.roots) {
            if (!current.has(root) || !root.isConnected)
                this.clear(root);
        }
        for (const root of current) {
            if (this.roots.has(root))
                continue;
            this.roots.add(root);
            this.previous.set(root, {
                mask: root.style.getPropertyValue('mask-image'),
                webkit: root.style.getPropertyValue('-webkit-mask-image'),
            });
            root.dataset.streamFade = '';
            this.fade.observe(root);
            const mask = 'linear-gradient(to bottom, #000 calc(100% - 20px), rgba(0, 0, 0, 0.4) 100%)';
            root.style.setProperty('mask-image', mask);
            root.style.setProperty('-webkit-mask-image', mask);
        }
    }
    clear(root) {
        this.roots.delete(root);
        this.fade.unobserve(root);
        const previous = this.previous.get(root);
        delete root.dataset.streamFade;
        if (previous?.mask === undefined || previous.mask === '')
            root.style.removeProperty('mask-image');
        else
            root.style.setProperty('mask-image', previous.mask);
        if (previous?.webkit === '' || previous?.webkit === undefined) {
            root.style.removeProperty('-webkit-mask-image');
        }
        else {
            root.style.setProperty('-webkit-mask-image', previous.webkit);
        }
    }
}
//# sourceMappingURL=normal-smoothing.js.map