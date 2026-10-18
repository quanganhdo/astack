import { expect, test } from "bun:test";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flag, gitRepo, restore, useWorld } from "./harness.mjs";

const setup = useWorld();
const primary = "openai/gpt-6.1-sol";
const secondary = "openai/gpt-6-luna";
const policy = { permittedModels: [primary, secondary], allowedEfforts: ["low", "medium", "high"], defaultEffort: "medium", fallbackEffort: "medium" };
function writePolicy(w, value = policy) { writeFileSync(join(w.agentDir, "astack-policy.json"), JSON.stringify(value)); }
function registry(ctx, models) {
  ctx.modelRegistry.find = (provider, id) => models.includes(`${provider}/${id}`) ? { provider, id } : undefined;
}
async function refused(params, expected, configure = () => {}) {
  const { w, pi, ctx } = setup({ ctx: { model: { provider: "openai", id: "gpt-6.1-sol" } } });
  gitRepo(w.cwd);
  writePolicy(w);
  configure(w, ctx);
  await expect(pi.call("agent", { description: "refused", prompt: "x", isolation: "worktree", ...params }, ctx)).rejects.toThrow(expected);
  expect(w.invocations()).toEqual([]);
  expect(pi.entries).toEqual([]);
  expect(existsSync(join(w.agentDir, "astack"))).toBe(false);
  expect(existsSync(join(w.cwd, ".astack-worktrees"))).toBe(false);
}

test("policy refuses forbidden full IDs and inherited parents before creating state or worktrees", async () => {
  await refused({ model: "openai/gpt-6-astra" }, "forbidden");
});
test("policy validates aliases before dispatch", async () => {
  await refused({ model: "opus" }, "forbidden");
});
test("policy rejects an inherited forbidden parent", async () => {
  await refused({ model: "inherit-parent" }, "forbidden", (_w, ctx) => { ctx.model.id = "gpt-6-astra"; });
});
test("policy rejects excessive effort before dispatch", async () => {
  await refused({ subagent_type: "astack:effort-max" }, "Effort");
});
test("existing malformed or unreadable policy fails closed", async () => {
  await refused({}, "Invalid JSON", (w) => writeFileSync(join(w.agentDir, "astack-policy.json"), "{"));
});
for (const value of [{ ...policy, allowedEfforts: ["medium", "max"] }, { ...policy, fallbackEffort: "high" }, { ...policy, surprise: true }, { ...policy, allowedEfforts: ["high"] }]) {
  test(`invalid policy ${JSON.stringify(value)} refuses dispatch`, async () => { await refused({}, "Invalid policy", (w) => writePolicy(w, value)); });
}
test("both permitted models absent refuses before effects", async () => {
  await refused({}, "No permitted model", (_w, ctx) => registry(ctx, []));
});
test("both permitted models without configured authentication refuse before effects", async () => {
  await refused({}, "No permitted model", (_w, ctx) => { ctx.modelRegistry.hasConfiguredAuth = () => false; });
});
for (const requested of [undefined, "inherit-parent", "auto", primary, "gpt-6.1-sol"]) {
  test(`permitted ${requested} launches explicit model and default effort`, async () => {
    const { w, pi, ctx } = setup({ ctx: { model: { provider: "openai", id: "gpt-6.1-sol" } } });
    writePolicy(w);
    await pi.call("agent", { description: "ok", prompt: "x", model: requested }, ctx);
    expect(flag(w.invocations()[0], "--model")).toBe(primary);
    expect(flag(w.invocations()[0], "--thinking")).toBe("medium");
  });
}
test("sheet aliases pass through the same policy boundary", async () => {
  const { w, pi, ctx } = setup({ sheet: `pi models: opus=${primary}\n` });
  writePolicy(w);
  await pi.call("agent", { description: "ok", prompt: "x", model: "opus" }, ctx);
  expect(flag(w.invocations()[0], "--model")).toBe(primary);
});
for (const missing of ["catalog", "authentication"]) {
  test(`preflight ${missing} failure falls back once at medium`, async () => {
    const { w, pi, ctx } = setup({ ctx: { model: { provider: "openai", id: "gpt-6.1-sol" } } });
    writePolicy(w);
    if (missing === "catalog") registry(ctx, [secondary]);
    else ctx.modelRegistry.hasConfiguredAuth = (model) => model.id === "gpt-6-luna";
    await pi.call("agent", { description: "ok", prompt: "x", subagent_type: "astack:effort-high" }, ctx);
    expect(w.invocations()).toHaveLength(1);
    expect(flag(w.invocations()[0], "--model")).toBe(secondary);
    expect(flag(w.invocations()[0], "--thinking")).toBe("medium");
  });
}
test("resume and a second resume reread current policy before subprocess or state writes", async () => {
  const { w, pi, ctx } = setup({ ctx: { model: { provider: "openai", id: "gpt-6.1-sol" } } });
  writePolicy(w);
  await pi.call("agent", { description: "ok", prompt: "x" }, ctx);
  await pi.call("send_message", { to: "ok", message: "again" }, ctx);
  await w.until("invocation", 2);
  // Await the background completion before changing the policy.
  while (pi.entries.filter((entry) => entry.data.status === "completed").length < 2) await new Promise((resolve) => setTimeout(resolve, 20));
  writePolicy(w, { ...policy, permittedModels: [secondary] });
  const resumed = await restore(w, pi.entries);
  const entriesBefore = resumed.entries.length;
  await expect(resumed.call("send_message", { to: "ok", message: "forbidden now" }, ctx)).rejects.toThrow("forbidden");
  expect(w.invocations()).toHaveLength(2);
  expect(resumed.entries).toHaveLength(entriesBefore);
});
test("an existing unreadable policy fails closed", async () => {
  await refused({}, "Cannot read", (w) => {
    const file = join(w.agentDir, "astack-policy.json");
    // A directory is unreadable as a policy file even for privileged test runners.
    unlinkSync(file);
    mkdirSync(file);
  });
});
test("a child execution error never retries another permitted model", async () => {
  const { w, pi, ctx } = setup({ script: { default: [{ error: "authentication rejected" }] }, ctx: { model: { provider: "openai", id: "gpt-6.1-sol" } } });
  writePolicy(w);
  const result = await pi.call("agent", { description: "error", prompt: "x" }, ctx);
  expect(result.isError).toBe(true);
  expect(w.invocations()).toHaveLength(1);
  expect(flag(w.invocations()[0], "--model")).toBe(primary);
});
