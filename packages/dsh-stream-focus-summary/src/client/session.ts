/** Resolve the one Session whose main view currently owns the transcript. */

/** The Session-list row facts this plugin reads. */
export interface SessionListRow {
  readonly retainedBy: Readonly<Partial<Record<string, number>>>
}

/** Immutable Session catalog shape shared by the Client service snapshot. */
export interface SessionListSnapshot {
  readonly ids: readonly string[]
  readonly byId: Readonly<Record<string, SessionListRow>>
}

/** Observable Session catalog. */
export interface SessionListSource {
  getSnapshot(): SessionListSnapshot
  subscribe(listener: () => void): () => void
}

/** The subset of the Sessions client service the presenter and page need. */
export interface SessionsFace {
  readonly list: SessionListSource
}

/**
 * Recognize the Client Sessions face without importing a UI feature that
 * declares `mainView`; the plugin reads only the catalog snapshot.
 * @param value - candidate service.
 * @returns whether it exposes an observable list snapshot.
 */
export function isSessionsFace(value: unknown): value is SessionsFace {
  if (typeof value !== 'object' || value === null) return false
  const list = (value as { readonly list?: unknown }).list
  return typeof list === 'object' && list !== null
    && typeof (list as { readonly getSnapshot?: unknown }).getSnapshot === 'function'
    && typeof (list as { readonly subscribe?: unknown }).subscribe === 'function'
}

/**
 * Tracks whether exactly one listed Session is retained by the main view.
 * Multiple retained Sessions are ambiguous and resolve to no identity, so the
 * Host keeps using its default model instead of guessing.
 */
export class ActiveSessionResolver {
  private readonly listeners = new Set<() => void>()
  private readonly unsubscribe: () => void

  /**
   * @param sessions - client Sessions service exposing the catalog snapshot.
   */
  constructor(private readonly sessions: SessionsFace) {
    this.unsubscribe = sessions.list.subscribe(() => { this.publish() })
  }

  /**
   * Read the current unambiguous Session identity.
   * @returns the one main-view retained Session, or undefined when none or several qualify.
   */
  current(): string | undefined {
    const state = this.sessions.list.getSnapshot()
    let resolved: string | undefined
    for (const id of state.ids) {
      const row = state.byId[id]
      if (row === undefined || (row.retainedBy.mainView ?? 0) <= 0) continue
      if (resolved !== undefined) return undefined
      resolved = id
    }
    return resolved
  }

  /**
   * Observe Session-list replacement so the page can refresh its model status.
   * @param listener - invoked after the list snapshot changes.
   * @returns the unsubscribe function.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Release the Session-list subscription owned by the plugin fiber. */
  dispose(): void {
    this.unsubscribe()
    this.listeners.clear()
  }

  private publish(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[stream-focus-summary] active Session listener failed:', error)
      }
    }
  }
}

/** Empty fallback used only if the injected service fails its runtime shape check. */
export const EMPTY_SESSIONS: SessionsFace = Object.freeze({
  list: Object.freeze({
    getSnapshot: (): SessionListSnapshot => ({ ids: [], byId: {} }),
    subscribe: () => () => {},
  }),
})
