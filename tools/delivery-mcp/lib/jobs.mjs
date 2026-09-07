import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { findRepoRoot, assertSafeRepoPath } from "./repo-root.mjs";

const JOB_ID_REGEX = /^[A-Za-z0-9_-]+$/;
const JOBS_DIR = ".delivery/runtime/jobs";

export function getJobsDir(repoRoot) {
  const root = findRepoRoot(repoRoot);
  return path.resolve(root, JOBS_DIR);
}

export function validateJobId(jobId) {
  if (!jobId || typeof jobId !== "string" || !JOB_ID_REGEX.test(jobId)) {
    throw new Error(`Invalid job ID: ${String(jobId || "").slice(0, 50)}`);
  }
}

export function getJobFilePath(repoRoot, jobId) {
  const root = findRepoRoot(repoRoot);
  validateJobId(jobId);
  const relative = path.posix.join(JOBS_DIR, `${jobId}.json`);
  assertSafeRepoPath(root, relative, "Job path");
  return path.resolve(root, relative);
}

async function writeJobAtomic(root, jobId, jobData) {
  const filePath = getJobFilePath(root, jobId);
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(jobData, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, filePath);
}

export function isProcessAlive(pid) {
  if (!pid || typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
}

export async function killProcessTree(pid, signal = "SIGTERM") {
  if (!isProcessAlive(pid)) return;
  if (process.platform !== "win32") {
    try {
      process.kill(-pid, signal);
      return;
    } catch {
      // Process group kill failed, try direct kill
    }
  }
  try {
    process.kill(pid, signal);
  } catch {
    // already gone
  }
}

export async function createDeliveryJob({
  repoRoot,
  type = "prepare",
  params = {},
  runKey = null,
  snapshotHash = null,
  gateId = null,
}) {
  const root = findRepoRoot(repoRoot);
  const timestamp = Date.now();
  const suffix = crypto.randomBytes(4).toString("hex");
  const jobId = `job-${timestamp}-${suffix}`;

  const job = {
    jobId,
    type,
    status: "queued",
    createdAt: new Date(timestamp).toISOString(),
    startedAt: null,
    finishedAt: null,
    pid: null,
    runKey,
    snapshotHash,
    gateId,
    params,
    result: null,
    error: null,
  };

  await writeJobAtomic(root, jobId, job);
  return job;
}

export async function getDeliveryJob({ repoRoot, jobId }) {
  const root = findRepoRoot(repoRoot);
  const filePath = getJobFilePath(root, jobId);
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    if (error instanceof SyntaxError) {
      // Retry once in case of brief read-during-rename collision
      await new Promise((r) => setTimeout(r, 50));
      try {
        const retryContent = await fs.readFile(filePath, "utf8");
        return JSON.parse(retryContent);
      } catch {
        return null;
      }
    }
    throw error;
  }
}

export async function updateDeliveryJob({ repoRoot, jobId, updates }) {
  const root = findRepoRoot(repoRoot);
  const current = await getDeliveryJob({ repoRoot: root, jobId });
  if (!current) throw new Error(`Job not found: ${jobId}`);
  const updated = { ...current, ...updates };
  await writeJobAtomic(root, jobId, updated);
  return updated;
}

export async function findActiveDeliveryJob({ repoRoot, runKey }) {
  if (!runKey) return null;
  const root = findRepoRoot(repoRoot);
  const jobsDir = getJobsDir(root);
  let files = [];
  try {
    files = await fs.readdir(jobsDir);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const jobId = file.slice(0, -5);
    try {
      const job = await getDeliveryJob({ repoRoot: root, jobId });
      if (job && job.runKey === runKey && ["queued", "running"].includes(job.status)) {
        if (job.pid && !isProcessAlive(job.pid)) {
          // Dead worker detected; mark failed and free lock
          if (job.runKey) {
            const lockPath = path.resolve(root, ".delivery/runtime/locks", `${job.runKey}.lock`);
            await fs.unlink(lockPath).catch(() => {});
          }
          await updateDeliveryJob({
            repoRoot: root,
            jobId,
            updates: {
              status: "failed",
              finishedAt: new Date().toISOString(),
              error: { code: "WORKER_CRASHED", message: "Job worker process terminated unexpectedly" },
            },
          });
          continue;
        }
        return job;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function spawnJobWorker({ repoRoot, jobId }) {
  const root = findRepoRoot(repoRoot);
  validateJobId(jobId);
  const runnerPath = path.resolve(root, "tools/delivery-mcp/lib/job-runner.mjs");

  const child = spawn(process.execPath, [runnerPath, jobId, root], {
    cwd: root,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "development" },
    detached: process.platform !== "win32",
    stdio: ["ignore", "ignore", "ignore"],
  });

  child.unref();

  await updateDeliveryJob({
    repoRoot: root,
    jobId,
    updates: { pid: child.pid, status: "running", startedAt: new Date().toISOString() },
  });

  return child.pid;
}

export async function cancelDeliveryJob({ repoRoot, jobId, reason = "Cancelled by user" }) {
  const root = findRepoRoot(repoRoot);
  const job = await getDeliveryJob({ repoRoot: root, jobId });
  if (!job) throw new Error(`Job not found: ${jobId}`);

  if (["passed", "failed", "timed_out", "cancelled"].includes(job.status)) {
    return job;
  }

  if (job.pid && isProcessAlive(job.pid)) {
    await killProcessTree(job.pid, "SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
    if (isProcessAlive(job.pid)) {
      await killProcessTree(job.pid, "SIGKILL");
    }
  }

  if (job.runKey) {
    const lockPath = path.resolve(root, ".delivery/runtime/locks", `${job.runKey}.lock`);
    await fs.unlink(lockPath).catch(() => {});
  }

  const updated = await updateDeliveryJob({
    repoRoot: root,
    jobId,
    updates: {
      status: "cancelled",
      finishedAt: new Date().toISOString(),
      error: { code: "JOB_CANCELLED", message: reason },
    },
  });

  return updated;
}

export async function cleanupOrphanedDeliveryJobs({ repoRoot }) {
  const root = findRepoRoot(repoRoot);
  const jobsDir = getJobsDir(root);
  let files = [];
  try {
    files = await fs.readdir(jobsDir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const cleaned = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const jobId = file.slice(0, -5);
    try {
      const job = await getDeliveryJob({ repoRoot: root, jobId });
      if (job && ["queued", "running"].includes(job.status)) {
        if (job.pid && !isProcessAlive(job.pid)) {
          if (job.runKey) {
            const lockPath = path.resolve(root, ".delivery/runtime/locks", `${job.runKey}.lock`);
            await fs.unlink(lockPath).catch(() => {});
          }
          await updateDeliveryJob({
            repoRoot: root,
            jobId,
            updates: {
              status: "failed",
              finishedAt: new Date().toISOString(),
              error: { code: "WORKER_CRASHED", message: "Orphaned job worker process died" },
            },
          });
          cleaned.push(jobId);
        }
      }
    } catch {
      // ignore
    }
  }
  return cleaned;
}

function formatTerminalJobResult(job) {
  if (job.result) {
    return {
      jobId: job.jobId,
      ...job.result,
    };
  }

  if (job.status === "cancelled") {
    return {
      jobId: job.jobId,
      status: "cancelled",
      message: job.error?.message || "Delivery job was cancelled",
      diagnostics: [
        {
          code: "JOB_CANCELLED",
          message: job.error?.message || "Delivery job was cancelled",
          retryable: false,
        },
      ],
    };
  }

  if (job.status === "timed_out") {
    return {
      jobId: job.jobId,
      status: "timed_out",
      message: job.error?.message || "Delivery job exceeded execution deadline",
      diagnostics: [
        {
          code: "JOB_TIMED_OUT",
          message: job.error?.message || "Delivery job timed out",
          retryable: true,
        },
      ],
    };
  }

  return {
    jobId: job.jobId,
    status: job.status || "failed",
    message: job.error?.message || "Delivery job failed",
    diagnostics: [
      {
        code: job.error?.code || "JOB_FAILED",
        message: job.error?.message || "Delivery job failed without result",
        retryable: true,
      },
    ],
  };
}

export async function waitForJob({
  repoRoot,
  jobId,
  timeoutMs = 60000,
  pollIntervalMs = 500,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const root = findRepoRoot(repoRoot);
  validateJobId(jobId);

  const startedWait = Date.now();
  while (true) {
    const job = await getDeliveryJob({ repoRoot: root, jobId });
    if (!job) {
      return {
        jobId,
        status: "failed",
        diagnostics: [
          {
            code: "JOB_NOT_FOUND",
            message: `Delivery job '${jobId}' does not exist`,
            retryable: false,
          },
        ],
      };
    }

    if (["queued", "running"].includes(job.status) && job.pid && !isProcessAlive(job.pid)) {
      await sleepFn(100);
      const fresh = await getDeliveryJob({ repoRoot: root, jobId });
      if (fresh && ["passed", "failed", "timed_out", "cancelled"].includes(fresh.status)) {
        return formatTerminalJobResult(fresh);
      }
      if (job.runKey) {
        const lockPath = path.resolve(root, ".delivery/runtime/locks", `${job.runKey}.lock`);
        await fs.unlink(lockPath).catch(() => {});
      }
      const failedJob = await updateDeliveryJob({
        repoRoot: root,
        jobId,
        updates: {
          status: "failed",
          finishedAt: new Date().toISOString(),
          error: { code: "JOB_WORKER_CRASHED", message: "Job worker process died unexpectedly" },
        },
      });
      return formatTerminalJobResult(failedJob);
    }

    if (["passed", "failed", "timed_out", "cancelled"].includes(job.status)) {
      return formatTerminalJobResult(job);
    }

    const elapsed = Date.now() - startedWait;
    if (elapsed >= timeoutMs) {
      const jobDuration = job.startedAt
        ? Date.now() - new Date(job.startedAt).getTime()
        : elapsed;
      return {
        jobId,
        status: "running",
        durationMs: jobDuration,
        gateId: job.gateId,
        message: `Delivery job '${jobId}' is still in progress (${Math.round(jobDuration / 1000)}s elapsed). Call delivery_job_wait to continue waiting.`,
      };
    }

    const remaining = timeoutMs - elapsed;
    await sleepFn(Math.min(pollIntervalMs, remaining));
  }
}
