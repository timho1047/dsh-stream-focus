/**
 * Line-edge fade for streaming Assistant prose.
 *
 * Normal assistant Markdown has no content Factory, so it cannot be paced
 * without duplicating Chat's renderer. A mask on the streaming root instead
 * softens the newest line while leaving the official renderer untouched.
 */
export declare class NormalOutputSmoother {
    private readonly doc;
    private readonly win;
    private active;
    private observer;
    private readonly roots;
    private readonly previous;
    private readonly animated;
    private readonly animations;
    /**
     * @param doc - document that owns the transcript.
     * @param win - window supplying MutationObserver.
     */
    constructor(doc?: Document, win?: Window & typeof globalThis);
    /** Observe streaming assistant roots. Idempotent. */
    start(): void;
    /** Remove every mask and stop observing. */
    stop(): void;
    /** Reconcile masks against the currently streaming Assistant roots. Public for tests. */
    sync(): void;
    private pinOuter;
    private animateNewBlocks;
    private isStreamingBlock;
    private animateBlock;
    private reconcile;
    private clear;
}
