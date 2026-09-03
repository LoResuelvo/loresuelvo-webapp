import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  executeCheck,
  resolveCheck,
  summarizeFailureOutput,
  extractLocations,
} from "../lib/execute-check.mjs";
import { redactSecrets } from "../lib/redact-secrets.mjs";

test("summarizeFailureOutput: removes stack noise and keeps bounded causal lines", () => {
  const output = [
    "Error: expected provider review count to be 2",
    "    at Object.<anonymous> (/tmp/test.ts:10:2)",
    "Received: 0",
    "node:internal/process/task_queues:95:5",
  ].join("\n");

  assert.deepStrictEqual(summarizeFailureOutput(output, 2), [
    "Error: expected provider review count to be 2",
    "Received: 0",
  ]);
});

test("secretos se redactan: redacta JWT, Bearer tokens, passwords y private keys", () => {
  const raw = [
    "Authorization: Bearer my-super-secret-token-12345",
    "Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    "Error with password=secretPassword123 and api_key: 'sk-1234567890abcdef1234567890'",
    "-----BEGIN RSA PRIVATE KEY-----",
    "MIIEowIBAAKCAQEA0Y3...",
    "-----END RSA PRIVATE KEY-----",
  ].join("\n");

  const redacted = redactSecrets(raw);
  assert.ok(!redacted.includes("my-super-secret-token-12345"));
  assert.ok(!redacted.includes("eyJhbGciOiJIUzI1Ni"));
  assert.ok(!redacted.includes("secretPassword123"));
  assert.ok(!redacted.includes("sk-1234567890abcdef"));
  assert.ok(!redacted.includes("MIIEowIBAAKCAQEA0Y3"));

  const summary = summarizeFailureOutput(raw, 5);
  for (const line of summary) {
    assert.ok(!line.includes("my-super-secret-token-12345"));
    assert.ok(!line.includes("secretPassword123"));
  }
});

test("extractLocations: extrae ubicaciones archivo:linea de forma acotada", () => {
  const output = [
    "Error in features/auth/login.feature:25: Scenario failed",
    "at domain/user/user-helper.ts:42:15",
    "some unrelated line",
  ].join("\n");

  const locations = extractLocations(output);
  assert.ok(locations.includes("features/auth/login.feature:25"));
  assert.ok(locations.includes("domain/user/user-helper.ts:42"));
});

test("traversal de paths es rechazado: rechaza rutas relativas hacia afuera o con ..", () => {
  const repoRoot = process.cwd();

  assert.throws(() => {
    resolveCheck({
      checkId: "e2e_feature",
      definition: {
        kind: "command",
        label: "Feature E2E",
        command: "make",
        args: ["test-e2e-managed", "E2E_FILE={featureFile}"],
        display: "make test-e2e-managed E2E_FILE={featureFile}",
        requires: ["featureFile"],
        timeoutMs: 10000,
      },
      parameters: { featureFile: "../../../etc/passwd.feature" },
      repoRoot,
    });
  }, /path traversal|resolves outside repository/);

  assert.throws(() => {
    resolveCheck({
      checkId: "no_wip_in_scope",
      definition: {
        kind: "builtin",
        label: "No @wip",
        handler: "no_wip_in_scope",
        display: "verify no @wip",
        requires: ["scopeFeatures"],
      },
      parameters: { scopeFeatures: ["../outside.feature"] },
      repoRoot,
    });
  }, /path traversal|resolves outside repository/);
});

test("timeout mata el árbol de procesos: comando cancelado por timeout retorna status failed y CHECK_TIMEOUT", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-timeout-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  const check = {
    id: "unit",
    kind: "command",
    label: "Unit tests",
    command: "npm",
    args: ["run", "test"],
    timeoutMs: 1, // 1 ms timeout guarantees timeout triggers immediately
  };

  const result = await executeCheck({
    check,
    repoRoot,
    logPath: ".delivery/runtime/logs/timeout.log",
    limits: { maxCheckLogBytes: 1024, maxFailureSummaryLines: 6 },
  });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.diagnostic?.code, "CHECK_TIMEOUT");
});

test("no_wip_in_scope: reports only compact locations from the declared feature scope", async (t) => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-check-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(repoRoot, "features", "provider"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, "features", "provider", "reviews.feature"),
    "Feature: Reviews\n\n  @wip\n  Scenario: Preview\n",
    "utf8"
  );

  const check = resolveCheck({
    checkId: "no_wip_in_scope",
    definition: {
      kind: "builtin",
      label: "No @wip",
      handler: "no_wip_in_scope",
      display: "verify no @wip",
      requires: ["scopeFeatures"],
    },
    parameters: { scopeFeatures: ["features/provider/reviews.feature"] },
    repoRoot,
  });
  const result = await executeCheck({ check, repoRoot, limits: {} });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.diagnostic.code, "WIP_TAG_IN_COMPLETED_SCOPE");
  assert.deepStrictEqual(result.summaryLines, [
    "features/provider/reviews.feature:3: @wip remains in completed scope",
  ]);
  assert.deepStrictEqual(result.locations, ["features/provider/reviews.feature:3"]);
});
