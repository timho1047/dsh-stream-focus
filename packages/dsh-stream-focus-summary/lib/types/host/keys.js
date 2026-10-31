/**
 * Authoritative content and anchor key derivation for generated phrases.
 *
 * The browser never derives keys. Every input that can change the generated
 * phrase is part of the exact key, while the anchor key deliberately omits
 * locale so a completed row can be restored in the language it was generated
 * in after a UI language change.
 */
import { firstLineOf, sessionIdentity } from "./text.js";
const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const FNV_MASK = 0xffffffffffffffffn;
/**
 * Hash one string into 16 lowercase hexadecimal characters.
 *
 * This is FNV-1a over UTF-16 code units with a 64-bit multiply. It is stable
 * across processes and restarts, unlike a random UUID, and is wide enough for
 * the bounded Host caches.
 * @param value - text to hash.
 * @returns a fixed-width 64-bit hash.
 */
export function hash64(value) {
    let hash = FNV_OFFSET_BASIS;
    for (let index = 0; index < value.length; index++) {
        hash ^= BigInt(value.charCodeAt(index));
        hash = (hash * FNV_PRIME) & FNV_MASK;
    }
    return hash.toString(16).padStart(16, '0');
}
/**
 * Encode one colon-delimited key component without allowing lone surrogates to
 * throw or to make distinct malformed values collide.
 * @param value - route, locale, or other key component.
 * @returns a percent-encoded component.
 */
function encodeKeySegment(value) {
    let encoded = '';
    for (const character of value) {
        try {
            encoded += encodeURIComponent(character);
        }
        catch {
            encoded += '%EF%BF%BD';
        }
    }
    return encoded;
}
/**
 * Derive the exact key and, when stable row identity is present, the anchor key.
 * @param input - effective model, bounded content, locale, mode, and origin.
 * @returns both keys, with the same lane layout documented in the SPEC.
 */
export function summaryKeys(input) {
    const provider = encodeKeySegment(input.model.provider);
    const model = encodeKeySegment(input.model.model);
    const sessionHash = hash64(sessionIdentity(input.sessionId));
    const contentHash = hash64(input.text);
    const exact = [
        'v1', input.promptVersion, provider, model, input.locale, input.mode,
        String(input.maxChars), sessionHash, contentHash,
    ].join(':');
    if (input.anchor === undefined)
        return { exact };
    const rowAnchorHash = hash64(JSON.stringify([
        input.anchor.nodeKey,
        input.anchor.groupPart ?? null,
        input.anchor.rowIndex,
    ]));
    const firstLineHash = hash64(firstLineOf(input.text));
    return {
        exact,
        anchor: [
            'a', 'v1', input.promptVersion, provider, model, input.mode,
            String(input.maxChars), sessionHash, rowAnchorHash, firstLineHash,
        ].join(':'),
    };
}
//# sourceMappingURL=keys.js.map