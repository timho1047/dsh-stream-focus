/** Work-details modes and the conductor shape each one needs. */

export const ENHANCED_MODES = ['compact', 'standard', 'detailed', 'verbose'] as const

export type EnhancedMode = typeof ENHANCED_MODES[number]
export type ConductorKind = 'grouped' | 'flat'

/**
 * Resolve a saved or absent work-details mode with Chat's compatibility rules.
 *
 * @param saved - raw `ui-chat.transcriptView` value.
 * @param desktop - whether the client is the Desktop shell.
 * @returns the enhanced mode, or null for an unavailable setting snapshot.
 */
export function resolveMode(saved: unknown, desktop: boolean): EnhancedMode {
  if (saved === 'compact' || saved === 'standard' || saved === 'detailed' || saved === 'verbose') return saved
  if (saved === 'normal' || saved === 'expanded') return 'detailed'
  return desktop ? 'standard' : 'detailed'
}

/** Pick the process representation the official mode renders. */
export function conductorFor(mode: EnhancedMode): ConductorKind {
  return mode === 'compact' || mode === 'standard' ? 'grouped' : 'flat'
}
