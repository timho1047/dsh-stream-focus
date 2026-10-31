/**
 * Authoritative content and anchor key derivation for generated phrases.
 *
 * The browser never derives keys. Every input that can change the generated
 * phrase is part of the exact key, while the anchor key deliberately omits
 * locale so a completed row can be restored in the language it was generated
 * in after a UI language change.
 */
import type { AnchorIdentity, ModelRef, SummaryMode } from '../shared/protocol.ts';
/**
 * Hash one string into 16 lowercase hexadecimal characters.
 *
 * This is FNV-1a over UTF-16 code units with a 64-bit multiply. It is stable
 * across processes and restarts, unlike a random UUID, and is wide enough for
 * the bounded Host caches.
 * @param value - text to hash.
 * @returns a fixed-width 64-bit hash.
 */
export declare function hash64(value: string): string;
/** Inputs shared by exact and anchor keys. */
export interface SummaryKeyInput {
    /** Model that actually performs the generation, after fallback resolution. */
    readonly model: ModelRef;
    /** Bounded reasoning text used for the prompt. */
    readonly text: string;
    readonly mode: SummaryMode;
    readonly locale: string;
    readonly sessionId?: string;
    /** Stable row identity; omission suppresses the anchor key. */
    readonly anchor?: AnchorIdentity;
    readonly maxChars: number;
    /** Content contract version from the shared protocol. */
    readonly promptVersion: string;
}
/** The authoritative exact key and optional locale-neutral anchor key. */
export interface SummaryKeys {
    readonly exact: string;
    readonly anchor?: string;
}
/**
 * Derive the exact key and, when stable row identity is present, the anchor key.
 * @param input - effective model, bounded content, locale, mode, and origin.
 * @returns both keys, with the same lane layout documented in the SPEC.
 */
export declare function summaryKeys(input: SummaryKeyInput): SummaryKeys;
