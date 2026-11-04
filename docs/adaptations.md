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

AStack uses the `astack:` plugin namespace and `astack-models.md` configuration. The main workflow keeps the `poteto-mode` name; model and routing setup uses `setup-astack`. Claude invokes `/astack:poteto-mode` and `/astack:setup-astack`. Mechanical branding and the setup directory rename are applied during upstream translation. Original PStack names remain in source attribution, upstream paths, and legacy checkpoint compatibility.

The Codex adapter uses available tools and model capabilities rather than assuming that every Codex surface exposes the same tool names. User and project instructions take precedence over all plugin guidance.

New functionality should be placed in the smallest applicable layer. Platform-specific preferences belong in the consuming project’s instructions. When fixing a portability defect, add a behavioral fixture to the existing tests and make the translation reproducible.

The upstream root `plugin.json` and `.cursor-plugin/` manifest are excluded because AStack generates native Claude Code and Codex manifests. Cursor's setup and guide changes are reconciled into AStack's own setup, help, catalog, and runtime mapping.

PStack 0.15.36 replaces the Orchestrate bookkeeping scripts with host task tools and a durable project store. AStack removes the old `orch` CLI and maps the new workflow to local worktrees and available host capabilities. Its operator landing policy, per-round verification, and merge safeguards remain declared forks.

The statechart tree retains upstream's compiler, test corpus, runtime launcher, and attribution. AStack adds a frozen Bun lockfile for its test dependency and runs its strict typecheck and suite from `tools/check.sh`, sharing the existing bundled TypeScript toolchain. Declared adaptations preserve the exit-code union type, resolve relative symlink fixtures on macOS, and await Node test callbacks without returning fixture objects. Live TLC tests require `TLA2TOOLS`; a run without it does not establish live model-checker coverage. The pinned mise setup supplies Bun and Node.js in both CI workflows.

Interrogate now delegates adversaries through Arena. The generator stamps its reviewer role into a Models section, matching the other workflow skills, because upstream removed the former reviewer table.
