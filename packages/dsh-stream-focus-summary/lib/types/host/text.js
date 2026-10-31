/** Bounds and small text helpers shared by key derivation and prompt building. */
/** Maximum reasoning characters sent for a single completed paragraph. */
export const PARAGRAPH_INPUT_LIMIT = 4_000;
/** Maximum reasoning characters sent for a whole reasoning stretch. */
export const SEGMENT_INPUT_LIMIT = 8_000;
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
export function boundedReasoningText(text, mode) {
    const limit = mode === 'segment' ? SEGMENT_INPUT_LIMIT : PARAGRAPH_INPUT_LIMIT;
    return text.trim().slice(0, limit);
}
/**
 * Return the first line of reasoning text without surrounding whitespace.
 * @param text - source reasoning text.
 * @returns the first logical line.
 */
export function firstLineOf(text) {
    return text.split(/\r?\n/u, 1)[0]?.trim() ?? '';
}
/**
 * Identity used for session-keyed hashes and fallback diagnostics.
 * @param sessionId - Session identity supplied by the Client, when known.
 * @returns the Session id, or the fixed no-session marker.
 */
export function sessionIdentity(sessionId) {
    return sessionId !== undefined && sessionId.length > 0 ? sessionId : 'no-session';
}
/**
 * Normalize text for the "mechanical copy" comparison only.
 * @param text - phrase or source text.
 * @returns case- and whitespace-insensitive text.
 */
export function comparableText(text) {
    return text.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
}
//# sourceMappingURL=text.js.map