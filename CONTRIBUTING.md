# Development and release

This repository is a private pnpm workspace for the `dsh-stream-focus` bundle
and the `dsh-stream-focus-summary` plugin. The workspace root is not published;
both packages are published from `packages/`.

Product behavior, installation, privacy, and limitations live in the root
[README.md](README.md) and [README.en.md](README.en.md). This file keeps the
workspace development and release flow out of the GitHub landing page.

The user-facing install entry is unchanged:

```bash
dsh plugin --profile web add dsh-stream-focus
```

That installs two independently toggleable rows:

| Package | Row | Default | Role |
|---|---|---|---|
| `packages/dsh-stream-focus` | `dsh-stream-focus` | on | Bundle patch and the client-only smoothing behavior for all four Work details modes. |
| `packages/dsh-stream-focus-summary` | `dsh-stream-focus-summary` | **off** | Model-written progress phrases, whole-stretch summaries, Host persistence, and the plugin-manager configuration page. |

When enabled, the summary row makes model calls and persists derived phrases.
By default it is off, and the stream-focus row makes no network calls. See the
package READMEs for behavior, model fallback, privacy, enablement, and rollback
details:

- [dsh-stream-focus README](packages/dsh-stream-focus/README.md) ([English](packages/dsh-stream-focus/README.en.md))
- [dsh-stream-focus-summary README](packages/dsh-stream-focus-summary/README.md)

## Development

```bash
pnpm install
pnpm -r run typecheck
pnpm run verify   # build and test both packages
```

`pnpm-workspace.yaml` covers `packages/*`. Local devDependencies link into the
DeepSeek Harness checkout at `../../../../deepseek-harness`, so a fresh clone
without that checkout can still `pnpm pack` (the release path does not install
dependencies) but cannot run the full build.

## Release train

One tag publishes both packages:

```text
v0.2.0  ->  dsh-stream-focus@0.2.0
            dsh-stream-focus-summary@0.1.0  (as declared in its manifest)
```

- The tag always equals the bundle version and is checked against
  `packages/dsh-stream-focus/package.json`.
- The summary version comes from
  `packages/dsh-stream-focus-summary/package.json`; the bundle depends on it
  through `workspace:^`, which `pnpm pack` rewrites to `^<summary version>`.
- `.github/workflows/release.yml` packs both packages, verifies the rewritten
  dependency range and both manifests, publishes the summary first (skipping an
  already-published matching version), then publishes the bundle.
- Both packages publish with npm Trusted Publisher through GitHub OIDC and
  provenance; no `NPM_TOKEN` secret is used. A brand-new package cannot use
  trusted publishing before its first release, so
  `dsh-stream-focus-summary@0.1.0` must be seeded once manually, then have its
  trusted publisher configured.
- The workflow also creates or updates the GitHub Release from the bundle
  CHANGELOG. It never pushes commits or tags; maintainers tag and push.

Maintainer flow:

```bash
pnpm install
pnpm run verify
# commit the rebuilt packages/*/lib trees and docs
# bump packages/dsh-stream-focus/package.json
git tag v0.2.0
git push --follow-tags
```

Do not publish from an agent session; tag and release from an approved
maintainer run.
