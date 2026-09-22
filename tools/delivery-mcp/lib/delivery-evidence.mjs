import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { assertSafeRepoPath } from "./repo-root.mjs";
import { withJobMutex } from "./job-mutex.mjs";
import { readProcessIdentity, isProcessAlive } from "./jobs.mjs";

const RUNTIME_ROOT = ".delivery/runtime";
const STALE_LOCK_MS = 30 * 60 * 1000;

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableObject(child)])
  );
}

function relativeRuntimePath(...parts) {
  const resolved = path.posix.join(RUNTIME_ROOT, ...parts);
  return resolved;
}

async function writeJsonAtomic(repoRoot, relativePath, value) {
  assertSafeRepoPath(repoRoot, relativePath, "Runtime artifact path");
  const absolutePath = path.resolve(repoRoot, relativePath);
  const tempPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, absolutePath);
}

export function computeRunKey({ inspection, snapshot }) {
  const identity = stableObject({
    snapshotHash: inspection.snapshotHash,
    headSha: inspection.repository.headSha,
    policy: inspection.policy,
    gateId: inspection.gate.id,
    checkIds: inspection.gate.checkIds,
    parameters: inspection.gate.parameters,
    stagedFiles: snapshot.stagedFiles,
  });
  return crypto.createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export async function loadCachedSuccess({ repoRoot, runKey, cacheable }) {
  if (!cacheable) return null;
  const relativeCache = relativeRuntimePath("cache", `${runKey}.json`);
  assertSafeRepoPath(repoRoot, relativeCache, "Cache path");
  const cachePath = path.resolve(repoRoot, relativeCache);
  try {
    const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
    if (cached.status !== "passed" || cached.runKey !== runKey) return null;
    return { ...cached, cached: true };
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function loadCachedFailure({ repoRoot, runKey, cacheable }) {
  if (!cacheable) return null;
  const relativeCache = relativeRuntimePath("cache", `failure-${runKey}.json`);
  assertSafeRepoPath(repoRoot, relativeCache, "Cache path");
  const cachePath = path.resolve(repoRoot, relativeCache);
  try {
    const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
    if (cached.status !== "failed" || cached.runKey !== runKey) return null;
    return { ...cached, cached: true };
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function acquireRunLock({ repoRoot, runKey }) {
  const relativePath = relativeRuntimePath("locks", `${runKey}.lock`);
  assertSafeRepoPath(repoRoot, relativePath, "Lock path");
  const absolutePath = path.resolve(repoRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });

  const token = crypto.randomBytes(16).toString("hex");
  await withJobMutex(repoRoot, `gate:${runKey}`, async () => {
    let previous = null;
    let stat = null;
    try {
      stat = await fs.stat(absolutePath);
      previous = JSON.parse(await fs.readFile(absolutePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    }
    const identity = previous?.pid ? await readProcessIdentity(Number(previous.pid)) : null;
    const processStillOwned = previous?.processIdentity && isProcessAlive(Number(previous.pid)) &&
      (!identity || identity.startTimeTicks === previous.processIdentity.startTimeTicks);
    if (processStillOwned ||
        (!previous?.processIdentity && stat && Date.now() - stat.mtimeMs <= STALE_LOCK_MS)) {
      const inProgress = new Error("An equivalent delivery gate execution is already in progress");
      inProgress.code = "DELIVERY_RUN_IN_PROGRESS";
      throw inProgress;
    }
    const owner = { pid: process.pid, acquiredAt: new Date().toISOString(), token,
      jobToken: process.env.DELIVERY_JOB_TOKEN || null,
      processIdentity: await readProcessIdentity(process.pid) };
    const tempPath = `${absolutePath}.${token}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(owner)}\n`, { mode: 0o600 });
    await fs.rename(tempPath, absolutePath);
  });

  return async () => {
    await withJobMutex(repoRoot, `gate:${runKey}`, async () => {
      let current;
      try { current = JSON.parse(await fs.readFile(absolutePath, "utf8")); }
      catch (error) { if (error.code === "ENOENT") return; throw error; }
      if (current.token === token) await fs.unlink(absolutePath);
    });
  };
}

export async function createRunArtifacts({ repoRoot, runKey }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = crypto.randomBytes(3).toString("hex");
  const runId = `${timestamp}-${runKey.slice(0, 12)}-${suffix}`;
  const logDirectory = relativeRuntimePath("logs", runId);
  const recordPath = relativeRuntimePath("runs", `${runId}.json`);
  assertSafeRepoPath(repoRoot, logDirectory, "Log directory");
  assertSafeRepoPath(repoRoot, recordPath, "Record path");
  await fs.mkdir(path.resolve(repoRoot, logDirectory), { recursive: true, mode: 0o700 });
  return { logDirectory, recordPath };
}

export async function saveRunEvidence({ repoRoot, result, cacheable }) {
  if (result.evidence?.recordPath) {
    await writeJsonAtomic(repoRoot, result.evidence.recordPath, result);
  }
  await writeJsonAtomic(repoRoot, relativeRuntimePath("latest.json"), result);
  if (cacheable && result.status === "passed" && result.runKey) {
    await writeJsonAtomic(repoRoot, relativeRuntimePath("cache", `${result.runKey}.json`), result);
  }
  if (cacheable && result.status === "failed" && result.runKey) {
    await writeJsonAtomic(repoRoot, relativeRuntimePath("cache", `failure-${result.runKey}.json`), result);
  }
}
