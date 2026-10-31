/**
 * Keeps at most two Host calls in flight, replaces the pending request for the
 * same row/mode, gives running rows priority, and spaces starts by a minimum
 * gap. The queue carries no phrases; it only schedules work.
 */
export class SummaryQueue {
    options;
    pending = [];
    inFlight = new Map();
    aborted = new Set();
    maxConcurrent;
    minGapMs;
    now;
    timer = null;
    active = 0;
    lastStart = Number.NEGATIVE_INFINITY;
    nextToken = 1;
    stopped = false;
    /**
     * @param options - RPC runner, settlement callbacks, and scheduling limits.
     */
    constructor(options) {
        this.options = options;
        this.maxConcurrent = options.maxConcurrent ?? 2;
        this.minGapMs = options.minGapMs ?? 500;
        this.now = options.now ?? Date.now;
    }
    /**
     * Enqueue the latest request for a row and mode. An older pending request for
     * the same pair is discarded; in-flight requests are left to settle and are
     * rejected by the presenter's token check.
     * @param job - request identity without its queue token.
     * @returns the token assigned to this request.
     */
    enqueue(job) {
        const token = this.nextToken++;
        const next = { ...job, token };
        const duplicate = this.pending.findIndex(candidate => candidate.row === job.row && candidate.request.mode === job.request.mode);
        if (duplicate >= 0)
            this.pending.splice(duplicate, 1);
        this.pending.push(next);
        this.pump();
        return token;
    }
    /**
     * Cancel every pending and in-flight request belonging to one row.
     * @param row - row whose requests must stop.
     */
    abortRow(row) {
        for (let index = this.pending.length - 1; index >= 0; index -= 1) {
            if (this.pending[index]?.row === row)
                this.pending.splice(index, 1);
        }
        for (const [token, entry] of this.inFlight) {
            if (entry.job.row !== row)
                continue;
            this.aborted.add(token);
            entry.controller.abort();
        }
    }
    /** Re-arm a queue after {@link clear}; the presenter owns start/stop reuse. */
    restart() {
        this.stopped = false;
        this.aborted.clear();
        this.lastStart = Number.NEGATIVE_INFINITY;
        this.timer = null;
    }
    /** Cancel all pending work, abort in-flight requests, and stop the queue. */
    clear() {
        this.stopped = true;
        this.pending.length = 0;
        if (this.timer !== null)
            clearTimeout(this.timer);
        this.timer = null;
        for (const [token, entry] of this.inFlight) {
            this.aborted.add(token);
            entry.controller.abort();
        }
        this.inFlight.clear();
        this.active = 0;
    }
    pump() {
        if (this.stopped || this.pending.length === 0 || this.active >= this.maxConcurrent)
            return;
        const wait = this.minGapMs - (this.now() - this.lastStart);
        if (wait > 0) {
            this.arm(wait);
            return;
        }
        this.pending.sort((left, right) => priorityOf(left) - priorityOf(right) || left.token - right.token);
        const job = this.pending.shift();
        if (job === undefined)
            return;
        this.start(job);
        this.pump();
    }
    arm(wait) {
        if (this.timer !== null)
            return;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.pump();
        }, wait);
    }
    start(job) {
        this.active += 1;
        this.lastStart = this.now();
        const controller = new AbortController();
        this.inFlight.set(job.token, { job, controller });
        void Promise.resolve()
            .then(() => this.options.run(job, controller.signal))
            .then(value => { this.settle(job, () => this.options.onSuccess(job, value)); }, error => { this.settle(job, () => this.options.onError(job, error)); });
    }
    settle(job, callback) {
        this.inFlight.delete(job.token);
        this.active = Math.max(0, this.active - 1);
        if (!this.stopped && !this.aborted.delete(job.token)) {
            try {
                callback();
            }
            catch (error) {
                console.error('[stream-focus-summary] request settlement failed:', error);
            }
        }
        if (!this.stopped)
            this.pump();
    }
}
function priorityOf(job) {
    return job.priority === 'active' ? 0 : 1;
}
//# sourceMappingURL=queue.js.map