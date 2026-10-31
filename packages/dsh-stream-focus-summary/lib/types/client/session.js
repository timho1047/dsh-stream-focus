/** Resolve the one Session whose main view currently owns the transcript. */
/**
 * Recognize the Client Sessions face without importing a UI feature that
 * declares `mainView`; the plugin reads only the catalog snapshot.
 * @param value - candidate service.
 * @returns whether it exposes an observable list snapshot.
 */
export function isSessionsFace(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const list = value.list;
    return typeof list === 'object' && list !== null
        && typeof list.getSnapshot === 'function'
        && typeof list.subscribe === 'function';
}
/**
 * Tracks whether exactly one listed Session is retained by the main view.
 * Multiple retained Sessions are ambiguous and resolve to no identity, so the
 * Host keeps using its default model instead of guessing.
 */
export class ActiveSessionResolver {
    sessions;
    listeners = new Set();
    unsubscribe;
    /**
     * @param sessions - client Sessions service exposing the catalog snapshot.
     */
    constructor(sessions) {
        this.sessions = sessions;
        this.unsubscribe = sessions.list.subscribe(() => { this.publish(); });
    }
    /**
     * Read the current unambiguous Session identity.
     * @returns the one main-view retained Session, or undefined when none or several qualify.
     */
    current() {
        const state = this.sessions.list.getSnapshot();
        let resolved;
        for (const id of state.ids) {
            const row = state.byId[id];
            if (row === undefined || (row.retainedBy.mainView ?? 0) <= 0)
                continue;
            if (resolved !== undefined)
                return undefined;
            resolved = id;
        }
        return resolved;
    }
    /**
     * Observe Session-list replacement so the page can refresh its model status.
     * @param listener - invoked after the list snapshot changes.
     * @returns the unsubscribe function.
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    /** Release the Session-list subscription owned by the plugin fiber. */
    dispose() {
        this.unsubscribe();
        this.listeners.clear();
    }
    publish() {
        for (const listener of [...this.listeners]) {
            try {
                listener();
            }
            catch (error) {
                console.error('[stream-focus-summary] active Session listener failed:', error);
            }
        }
    }
}
/** Empty fallback used only if the injected service fails its runtime shape check. */
export const EMPTY_SESSIONS = Object.freeze({
    list: Object.freeze({
        getSnapshot: () => ({ ids: [], byId: {} }),
        subscribe: () => () => { },
    }),
});
//# sourceMappingURL=session.js.map