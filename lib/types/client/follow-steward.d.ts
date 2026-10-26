/** One follow-intent and repair policy for a scroll surface. */
/** Shared per-scrollport owners, so two modules cannot maintain different intent. */
export declare class FollowSteward {
    private readonly scroll;
    private readonly win;
    private static readonly pool;
    private readonly listeners;
    private intent;
    private gestureAt;
    private growthAt;
    private repairTimer;
    private constructor();
    /** Acquire the single steward for this scrollport. */
    static acquire(scroll: HTMLElement, win?: Window & typeof globalThis): FollowSteward;
    /** Release one caller; listeners are removed when the last caller leaves. */
    release(): void;
    /** Pin immediately when the reader is following; used by prose growth. */
    pinIfFollowing(): void;
    /** Record content growth and schedule one delayed repair. */
    noteGrowth(): void;
    /** Re-arm after an automatic row motion, so the check lands after the motion. */
    rearmAfterMotion(delay: number): void;
    /** Release the last reference explicitly. */
    stop(): void;
    private nearBottom;
    private readonly onGesture;
    private readonly onScroll;
    private readonly onScrollEnd;
    private arm;
}
