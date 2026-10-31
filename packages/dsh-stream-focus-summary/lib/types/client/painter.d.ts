/** Attribute names owned by this plugin; cleanup removes only these. */
export declare const OWNED_ATTRIBUTES: readonly ["data-dshsf-progress", "data-dshsf-phrase", "data-dshsf-pending"];
/**
 * Decorate a row with one phrase.
 * @param root - product reasoning row.
 * @param phrase - Host-generated phrase.
 * @returns false when the product title disappeared before painting.
 */
export declare function paintPhrase(root: HTMLElement, phrase: string): boolean;
/**
 * Show the neutral placeholder while a row has no phrase yet.
 * @param root - product reasoning row.
 * @returns false when the product title disappeared before painting.
 */
export declare function paintPending(root: HTMLElement): boolean;
/**
 * Remove every attribute this plugin may have written to one row.
 * @param root - product reasoning row, connected or previously painted.
 */
export declare function clearRow(root: HTMLElement): void;
/** Whether the row still carries this plugin's marker. */
export declare function isPainted(root: HTMLElement): boolean;
