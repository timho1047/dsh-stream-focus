/** CSS Custom Highlight based fade for streamed text without DOM mutation. */
/**
 * Fade newly appended text by highlighting its grapheme ranges.
 *
 * The browser's highlight registry styles text ranges without changing the
 * DOM, so React ownership, Markdown structure, selection, and copy semantics
 * stay untouched. Unsupported browsers simply see the normal output.
 */
export declare class HighlightFade {
    private readonly doc;
    private readonly win;
    private readonly name;
    private readonly realm;
    private readonly highlights;
    private readonly observer;
    private readonly roots;
    private readonly texts;
    private readonly glyphs;
    private frame;
    private observerActive;
    /**
     * @param doc - document owning the text.
     * @param win - window exposing CSS.highlights.
     * @param name - unique highlight namespace for this fade instance.
     */
    constructor(doc?: Document, win?: Window & typeof globalThis, name?: string);
    /** Observe a root and start fading its newly appended text. */
    observe(root: HTMLElement): void;
    /** Stop observing one root and drop its pending ranges. */
    unobserve(root: HTMLElement): void;
    /** Stop observing everything and clear the registry. */
    stop(): void;
    private installStyle;
    private scan;
    private record;
    private recordText;
    private pushGlyph;
    private schedule;
    private update;
    private setBucket;
    private clearHighlights;
    private dropRanges;
}
