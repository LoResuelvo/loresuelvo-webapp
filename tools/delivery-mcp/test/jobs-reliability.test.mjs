import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  createDeliveryJob,
  getDeliveryJob,
  updateDeliveryJob,
  releaseJobRunLock,
  spawnJobWorker,
} from "../lib/jobs.mjs";

async function createRuntimeRoot(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-jobs-reliability-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, ".delivery", "runtime", "jobs"), { recursive: true });
  await fs.mkdir(path.join(root, ".delivery", "runtime", "locks"), { recursive: true });
  return root;
}

async function writeRunLock(root, runKey, owner) {
  await fs.writeFile(
    path.join(root, ".delivery", "runtime", "locks", `${runKey}.lock`),
    `${JSON.stringify(owner)}\n`,
    "utf8"
  );
}

test("releaseJobRunLock elimina únicamente el lock cuyo PID pertenece al job", async (t) => {
  const root = await createRuntimeRoot(t);
  const worker = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  t.after(() => {
    try {
      worker.kill("SIGKILL");
    } catch {}
  });

  const runKey = "run-owner-check";
  const job = await createDeliveryJob({ repoRoot: root, runKey });
  const running = await updateDeliveryJob({
    repoRoot: root,
    jobId: job.jobId,
    updates: {
      status: "running",
      pid: worker.pid,
      startedAt: new Date().toISOString(),
    },
  });

  await writeRunLock(root, runKey, {
    pid: running.pid,
    acquiredAt: new Date().toISOString(),
  });
  assert.strictEqual(await releaseJobRunLock(root, running), true);
  await assert.rejects(
    fs.access(path.join(root, ".delivery", "runtime", "locks", `${runKey}.lock`)),
    /ENOENT/
  );

  // A new execution replaced the lock with a different owner.  The old job's
  // cleanup must leave that lock untouched.
  await writeRunLock(root, runKey, {
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  });
  assert.strictEqual(await releaseJobRunLock(root, running), false);
  await fs.access(path.join(root, ".delivery", "runtime", "locks", `${runKey}.lock`));
});

test("spawnJobWorker convierte errores asincrónicos de spawn en fallo compacto sin borrar lock ajeno", async (t) => {
  const root = await createRuntimeRoot(t);
  const runKey = "run-spawn-error";
  const job = await createDeliveryJob({ repoRoot: root, runKey });
  await writeRunLock(root, runKey, {
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  });

  const fakeChild = new EventEmitter();
  fakeChild.pid = undefined;
  fakeChild.unref = () => {};
  const spawnFn = () => {
    queueMicrotask(() => {
      const error = new Error("permission denied\nsecret=do-not-leak");
      error.code = "EACCES";
      fakeChild.emit("error", error);
    });
    return fakeChild;
  };

  const result = await spawnJobWorker({ repoRoot: root, jobId: job.jobId, spawnFn });
  assert.strictEqual(result, null);

  const failed = await getDeliveryJob({ repoRoot: root, jobId: job.jobId });
  assert.strictEqual(failed.status, "failed");
  assert.strictEqual(failed.error.code, "JOB_WORKER_SPAWN_FAILED");
  assert.strictEqual(failed.error.message, "permission denied");
  await fs.access(path.join(root, ".delivery", "runtime", "locks", `${runKey}.lock`));
});
