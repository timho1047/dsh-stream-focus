/**
 * Keep the running Turn's process disclosures in one reader-controlled window.
 *
 * The conductor never renders. It reads the semantically attributed Chat DOM,
 * toggles the same disclosure controls a reader would click, and keeps the
 * window pinned to its newest row while the reader has not scrolled away.
 */
export declare class StreamWindowConductor {
    private readonly doc;
    private readonly win;
    private active;
    private root;
    private activeGroup;
    private frame;
    private followObserver;
    private followBody;
    private followBodyOverflowX;
    private followBodyMaskImage;
    private followBodyMinHeight;
    private followBodyHeight;
    private followBodyMaxHeight;
    private heightFrozen;
    private lastUserGesture;
    private followRepairTimer;
    private fadeElement;
    private fadeGroup;
    private fadeGroupPosition;
    private progressTrack;
    private progressThumb;
    private progressFrame;
    private textFade;
    private outerGuard;
    private openAnimation;
    private observer;
    /** Rows this plugin opened and is therefore allowed to close later. */
    private readonly autoKeys;
    /** Process groups this plugin opened. */
    private readonly autoGroups;
    /** Group keys the reader deliberately closed. */
    private readonly suppressedGroups;
    /** Reader's explicit open/closed choice per row key. */
    private readonly manualRows;
    private readonly pendingClose;
    private transitionTimer;
    private autoClickDepth;
    /**
     * @param doc - document that owns the running Chat.
     * @param win - window supplying MutationObserver and rAF.
     */
    constructor(doc?: Document, win?: Window & typeof globalThis);
    /** Start observing the Chat. Idempotent. */
    start(): void;
    /** Stop observing and restore every automatic open state. */
    stop(): void;
    /** Reconcile the current DOM with the window decision. Public for tests. */
    sync(): void;
    /** Bind bottom following and its reader-override signals to the active window. */
    private attachFollow;
    /** Release the active window's observer and reader signals. */
    private detachFollow;
    /** Pin the outer transcript on each height step while the window reveals. */
    private startOuterGuard;
    private stopOuterGuard;
    /** Keep the outer transcript at its floor without waiting a frame for Chat's follow. */
    private pinOuterNow;
    /** Fade the lowest content edge so new lines enter instead of popping. */
    private attachFade;
    private removeFade;
    private readonly onReaderGesture;
    private readonly onProgressScroll;
    private attachProgress;
    private removeProgress;
    private scheduleProgress;
    private updateProgress;
    private nearBottomElement;
    /**
     * Re-arm official follow after a row transition when the reader never touched
     * the window and it was following before the transition. This is a one-shot
     * repair, not a second follow loop.
     */
    private scheduleFollowRepair;
    /** Freeze the window height for a row-to-row transition so outer follow has no floor change. */
    private freezeWindowHeight;
    /** Keep the active window from shrinking below the height it has already shown. */
    private rememberHeight;
    /** Whether this is the newest Turn, so a stale group cannot capture a new turn. */
    private isLatestTurn;
    private schedule;
    private onMutations;
    private onClick;
    /** Close the plugin's automatic rows and groups in non-active groups. */
    private closeOtherWindows;
    /** Read one group's header and top-level reasoning/Tool disclosures. */
    private snapshot;
    private candidateKind;
    private groupHeader;
    private openRow;
    private closeRow;
    private deferSync;
    private click;
    private restoreFocus;
    /**
     * Open the process group at full height with a short opacity fade.
     *
     * The window must not collapse to zero and re-expand; the outer transcript is
     * kept on the floor by its own guard while the group appears at its real size.
     */
    private autoOpen;
    private finishOpenAnimation;
    private cancelOpenAnimation;
    /** Close and forget every automatic open state. */
    private resetWindow;
}
