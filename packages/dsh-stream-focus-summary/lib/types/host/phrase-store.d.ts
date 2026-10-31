/**
 * Two-level phrase storage for the summary Host.
 *
 * The in-memory LRU is a bounded acceleration layer. The durable storage
 * domain is the source of truth and keeps derived data only: a phrase, its
 * locale, the prompt generation that produced it, and a timestamp. Opening the
 * domain is best-effort; any failure degrades to memory without failing the
 * plugin row.
 */
import type { Context } from '@deepseek-ai/cordis';
/** One persisted phrase record; never contains reasoning text. */
export interface StoredPhrase {
    readonly phrase: string;
    readonly locale: string;
    readonly promptVersion: string;
    readonly updatedAt: number;
}
/**
 * Durable domain declaration for generated phrases.
 *
 * The storage hub's unit-name grammar admits lowercase letters, digits, and
 * underscores, so the domain name cannot use the package name's hyphens.
 */
export declare const PHRASE_DOMAIN: {
    name: string;
    version: number;
    invalidRecords: "backup-and-skip";
    tables: {
        phrases: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, StoredPhrase>;
    };
};
/** Internal in-memory capacity; deliberately not public configuration. */
export declare const MEMORY_CAPACITY = 400;
/** Internal durable capacity; deliberately not public configuration. */
export declare const DURABLE_CAPACITY = 800;
/** One successful exact-or-anchor lookup. */
export interface PhraseLookup {
    readonly key: string;
    readonly record: StoredPhrase;
}
/**
 * LRU plus fail-soft durable store for validated phrases.
 *
 * Exact and anchor keys are ordinary records. Reads are synchronous from the
 * LRU, then from the durable domain's in-memory table; writes update the LRU
 * immediately and persist sequentially, swallowing backend failures because
 * derived-phrase durability must never fail a summary reply.
 */
export declare class PhraseStore {
    private readonly ctx;
    private readonly cache;
    private domain;
    /**
     * @param ctx - owning Host context, used for the optional storage service and logs.
     */
    constructor(ctx: Context);
    /**
     * Open the durable domain if the optional service is mounted.
     * @returns resolution after hydration and capacity trimming settle.
     */
    open(): Promise<void>;
    /**
     * Read one exact key only. Used by generation so a locale-specific cache hit
     * never consults the locale-neutral anchor lane.
     * @param key - exact content key.
     * @returns the stored record, if present.
     */
    getExact(key: string): StoredPhrase | undefined;
    /**
     * Read the exact key first, then the anchor key.
     * @param exact - locale-specific exact key.
     * @param anchor - optional locale-neutral anchor key.
     * @returns the hit and the key that produced it.
     */
    lookup(exact: string, anchor?: string): PhraseLookup | undefined;
    /**
     * Store one validated phrase under its exact key and optional anchor key.
     * @param exact - exact content key.
     * @param anchor - optional locale-neutral anchor key.
     * @param record - validated phrase and metadata.
     * @returns resolution after the durable write and capacity trim settle.
     */
    put(exact: string, anchor: string | undefined, record: StoredPhrase): Promise<void>;
    /**
     * Store one alias key for an already persisted phrase.
     * @param key - exact or anchor key to add.
     * @param record - validated phrase and metadata.
     * @returns resolution after the durable write and capacity trim settle.
     */
    putAlias(key: string, record: StoredPhrase): Promise<void>;
    /** Persist keys sequentially; backend failures stay contained. */
    private persist;
    /** Read through the LRU to keep recently used records hot. */
    private get;
    /** Insert and refresh LRU recency. */
    private remember;
    /** Refresh a hit without changing the stored value. */
    private touch;
    /**
     * Keep the durable table at its internal cap, evicting oldest records by
     * `updatedAt`. Failures leave the readable domain in place.
     */
    private trimDurable;
}
