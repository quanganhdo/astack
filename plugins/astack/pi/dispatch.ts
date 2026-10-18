import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Static, Type } from "typebox";
import { Value } from "typebox/value";

const effort = Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")]);
const policySchema = Type.Object({
  permittedModels: Type.Array(Type.String({ pattern: "^[^/\\s]+/[^\\s]+$" }), { minItems: 1, uniqueItems: true }),
  allowedEfforts: Type.Array(effort, { minItems: 1, uniqueItems: true }),
  defaultEffort: effort,
  fallbackEffort: Type.Literal("medium"),
}, { additionalProperties: false });
type Policy = Static<typeof policySchema>;

export function readPolicy(agentDir: string): Policy | undefined {
  const file = join(agentDir, "astack-policy.json");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      try { lstatSync(file); } catch (missing) {
        if (missing instanceof Error && "code" in missing && missing.code === "ENOENT") return undefined;
      }
    }
    throw new Error(`Cannot read ${file}: ${String(error)}`);
  }
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error(`Invalid JSON in ${file}`); }
  if (!Value.Check(policySchema, raw) || !raw.allowedEfforts.includes(raw.defaultEffort) || !raw.allowedEfforts.includes(raw.fallbackEffort)) {
    throw new Error(`Invalid policy in ${file}: expected permittedModels, allowedEfforts, defaultEffort and fallbackEffort medium.`);
  }
  return raw;
}

function available(model: string, registry: ExtensionContext["modelRegistry"]): boolean {
  const slash = model.indexOf("/");
  if (slash < 1) return false;
  const found = registry.find(model.slice(0, slash), model.slice(slash + 1));
  return found !== undefined && registry.hasConfiguredAuth(found);
}

// Called for each process launch, including restored sessions, before disk writes.
export function prepareDispatch({ agentDir, model, thinking, registry }: {
  agentDir: string;
  model: string | undefined;
  thinking: string | undefined;
  registry: ExtensionContext["modelRegistry"];
}): { model: string | undefined; thinking: string | undefined } {
  const policy = readPolicy(agentDir);
  if (policy) {
    if (!model || !policy.permittedModels.includes(model)) throw new Error(`Model "${model ?? "unknown parent"}" is forbidden by astack-policy.json.`);
    const selectedEffort = thinking ?? policy.defaultEffort;
    if (!policy.allowedEfforts.some((allowed) => allowed === selectedEffort)) throw new Error(`Effort "${selectedEffort}" is forbidden by astack-policy.json.`);
    if (available(model, registry)) return { model, thinking: selectedEffort };
    const fallback = policy.permittedModels.find((candidate) => candidate !== model && available(candidate, registry));
    if (fallback) return { model: fallback, thinking: policy.fallbackEffort };
    throw new Error(`No permitted model has a catalog entry and configured authentication. Requested ${model}.`);
  }
  if (model && !available(model, registry)) throw new Error(`Model "${model}" has no catalog entry or configured authentication.`);
  return { model, thinking };
}
