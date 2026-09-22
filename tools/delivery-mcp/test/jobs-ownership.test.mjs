import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { EventEmitter } from "node:events";
import { acquireRunLock } from "../lib/delivery-evidence.mjs";
import {
  claimDeliveryJob,
  getDeliveryJob,
  transitionDeliveryJob,
  cancelDeliveryJob,
  cleanupOrphanedDeliveryJobs,
  createDeliveryJob,
  updateDeliveryJob,
  releaseJobRunLock,
  spawnJobWorker,
} from "../lib/jobs.mjs";

async function rootFor(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-owner-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, ".delivery/runtime/jobs"), { recursive: true });
  await fs.mkdir(path.join(root, ".delivery/runtime/locks"), { recursive: true });
  return root;
}

test("dos enqueues simultáneos reclaman un único owner", async (t) => {
  const root = await rootFor(t);
  const claims = await Promise.all(Array.from({ length: 12 }, () =>
    claimDeliveryJob({ repoRoot: root, runKey: "same-run", type: "test" })
  ));
  assert.equal(new Set(claims.map(({ job }) => job.jobId)).size, 1);
  assert.equal(claims.filter(({ claimed }) => claimed).length, 1);
  assert.equal(new Set(claims.map(({ job }) => job.ownerGeneration)).size, 1);
  let workers = 0;
  const spawnFn = () => {
    workers++;
    const child = new EventEmitter();
    child.pid = process.pid;
    child.unref = () => {};
    queueMicrotask(() => child.emit("spawn"));
    return child;
  };
  await Promise.all(Array.from({ length: 12 }, () =>
    spawnJobWorker({ repoRoot: root, jobId: claims[0].job.jobId, spawnFn })
  ));
  assert.equal(workers, 1);
});

test("cancelación y completado concurrentes conservan el resultado terminal y el PID", async (t) => {
  const root = await rootFor(t);
  const job = await createDeliveryJob({ repoRoot: root, runKey: "race" });
  await updateDeliveryJob({ repoRoot: root, jobId: job.jobId, updates: { status: "running" } });
  const done = transitionDeliveryJob({ repoRoot: root, jobId: job.jobId, ownerGeneration: job.ownerGeneration,
    from: ["running"], updates: { status: "passed", result: { status: "passed" }, pid: 321 } });
  const cancel = cancelDeliveryJob({ repoRoot: root, jobId: job.jobId });
  await Promise.all([done, cancel]);
  const stored = await getDeliveryJob({ repoRoot: root, jobId: job.jobId });
  assert.equal(stored.status, "passed");
  assert.deepEqual(stored.result, { status: "passed" });
  assert.equal(stored.pid, 321);
});

test("writer stale no cambia un terminal ni sus campos", async (t) => {
  const root = await rootFor(t);
  const job = await createDeliveryJob({ repoRoot: root });
  await transitionDeliveryJob({ repoRoot: root, jobId: job.jobId, ownerGeneration: job.ownerGeneration,
    from: ["queued"], updates: { status: "failed", error: { code: "ACTUAL" } } });
  await assert.rejects(transitionDeliveryJob({ repoRoot: root, jobId: job.jobId,
    ownerGeneration: "stale", from: ["queued"], updates: { status: "passed", result: {} } }), /OWNER|STALE|TRANSITION/);
  const stored = await getDeliveryJob({ repoRoot: root, jobId: job.jobId });
  assert.equal(stored.status, "failed");
  assert.equal(stored.error.code, "ACTUAL");
});

test("PID reutilizado y lock reemplazado no autorizan kill ni release", async (t) => {
  const root = await rootFor(t);
  const worker = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", detached: true });
  t.after(() => { try { process.kill(-worker.pid, "SIGKILL"); } catch {} });
  const job = await createDeliveryJob({ repoRoot: root, runKey: "reuse" });
  const running = await updateDeliveryJob({ repoRoot: root, jobId: job.jobId,
    updates: { status: "running", pid: worker.pid, workerIdentity: { pid: worker.pid, startTimeTicks: "0" } } });
  const lockPath = path.join(root, ".delivery/runtime/locks/reuse.lock");
  await fs.writeFile(lockPath, JSON.stringify({ pid: worker.pid, ownerGeneration: "replacement", active: true }));
  assert.equal(await releaseJobRunLock(root, running), false);
  const cancelled = await cancelDeliveryJob({ repoRoot: root, jobId: job.jobId });
  assert.notEqual(cancelled.status, "cancelled");
  assert.equal(worker.exitCode, null);
  await fs.access(lockPath);
});

test("un release tardío no borra el lock de otra generación", async (t) => {
  const root = await rootFor(t);
  const release = await acquireRunLock({ repoRoot: root, runKey: "replace" });
  const lockPath = path.join(root, ".delivery/runtime/locks/replace.lock");
  await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid, token: "new-generation" }));
  await release();
  assert.equal(JSON.parse(await fs.readFile(lockPath, "utf8")).token, "new-generation");
});

test("kill fallido no informa cancelled", async (t) => {
  const root = await rootFor(t);
  const job = await createDeliveryJob({ repoRoot: root });
  await updateDeliveryJob({ repoRoot: root, jobId: job.jobId,
    updates: { status: "running", pid: process.pid, workerIdentity: { pid: process.pid, startTimeTicks: "0" } } });
  const result = await cancelDeliveryJob({ repoRoot: root, jobId: job.jobId });
  assert.notEqual(result.status, "cancelled");
  assert.match(result.error.code, /CANCEL|IDENTITY/);
});

test("cancelar durante npm termina descendientes y libera el puerto", async (t) => {
  const root = await rootFor(t);
  const childScript = "const fs=require('fs'),net=require('net'); const s=net.createServer(); s.listen(0,'127.0.0.1',()=>fs.writeFileSync('port',String(s.address().port)));";
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: { hold: `node -e ${JSON.stringify(childScript)}` } }));
  const job = await createDeliveryJob({ repoRoot: root, runKey: "npm-tree" });
  const script = `import {executeProcessDefault} from ${JSON.stringify(new URL("../lib/test-delivery.mjs", import.meta.url).href)}; await executeProcessDefault({command:'npm',args:['run','hold'],cwd:${JSON.stringify(root)},logPath:'.delivery/runtime/npm.log',timeoutMs:30000});`;
  const worker = spawn(process.execPath, ["--input-type=module", "-e", script], {
    cwd: root, stdio: "ignore", detached: true,
    env: { ...process.env, DELIVERY_JOB_ID: job.jobId, DELIVERY_JOB_TOKEN: job.workerToken },
  });
  t.after(() => { try { process.kill(-worker.pid, "SIGKILL"); } catch {} });
  await updateDeliveryJob({ repoRoot: root, jobId: job.jobId,
    updates: { status: "running", pid: worker.pid, startedAt: new Date().toISOString() } });
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number(await fs.readFile(path.join(root, "port"), "utf8")); break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  assert.ok(port, "npm descendant must start and bind its port");
  const cancelled = await cancelDeliveryJob({ repoRoot: root, jobId: job.jobId });
  assert.equal(cancelled.status, "cancelled");
  await assert.rejects(new Promise((resolve, reject) => {
    const connection = createConnection({ host: "127.0.0.1", port });
    connection.once("connect", () => { connection.destroy(); resolve(); });
    connection.once("error", reject);
  }));
});

test("restart reconcilia un lote acotado de huérfanos", async (t) => {
  const root = await rootFor(t);
  const jobs = await Promise.all(Array.from({ length: 3 }, (_, i) =>
    createDeliveryJob({ repoRoot: root, runKey: `orphan-${i}` })
  ));
  for (const job of jobs) await updateDeliveryJob({ repoRoot: root, jobId: job.jobId,
    updates: { queueLeaseUntil: new Date(0).toISOString() } });
  const first = await cleanupOrphanedDeliveryJobs({ repoRoot: root, limit: 2 });
  assert.equal(first.length, 2);
  const second = await cleanupOrphanedDeliveryJobs({ repoRoot: root, limit: 2 });
  assert.equal(second.length, 1);
});

test("restart termina el grupo heredado de un worker huérfano", async (t) => {
  const root = await rootFor(t);
  const job = await createDeliveryJob({ repoRoot: root, runKey: "orphan-group" });
  const childScript = "const fs=require('fs'),net=require('net'); const s=net.createServer(); s.listen(0,'127.0.0.1',()=>fs.writeFileSync('orphan-port',String(s.address().port)));";
  const workerScript = `const {spawn}=require('child_process');spawn(process.execPath,['-e',${JSON.stringify(childScript)}],{stdio:'ignore'});setTimeout(()=>process.exit(0),300);`;
  const worker = spawn(process.execPath, ["-e", workerScript], { cwd: root, stdio: "ignore", detached: true,
    env: { ...process.env, DELIVERY_JOB_TOKEN: job.workerToken } });
  t.after(() => { try { process.kill(-worker.pid, "SIGKILL"); } catch {} });
  await updateDeliveryJob({ repoRoot: root, jobId: job.jobId,
    updates: { status: "running", pid: worker.pid, startedAt: new Date().toISOString() } });
  await new Promise((resolve) => worker.once("exit", resolve));
  const port = Number(await fs.readFile(path.join(root, "orphan-port"), "utf8"));
  assert.ok(port);
  assert.deepEqual(await cleanupOrphanedDeliveryJobs({ repoRoot: root, limit: 1 }), [job.jobId]);
  assert.equal((await getDeliveryJob({ repoRoot: root, jobId: job.jobId })).status, "cancelled");
  await assert.rejects(new Promise((resolve, reject) => {
    const connection = createConnection({ host: "127.0.0.1", port });
    connection.once("connect", () => { connection.destroy(); resolve(); });
    connection.once("error", reject);
  }));
});

test("registros legacy se leen y reconcilian sin capacidad destructiva", async (t) => {
  const root = await rootFor(t);
  const job = await createDeliveryJob({ repoRoot: root, runKey: "legacy" });
  const legacy = { ...job, status: "queued", queueLeaseUntil: new Date(0).toISOString() };
  delete legacy.ownerGeneration;
  await fs.writeFile(path.join(root, `.delivery/runtime/jobs/${job.jobId}.json`), JSON.stringify(legacy));
  assert.equal((await getDeliveryJob({ repoRoot: root, jobId: job.jobId })).ownerGeneration, undefined);
  assert.deepEqual(await cleanupOrphanedDeliveryJobs({ repoRoot: root, limit: 1 }), [job.jobId]);
  assert.equal((await getDeliveryJob({ repoRoot: root, jobId: job.jobId })).status, "failed");
});
