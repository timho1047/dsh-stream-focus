/** Bounded request scheduler for Host summary generations. */
import type { SummaryRequest } from '../shared/protocol.ts'

/** One request waiting for a concurrency slot. */
export interface SummaryQueueJob {
  readonly row: HTMLElement
  /** Row phase generation that invalidates a reply after a transition. */
  readonly epoch: number
  /** Running rows precede viewport backfill. */
  readonly priority: 'active' | 'historical'
  readonly request: SummaryRequest
  /** Latest-request token used by the presenter to reject stale replies. */
  readonly token: number
}

/** Callbacks and limits for one presenter-owned queue. */
export interface SummaryQueueOptions<T> {
  /** Perform one Host call. The queue aborts this signal when the row is cancelled. */
  run(job: SummaryQueueJob, signal: AbortSignal): Promise<T>
  /** Accept a settled reply; the presenter re-checks its own token and epoch. */
  onSuccess(job: SummaryQueueJob, value: T): void
  /** Report a transport or Host failure. */
  onError(job: SummaryQueueJob, error: unknown): void
  /** Concurrent RPC cap. @default 2 */
  maxConcurrent?: number
  /** Minimum delay between request starts. @default 500 */
  minGapMs?: number
  /** Clock override for tests. */
  now?: () => number
}

interface InFlight {
  readonly job: SummaryQueueJob
  readonly controller: AbortController
}

/**
 * Keeps at most two Host calls in flight, replaces the pending request for the
 * same row/mode, gives running rows priority, and spaces starts by a minimum
 * gap. The queue carries no phrases; it only schedules work.
 */
export class SummaryQueue<T> {
  private readonly pending: SummaryQueueJob[] = []
  private readonly inFlight = new Map<number, InFlight>()
  private readonly aborted = new Set<number>()
  private readonly maxConcurrent: number
  private readonly minGapMs: number
  private readonly now: () => number
  private timer: ReturnType<typeof setTimeout> | null = null
  private active = 0
  private lastStart = Number.NEGATIVE_INFINITY
  private nextToken = 1
  private stopped = false

  /**
   * @param options - RPC runner, settlement callbacks, and scheduling limits.
   */
  constructor(private readonly options: SummaryQueueOptions<T>) {
    this.maxConcurrent = options.maxConcurrent ?? 2
    this.minGapMs = options.minGapMs ?? 500
    this.now = options.now ?? Date.now
  }

  /**
   * Enqueue the latest request for a row and mode. An older pending request for
   * the same pair is discarded; in-flight requests are left to settle and are
   * rejected by the presenter's token check.
   * @param job - request identity without its queue token.
   * @returns the token assigned to this request.
   */
  enqueue(job: Omit<SummaryQueueJob, 'token'>): number {
    const token = this.nextToken++
    const next: SummaryQueueJob = { ...job, token }
    const duplicate = this.pending.findIndex(candidate =>
      candidate.row === job.row && candidate.request.mode === job.request.mode)
    if (duplicate >= 0) this.pending.splice(duplicate, 1)
    this.pending.push(next)
    this.pump()
    return token
  }

  /**
   * Cancel every pending and in-flight request belonging to one row.
   * @param row - row whose requests must stop.
   */
  abortRow(row: HTMLElement): void {
    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      if (this.pending[index]?.row === row) this.pending.splice(index, 1)
    }
    for (const [token, entry] of this.inFlight) {
      if (entry.job.row !== row) continue
      this.aborted.add(token)
      entry.controller.abort()
    }
  }

  /** Re-arm a queue after {@link clear}; the presenter owns start/stop reuse. */
  restart(): void {
    this.stopped = false
    this.aborted.clear()
    this.lastStart = Number.NEGATIVE_INFINITY
    this.timer = null
  }

  /** Cancel all pending work, abort in-flight requests, and stop the queue. */
  clear(): void {
    this.stopped = true
    this.pending.length = 0
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    for (const [token, entry] of this.inFlight) {
      this.aborted.add(token)
      entry.controller.abort()
    }
    this.inFlight.clear()
    this.active = 0
  }

  private pump(): void {
    if (this.stopped || this.pending.length === 0 || this.active >= this.maxConcurrent) return
    const wait = this.minGapMs - (this.now() - this.lastStart)
    if (wait > 0) {
      this.arm(wait)
      return
    }
    this.pending.sort((left, right) =>
      priorityOf(left) - priorityOf(right) || left.token - right.token)
    const job = this.pending.shift()
    if (job === undefined) return
    this.start(job)
    this.pump()
  }

  private arm(wait: number): void {
    if (this.timer !== null) return
    this.timer = setTimeout(() => {
      this.timer = null
      this.pump()
    }, wait)
  }

  private start(job: SummaryQueueJob): void {
    this.active += 1
    this.lastStart = this.now()
    const controller = new AbortController()
    this.inFlight.set(job.token, { job, controller })
    void Promise.resolve()
      .then(() => this.options.run(job, controller.signal))
      .then(
        value => { this.settle(job, () => this.options.onSuccess(job, value)) },
        error => { this.settle(job, () => this.options.onError(job, error)) },
      )
  }

  private settle(job: SummaryQueueJob, callback: () => void): void {
    this.inFlight.delete(job.token)
    this.active = Math.max(0, this.active - 1)
    if (!this.stopped && !this.aborted.delete(job.token)) {
      try {
        callback()
      } catch (error) {
        console.error('[stream-focus-summary] request settlement failed:', error)
      }
    }
    if (!this.stopped) this.pump()
  }
}

function priorityOf(job: SummaryQueueJob): number {
  return job.priority === 'active' ? 0 : 1
}
