/** Work-details modes and the conductor shape each one needs. */
export declare const ENHANCED_MODES: readonly ["compact", "standard", "detailed", "verbose"];
export type EnhancedMode = typeof ENHANCED_MODES[number];
export type ConductorKind = 'grouped' | 'flat';
/**
 * Resolve a saved or absent work-details mode with Chat's compatibility rules.
 *
 * @param saved - raw `ui-chat.transcriptView` value.
 * @param desktop - whether the client is the Desktop shell.
 * @returns the enhanced mode, or null for an unavailable setting snapshot.
 */
export declare function resolveMode(saved: unknown, desktop: boolean): EnhancedMode;
/** Pick the process representation the official mode renders. */
export declare function conductorFor(mode: EnhancedMode): ConductorKind;
