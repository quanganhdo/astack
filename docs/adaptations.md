# AStack adaptations

The maintained source is original PStack in cursor/plugins. The initial translation tooling, native manifests, hooks, and tests reuse MIT-licensed work from Michael Denyer's pstack-claude at the exact commit recorded in `tools/provenance.json`. That repository is never fetched by the update pipeline.

| Layer | Source of truth | Update behavior |
| --- | --- | --- |
| Original workflows | `tools/upstream.json` | Fetch original source at an immutable commit and compare with the previous pin. |
| Mechanical translation | `tools/substitutions.json` | Apply named text rewrites and `pathRenames` to both old and new source before three-way comparison. |
| Deliberate divergence | `tools/forks.json` | Preserve non-overlapping edits; fail validation on conflicts or undeclared differences. |
| Maintenance instructions | `docs/maintenance.md`, `docs/maintenance-prompt.md`, `docs/workflow.md` | AStack owns the portable runbook, scheduler prompt, and diagrams. Host settings and credentials stay outside Git. |
| Native packaging | Harness manifests, marketplaces, hooks, `tools/generate.mjs` | Share one skills tree and validate each harness's packaging. |
| Release identity | `VERSION`, `CHANGES.md`, `tools/provenance.json` | AStack uses its own semver and records the upstream version and commit separately. |

The bootstrap retains the port reference's declared policy forks as well as its mechanical compatibility work. Those are visible in `tools/forks.json`; they are not represented as original PStack behavior. Review them individually before changing them rather than silently discarding mature workflows.

The `pathRenames` map translates upstream `skills/setup-pstack` into local `skills/setup-astack`. Substitution file scopes keep their upstream paths. Generation, fork declarations, and sync reports use local paths. Unsafe paths or colliding destinations stop sync before it writes.

AStack uses the `astack:` plugin namespace and `astack-models.md` configuration. The main workflow keeps the `poteto-mode` name; model and routing setup uses `setup-astack`. Claude invokes `/astack:poteto-mode` and `/astack:setup-astack`. Mechanical branding and the setup directory rename are applied during upstream translation. The upstream root `plugin.json` is excluded alongside its Cursor manifest because AStack owns its runtime manifests. Original PStack names remain in source attribution, upstream paths, and legacy checkpoint compatibility.

The Codex adapter uses available tools and model capabilities rather than assuming that every Codex surface exposes the same tool names. User and project instructions take precedence over all plugin guidance.

New functionality should be placed in the smallest applicable layer. Platform-specific preferences belong in the consuming project’s instructions. When fixing a portability defect, add a behavioral fixture to the existing tests and make the translation reproducible.

## Native pi package

The repository root `package.json` exposes the existing `plugins/astack/skills` tree and `plugins/astack/pi/index.ts`. The generator stamps its version from `VERSION`. `bun.lock` pins the root test dependency. The native extension requires pi 1.3.0 or later.

The pi adapter and lifecycle tests selectively reuse Michael Denyer's MIT-licensed implementation at the immutable revision recorded as `piAdapterReference` in `tools/provenance.json`. This reference is not an update dependency. `plugins/astack/pi` owns child RPC, process identity, worktrees, messaging, question UI, session scheduling, and routing. `dispatch.ts` adds host-owned model and effort policy validation before new or resumed child launches. Personal policy files remain outside Git.

`tools/pi-package.mjs` locates the installed pi SDK. `tools/typecheck-pi.mjs`, `tests/pi`, `tests/pi-package.test.mjs`, and the dedicated CI job verify packaging, policy, lifecycle, and native child startup. The pi model table in `plugins/astack/models.json` generates the mapping reference's model section. `docs/pi.md` and `pi-tools.md` describe the runtime contract. The native transcript finder reads pi's active branch while preserving Claude transcript support.

Pi package loading does not write host configuration. Session loops are not durable schedules, and reviewer tool exclusion is not filesystem isolation. Live provider acceptance is separate from offline and startup checks.
