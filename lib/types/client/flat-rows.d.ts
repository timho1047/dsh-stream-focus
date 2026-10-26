/**
 * Row-level enhancement for Detailed and Verbose Turns.
 *
 * Those modes intentionally render process rows flat, without a group body to
 * cap or scroll. This conductor only opens the current reasoning/tool rows and
 * respects the mode's collapse semantics: Detailed may fold older automatic
 * rows, Verbose never does.
 */
export declare class FlatRowConductor {
    private readonly mode;
    private readonly doc;
    private readonly win;
    private active;
    private frame;
    private observer;
    private transitionTimer;
    private readonly rows;
    private readonly pendingClose;
    private follow;
    /**
     * @param mode - Detailed or Verbose.
     * @param doc - document owning the transcript.
     * @param win - window supplying observers and animation frames.
     */
    constructor(mode: 'detailed' | 'verbose', doc?: Document, win?: Window & typeof globalThis);
    /** Start observing flat process rows. Idempotent. */
    start(): void;
    /** Stop observing. Verbose rows that were opened stay open by design. */
    stop(): void;
    /** Reconcile the newest Turn's flat rows. Public for tests. */
    sync(): void;
    private attachOuterFollow;
    private detachOuterFollow;
    private openRow;
    private closeRow;
    private click;
    private deferSync;
    private candidate;
    private schedule;
    private onMutations;
}
