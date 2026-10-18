const BLOCK_SELECTOR = 'p,pre,ul,ol,li,table,blockquote,h1,h2,h3,h4,h5,h6,hr';
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
    animated = new WeakSet();
    animations = new Set();
    /**
     * @param doc - document that owns the transcript.
     * @param win - window supplying MutationObserver.
     */
    constructor(doc = document, win = window) {
        this.doc = doc;
        this.win = win;
    }
    /** Observe streaming assistant roots. Idempotent. */
    start() {
        if (this.active)
            return;
        this.active = true;
        const body = this.doc.body;
        if (body !== null) {
            this.observer = new this.win.MutationObserver(records => {
                this.pinOuter();
                this.animateNewBlocks(records);
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
        for (const animation of this.animations)
            animation.cancel();
        this.animations.clear();
    }
    /** Reconcile masks against the currently streaming Assistant roots. Public for tests. */
    sync() {
        this.reconcile();
    }
    pinOuter() {
        if (this.doc.querySelector('[data-chat-following-tail]') === null)
            return;
        const outer = this.doc.querySelector('[data-conversation-scroll]');
        if (outer === null)
            return;
        const floor = Math.max(0, outer.scrollHeight - outer.clientHeight);
        if (Math.abs(floor - outer.scrollTop) > 0.5)
            outer.scrollTop = floor;
    }
    animateNewBlocks(records) {
        for (const record of records) {
            if (record.type !== 'childList' || record.addedNodes.length === 0)
                continue;
            for (const node of record.addedNodes) {
                if (node.nodeType !== 1)
                    continue;
                const element = node;
                const blocks = element.matches(BLOCK_SELECTOR)
                    ? [element]
                    : [...element.querySelectorAll(BLOCK_SELECTOR)];
                for (const block of blocks)
                    if (this.isStreamingBlock(block))
                        this.animateBlock(block);
            }
        }
    }
    isStreamingBlock(element) {
        return element.closest('[data-variant="think"][data-state="running"]') !== null
            || element.closest('[data-chat-flow-kind="assistant-step"][data-chat-group-part="response"] [data-streaming]') !== null;
    }
    animateBlock(element) {
        if (this.animated.has(element) || typeof element.animate !== 'function')
            return;
        this.animated.add(element);
        const animation = element.animate([{ opacity: 0.2, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 280, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        this.animations.add(animation);
        animation.addEventListener('finish', () => { this.animations.delete(animation); }, { once: true });
        animation.addEventListener('cancel', () => { this.animations.delete(animation); }, { once: true });
    }
    reconcile() {
        if (!this.active)
            return;
        const current = new Set();
        for (const root of this.doc.querySelectorAll('[data-chat-flow-kind="assistant-step"][data-chat-group-part="response"] [data-streaming]'))
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
            const mask = 'linear-gradient(to bottom, #000 calc(100% - 20px), rgba(0, 0, 0, 0.4) 100%)';
            root.style.setProperty('mask-image', mask);
            root.style.setProperty('-webkit-mask-image', mask);
        }
    }
    clear(root) {
        this.roots.delete(root);
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