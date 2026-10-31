# dsh-stream-focus-summary

The second plugin row inside the [dsh-stream-focus](https://github.com/timho1047/dsh-stream-focus/tree/main/packages/dsh-stream-focus#readme)
install: model-written progress phrases for running thinking rows and
whole-stretch summaries for settled ones.

Do not install or enable this package as a separate entry. `dsh-stream-focus`
depends on it and its bundle patch inserts it as `dsh-stream-focus-summary`,
enabled by default. Both packages require DSH `>=0.2.1-rc.3` and the Web
profile.

## What it does

- While reasoning streams, each newly completed paragraph produces one short
  phrase in the active UI language, rendered after the product's thinking-row
  title (`思考 · 核对插件槽位定义`).
- When the row settles, the phrase upgrades to a summary of the whole
  reasoning stretch.
- Phrase state is restored through the Host after re-renders, conversation
  switches, and page reloads. The browser keeps no reusable phrase cache.
- The package has its own Host service (`streamFocusSummary`) and client
  bundle. It does not replace `ReasoningRow`, an assistant-step renderer, or
  any Slot, and it does not take over transcript scrolling.
- Disabling this row stops its model calls and phrase persistence while the
  stream-focus row keeps working. The configuration page ships in the same
  client bundle, so it disappears with the row.

## Model routing

- **Default — follow the current Session model**: the Host reads the current
  Session's `modelSelection` projection (`pending ?? lastUsed`). With no
  Session or projection it uses DSH's `agentDefaultModel`; with neither, no
  model call is made and the product preview remains.
- **Optional override**: `modelOverride` must be a complete
  `{ provider, model }` pair. Partial or empty-field overrides are rejected by
  the Host configuration schema and never silently become “follow”.
- **Fallback**: a complete override that fails before producing usable content
  because the model is unknown, the route or adapter is missing, credentials
  are invalid, or quota is exhausted falls back to the current Session model
  (or the default model) and records a diagnostic. Network, rate-limit,
  server, timeout, transport, and abort failures do not switch models; an
  empty result gets one repair attempt on the same model. A result that
  becomes usable and then fails is discarded without a second call.
- The cache key always uses the effective model, never a stale override.

## Configuration page

Open the `dsh-stream-focus-summary` row in the plugin manager. The page edits
the row config through the plugin manager's form:

- `maxChars`: default 30, range 10–80; hard clamp after cleaning.
- `maxTokens`: default 800, range 256–4,000; per-request generation budget,
  including provider reasoning tokens.
- Model mode: follow the current Session model, or select a complete
  `provider/model` from the full DSH catalogue (`remote.session.modelCatalog()`),
  grouped by provider and searchable by model/provider name.
- Status: active source (session or default), effective model, and the latest
  per-Session fallback.
- Warnings: the selected route is absent from the current catalogue, provider
  catalogue loading failed, or runtime fell back. Warnings do not block
  saving; catalogue membership is advisory.

The page adds no top-level Settings entry. It only edits row config; it does
not change the current Session model.

## Locale

Phrases follow the active DSH UI locale. Locale is part of the exact cache key;
the locale-neutral anchor does not include it, so a finished row keeps the
language it was generated in after a language switch and reload. New
paragraphs and settlements use the new locale. Mixed-language phrases can
therefore appear temporarily in a long conversation.

## Persistence and privacy

- Selected reasoning text is sent to the configured model provider. This is
  part of the feature and is why the row is not zero-network.
- The Host persists through DSH `storageDomain` (storage domain
  `stream_focus_summary`; the unit-name grammar does not allow hyphens): exact
  keys, locale-neutral anchors, cleaned phrases, locale, and update metadata.
  It never stores reasoning text.
- The durable store is capped at 800 entries; the in-memory Host LRU at 400.
  Corrupt records use `invalidRecords: 'backup-and-skip'`; an unavailable
  domain degrades to memory-only without blocking the row.
- The browser keeps only current DOM-row decoration and in-flight state; there
  is no browser phrase cache or localStorage phrase data. Hydration always goes
  through the Host `phrases` query.
- Default logs omit raw reasoning previews.

## Legacy guard

A row already decorated by the old standalone thinking-progress plugin
(`data-dtp`) is skipped with one diagnostic warning. If the old marker appears
after this plugin decorated a row, this plugin removes its own attributes and
pending request state. Uninstall the old plugin; do not run both.

## Disable and rollback

Disable the `dsh-stream-focus-summary` row in the plugin manager, or in the
profile patch:

```yaml
- id: dsh-stream-focus-summary
  disabled: true
```

Rolling back to `dsh-stream-focus@0.1.3` removes this dependency and the row.
No cache is migrated from the old standalone plugin.

## Development

```bash
pnpm install
pnpm -r run typecheck
pnpm run verify
```

Tests live next to the package: Host tests exercise the service through its
public remote methods with a fake `llm.stream()` and fake storage; browser
tests use jsdom fixtures of the product's think-row markup and a fake RPC
connection. The composition and packaging checks live in the workspace
[README](https://github.com/timho1047/dsh-stream-focus#readme).
