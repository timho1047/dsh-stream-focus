/** Bounds and small text helpers shared by key derivation and prompt building. */
import type { SummaryMode } from '../shared/protocol.ts';
/** Maximum reasoning characters sent for a single completed paragraph. */
export declare const PARAGRAPH_INPUT_LIMIT = 4000;
/** Maximum reasoning characters sent for a whole reasoning stretch. */
export declare const SEGMENT_INPUT_LIMIT = 8000;
/**
 * Normalize and bound one model input.
 *
 * Trimming before hashing keeps keys stable for equivalent request whitespace;
 * bounding before hashing keeps a generation keyed by the text the model
 * actually saw.
 * @param text - raw reasoning text from the Client.
 * @param mode - paragraph or whole-stretch input.
 * @returns the bounded source text, possibly empty.
 */
export declare function boundedReasoningText(text: string, mode: SummaryMode): string;
/**
 * Return the first line of reasoning text without surrounding whitespace.
 * @param text - source reasoning text.
 * @returns the first logical line.
 */
export declare function firstLineOf(text: string): string;
/**
 * Identity used for session-keyed hashes and fallback diagnostics.
 * @param sessionId - Session identity supplied by the Client, when known.
 * @returns the Session id, or the fixed no-session marker.
 */
export declare function sessionIdentity(sessionId?: string): string;
/**
 * Normalize text for the "mechanical copy" comparison only.
 * @param text - phrase or source text.
 * @returns case- and whitespace-insensitive text.
 */
export declare function comparableText(text: string): string;
