/** Chooses the disclosures that belong to the running process window. */

/** The two disclosures a running process group can own. */
export type CandidateKind = 'reasoning' | 'tool'

/** A manual choice recorded from a reader's own click. */
export type ManualChoice = 'open' | 'closed' | undefined

/** One reasoning or top-level Tool disclosure in a process group. */
export interface WindowCandidate {
  /** Stable Chat row key, unique within the loaded transcript. */
  readonly key: string
  readonly kind: CandidateKind
  /** DOM order inside the process group; reasoning and tools share it. */
  readonly order: number
  /** Whether the disclosure body is currently open. */
  readonly open: boolean
  /** Whether this row is streaming reasoning or a running/preparing Tool. */
  readonly active: boolean
  /** Whether the plugin opened it and may therefore close it later. */
  readonly auto: boolean
  /** The reader's explicit choice, which always wins. */
  readonly manual: ManualChoice
}

/** One running process group reduced to the facts the decision needs. */
export interface WindowGroup {
  readonly open: boolean
  /** The reader closed this group; do not reopen it. */
  readonly suppressed: boolean
  readonly candidates: readonly WindowCandidate[]
}

/** Disclosures to open and close for one synchronization. */
export interface WindowDecision {
  /** Open the process group itself first; row actions wait for its body. */
  readonly openGroup: boolean
  /** Stable keys to open, in candidate order. */
  readonly open: readonly string[]
  /** Stable keys to close, in candidate order. */
  readonly close: readonly string[]
  /** Keys the window should own this round. */
  readonly targets: readonly string[]
}

/**
 * Select one process window for the running Turn.
 *
 * The newest streaming reasoning wins. Otherwise the Tools after the newest
 * reasoning win, so a fast tool that settles before an observed running state
 * still opens. Without a newer Tool, the newest reasoning stays open while its
 * answer begins. Every older automatic disclosure closes; a still-running Tool
 * and every reader-owned disclosure stay untouched.
 *
 * @param group - current process group and its rows.
 * @returns deterministic opens, closes, and the owned target keys.
 */
export function decideWindow(group: WindowGroup): WindowDecision {
  const candidates = [...group.candidates].sort((left, right) => left.order - right.order)
  const reasoning = candidates.filter(candidate => candidate.kind === 'reasoning')
  const newestReasoning = reasoning.at(-1)
  const streamingReasoning = reasoning.filter(candidate => candidate.active).at(-1)
  const toolsAfterReasoning = candidates.filter(candidate => candidate.kind === 'tool'
    && (newestReasoning === undefined || candidate.order > newestReasoning.order))

  const targets = streamingReasoning !== undefined
    ? [streamingReasoning]
    : toolsAfterReasoning.length > 0
      ? toolsAfterReasoning
      : newestReasoning === undefined
        ? []
        : [newestReasoning]
  const targetKeys = new Set(targets.map(candidate => candidate.key))

  return {
    openGroup: !group.open && !group.suppressed,
    open: targets
      .filter(candidate => !candidate.open && candidate.manual !== 'closed')
      .map(candidate => candidate.key),
    close: candidates
      .filter(candidate => candidate.open
        && candidate.auto
        && !targetKeys.has(candidate.key)
        && !candidate.active
        && candidate.manual !== 'open')
      .map(candidate => candidate.key),
    targets: [...targetKeys],
  }
}
