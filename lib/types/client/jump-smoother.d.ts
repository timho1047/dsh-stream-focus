/** Visual-only compensation for discrete scroll jumps; never writes scrollTop. */
/**
 * Soften a line-height scroll jump by translating the content down by the
 * observed jump, then easing the translation back to zero. The real scroll
 * position and its owner stay untouched.
 */
export declare class JumpSmoother {
    private readonly win;
    private attach;
    private offset;
    private lastTop;
    private lastTime;
    private frame;
    private gestureAt;
    constructor(win?: Window & typeof globalThis);
    /** Bind to one scrollport/content pair. */
    observe(scroll: HTMLElement, content: HTMLElement): void;
    /** Restore the content translation and detach. */
    stop(): void;
    private readonly onGesture;
    private readonly onScroll;
    private reset;
    private schedule;
    private readonly tick;
}
