import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { findRepoRoot, assertSafeRepoPath } from "./repo-root.mjs";
import { validateAgainstSchema } from "./validate-schema.mjs";

export const DELIVERY_POLICY_PATH = ".delivery/policy.v1.json";

const REQUIRED_GATES = ["NONE", "0", "A", "B", "C", "D"];
export const SAFE_COMMANDS = new Set([
  JSON.stringify(["make", "test-e2e-steps-compatible"]),
  JSON.stringify(["npm", "run", "test"]),
  JSON.stringify(["npm", "run", "delivery:test"]),
  JSON.stringify(["npm", "run", "lint"]),
  JSON.stringify(["npx", "--no-install", "tsc", "--noEmit"]),
  JSON.stringify(["npx", "--no-install", "tsc", "--project", "tsconfig.cucumber.json", "--noEmit"]),
  JSON.stringify(["make", "test-e2e-managed"]),
  JSON.stringify(["make", "test-e2e-managed", "E2E_FILE={featureFile}"]),
]);
export const SAFE_BUILTINS = new Set(["no_wip_in_scope"]);

function assertPositiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid delivery policy: ${field} must be a positive integer`);
  }
}

function assertSafeCheck(checkId, definition) {
  if (!definition || typeof definition !== "object") {
    throw new Error(`Invalid delivery policy: missing check definition for ${checkId}`);
  }

  if (definition.kind === "command") {
    const signature = JSON.stringify([definition.command, ...(definition.args || [])]);
    if (!SAFE_COMMANDS.has(signature)) {
      throw new Error(`Unsafe delivery command rejected for check ${checkId}`);
    }
    assertPositiveInteger(definition.timeoutMs, `checkCatalog.${checkId}.timeoutMs`);
    return;
  }

  if (definition.kind === "builtin" && SAFE_BUILTINS.has(definition.handler)) {
    return;
  }

  throw new Error(`Unsupported delivery check kind for ${checkId}`);
}

function validateClassification(classification) {
  if (!classification || !Array.isArray(classification.rules) || !classification.fallback) {
    throw new Error("Invalid delivery policy: classification rules and fallback are required");
  }
  const ids = new Set();
  for (const rule of classification.rules) {
    if (ids.has(rule.id)) {
      throw new Error(`Invalid delivery policy: duplicate classification rule '${rule.id}'`);
    }
    ids.add(rule.id);
    for (const pattern of rule.match?.patterns || []) {
      try {
        new RegExp(pattern);
      } catch {
        throw new Error(`Invalid delivery policy: malformed classification pattern in '${rule.id}'`);
      }
    }
  }
}

function validatePolicy(policy) {
  assertPositiveInteger(policy?.version, "version");
  if (!policy?.checkCatalog || !policy?.gates || !policy?.limits || !policy?.ci) {
    throw new Error("Invalid delivery policy: checkCatalog, gates, limits, and ci are required");
  }

  validateClassification(policy.classification);

  for (const limit of [
    "maxStagedFiles",
    "maxDiffSizeBytes",
    "maxSignals",
    "maxDiagnostics",
    "maxCheckLogBytes",
    "maxFailureSummaryLines",
  ]) {
    assertPositiveInteger(policy.limits[limit], `limits.${limit}`);
  }

  assertPositiveInteger(policy.ci.maxInFlightCommits, "ci.maxInFlightCommits");

  for (const [checkId, definition] of Object.entries(policy.checkCatalog)) {
    if (!/^[a-z][a-z0-9_]*$/.test(checkId)) {
      throw new Error(`Invalid delivery check identifier: ${checkId}`);
    }
    assertSafeCheck(checkId, definition);
  }

  for (const gateId of REQUIRED_GATES) {
    const gate = policy.gates[gateId];
    if (!gate || gate.id !== gateId || !Array.isArray(gate.checkIds)) {
      throw new Error(`Invalid delivery policy: gate ${gateId} is incomplete`);
    }
    for (const checkId of gate.checkIds) {
      if (!policy.checkCatalog[checkId]) {
        throw new Error(`Invalid delivery policy: gate ${gateId} references unknown check ${checkId}`);
      }
    }
  }
}

export async function loadDeliveryPolicy({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  assertSafeRepoPath(root, DELIVERY_POLICY_PATH, "Delivery policy");
  const absolutePath = path.resolve(root, DELIVERY_POLICY_PATH);

  const source = await fs.readFile(absolutePath, "utf8");
  const policy = JSON.parse(source);
  validateAgainstSchema(policy, "policy.schema.json", root);
  validatePolicy(policy);

  return {
    ...policy,
    sourceHash: crypto.createHash("sha256").update(source).digest("hex"),
  };
}
