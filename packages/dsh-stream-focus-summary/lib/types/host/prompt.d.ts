/**
 * Prompt construction and the single-line phrase contract.
 *
 * This package deliberately requests plain text: the LLM seam has no
 * provider-neutral structured-output option. Validation after generation is
 * therefore the enforcement point, and only a validated phrase may reach a
 * cache or the durable store.
 */
import type { SummaryMode } from '../shared/protocol.ts';
/** System and user text for one generation attempt. */
export interface SummaryPrompt {
    readonly system: string;
    readonly user: string;
}
/** One prompt build request. */
export interface SummaryPromptInput {
    readonly text: string;
    readonly mode: SummaryMode;
    readonly locale: string;
    readonly maxChars: number;
    /** Use the stricter one-repair framing for the second attempt. */
    readonly repair: boolean;
}
/**
 * Build the system and user prompts for one generation attempt.
 * @param input - bounded source text and output constraints.
 * @returns immutable prompt strings.
 */
export declare function buildSummaryPrompt(input: SummaryPromptInput): SummaryPrompt;
/**
 * Clean and validate one model reply against the single-line contract.
 *
 * Cleaning removes wrapping quotes, whitespace, leading bullets, and trailing
 * punctuation before clamping to `maxChars`. Validation rejects empty output,
 * line breaks, JSON/code-fence/label prefixes, and exact mechanical copies of
 * the source or its first line.
 * @param raw - concatenated text deltas from one model call.
 * @param sourceText - bounded reasoning text the model saw.
 * @param maxChars - configured hard output bound.
 * @returns a valid phrase, or undefined when the reply must be retried.
 */
export declare function cleanAndValidatePhrase(raw: string, sourceText: string, maxChars: number): string | undefined;
