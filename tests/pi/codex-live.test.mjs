import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { agentByDescription, assistantModels, childEntries, PiRpc } from "./live-harness.mjs";
import { findPiPackage } from "../../tools/pi-package.mjs";

const suite = process.env.ASTACK_PI_CODEX_LIVE === "1" ? describe : describe.skip;
const models = ["openai-codex/gpt-6.1-sol", "openai-codex/gpt-6-luna"];
let root;
let parent;

suite("Codex models through native pi", () => {
  beforeAll(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "astack-codex-live-")));
    const agentDir = join(root, "agent");
    const work = join(root, "work");
    mkdirSync(agentDir);
    mkdirSync(work);
    copyFileSync(join(homedir(), ".pi/agent/auth.json"), join(agentDir, "auth.json"));
    chmodSync(join(agentDir, "auth.json"), 0o600);
    const repo = fileURLToPath(new URL("../../", import.meta.url));
    writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ packages: [repo], retry: { enabled: false } }));
    writeFileSync(join(agentDir, "astack-models.md"), "session hook: off\n");
    writeFileSync(join(agentDir, "astack-policy.json"), JSON.stringify({
      permittedModels: models,
      allowedEfforts: ["low", "medium", "high"],
      defaultEffort: "medium",
      fallbackEffort: "medium",
    }));
    parent = new PiRpc({ cwd: work, env: { ...process.env, PI_CODING_AGENT_DIR: agentDir, PI_TELEMETRY: "0" }, model: models[0], thinking: "medium" });
  });

  afterAll(async () => {
    await parent?.close();
    if (root) rmSync(root, { recursive: true, force: true });
  });

  test("background children finish on the permitted models and efforts", async () => {
    const from = await parent.run([
      "Call the agent tool exactly twice, both with run_in_background true.",
      `First: description codex-sol, model ${models[0]}, subagent_type astack:effort-high, prompt 'Reply with exactly the word alpha. Do not use tools or delegate.'`,
      `Second: description codex-luna, model ${models[1]}, subagent_type astack:effort-medium, prompt 'Reply with exactly the word beta. Do not use tools or delegate.'`,
      "After launching them, reply started. When each finishes, reply noted. Do not call any other tools.",
    ].join("\n"), 120_000);
    const failure = parent.messages(from).find((message) => message.role === "assistant" && message.stopReason === "error");
    if (failure) throw new Error(failure.errorMessage || "The parent model request failed.");
    await parent.until(() => parent.notices(from).length === 2, 120_000, "two child completion notices");
    await parent.idle(from, 120_000);
    const file = await parent.sessionFile();
    const evidence = [];
    for (const [description, model, effort, word] of [
      ["codex-sol", models[0], "high", "alpha"],
      ["codex-luna", models[1], "medium", "beta"],
    ]) {
      const final = agentByDescription(file, description).at(-1);
      expect(final.status).toBe("completed");
      expect(final.agent.model).toBe(model);
      expect(final.agent.thinking).toBe(effort);
      expect(final.finalText.toLowerCase()).toContain(word);
      const entries = childEntries(final);
      expect([...assistantModels(entries)]).toEqual([model]);
      expect(entries.filter((entry) => entry.type === "thinking_level_change").at(-1)?.thinkingLevel).toBe(effort);
      evidence.push({ description, model, effort, status: final.status });
    }
    console.log(JSON.stringify({ piVersion: JSON.parse(readFileSync(join(findPiPackage(), "package.json"), "utf8")).version, children: evidence }));
  }, 240_000);
});
