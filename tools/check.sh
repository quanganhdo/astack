#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bun tools/generate.mjs --check
bun test tests/
(
  cd plugins/astack/skills/poteto-mode/scripts
  bun install --frozen-lockfile
  bun run typecheck
  bun test watch-pr check-plan.test.ts
)

(
  cd plugins/astack/skills/statechart/scripts
  bun install --frozen-lockfile
  ../../poteto-mode/scripts/node_modules/.bin/tsc --noEmit -p tsconfig.json --typeRoots ../../poteto-mode/scripts/node_modules/@types
  node --disable-warning=ExperimentalWarning --test test/*.test.ts
)
