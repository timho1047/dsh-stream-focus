/** Resolve the one Session whose main view currently owns the transcript. */
/** The Session-list row facts this plugin reads. */
export interface SessionListRow {
    readonly retainedBy: Readonly<Partial<Record<string, number>>>;
}
/** Immutable Session catalog shape shared by the Client service snapshot. */
export interface SessionListSnapshot {
    readonly ids: readonly string[];
    readonly byId: Readonly<Record<string, SessionListRow>>;
}
/** Observable Session catalog. */
export interface SessionListSource {
    getSnapshot(): SessionListSnapshot;
    subscribe(listener: () => void): () => void;
}
/** The subset of the Sessions client service the presenter and page need. */
export interface SessionsFace {
    readonly list: SessionListSource;
}
/**
 * Recognize the Client Sessions face without importing a UI feature that
 * declares `mainView`; the plugin reads only the catalog snapshot.
 * @param value - candidate service.
 * @returns whether it exposes an observable list snapshot.
 */
export declare function isSessionsFace(value: unknown): value is SessionsFace;
/**
 * Tracks whether exactly one listed Session is retained by the main view.
 * Multiple retained Sessions are ambiguous and resolve to no identity, so the
 * Host keeps using its default model instead of guessing.
 */
export declare class ActiveSessionResolver {
    private readonly sessions;
    private readonly listeners;
    private readonly unsubscribe;
    /**
     * @param sessions - client Sessions service exposing the catalog snapshot.
     */
    constructor(sessions: SessionsFace);
    /**
     * Read the current unambiguous Session identity.
     * @returns the one main-view retained Session, or undefined when none or several qualify.
     */
    current(): string | undefined;
    /**
     * Observe Session-list replacement so the page can refresh its model status.
     * @param listener - invoked after the list snapshot changes.
     * @returns the unsubscribe function.
     */
    subscribe(listener: () => void): () => void;
    /** Release the Session-list subscription owned by the plugin fiber. */
    dispose(): void;
    private publish;
}
/** Empty fallback used only if the injected service fails its runtime shape check. */
export declare const EMPTY_SESSIONS: SessionsFace;
