/**
 * Two-level phrase storage for the summary Host.
 *
 * The in-memory LRU is a bounded acceleration layer. The durable storage
 * domain is the source of truth and keeps derived data only: a phrase, its
 * locale, the prompt generation that produced it, and a timestamp. Opening the
 * domain is best-effort; any failure degrades to memory without failing the
 * plugin row.
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { Domain, KvTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'

/** One persisted phrase record; never contains reasoning text. */
export interface StoredPhrase {
  readonly phrase: string
  readonly locale: string
  readonly promptVersion: string
  readonly updatedAt: number
}

/**
 * Durable domain declaration for generated phrases.
 *
 * The storage hub's unit-name grammar admits lowercase letters, digits, and
 * underscores, so the domain name cannot use the package name's hyphens.
 */
export const PHRASE_DOMAIN = defineDomain({
  name: 'stream_focus_summary',
  version: 1,
  invalidRecords: 'backup-and-skip',
  tables: {
    phrases: domainTable<string, StoredPhrase>(z.object({
      phrase: z.string().min(1),
      locale: z.string().min(1),
      promptVersion: z.string().min(1),
      updatedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })),
  },
})

/** Internal in-memory capacity; deliberately not public configuration. */
export const MEMORY_CAPACITY = 400

/** Internal durable capacity; deliberately not public configuration. */
export const DURABLE_CAPACITY = 800

/** One successful exact-or-anchor lookup. */
export interface PhraseLookup {
  readonly key: string
  readonly record: StoredPhrase
}

type PhraseTable = KvTable<string, StoredPhrase>

/**
 * LRU plus fail-soft durable store for validated phrases.
 *
 * Exact and anchor keys are ordinary records. Reads are synchronous from the
 * LRU, then from the durable domain's in-memory table; writes update the LRU
 * immediately and persist sequentially, swallowing backend failures because
 * derived-phrase durability must never fail a summary reply.
 */
export class PhraseStore {
  private readonly cache = new Map<string, StoredPhrase>()
  private domain: Domain<typeof PHRASE_DOMAIN> | undefined

  /**
   * @param ctx - owning Host context, used for the optional storage service and logs.
   */
  constructor(private readonly ctx: Context) {}

  /**
   * Open the durable domain if the optional service is mounted.
   * @returns resolution after hydration and capacity trimming settle.
   */
  async open(): Promise<void> {
    const facility = this.ctx.get('storageDomain')
    if (facility === undefined) return
    let domain: Domain<typeof PHRASE_DOMAIN> | undefined
    try {
      domain = await facility.open(PHRASE_DOMAIN)
      this.domain = domain
      this.ctx.effect(() => async () => {
        this.domain = undefined
        await domain?.close()
      }, 'stream-focus-summary.phrase-store')
      await this.trimDurable(domain.table('phrases'))
    } catch (error) {
      if (domain !== undefined) await domain.close().catch(() => {})
      this.domain = undefined
      this.ctx.logger.warn(
        `stream-focus-summary: durable phrase storage unavailable; using memory only: ${errorMessage(error)}`,
      )
    }
  }

  /**
   * Read one exact key only. Used by generation so a locale-specific cache hit
   * never consults the locale-neutral anchor lane.
   * @param key - exact content key.
   * @returns the stored record, if present.
   */
  getExact(key: string): StoredPhrase | undefined {
    return this.get(key)
  }

  /**
   * Read the exact key first, then the anchor key.
   * @param exact - locale-specific exact key.
   * @param anchor - optional locale-neutral anchor key.
   * @returns the hit and the key that produced it.
   */
  lookup(exact: string, anchor?: string): PhraseLookup | undefined {
    const exactRecord = this.get(exact)
    if (exactRecord !== undefined) return { key: exact, record: exactRecord }
    if (anchor !== undefined) {
      const anchorRecord = this.get(anchor)
      if (anchorRecord !== undefined) return { key: anchor, record: anchorRecord }
    }
    return undefined
  }

  /**
   * Store one validated phrase under its exact key and optional anchor key.
   * @param exact - exact content key.
   * @param anchor - optional locale-neutral anchor key.
   * @param record - validated phrase and metadata.
   * @returns resolution after the durable write and capacity trim settle.
   */
  async put(exact: string, anchor: string | undefined, record: StoredPhrase): Promise<void> {
    const keys = anchor === undefined ? [exact] : [exact, anchor]
    for (const key of keys) this.remember(key, record)
    await this.persist(keys, record)
  }

  /**
   * Store one alias key for an already persisted phrase.
   * @param key - exact or anchor key to add.
   * @param record - validated phrase and metadata.
   * @returns resolution after the durable write and capacity trim settle.
   */
  async putAlias(key: string, record: StoredPhrase): Promise<void> {
    this.remember(key, record)
    await this.persist([key], record)
  }

  /** Persist keys sequentially; backend failures stay contained. */
  private async persist(keys: readonly string[], record: StoredPhrase): Promise<void> {
    const domain = this.domain
    if (domain === undefined) return
    try {
      const table = domain.table('phrases')
      for (const key of keys) await table.put(key, record)
      await this.trimDurable(table)
    } catch (error) {
      this.ctx.logger.warn(`stream-focus-summary: phrase persistence failed: ${errorMessage(error)}`)
    }
  }

  /** Read through the LRU to keep recently used records hot. */
  private get(key: string): StoredPhrase | undefined {
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      this.touch(key, cached)
      return cached
    }
    const domain = this.domain
    if (domain === undefined) return undefined
    try {
      const stored = domain.table('phrases').get(key)
      if (stored !== undefined) this.touch(key, stored)
      return stored
    } catch {
      return undefined
    }
  }

  /** Insert and refresh LRU recency. */
  private remember(key: string, record: StoredPhrase): void {
    this.cache.delete(key)
    this.cache.set(key, record)
    while (this.cache.size > MEMORY_CAPACITY) {
      const oldest = this.cache.keys().next()
      if (oldest.done === true) break
      this.cache.delete(oldest.value)
    }
  }

  /** Refresh a hit without changing the stored value. */
  private touch(key: string, record: StoredPhrase): void {
    this.remember(key, record)
  }

  /**
   * Keep the durable table at its internal cap, evicting oldest records by
   * `updatedAt`. Failures leave the readable domain in place.
   */
  private async trimDurable(table: PhraseTable): Promise<void> {
    try {
      if (table.size <= DURABLE_CAPACITY) return
      const ordered = [...table.entries()].sort((left, right) => {
        const byTime = left[1].updatedAt - right[1].updatedAt
        return byTime === 0 ? left[0].localeCompare(right[0]) : byTime
      })
      const excess = table.size - DURABLE_CAPACITY
      const evicted = ordered.slice(0, excess).map(([key]) => key)
      if (evicted.length > 0) await table.deleteMany(evicted)
    } catch (error) {
      this.ctx.logger.warn(`stream-focus-summary: phrase capacity trim failed: ${errorMessage(error)}`)
    }
  }
}

/** Format an arbitrary failure without assuming it is an Error instance. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
