#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bun install --frozen-lockfile
bun tools/generate.mjs --check
bun test tests/
(
  cd plugins/astack/skills/poteto-mode/scripts
  bun install --frozen-lockfile
  bun run typecheck
  bun run test
)

if bun -e 'import { findPiPackage } from "./tools/pi-package.mjs"; process.exit(findPiPackage() ? 0 : 1)'; then
  bun tools/typecheck-pi.mjs
else
  echo "Pi is not installed; extension typecheck and installed startup require the dedicated Pi CI job."
fi
