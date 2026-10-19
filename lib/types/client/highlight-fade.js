/** CSS Custom Highlight based fade for streamed text without DOM mutation. */
const FADE_MS = 240;
const MAX_GLYPHS = 160;
const STEPS = 12;
const ALPHAS = [0.03, 0.06, 0.1, 0.16, 0.24, 0.34, 0.46, 0.6, 0.74, 0.86, 0.95, 1];
const SKIP = 'code,pre,a,.katex,script,style';
/**
 * Fade newly appended text by highlighting its grapheme ranges.
 *
 * The browser's highlight registry styles text ranges without changing the
 * DOM, so React ownership, Markdown structure, selection, and copy semantics
 * stay untouched. Unsupported browsers simply see the normal output.
 */
export class HighlightFade {
    doc;
    win;
    name;
    realm;
    highlights = [];
    observer;
    roots = new Set();
    texts = new WeakMap();
    glyphs = [];
    frame = null;
    observerActive = false;
    /**
     * @param doc - document owning the text.
     * @param win - window exposing CSS.highlights.
     * @param name - unique highlight namespace for this fade instance.
     */
    constructor(doc = document, win = window, name = 'dsh-stream-fade') {
        this.doc = doc;
        this.win = win;
        this.name = name;
        this.realm = win;
        const registry = this.realm.CSS?.highlights;
        const Ctor = this.realm.Highlight;
        if (registry === undefined || Ctor === undefined) {
            this.observer = null;
            return;
        }
        for (let index = 0; index < STEPS; index += 1) {
            const highlight = new Ctor();
            this.highlights.push(highlight);
            registry.set(`${name}-${index}`, highlight);
        }
        this.installStyle();
        this.observer = new this.win.MutationObserver(() => { this.scan(); });
    }
    /** Observe a root and start fading its newly appended text. */
    observe(root) {
        if (this.observer === null || this.roots.has(root))
            return;
        this.roots.add(root);
        root.dataset.highlightFade = this.name;
        this.record(root);
        this.observer.observe(root, { subtree: true, childList: true, characterData: true });
        this.observerActive = true;
    }
    /** Stop observing one root and drop its pending ranges. */
    unobserve(root) {
        this.roots.delete(root);
        delete root.dataset.highlightFade;
        this.dropRanges(root);
        if (this.roots.size === 0)
            this.observer?.disconnect();
    }
    /** Stop observing everything and clear the registry. */
    stop() {
        for (const root of this.roots)
            delete root.dataset.highlightFade;
        this.roots.clear();
        this.glyphs.length = 0;
        this.clearHighlights();
        this.observer?.disconnect();
        this.observerActive = false;
        if (this.frame !== null) {
            this.win.cancelAnimationFrame(this.frame);
            this.frame = null;
        }
        const registry = this.realm.CSS?.highlights;
        if (registry !== undefined)
            for (let index = 0; index < STEPS; index += 1)
                registry.delete(`${this.name}-${index}`);
    }
    installStyle() {
        const id = `dsh-stream-focus-${this.name}`;
        if (this.doc.getElementById(id) !== null)
            return;
        const style = this.doc.createElement('style');
        style.id = id;
        style.textContent = ALPHAS.map((alpha, index) => (`::highlight(${this.name}-${index}){color:color-mix(in srgb,currentColor ${Math.round(alpha * 100)}%,transparent)}`)).join('\n');
        this.doc.head.append(style);
    }
    scan() {
        for (const root of this.roots) {
            const walker = this.doc.createTreeWalker(root, 4);
            let node = walker.nextNode();
            while (node !== null) {
                const text = node;
                if (text.parentElement?.closest(SKIP) === null)
                    this.recordText(text);
                node = walker.nextNode();
            }
        }
    }
    record(root) {
        const walker = this.doc.createTreeWalker(root, 4);
        let node = walker.nextNode();
        while (node !== null) {
            const text = node;
            if (text.parentElement?.closest(SKIP) === null)
                this.texts.set(text, text.data);
            node = walker.nextNode();
        }
    }
    recordText(text) {
        const previous = this.texts.get(text);
        const next = text.data;
        this.texts.set(text, next);
        if (next === previous)
            return;
        let start = 0;
        if (previous !== undefined) {
            if (!next.startsWith(previous))
                return;
            start = previous.length;
        }
        const segmenter = typeof Intl.Segmenter === 'function'
            ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
            : null;
        const now = this.win.performance.now();
        if (segmenter === null) {
            for (let index = start; index < next.length; index += 1)
                this.pushGlyph(text, index, index + 1, now);
        }
        else {
            for (const part of segmenter.segment(next.slice(start))) {
                const from = start + part.index;
                this.pushGlyph(text, from, from + part.segment.length, now);
            }
        }
        while (this.glyphs.length > MAX_GLYPHS) {
            const dropped = this.glyphs.shift();
            if (dropped !== undefined)
                this.setBucket(dropped, STEPS - 1);
        }
        this.schedule();
    }
    pushGlyph(node, start, end, born) {
        if (start >= end)
            return;
        const range = this.doc.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        this.glyphs.push({ range, born, bucket: 0 });
        this.highlights[0]?.add(range);
    }
    schedule() {
        if (this.frame !== null)
            return;
        this.frame = this.win.requestAnimationFrame(() => {
            this.frame = null;
            this.update();
        });
    }
    update() {
        const now = this.win.performance.now();
        let pending = false;
        for (let index = this.glyphs.length - 1; index >= 0; index -= 1) {
            const glyph = this.glyphs[index];
            if (glyph === undefined)
                continue;
            if (!glyph.range.startContainer.isConnected || now - glyph.born >= FADE_MS) {
                this.setBucket(glyph, STEPS - 1);
                this.glyphs.splice(index, 1);
                continue;
            }
            const bucket = Math.min(STEPS - 1, Math.floor(((now - glyph.born) / FADE_MS) * STEPS));
            if (bucket !== glyph.bucket)
                this.setBucket(glyph, bucket);
            pending = true;
        }
        if (pending)
            this.schedule();
        else
            this.clearHighlights();
    }
    setBucket(glyph, bucket) {
        this.highlights[glyph.bucket]?.delete(glyph.range);
        glyph.bucket = bucket;
        if (bucket < STEPS - 1)
            this.highlights[bucket]?.add(glyph.range);
    }
    clearHighlights() {
        for (const highlight of this.highlights) {
            for (const glyph of this.glyphs)
                highlight.delete(glyph.range);
        }
    }
    dropRanges(root) {
        for (let index = this.glyphs.length - 1; index >= 0; index -= 1) {
            const glyph = this.glyphs[index];
            if (glyph !== undefined && root.contains(glyph.range.startContainer)) {
                this.setBucket(glyph, STEPS - 1);
                this.glyphs.splice(index, 1);
            }
        }
    }
}
//# sourceMappingURL=highlight-fade.js.map