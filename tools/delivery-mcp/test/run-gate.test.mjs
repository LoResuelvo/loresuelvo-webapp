import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadDeliveryPolicy } from "../lib/policy-loader.mjs";
import { runGate } from "../lib/run-gate.mjs";

const policy = await loadDeliveryPolicy();

async function createRunRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-run-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(
    ".delivery/schemas/execution-result.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "execution-result.schema.json")
  );
  return repoRoot;
}

function executionFixture(checkIds = ["unit"], gateId = "A") {
  return {
    inspection: {
      schemaVersion: 1,
      status: "ready",
      snapshotHash: "a".repeat(64),
      repository: { branch: "main", headSha: "b".repeat(40), usId: "30.1" },
      policy: { version: policy.version, hash: policy.sourceHash },
      gate: {
        id: gateId,
        reasonCodes: ["ISOLATED_PRODUCTION_CODE"],
        checkIds,
        checks: checkIds,
        parameters: {},
        postPushChecks: [],
      },
      diagnostics: [],
    },
    snapshot: {
      stagedFiles: ["domain/provider/provider.ts"],
      cacheable: true,
    },
  };
}

test("runGate: reuses successful evidence for the identical snapshot", async (t) => {
  const repoRoot = await createRunRepo(t);
  const fixture = executionFixture();
  let executions = 0;
  const fakeExecute = async ({ check }) => {
    executions += 1;
    return {
      id: check.id,
      status: "passed",
      durationMs: 3,
      exitCode: 0,
      summaryLines: [],
      diagnostic: null,
    };
  };

  const first = await runGate({ ...fixture, policy, repoRoot, executeCheck: fakeExecute });
  const second = await runGate({ ...fixture, policy, repoRoot, executeCheck: fakeExecute });

  assert.strictEqual(first.status, "passed");
  assert.strictEqual(first.cached, false);
  assert.strictEqual(second.cached, true);
  assert.strictEqual(executions, 1);
  assert.ok(first.evidence.recordPath.startsWith(".delivery/runtime/runs/"));
});

test("runGate: fails fast and returns the normalized diagnostic with failure structure", async (t) => {
  const repoRoot = await createRunRepo(t);
  const fixture = executionFixture(["unit", "typecheck_app"], "A");
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "failed",
    durationMs: 4,
    exitCode: 1,
    summaryLines: ["Expected one review, received zero"],
    locations: ["domain/provider/provider.ts:15"],
    logPath: ".delivery/runtime/logs/test.log",
    diagnostic: {
      code: "CHECK_FAILED",
      checkId: check.id,
      message: "Expected one review, received zero",
      retryable: true,
    },
  });

  const result = await runGate({ ...fixture, policy, repoRoot, executeCheck: fakeExecute });

  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.gate.id, "A"); // Criterion 24: gate.id conservado
  assert.deepStrictEqual(result.summary, { passed: 0, failed: 1, skipped: 1, durationMs: result.summary.durationMs });
  assert.strictEqual(result.diagnostics.at(-1).message, "Expected one review, received zero");
  assert.strictEqual(result.checks.length, 1);

  // Criterion 23: Estructura de falla máxima
  assert.ok(result.failure, "failure object present");
  assert.strictEqual(result.failure.checkId, "unit");
  assert.strictEqual(result.failure.exitCode, 1);
  assert.strictEqual(result.failure.message, "Expected one review, received zero");
  assert.deepStrictEqual(result.failure.locations, ["domain/provider/provider.ts:15"]);
  assert.deepStrictEqual(result.failure.summaryLines, ["Expected one review, received zero"]);
  assert.strictEqual(result.failure.attemptCount, 1);
  assert.strictEqual(result.failure.logPath, ".delivery/runtime/logs/test.log");
  assert.match(result.failure.signature, /^[a-f0-9]{64}$/);
});

test("falla idéntica tampoco vuelve a ejecutar: reusa fallo y registra attemptCount", async (t) => {
  const repoRoot = await createRunRepo(t);
  const fixture = executionFixture(["unit"]);
  let executions = 0;
  const fakeExecute = async ({ check }) => {
    executions += 1;
    return {
      id: check.id,
      status: "failed",
      durationMs: 4,
      exitCode: 1,
      summaryLines: ["Failed test 1"],
      locations: ["domain/provider/provider.ts:12"],
      logPath: ".delivery/runtime/logs/fail.log",
      diagnostic: {
        code: "CHECK_FAILED",
        checkId: check.id,
        message: "Failed test 1",
        retryable: true,
      },
    };
  };

  const first = await runGate({ ...fixture, policy, repoRoot, executeCheck: fakeExecute });
  const second = await runGate({ ...fixture, policy, repoRoot, executeCheck: fakeExecute });

  assert.strictEqual(first.status, "failed");
  assert.strictEqual(first.cached, false);
  assert.strictEqual(first.failure.attemptCount, 1);

  assert.strictEqual(second.status, "failed");
  assert.strictEqual(second.cached, true);
  assert.strictEqual(second.failure.attemptCount, 2);
  assert.strictEqual(executions, 1); // No volvió a ejecutar

  const forced = await runGate({
    ...fixture,
    policy,
    repoRoot,
    executeCheck: fakeExecute,
    force: true,
  });
  assert.strictEqual(forced.cached, false);
  assert.strictEqual(executions, 2);
});

test("lock concurrente evita duplicados: segunda ejecucion simultanea es bloqueada", async (t) => {
  const repoRoot = await createRunRepo(t);
  const fixture = executionFixture();

  let slowFinished = false;
  const slowExecute = async ({ check }) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    slowFinished = true;
    return {
      id: check.id,
      status: "passed",
      durationMs: 50,
      exitCode: 0,
      summaryLines: [],
      diagnostic: null,
    };
  };

  const [res1, res2] = await Promise.all([
    runGate({ ...fixture, policy, repoRoot, executeCheck: slowExecute }),
    runGate({ ...fixture, policy, repoRoot, executeCheck: slowExecute }),
  ]);

  const blocked = res1.status === "blocked" ? res1 : res2.status === "blocked" ? res2 : null;
  const passed = res1.status === "passed" ? res1 : res2.status === "passed" ? res2 : null;

  assert.ok(blocked, "One execution was blocked by concurrent run lock");
  assert.ok(passed, "One execution succeeded");
  assert.ok(blocked.diagnostics.some((d) => d.code === "DELIVERY_RUN_IN_PROGRESS"));
});
