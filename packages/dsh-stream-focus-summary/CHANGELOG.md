# Changelog

## [0.1.0] - Unreleased

### Added

- Host Typert remote service `streamFocusSummary` with `summarize`, `phrases`, and `modelStatus` for paragraph and whole-stretch phrases.
- Current-Session model routing (`modelSelection.pending ?? lastUsed`, then `agentDefaultModel`), a strict complete `modelOverride`, and fallback from an unusable override to the current Session model.
- Exact content keys plus locale-neutral anchors with stable row identity; a Host memory LRU and `storageDomain` phrase persistence, with memory-only degradation.
- Locale-aware generation that follows the active DSH UI locale; finished rows keep their language across locale switches and reloads.
- Row configuration page at `dsh-stream-focus#dsh-stream-focus-summary` with `maxChars`, `maxTokens`, follow/override model modes, a full searchable model catalogue, active-source status, and fallback/catalogue warnings.
- Legacy thinking-progress (`data-dtp`) guard for rows decorated before or after this plugin, with one diagnostic warning.
- No browser phrase cache: reload, re-mount, and conversation switches hydrate through the Host only.

### Notes

- Published before `dsh-stream-focus@0.2.0`, which inserts this package as its second row; it is not a separate install entry.
- Requires DSH `>=0.2.1-rc.3` and the Web profile.
- The release workflow publishes this package first so the bundle can resolve `^0.1.0`; an already-published matching version is skipped.
