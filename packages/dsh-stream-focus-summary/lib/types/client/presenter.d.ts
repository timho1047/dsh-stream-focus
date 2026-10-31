/** Compose row discovery, scheduling, Host hydration, and CSS-only painting. */
import type { PhraseHit, PhraseQuery, SummaryReply, SummaryRequest } from '../shared/protocol.ts';
/** Host calls used by the presenter. */
export interface SummaryPresenterApi {
    summarize(request: SummaryRequest, signal: AbortSignal): Promise<SummaryReply>;
    phrases(queries: readonly PhraseQuery[], signal: AbortSignal): Promise<readonly PhraseHit[]>;
}
/** Dependencies and diagnostics for one presenter lifetime. */
export interface SummaryPresenterOptions {
    readonly document: Document;
    readonly api: SummaryPresenterApi;
    /** Active DSH locale; the presenter falls back to `<html lang>` then `zh-CN`. */
    readonly activeLocale: () => string;
    /** Unambiguous main-view Session identity, when one exists. */
    readonly activeSessionId: () => string | undefined;
    /** Diagnostic sink; defaults to `console.warn`. */
    readonly onWarning?: (message: string) => void;
    /** Inline stylesheet; tests may supply an empty string. */
    readonly styleText?: string;
    /** Clock override for scan throttling and queue spacing. */
    readonly now?: () => number;
}
/**
 * Observes product reasoning rows and decorates them with Host phrases. The
 * presenter owns no reusable phrase cache: row state exists only while that
 * DOM row exists, and every fresh row restores its phrase through `phrases()`.
 */
export declare class SummaryPresenter {
    private readonly options;
    private readonly queue;
    private readonly styleText;
    private readonly onWarning;
    private readonly now;
    private rows;
    private observer;
    private viewportObserver;
    private styleElement;
    private scrollView;
    private scanTimer;
    private hydrationTimer;
    private hydrationController;
    private hydrationEntries;
    private hydrationId;
    private viewportPoll;
    private readonly dirtyRows;
    private scanAll;
    private lastScanAt;
    private started;
    private legacyWarned;
    private domWarned;
    /**
     * @param options - document, Host calls, active identity reads, and diagnostics.
     */
    constructor(options: SummaryPresenterOptions);
    /** Start observation, install the owned stylesheet, and scan current rows. */
    start(): void;
    /** Disconnect every observer, cancel timers and requests, and remove decoration. */
    stop(): void;
    private installStyle;
    private attachViewportObserver;
    private readonly handleScroll;
    private scan;
    private scanRow;
    private createState;
    private transition;
    private repaint;
    private requestForRow;
    private enqueue;
    private accept;
    private fail;
    private queueHydration;
    private queriesFor;
    private scheduleHydration;
    private flushHydration;
    private applyHydration;
    private handleMutations;
    private handleLegacyAttribute;
    private blockLegacy;
    private scheduleScan;
    private scanNow;
    private pollViewport;
    private isNearViewport;
    private observeViewport;
    private currentLocale;
    private warnLegacyOnce;
    private warnDomOnce;
    private warn;
}
