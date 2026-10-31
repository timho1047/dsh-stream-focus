// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SummaryQueueJob } from '../../src/client/queue.ts'
import { SummaryQueue } from '../../src/client/queue.ts'

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((settle, fail) => { resolve = settle; reject = fail })
  return { promise, resolve, reject }
}

function requestFor(text: string, mode: 'paragraph' | 'segment' = 'paragraph'): SummaryQueueJob['request'] {
  return { text, mode, locale: 'en' }
}

function job(row: HTMLElement, text: string, mode: 'paragraph' | 'segment' = 'paragraph') {
  return {
    row,
    epoch: 0,
    priority: mode === 'paragraph' ? 'active' as const : 'historical' as const,
    request: requestFor(text, mode),
  }
}

async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('SummaryQueue', () => {
  let now = 0
  const rows: HTMLElement[] = []

  beforeEach(() => {
    vi.useFakeTimers()
    now = 0
    document.body.innerHTML = ''
    rows.length = 0
    for (let index = 0; index < 4; index += 1) {
      const row = document.createElement('div')
      document.body.append(row)
      rows.push(row)
    }
  })

  afterEach(() => { vi.useRealTimers() })

  function bench() {
    const calls: Array<{ job: SummaryQueueJob; deferred: Deferred<string> }> = []
    const successes: string[] = []
    const failures: string[] = []
    const queue = new SummaryQueue<string>({
      now: () => now,
      run: (next) => {
        const pending = deferred<string>()
        calls.push({ job: next, deferred: pending })
        return pending.promise
      },
      onSuccess: (accepted) => { successes.push(accepted.request.text) },
      onError: (failed) => { failures.push(String(failed)) },
    })
    return { queue, calls, successes, failures }
  }

  it('starts at most two RPCs and spaces starts by at least 500 ms', async () => {
    const b = bench()
    b.queue.enqueue(job(rows[0]!, 'a'))
    await flush()
    expect(b.calls).toHaveLength(1)

    b.queue.enqueue(job(rows[1]!, 'b'))
    b.queue.enqueue(job(rows[2]!, 'c'))
    await flush()
    expect(b.calls).toHaveLength(1)

    now = 500
    vi.advanceTimersByTime(500)
    await flush()
    expect(b.calls).toHaveLength(2)

    now = 1_000
    vi.advanceTimersByTime(500)
    await flush()
    expect(b.calls).toHaveLength(2)

    b.calls[0]?.deferred.resolve('ok')
    await flush()
    expect(b.successes).toEqual(['a'])
    now = 1_500
    vi.advanceTimersByTime(500)
    await flush()
    expect(b.calls).toHaveLength(3)
  })

  it('keeps only the newest pending request per row and mode', async () => {
    const b = bench()
    b.queue.enqueue(job(rows[0]!, 'first'))
    await flush()
    b.queue.enqueue(job(rows[0]!, 'second'))
    b.queue.enqueue(job(rows[0]!, 'third'))
    b.calls[0]?.deferred.resolve('ok')
    await flush()
    now = 500
    vi.advanceTimersByTime(500)
    await flush()
    expect(b.calls.map(call => call.job.request.text)).toEqual(['first', 'third'])
  })

  it('gives a running row priority over a historical backfill', async () => {
    const b = bench()
    b.queue.enqueue(job(rows[3]!, 'blocker'))
    await flush()
    b.queue.enqueue({ ...job(rows[0]!, 'old', 'segment'), priority: 'historical' })
    b.queue.enqueue({ ...job(rows[1]!, 'live'), priority: 'active' })
    now = 500
    vi.advanceTimersByTime(500)
    await flush()
    expect(b.calls[1]?.job.request.text).toBe('live')
  })

  it('stops callbacks and aborts the signal when a row is cancelled', async () => {
    const b = bench()
    let signal: AbortSignal | undefined
    const queue = new SummaryQueue<string>({
      now: () => now,
      run: (_job, requestSignal) => {
        signal = requestSignal
        const pending = deferred<string>()
        b.calls.push({ job: _job, deferred: pending })
        return pending.promise
      },
      onSuccess: (accepted) => { b.successes.push(accepted.request.text) },
      onError: (failed) => { b.failures.push(String(failed)) },
    })
    queue.enqueue(job(rows[0]!, 'cancelled'))
    await flush()
    queue.abortRow(rows[0]!)
    expect(signal?.aborted).toBe(true)
    b.calls[0]?.deferred.resolve('ok')
    await flush()
    expect(b.successes).toEqual([])
  })

  it('cancels queued work on clear', async () => {
    const b = bench()
    b.queue.enqueue(job(rows[0]!, 'a'))
    b.queue.enqueue(job(rows[1]!, 'b'))
    await flush()
    b.queue.clear()
    now = 5_000
    vi.advanceTimersByTime(5_000)
    await flush()
    expect(b.calls).toHaveLength(1)
  })
})
