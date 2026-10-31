/** The active process window's smooth replacement for the native scrollbar thumb. */
export declare class ProcessProgress {
    private readonly doc;
    private readonly win;
    private readonly onAtBottom?;
    private body;
    private track;
    private thumb;
    private frame;
    private height;
    private top;
    private time;
    private initialized;
    /**
     * @param doc - document owning the active process group.
     * @param win - window supplying animation frames.
     * @param onAtBottom - reports when the scrollport is within two pixels of its floor.
     */
    constructor(doc?: Document, win?: Window & typeof globalThis, onAtBottom?: (() => void) | undefined);
    /** Attach the indicator to one process body. Replaces any previous attachment. */
    attach(group: HTMLElement, body: HTMLElement): void;
    /** Remove the indicator and cancel its frame. */
    stop(): void;
    /** Coalesce a geometry update into one animation frame. */
    schedule(): void;
    private update;
}
