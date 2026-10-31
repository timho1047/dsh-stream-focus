/** Read one product reasoning row without owning or rewriting its DOM. */
import type { AnchorIdentity } from '../shared/protocol.ts';
/** Maximum paragraph text sent to the Host. */
export declare const PARAGRAPH_LIMIT = 4000;
/** Maximum whole-stretch text sent to the Host. */
export declare const SEGMENT_LIMIT = 8000;
/** One product reasoning row and the content the presenter may use. */
export interface ThinkRowSnapshot {
    readonly element: HTMLElement;
    readonly title: HTMLElement;
    readonly running: boolean;
    readonly preview: string;
    readonly bodyText: string;
    readonly paragraphs: readonly string[];
    /** Latest completed paragraph, or the product's collapsed preview line. */
    readonly paragraphText: string;
    readonly anchor: AnchorIdentity | undefined;
}
/** Find every product reasoning row in one document pass. */
export declare function thinkRows(doc: Document): HTMLElement[];
/** The title is the disclosure label, never the collapsed preview or body copy. */
export declare function titleOf(root: HTMLElement): HTMLElement | undefined;
/** Read the product's collapsed preview without confusing it with body text. */
export declare function previewOf(root: HTMLElement): string;
/** Read the expanded reasoning body, if the row still exposes it. */
export declare function bodyOf(root: HTMLElement): HTMLElement | undefined;
/** Whether the product marks this row as the streaming tail. */
export declare function isRunning(root: HTMLElement): boolean;
/**
 * Read one reasoning row. A row without a title has no product surface this
 * plugin can decorate and is reported as absent.
 * @param root - `[data-variant="think"]` root.
 * @returns current title, state, preview, body paragraphs, and stable anchor.
 */
export declare function readThinkRow(root: HTMLElement): ThinkRowSnapshot | undefined;
/**
 * Extract the latest completed paragraph. The product's collapsed preview
 * names that paragraph's first line, so a match wins over positional guesses;
 * without a preview the streaming tail is treated as incomplete.
 * @param paragraphs - normalized body paragraphs in display order.
 * @param preview - product collapsed preview, possibly empty when expanded.
 * @param running - whether the row is still streaming.
 * @returns the paragraph text, without a trailing newline.
 */
export declare function latestCompletedParagraph(paragraphs: readonly string[], preview: string, running: boolean): string;
/**
 * Split body text on one or more blank lines.
 * @param text - normalized reasoning text.
 * @returns non-empty normalized paragraphs.
 */
export declare function paragraphsOf(text: string): string[];
/**
 * Extract text from the rendered Markdown body. `innerText` preserves the
 * browser's visual line breaks; the fallback serializer inserts paragraph
 * breaks between block elements, which `textContent` alone would lose.
 * @param body - product reasoning body element.
 * @returns normalized body text.
 */
export declare function readBodyText(body: HTMLElement): string;
/**
 * Read the stable row identity the Host uses for locale-neutral anchors.
 * Missing product identity yields undefined; the plugin never fabricates it.
 * @param root - reasoning row root.
 * @returns node key, optional group part, and reasoning-row index.
 */
export declare function anchorOf(root: HTMLElement): AnchorIdentity | undefined;
/** Truncate paragraph input to the Host's cap. */
export declare function limitParagraph(text: string): string;
/** Truncate segment input to the Host's cap. */
export declare function limitSegment(text: string): string;
/** Normalize one inline phrase or preview line. */
export declare function normalizeInline(text: string): string;
