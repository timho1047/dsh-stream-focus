# Changelog

## [Unreleased]

### Changed

- Require DSH `>=0.2.2-rc.1`; DSH 0.2.1 is no longer supported.

## [0.1.0] - 2026-11-02

### Added

- Host Typert remote service `streamFocusSummary` with `summarize`, `phrases`, and `modelStatus` for paragraph and whole-stretch phrases.
- Current-Session model routing (`modelSelection.pending ?? lastUsed`, then `agentDefaultModel`), a strict complete `modelOverride`, and fallback from an unusable override to the current Session model.
- Exact content keys plus locale-neutral anchors with stable row identity; a Host memory LRU and `storageDomain` phrase persistence, with memory-only degradation.
- Locale-aware generation that follows the active DSH UI locale; finished rows keep their language across locale switches and reloads.
- Row configuration page at `dsh-stream-focus#dsh-stream-focus-summary` with `maxChars`, `maxTokens`, follow/override model modes, a full searchable model catalogue, active-source status, and fallback/catalogue warnings.
- No browser phrase cache: reload, re-mount, and conversation switches hydrate through the Host only.

### Notes

- Published before `dsh-stream-focus@0.2.0`, which inserts this package as its second row; it is not a separate install entry.
- Requires DSH `>=0.2.1-rc.3` and the Web profile.
- The release workflow publishes this package first so the bundle can resolve `^0.1.0`; an already-published matching version is skipped.
