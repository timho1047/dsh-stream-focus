/** Paint and remove the plugin's attributes without touching product nodes. */
import { titleOf } from "./adapter.js";
const PROGRESS_ATTRIBUTE = 'data-dshsf-progress';
const PHRASE_ATTRIBUTE = 'data-dshsf-phrase';
const PENDING_ATTRIBUTE = 'data-dshsf-pending';
/** Attribute names owned by this plugin; cleanup removes only these. */
export const OWNED_ATTRIBUTES = [PROGRESS_ATTRIBUTE, PHRASE_ATTRIBUTE, PENDING_ATTRIBUTE];
/**
 * Decorate a row with one phrase.
 * @param root - product reasoning row.
 * @param phrase - Host-generated phrase.
 * @returns false when the product title disappeared before painting.
 */
export function paintPhrase(root, phrase) {
    const title = titleOf(root);
    if (title === undefined)
        return false;
    removePhraseAttributes(root, title);
    root.setAttribute(PROGRESS_ATTRIBUTE, '');
    root.removeAttribute(PENDING_ATTRIBUTE);
    title.setAttribute(PHRASE_ATTRIBUTE, phrase);
    return true;
}
/**
 * Show the neutral placeholder while a row has no phrase yet.
 * @param root - product reasoning row.
 * @returns false when the product title disappeared before painting.
 */
export function paintPending(root) {
    const title = titleOf(root);
    if (title === undefined)
        return false;
    removePhraseAttributes(root, title);
    root.setAttribute(PROGRESS_ATTRIBUTE, '');
    root.setAttribute(PENDING_ATTRIBUTE, '');
    return true;
}
/**
 * Remove every attribute this plugin may have written to one row.
 * @param root - product reasoning row, connected or previously painted.
 */
export function clearRow(root) {
    root.removeAttribute(PROGRESS_ATTRIBUTE);
    root.removeAttribute(PENDING_ATTRIBUTE);
    removeAllPhraseAttributes(root);
    if (root.hasAttribute(PHRASE_ATTRIBUTE))
        root.removeAttribute(PHRASE_ATTRIBUTE);
}
/** Whether the row still carries this plugin's marker. */
export function isPainted(root) {
    return root.hasAttribute(PROGRESS_ATTRIBUTE) || root.hasAttribute(PHRASE_ATTRIBUTE);
}
function removePhraseAttributes(root, title) {
    const phrases = root.querySelectorAll(`[${PHRASE_ATTRIBUTE}]`);
    for (const element of phrases) {
        if (element !== title)
            element.removeAttribute(PHRASE_ATTRIBUTE);
    }
    if (title.hasAttribute(PHRASE_ATTRIBUTE))
        title.removeAttribute(PHRASE_ATTRIBUTE);
}
function removeAllPhraseAttributes(root) {
    const phrases = root.querySelectorAll(`[${PHRASE_ATTRIBUTE}]`);
    for (const element of phrases)
        element.removeAttribute(PHRASE_ATTRIBUTE);
}
//# sourceMappingURL=painter.js.map