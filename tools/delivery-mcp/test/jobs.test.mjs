import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../server.mjs";
import {
  createDeliveryJob,
  getDeliveryJob,
  updateDeliveryJob,
  findActiveDeliveryJob,
  waitForJob,
  cancelDeliveryJob,
  cleanupOrphanedDeliveryJobs,
  isProcessAlive,
  validateJobId,
} from "../lib/jobs.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";
import { verifyPreparedEvidence } from "../lib/delivery-ledger.mjs";
import { captureGitSnapshot } from "../lib/git-snapshot.mjs";
import { inspectDelivery } from "../lib/inspect-delivery.mjs";
import { computeRunKey } from "../lib/delivery-evidence.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-jobs-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "records"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "jobs"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "locks"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  for (const schema of [
    "ci-inspection-result.schema.json",
    "delivery-context.schema.json",
    "execution-result.schema.json",
    "inspection-result.schema.json",
    "policy.schema.json",
  ]) {
    await fs.copyFile(
      path.join(".delivery", "schemas", schema),
      path.join(repoRoot, ".delivery", "schemas", schema)
    );
  }
  await fs.copyFile(
    path.join(".delivery", "policy.v1.json"),
    path.join(repoRoot, ".delivery", "policy.v1.json")
  );
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));

  await fs.mkdir(
    path.join(repoRoot, ".agents/skills/frontend-maintainability-governance/scripts"),
    { recursive: true }
  );
  await fs.copyFile(
    ".agents/skills/frontend-maintainability-governance/scripts/audit-changed-code.mjs",
    path.join(
      repoRoot,
      ".agents/skills/frontend-maintainability-governance/scripts/audit-changed-code.mjs"
    )
  );

  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });
  return repoRoot;
}

test("jobs: creación, consulta y actualización de estado", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    params: { intent: "prepare_commit" },
    runKey: "runkey-12345",
    snapshotHash: "hash-67890",
    gateId: "D",
  });

  assert.ok(job.jobId.startsWith("job-"));
  assert.strictEqual(job.status, "queued");
  assert.strictEqual(job.runKey, "runkey-12345");
  assert.strictEqual(job.gateId, "D");

  const loaded = await getDeliveryJob({ repoRoot, jobId: job.jobId });
  assert.strictEqual(loaded.jobId, job.jobId);
  assert.strictEqual(loaded.status, "queued");

  const updated = await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "running",
      pid: process.pid,
      startedAt: new Date().toISOString(),
    },
  });
  assert.strictEqual(updated.status, "running");
  assert.strictEqual(updated.pid, process.pid);

  const loadedAfterUpdate = await getDeliveryJob({ repoRoot, jobId: job.jobId });
  assert.strictEqual(loadedAfterUpdate.status, "running");
});

test("jobs: validación estricta de jobId rechaza path traversal y caracteres inválidos", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  assert.throws(() => validateJobId("../hack"), /Invalid job ID/);
  assert.throws(() => validateJobId("job/123"), /Invalid job ID/);
  assert.throws(() => validateJobId(""), /Invalid job ID/);
  assert.throws(() => validateJobId("job with spaces"), /Invalid job ID/);

  await assert.rejects(
    async () => getDeliveryJob({ repoRoot, jobId: "../etc/passwd" }),
    /Invalid job ID/
  );
});

test("jobs: isProcessAlive detecta procesos existentes y ausentes", () => {
  assert.strictEqual(isProcessAlive(process.pid), true);
  assert.strictEqual(isProcessAlive(9999999), false);
  assert.strictEqual(isProcessAlive(null), false);
});

test("jobs: waitForJob retorna inmediatamente si el job ya pasó o falló", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    params: {},
  });

  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "passed",
      finishedAt: new Date().toISOString(),
      result: {
        schemaVersion: 1,
        status: "passed",
        runKey: "rk-abc",
        summary: { passed: 5, failed: 0, skipped: 0, durationMs: 1200 },
      },
    },
  });

  const waitResult = await waitForJob({
    repoRoot,
    jobId: job.jobId,
    timeoutMs: 5000,
  });

  assert.strictEqual(waitResult.status, "passed");
  assert.strictEqual(waitResult.jobId, job.jobId);
  assert.strictEqual(waitResult.summary.passed, 5);
});

test("jobs: waitForJob respeta timeoutMs cuando el job sigue en ejecución", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    params: {},
  });

  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "running",
      pid: process.pid,
      startedAt: new Date().toISOString(),
    },
  });

  const t0 = Date.now();
  const waitResult = await waitForJob({
    repoRoot,
    jobId: job.jobId,
    timeoutMs: 300,
    pollIntervalMs: 50,
  });

  const elapsed = Date.now() - t0;
  assert.ok(elapsed >= 250);
  assert.strictEqual(waitResult.status, "running");
  assert.strictEqual(waitResult.jobId, job.jobId);
  assert.ok(waitResult.message.includes("still in progress"));
});

test("jobs: waitForJob detecta muerte inesperada del worker y libera el lock", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const fakeRunKey = "runkey-dead-worker";
  const lockFile = path.resolve(repoRoot, ".delivery/runtime/locks", `${fakeRunKey}.lock`);
  await fs.writeFile(lockFile, "lock", "utf8");

  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    runKey: fakeRunKey,
  });

  // Set worker pid to a dead PID
  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "running",
      pid: 9999999,
      startedAt: new Date().toISOString(),
    },
  });

  const waitResult = await waitForJob({
    repoRoot,
    jobId: job.jobId,
    timeoutMs: 2000,
    pollIntervalMs: 50,
  });

  assert.strictEqual(waitResult.status, "failed");
  assert.strictEqual(waitResult.diagnostics[0].code, "JOB_WORKER_CRASHED");

  // Verify lock was cleaned up
  await assert.rejects(async () => fs.access(lockFile), /ENOENT/);
});

test("jobs: cancelDeliveryJob cancela el job y libera el lock", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const fakeRunKey = "runkey-cancel-test";
  const lockFile = path.resolve(repoRoot, ".delivery/runtime/locks", `${fakeRunKey}.lock`);
  await fs.writeFile(lockFile, "lock", "utf8");

  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    runKey: fakeRunKey,
  });

  const dummy = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  t.after(() => {
    try { dummy.kill("SIGKILL"); } catch {}
  });

  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "running",
      pid: dummy.pid,
      startedAt: new Date().toISOString(),
    },
  });

  const cancelled = await cancelDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    reason: "Aborted by agent",
  });

  assert.strictEqual(cancelled.status, "cancelled");
  assert.strictEqual(cancelled.error.code, "JOB_CANCELLED");

  // Verify lock was released
  await assert.rejects(async () => fs.access(lockFile), /ENOENT/);
});

test("jobs: deduplicación de job activo para el mismo snapshot", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "features/test.feature"), "Feature: Test\n", "utf8");
  execFileSync("git", ["add", "features/test.feature"], { cwd: repoRoot });

  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  const inspection = (await inspectDelivery({ repoRoot, intent: "prepare_commit" })).result;
  const runKey = computeRunKey({ inspection, snapshot });

  // 1. Simular un job activo garantizado para este snapshot
  const activeJob = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    params: { intent: "prepare_commit" },
    runKey,
    snapshotHash: inspection.snapshotHash,
    gateId: inspection.gate.id,
  });
  await updateDeliveryJob({
    repoRoot,
    jobId: activeJob.jobId,
    updates: {
      status: "running",
      pid: process.pid,
      startedAt: new Date().toISOString(),
    },
  });

  // 2. Llamada concurrente mientras el job está activo detecta deduplicación
  const secondCall = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    mode: "job",
  });

  assert.strictEqual(secondCall.status, "running");
  assert.strictEqual(secondCall.jobId, activeJob.jobId);
  assert.ok(secondCall.message.includes("already running"));
});

test("jobs: el worker ejecuta su snapshot sin deduplicarse contra sí mismo", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "features/test.feature"), "Feature: Test\n", "utf8");
  execFileSync("git", ["add", "features/test.feature"], { cwd: repoRoot });

  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  const inspection = (await inspectDelivery({ repoRoot, intent: "prepare_commit" })).result;
  const runKey = computeRunKey({ inspection, snapshot });
  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    params: { intent: "prepare_commit" },
    runKey,
    snapshotHash: inspection.snapshotHash,
    gateId: inspection.gate.id,
  });
  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: { status: "running", pid: process.pid, startedAt: new Date().toISOString() },
  });

  let executions = 0;
  const result = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    mode: "sync",
    workerJobId: job.jobId,
    executeCheck: async ({ check }) => {
      executions += 1;
      return {
        id: check.id,
        status: "passed",
        durationMs: 1,
        exitCode: 0,
        summaryLines: [],
        diagnostic: null,
      };
    },
  });

  assert.strictEqual(result.status, "passed");
  assert.ok(executions > 0, "the worker must execute the selected gate");
});

test("jobs: un queued sin worker se libera al vencer su lease", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const job = await createDeliveryJob({ repoRoot, type: "prepare", runKey: "expired-queue" });
  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: { queueLeaseUntil: new Date(Date.now() - 1_000).toISOString() },
  });

  assert.strictEqual(await findActiveDeliveryJob({ repoRoot, runKey: "expired-queue" }), null);
  const persisted = await getDeliveryJob({ repoRoot, jobId: job.jobId });
  assert.strictEqual(persisted.status, "failed");
  assert.strictEqual(persisted.error.code, "JOB_QUEUE_EXPIRED");
});

test("jobs: un timeout terminal no se presenta como job todavía en progreso", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const job = await createDeliveryJob({ repoRoot, type: "finalize" });
  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "timed_out",
      finishedAt: new Date().toISOString(),
      result: { finalized: false, status: "in_progress", reason: "CI_TIMEOUT" },
    },
  });

  const result = await waitForJob({ repoRoot, jobId: job.jobId, timeoutMs: 100 });
  assert.strictEqual(result.status, "timed_out");
  assert.strictEqual(result.reason, "CI_TIMEOUT");
  assert.ok(result.diagnostics.length > 0);
});

test("jobs: job completado emite receipt idéntico y verificable", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "features/test.feature"), "Feature: Test\n", "utf8");
  execFileSync("git", ["add", "features/test.feature"], { cwd: repoRoot });

  // Simulate a completed job with passed execution result
  const job = await createDeliveryJob({
    repoRoot,
    type: "prepare",
    params: { intent: "prepare_commit" },
  });

  const executeCheck = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 5,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });

  // Run prepare in sync mode with mock check to simulate what worker does
  const outcome = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    mode: "sync",
    executeCheck,
  });

  assert.strictEqual(outcome.status, "passed");

  await updateDeliveryJob({
    repoRoot,
    jobId: job.jobId,
    updates: {
      status: "passed",
      finishedAt: new Date().toISOString(),
      result: outcome,
    },
  });

  // waitForJob retrieves the result
  const awaited = await waitForJob({
    repoRoot,
    jobId: job.jobId,
    timeoutMs: 1000,
  });

  assert.strictEqual(awaited.status, "passed");
  assert.strictEqual(awaited.jobId, job.jobId);
  assert.strictEqual(awaited.gate.id, "0");

  // Verify the receipt is valid and consumed by hooks
  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  const inspection = (await inspectDelivery({ repoRoot, intent: "prepare_commit" })).result;
  const verified = await verifyPreparedEvidence({
    repoRoot,
    snapshot,
    inspection,
    intent: "prepare_commit",
  });

  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.record.status, "passed");
});

test("jobs: integración MCP delivery_prepare y delivery_job_wait", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "job-mcp-test", version: "1.0.0" });

  try {
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // 1. List tools includes delivery_job_wait
    const toolList = await client.listTools();
    const waitTool = toolList.tools.find((t) => t.name === "delivery_job_wait");
    assert.ok(waitTool, "delivery_job_wait must be listed in MCP tools");
    assert.ok(waitTool.inputSchema.properties.jobId);

    // 2. delivery_prepare with mode: 'job' returns job_started or no_changes
    const prepResult = await client.callTool({
      name: "delivery_prepare",
      arguments: { intent: "prepare_commit", mode: "job" },
    });
    const prepResultJson = JSON.parse(prepResult.content[0].text);
    assert.ok(
      ["job_started", "no_changes", "running", "passed", "blocked"].includes(prepResultJson.status),
      `Unexpected prepare status: ${prepResultJson.status}`
    );
    if (prepResultJson.jobId) {
      const waitJob = await client.callTool({
        name: "delivery_job_wait",
        arguments: { jobId: prepResultJson.jobId, timeoutMs: 300 },
      });
      const waitJson = JSON.parse(waitJob.content[0].text);
      assert.ok(["running", "passed", "failed"].includes(waitJson.status));
    }

    // 3. delivery_job_wait with non-existent jobId returns failure diagnostic
    const waitBad = await client.callTool({
      name: "delivery_job_wait",
      arguments: { jobId: "job-nonexistent-12345", timeoutMs: 200 },
    });
    const waitBadJson = JSON.parse(waitBad.content[0].text);
    assert.strictEqual(waitBadJson.status, "failed");
    assert.strictEqual(waitBadJson.diagnostics[0].code, "JOB_NOT_FOUND");
  } finally {
    await client.close();
    await server.close();
  }
});
