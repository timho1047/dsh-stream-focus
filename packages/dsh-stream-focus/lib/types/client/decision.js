/** Chooses the disclosures that belong to the running process window. */
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
export function decideWindow(group) {
    const candidates = [...group.candidates].sort((left, right) => left.order - right.order);
    const reasoning = candidates.filter(candidate => candidate.kind === 'reasoning');
    const newestReasoning = reasoning.at(-1);
    const streamingReasoning = reasoning.filter(candidate => candidate.active).at(-1);
    const toolsAfterReasoning = candidates.filter(candidate => candidate.kind === 'tool'
        && (newestReasoning === undefined || candidate.order > newestReasoning.order));
    const targets = streamingReasoning !== undefined
        ? [streamingReasoning]
        : toolsAfterReasoning.length > 0
            ? toolsAfterReasoning
            : newestReasoning === undefined
                ? []
                : [newestReasoning];
    const targetKeys = new Set(targets.map(candidate => candidate.key));
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
    };
}
//# sourceMappingURL=decision.js.map