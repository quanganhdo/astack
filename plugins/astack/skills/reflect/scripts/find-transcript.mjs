#!/usr/bin/env node
// Locate the transcript whose opening user prompt carries a fragment.
//
//   node find-transcript.mjs <projects-dir> <opening-prompt-fragment>
//
import { createReadStream, readdirSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export function candidates(projectsDir, maxDepth = 2) {
  const files = [];
  const walk = (dir, depth) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(full);
      else if (entry.isDirectory() && depth < maxDepth) walk(full, depth + 1);
    }
  };
  walk(projectsDir, 0);
  return files
    .map((path) => ({ path, mtime: statSync(path).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map(({ path }) => path);
}

function text(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block) => typeof block?.text === "string")
      .map((block) => block.text)
      .join("\n");
  }
  return null;
}

export async function openingPrompt(path) {
  const stream = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let pi = false;
  let leaf = null;
  const entries = new Map();
  try {
    for await (const line of lines) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (record?.type === "session" && Number.isInteger(record.version) && typeof record.cwd === "string") {
        pi = true;
        continue;
      }
      if (pi) {
        if (typeof record?.id !== "string") continue;
        entries.set(record.id, {
          parentId: typeof record.parentId === "string" ? record.parentId : null,
          prompt: record.type === "message" && record.message?.role === "user" ? text(record.message.content) : null,
        });
        leaf = record.id;
      } else if (record?.type === "user") return text(record.message?.content);
    }
    let prompt = null;
    const seen = new Set();
    for (let id = leaf; entries.has(id) && !seen.has(id); id = entries.get(id).parentId) {
      seen.add(id);
      prompt = entries.get(id).prompt || prompt;
    }
    return prompt;
  } finally {
    lines.close();
    stream.destroy();
  }
}

export async function findTranscript(projectsDir, fragment) {
  for (const path of candidates(projectsDir)) {
    const prompt = await openingPrompt(path);
    if (prompt?.includes(fragment)) return path;
  }
  return null;
}

async function main(argv) {
  const [projectsDir, fragment] = argv;
  if (!projectsDir || !fragment) {
    console.error("usage: find-transcript.mjs <projects-dir> <opening-prompt-fragment>");
    return 2;
  }
  const path = await findTranscript(projectsDir, fragment);
  if (!path) {
    console.error(`no transcript under ${projectsDir} opens with ${JSON.stringify(fragment)}`);
    return 1;
  }
  console.log(path);
  return 0;
}

// node leaves argv[1] unresolved and may set it to a non-file (`node -e ... arg`).
function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exitCode = await main(process.argv.slice(2));
}
