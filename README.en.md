# dsh-stream-focus

Enhances the running thinking/tool display across all four built-in Work details modes.

English | [中文](README.md)

## Behavior by mode

| Mode | Enhancement |
|---|---|
| Compact / Standard | Auto-opens the current process group as a capped, bottom-following window that keeps its height; old windows fold when the step changes. |
| Detailed | Keeps the current Turn flat inside the official container without faking a group cap; auto-opens the current thinking/tool row and closes older automatic rows. |
| Verbose | Keeps the flat presentation; auto-opens the current thinking/tool row but never closes older rows, preserving “always expanded” semantics. |

All modes share: character-paced reasoning, line-level fading for normal assistant prose, fade-in for new paragraphs/lists/code blocks, and focus-safe automatic actions.

- While reasoning streams, the current Think row opens automatically; the official process group becomes a capped window that follows its own bottom.
- Reasoning is revealed smoothly by animation frame, and window scrolling is eased by frame, avoiding chunked character pops and whole-block jumps.
- A process group appears at its real height with a short ~180ms opacity fade instead of collapsing and expanding again.
- The active window disables horizontal overflow and the official top/bottom edge masks, avoiding intermittent horizontal scrollbars and a partially faded vertical scrollbar.
- The active window keeps the tallest height it has shown; switching from thinking to tools only scrolls its inner content, so the outer transcript never rolls back because the window became shorter.
- A light 16px fade at the window bottom makes new lines enter softly rather than snapping in.
- Streaming assistant prose gets a 20px line fade at the message root; it is removed as soon as streaming ends.
- New paragraphs, lists, and code blocks in reasoning and normal prose fade in with a small upward motion; character reveal avoids splitting combining marks and ZWJ emoji.
- While normal prose grows or a row open/close animation runs, the outer transcript is kept on its floor instead of lagging one frame.
- Tool rows auto-open independently of whether the outer transcript happens to be pinned to the bottom.
- No custom background, border, radius, or padding: the window keeps the official process-group appearance.
- Automatic opens temporarily suppress the title button’s `focus()`, and pointer clicks move focus away afterwards, so no focus ring is left behind. Keyboard focus keeps the official accessible behavior.
- When thinking ends and tools begin, the previous Think row closes and the current tool row opens with a ~180ms height + opacity transition. Parallel tools open together, including the standalone Bash row (`data-sample="bash"`).
- When the next thinking step starts, the previous batch of automatic thinking/tool windows closes, leaving only the new Think window.
- Rows opened manually are never auto-closed; groups or rows closed manually are never forced open.
- If the reader scrolls the outer transcript away from the bottom, the plugin does not scroll it for them. Scrolling up inside the window pauses bottom-following; returning to the window bottom resumes it.
- When a Turn ends or the plugin is removed, the official presentation is restored.

## Scope

- Pure client-side presentation enhancement: writes no Session data, makes no network requests, touches no credentials, and registers no model tools.
- Zero settings and zero persistence. The plugin panel enable/disable switch is the only control.
- Process-group expansion/collapse is driven by the official Chat semantic DOM. Reasoning text wraps the official `conversation.chat.reasoning.body` Slot and `conversation.chat.reasoning.content` Factory without copying the Markdown renderer. Bottom-following inside the window is maintained by the plugin with a ResizeObserver and does not hijack outer transcript scrolling. Upstream changes to these attributes or Slot contracts require a matching plugin update.
- Only the running Turn is affected; historical Turns keep each mode’s official folding behavior.

## Install

```bash
dsh plugin --profile web add dsh-stream-focus
```

Refresh the browser page after installation. All four Work details modes are enhanced.

## Known limitations

- Depends on ui-chat semantic DOM (`data-chat-group-key`, `data-variant="think"`, `data-tool`, `data-sample="bash"`, `data-disclosure-row`, `data-chat-running`, `data-chat-following-tail`). If upstream renames them, the plugin silently stops applying until updated.
- Only Compact / Standard have an official process group; their window height uses the official `min(400px, 50vh)`. Detailed / Verbose keep the official flat structure without an added group cap.
- Automatic row switches use a ~180ms height + opacity transition; manual row clicks keep the official instant toggle. A process group’s first appearance uses a 180ms opacity fade.
- Character pacing adds roughly 100ms of visual latency. While streaming, the visible prefix is shown; the complete text is rendered as soon as the block settles. Copying during streaming copies the currently visible prefix.
- Normal assistant prose has no official Content Factory, so it uses line-level bottom fading rather than per-character pacing. True per-character pacing requires an official prose Factory.

## Acknowledgements

This plugin was inspired by [dsh-streamfold](https://github.com/rezon-aki/dsh-streamfold). Thanks to [@rezon-aki](https://github.com/rezon-aki) for the exploration and implementation.

## Development

```bash
pnpm install
pnpm run verify   # typecheck + build + 51 tests
```

- `src/client/decision.ts`: pure state machine deciding which rows the current window should own.
- `src/client/conductor.ts`: Compact / Standard process-group window, bottom pinning, and scroll easing.
- `src/client/flat-rows.ts`: Detailed / Verbose flat-row auto-expansion.
- `src/client/mode-policy.ts`: four-mode resolution and conductor selection.
- `src/client/paced-body.tsx`: reasoning Body Slot replacement that paces text through the official Content Factory.
- `src/client/normal-smoothing.ts`: normal-prose line fading and new-block fade-in.
- `src/client/pacing.ts`: pure math for character reveal and scroll easing.
- `tests/`: mode policy, state machine, pacing math, and jsdom interaction tests.
