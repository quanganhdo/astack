import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { findPiPackage, piCompilerPaths } from "./pi-package.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const piDir = findPiPackage();
if (!piDir || !existsSync(join(piDir, "dist", "index.d.ts"))) {
  console.error(`No Pi package at ${piDir ?? "the global npm or bun root"}. Install one with npm install -g @earendil-works/pi-coding-agent, or set PI_PACKAGE_DIR.`);
  process.exit(2);
}

const config = {
  compilerOptions: {
    target: "es2022",
    module: "esnext",
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: ["node"],
    ...piCompilerPaths(piDir),
  },
  include: [join(repo, "plugins", "astack", "pi", "*.ts")],
};
const dir = mkdtempSync(join(tmpdir(), "astack-pi-typecheck-"));
try {
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(config, null, 2));
  console.log(`typechecking plugins/astack/pi against ${piDir}`);
  const tsc = spawnSync("bunx", ["--package", "typescript@5.9.3", "tsc", "-p", join(dir, "tsconfig.json")], { cwd: dir, stdio: "inherit" });
  if (tsc.error) console.error(`could not run bunx: ${tsc.error.message}`);
  process.exitCode = tsc.status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
