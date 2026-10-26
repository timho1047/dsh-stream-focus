# dsh-stream-focus

Enhances the running thinking/tool display across all four built-in Work details modes.

English | [中文](README.md) | [Landing page](https://timho1047.github.io/dsh-stream-focus/) | [Changelog](CHANGELOG.md)

## Behavior by mode

| Mode | Enhancement |
|---|---|
| Compact / Standard | Auto-opens the current process group as a capped, bottom-following window that keeps its height; old windows fold when the step changes. |
| Detailed | Keeps the current Turn flat inside the official container without faking a group cap; auto-opens the current thinking/tool row and closes older automatic rows. |
| Verbose | Keeps the flat presentation; auto-opens the current thinking/tool row but never closes older rows, preserving “always expanded” semantics. |

All modes share: character-paced reasoning, line-level fading plus character highlight fading for normal assistant prose, fade-in for new paragraphs/lists/code blocks, and focus-safe automatic actions.

- While reasoning streams, the current Think row opens automatically, and new tail graphemes fade in through the CSS Custom Highlight API without DOM spans. Reveal speed is normalized by elapsed time for consistent 60Hz/120Hz behavior. The official process group becomes a capped window. Inner scrolling and bottom-following stay with the official process scroll, so the plugin never writes a second `scrollTop`.
- A process group appears at its real height with a short ~180ms opacity fade instead of collapsing and expanding again.
- Automatic disclosures use a native CSS `0 → auto` size transition where `interpolate-size` is supported, avoiding JS height writes on every frame; other browsers keep the WAAPI fallback.
- The active window disables horizontal overflow and the official top/bottom edge masks, avoiding intermittent horizontal scrollbars and a partially faded vertical scrollbar. The native thumb is hidden in the active window and replaced with a 3px progress line whose height transitions smoothly, so it no longer flickers as content grows by line. 
- The active window keeps the tallest height it has shown; switching from thinking to tools only scrolls its inner content, so the outer transcript never rolls back because the window became shorter.
- A light 16px fade at the window bottom makes new lines enter softly rather than snapping in.
- Streaming assistant prose gets a 20px line fade at the message root; it is removed as soon as streaming ends.
- New paragraphs, lists, and code blocks in reasoning and normal prose fade in with a 600ms ease-in opacity transition and no movement; character reveal avoids splitting combining marks and ZWJ emoji.
- While normal prose grows or a tool row expands, the plugin keeps the outer transcript on its floor only while it is still following; row switches freeze the window height instead of moving the outer scroller during the animation.
- No custom background, border, radius, or padding: the window keeps the official process-group appearance.
- Automatic opens temporarily suppress the title button’s `focus()`, and pointer clicks move focus away afterwards, so no focus ring is left behind. Keyboard focus keeps the official accessible behavior.
- When thinking ends and tools begin, the previous Think row closes first, then the current tool row opens. The window height is frozen before the switch, so the outer transcript does not change height and content above neither drops nor gets pushed back. Rows use a ~180ms height + opacity transition. Parallel tools open together, including the standalone Bash row (`data-sample="bash"`).
- When the next thinking step starts, the previous batch of automatic thinking/tool windows closes, leaving only the new Think window.
- Rows opened manually are never auto-closed; groups or rows closed manually are never forced open.
- If the reader scrolls the outer transcript away from the bottom, the plugin does not scroll it for them. Inner window scrolling and bottom-following remain owned by the official process scroll. When there is no reader gesture and official follow is lost after a transition, the plugin performs one repair pass: it returns the window to its floor and dispatches `scrollend` to re-arm follow.
- When a Turn ends or the plugin is removed, the official presentation is restored.

## Demos

30fps, 1080p MP4 demos for all four modes (25–32 seconds each, starting from the centered composer, including the full opening reasoning, and ending when the model finishes). GitHub README does not embed video, so each poster opens that mode on the GitHub Pages player.

| Compact | Standard |
|---|---|
| [![Compact](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/compact.jpg)](https://timho1047.github.io/dsh-stream-focus/#compact) | [![Standard](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/standard.jpg)](https://timho1047.github.io/dsh-stream-focus/#standard) |
| **Detailed** | **Verbose** |
| [![Detailed](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/detailed.jpg)](https://timho1047.github.io/dsh-stream-focus/#detailed) | [![Verbose](https://raw.githubusercontent.com/timho1047/dsh-stream-focus/main/docs/demo/verbose.jpg)](https://timho1047.github.io/dsh-stream-focus/#verbose) |

[Open all demos](https://timho1047.github.io/dsh-stream-focus/)

See the [demo production guide](docs/demo-production.md) for recording and updating the videos.

## Scope

- Pure client-side presentation enhancement: writes no Session data, makes no network requests, touches no credentials, and registers no model tools.
- Zero settings and zero persistence. The plugin panel enable/disable switch is the only control.
- Process-group expansion/collapse is driven by the official Chat semantic DOM. Reasoning text wraps the official `conversation.chat.reasoning.body` Slot and `conversation.chat.reasoning.content` Factory without copying the Markdown renderer. The plugin owns the window's height and styles; inner scrolling stays with the official process scroll and the plugin does not write a second `scrollTop`. Upstream changes to these attributes or Slot contracts require a matching plugin update.
- Only the running Turn is affected; historical Turns keep each mode’s official folding behavior.

## Install

```bash
dsh plugin --profile web add dsh-stream-focus
```

Refresh the browser page after installation. All four Work details modes are enhanced.

## Verified DSH versions

| DSH version | Status |
|---|---|
| `0.2.1-rc.2` | Verified on all four modes, thinking/tool expansion, follow and lost-follow recovery |
| `0.2.1-rc.3` | Verified; current main development version |

Before a release, check the current DSH version. If it is new, add it here and verify all four modes on it first. This table records tested versions; it is not a hard compatibility limit.

## Known limitations

- Character fading uses the CSS Custom Highlight API; browsers without it fall back to normal text rendering.
- Depends on ui-chat semantic DOM (`data-chat-group-key`, `data-variant="think"`, `data-tool`, `data-sample="bash"`, `data-disclosure-row`, `data-chat-running`, `data-chat-following-tail`). If upstream renames them, the plugin silently stops applying until updated.
- Only Compact / Standard have an official process group; their window height uses the official `min(400px, 50vh)`. Detailed / Verbose keep the official flat structure without an added group cap.
- Automatic row switches use a ~180ms height + opacity transition; manual row clicks keep the official instant toggle. A process group’s first appearance uses a 180ms opacity fade.
- Character pacing adds roughly 100ms of visual latency. While streaming, the visible prefix is shown; the complete text is rendered as soon as the block settles. Copying during streaming copies the currently visible prefix.
- Normal assistant prose has no official Content Factory, so it cannot be paced per character. It currently uses a tail character highlight fade plus line-level bottom fading. True per-character pacing requires an official prose Factory.

## Acknowledgements

This plugin was inspired by [dsh-streamfold](https://github.com/rezon-aki/dsh-streamfold). Thanks to [@rezon-aki](https://github.com/rezon-aki) for the exploration and implementation.

Thanks also to [dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream): its CSS Custom Highlight character fade, reveal/follow separation, and time-based integration were important references for later improvements. Thanks to [@Laplace-bit](https://github.com/Laplace-bit) for the exploration and implementation.

## Development

```bash
pnpm install
pnpm run verify   # typecheck + build + 57 tests
```

Before release: run `pnpm run verify` and a four-mode live check on the current DSH version. If the DSH version changed, add it to “Verified DSH versions” before publishing.

- `src/client/decision.ts`: pure state machine deciding which rows the current window should own.
- `src/client/conductor.ts`: Compact / Standard process-group window, height freezing, and mode coordination.
- `src/client/flat-rows.ts`: Detailed / Verbose flat-row auto-expansion.
- `src/client/mode-policy.ts`: four-mode resolution and conductor selection.
- `src/client/paced-body.tsx`: reasoning Body Slot replacement that paces text through the official Content Factory.
- `src/client/normal-smoothing.ts`: normal-prose line fading, character highlight fading, and new-block fade-in.
- `src/client/highlight-fade.ts`: CSS Custom Highlight character fade.
- `src/client/pacing.ts`: pure math for character reveal.
- `src/client/live-transcript.ts`: one adapter for the ui-chat semantic DOM contract.
- `src/client/follow-steward.ts`: shared follow intent, gestures, scrollend and growth recovery.
- `src/client/process-progress.ts`: active-window progress line.
- `src/client/row-disclosure.ts`: shared row ownership, manual choice and click policy.
- `tests/`: mode policy, state machine, pacing math, and jsdom interaction tests.
