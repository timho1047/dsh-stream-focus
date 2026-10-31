/** Bounded request scheduler for Host summary generations. */
import type { SummaryRequest } from '../shared/protocol.ts';
/** One request waiting for a concurrency slot. */
export interface SummaryQueueJob {
    readonly row: HTMLElement;
    /** Row phase generation that invalidates a reply after a transition. */
    readonly epoch: number;
    /** Running rows precede viewport backfill. */
    readonly priority: 'active' | 'historical';
    readonly request: SummaryRequest;
    /** Latest-request token used by the presenter to reject stale replies. */
    readonly token: number;
}
/** Callbacks and limits for one presenter-owned queue. */
export interface SummaryQueueOptions<T> {
    /** Perform one Host call. The queue aborts this signal when the row is cancelled. */
    run(job: SummaryQueueJob, signal: AbortSignal): Promise<T>;
    /** Accept a settled reply; the presenter re-checks its own token and epoch. */
    onSuccess(job: SummaryQueueJob, value: T): void;
    /** Report a transport or Host failure. */
    onError(job: SummaryQueueJob, error: unknown): void;
    /** Concurrent RPC cap. @default 2 */
    maxConcurrent?: number;
    /** Minimum delay between request starts. @default 500 */
    minGapMs?: number;
    /** Clock override for tests. */
    now?: () => number;
}
/**
 * Keeps at most two Host calls in flight, replaces the pending request for the
 * same row/mode, gives running rows priority, and spaces starts by a minimum
 * gap. The queue carries no phrases; it only schedules work.
 */
export declare class SummaryQueue<T> {
    private readonly options;
    private readonly pending;
    private readonly inFlight;
    private readonly aborted;
    private readonly maxConcurrent;
    private readonly minGapMs;
    private readonly now;
    private timer;
    private active;
    private lastStart;
    private nextToken;
    private stopped;
    /**
     * @param options - RPC runner, settlement callbacks, and scheduling limits.
     */
    constructor(options: SummaryQueueOptions<T>);
    /**
     * Enqueue the latest request for a row and mode. An older pending request for
     * the same pair is discarded; in-flight requests are left to settle and are
     * rejected by the presenter's token check.
     * @param job - request identity without its queue token.
     * @returns the token assigned to this request.
     */
    enqueue(job: Omit<SummaryQueueJob, 'token'>): number;
    /**
     * Cancel every pending and in-flight request belonging to one row.
     * @param row - row whose requests must stop.
     */
    abortRow(row: HTMLElement): void;
    /** Re-arm a queue after {@link clear}; the presenter owns start/stop reuse. */
    restart(): void;
    /** Cancel all pending work, abort in-flight requests, and stop the queue. */
    clear(): void;
    private pump;
    private arm;
    private start;
    private settle;
}
