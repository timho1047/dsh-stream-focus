# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-10-19

### Added

- Qwen-style fade for newly streamed paragraphs, lists, and code blocks:
  opacity `0 → 1` over `600ms ease-in`, without movement.
- Smooth 3px progress line in the active process window, replacing the native
  scrollbar thumb whose height flickered as content grew by line.
- Bilingual project landing page with 30fps mode demos on GitHub Pages.

### Changed

- When thinking ends, close the old row first and open the tool row after the
  close completes, instead of changing both heights at the same time.
- Freeze the active window height before a row-to-row transition so the outer
  transcript floor does not move.
- Inner window scrolling and bottom-following now use DSH's official
  `useProcessScroll`; the plugin no longer writes a second, competing
  `scrollTop` loop.

### Fixed

- Content above the window no longer drops when the Think block collapses or
  gets pushed back when the tool block expands.
- Removed duplicate follow loops that could stutter during tool expansion or
  interrupt bottom-following.
- Re-arm official process follow after a transition when the window was at the
  bottom, no reader gesture occurred, and follow was lost to the
  content-growth/scrollend race.
- Improved landing page text contrast.

## [0.1.0] - 2026-10-19

### Added

- Initial release of `dsh-stream-focus`.
- Support for all four DSH Work details modes:
  - Compact / Standard: auto-opening capped process window with height
    high-water and outer-tail guarding.
  - Detailed / Verbose: automatic current-row expansion for flat process rows.
- Automatic expansion of the current reasoning and tool row, including
  standalone Bash rows.
- Character-paced reasoning reveal with animation-frame catch-up and
  grapheme-safe boundaries.
- Line-level fade for normal assistant prose and fade-in for new blocks.
- ~180ms height + opacity transitions for automatic row disclosures.
- Focus-safe automatic clicks, manual-choice preservation, native window
  chrome, horizontal scrollbar suppression, and reduced-motion fallbacks.
- Zero settings, no Session writes, no network requests, and no model tools.
- npm package, MIT license, and GitHub Pages project page.

[0.1.1]: https://github.com/timho1047/dsh-stream-focus/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/timho1047/dsh-stream-focus/releases/tag/v0.1.0
