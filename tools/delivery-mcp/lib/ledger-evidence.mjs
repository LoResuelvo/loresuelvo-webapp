import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";
import { validateExecutionResult } from "./validate-schema.mjs";

// Owns last-prepared, individual/consolidated commit records and the lock
// implementation in .delivery/runtime/locks. Gate run records are read only.
export const LEDGER_DIR = ".delivery/runtime/ledger";
export const LEDGER_FILE = ".delivery/runtime/ledger.json";
export const LAST_PREPARED_FILE = ".delivery/runtime/last-prepared.json";
export const REPAIR_LOCKS_DIR = ".delivery/runtime/locks";
export const LEDGER_STATES = Object.freeze({
  VALID_LEDGER: "VALID_LEDGER",
  EMPTY_LEDGER: "EMPTY_LEDGER",
  LEDGER_NOT_INITIALIZED: "LEDGER_NOT_INITIALIZED",
  LEDGER_CORRUPT: "LEDGER_CORRUPT",
  LEDGER_INCONSISTENT: "LEDGER_INCONSISTENT",
});

export function ledgerError(code, message, details = {}) {
  const error = new Error(message || code);
  error.code = code;
  Object.assign(error, details);
  return error;
}

export function assertCommitSha(commitSha) {
  if (!commitSha || typeof commitSha !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitSha.trim())) {
    throw new Error(`Invalid commit SHA: ${commitSha}`);
  }
  return commitSha.trim().toLowerCase();
}

function assertFullCommitSha(commitSha, fieldName) {
  if (
    !commitSha ||
    typeof commitSha !== "string" ||
    !/^[a-f0-9]{40}$/i.test(commitSha.trim())
  ) {
    throw ledgerError(
      "INVALID_REPAIR_SHA",
      `${fieldName} must be a full 40-character hexadecimal commit SHA`
    );
  }
  return commitSha.trim().toLowerCase();
}

function evidenceReadError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function isJsonObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isJsonObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",\n")}}`;
  }
  return JSON.stringify(value);
}

export async function writeJsonAtomic(root, relativePath, value) {
  assertSafeRepoPath(root, relativePath, "Delivery ledger path");
  const targetPath = path.resolve(root, relativePath);
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, targetPath);
}

export async function loadEvidenceRecord({ repoRoot, recordPath } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!recordPath || typeof recordPath !== "string") {
    throw new Error("Delivery evidence record path is missing");
  }
  assertSafeRepoPath(root, recordPath, "Delivery evidence record");
  const raw = await fs.readFile(path.resolve(root, recordPath), "utf8");
  const record = JSON.parse(raw);
  validateExecutionResult(record, root);
  const digest = crypto.createHash("sha256").update(raw).digest("hex");
  return { record, digest };
}

export async function recordPreparedEvidenceCore({
  repoRoot,
  snapshot,
  inspection,
  intent = "prepare_commit",
  usId = null,
  featureFile = null,
  scenarioName = null,
  scopeFiles = [],
  runKey = null,
  status,
  recordPath = null,
  repairsSha = null,
  supersedes = [],
  repairStatus = null,
  repairedFailure = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  if (status === "passed" && (!snapshot?.stagedTreeSha || !recordPath)) {
    throw new Error("Passed delivery evidence requires an exact staged tree and execution record");
  }

  let recordDigest = null;
  if (recordPath) {
    const loaded = await loadEvidenceRecord({ repoRoot: root, recordPath });
    if (loaded.record.status !== status) {
      throw new Error("Prepared evidence status does not match its execution record");
    }
    if (loaded.record.snapshotHash !== snapshot?.snapshotHash || loaded.record.runKey !== runKey) {
      throw new Error("Prepared evidence identity does not match its execution record");
    }
    if (loaded.record.policy?.hash !== inspection?.policy?.hash) {
      throw new Error("Prepared evidence policy does not match its execution record");
    }
    recordDigest = loaded.digest;
  }

  const effectivePolicyHash = inspection?.policy?.hash || null;
  const rawRepairsSha = repairsSha || inspection?.repairsSha || null;
  const effectiveRepairsSha = rawRepairsSha ? rawRepairsSha.trim().toLowerCase() : null;
  const isRepair = Boolean(effectiveRepairsSha) || inspection?.gate?.id === "R" || intent === "repair_ci";
  const effectiveSupersedes = Array.isArray(supersedes) && supersedes.length > 0
    ? sortedUnique(supersedes.map((s) => String(s).toLowerCase()))
    : (effectiveRepairsSha ? [effectiveRepairsSha] : []);
  const effectiveRepairStatus = repairStatus || (isRepair ? "unverified" : null);
  const effectiveRepairAuthState = isRepair ? "prepared" : null;

  const data = {
    schemaVersion: 2,
    recordedAt: new Date().toISOString(),
    status,
    snapshotHash: snapshot?.snapshotHash || null,
    runKey,
    recordPath,
    recordDigest,
    branch: snapshot?.branch || null,
    parentHeadSha: snapshot?.headSha || null,
    stagedTreeSha: snapshot?.stagedTreeSha || null,
    stagedFiles: [...new Set(snapshot?.stagedFiles || [])].sort(),
    gateId: inspection?.gate?.id || null,
    policyHash: effectivePolicyHash,
    intent,
    usId: usId || snapshot?.proposedUsId || null,
    featureFile: featureFile || null,
    scenarioName: scenarioName || null,
    scopeFiles: [...new Set(scopeFiles || [])].sort(),
    repairsSha: effectiveRepairsSha,
    supersedes: effectiveSupersedes,
    repairStatus: effectiveRepairStatus,
    repairedFailure: repairedFailure || null,
    repairAuthState: effectiveRepairAuthState,
    repairAuthSha: null,
    consumedByCommitSha: null,
    consumedAt: null,
  };

  await writeJsonAtomic(root, LAST_PREPARED_FILE, data);

  return data;
}

export async function getLastPreparedEvidence({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  const targetPath = path.resolve(root, LAST_PREPARED_FILE);
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

export function sortedUnique(values) {
  return [...new Set(Array.isArray(values) ? values : [])].sort();
}

function hasCanonicalFiles(values) {
  return Array.isArray(values) && JSON.stringify(values) === JSON.stringify(sortedUnique(values));
}

function hasMatchingFiles(left, right) {
  return hasCanonicalFiles(left) && JSON.stringify(left) === JSON.stringify(sortedUnique(right));
}

/**
 * Read-only validation for a prepared receipt. Every consumer of a receipt uses
 * this boundary so the guard and Git hooks cannot drift from one another.
 */
export async function verifyPreparedEvidence({
  repoRoot,
  prepared: suppliedPrepared = null,
  snapshot,
  inspection = null,
  intent,
  gateId,
  policyHash,
  repairsSha,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const prepared = suppliedPrepared || (await getLastPreparedEvidence({ repoRoot: root }));
  if (!prepared) return { valid: false, reason: "MISSING_PREPARED_EVIDENCE" };
  if (
    prepared.schemaVersion !== 2 ||
    prepared.status !== "passed" ||
    prepared.consumedByCommitSha ||
    prepared.repairStatus === "abandoned" ||
    prepared.repairAuthState === "abandoned"
  ) {
    return {
      valid: false,
      reason:
        prepared.repairStatus === "abandoned" || prepared.repairAuthState === "abandoned"
          ? "ABANDONED_PREPARED_EVIDENCE"
          : "STALE_PREPARED_EVIDENCE",
      prepared,
    };
  }

  const expectedPolicyHash = policyHash ?? inspection?.policy?.hash;
  if (expectedPolicyHash !== undefined && prepared.policyHash !== expectedPolicyHash) {
    return { valid: false, reason: "POLICY_MISMATCH", prepared };
  }

  const expectedRepairsSha = repairsSha ?? inspection?.repairsSha ?? inspection?.resolvedInput?.repairsSha;
  if (expectedRepairsSha !== undefined && (prepared.repairsSha || null) !== (expectedRepairsSha || null)) {
    return { valid: false, reason: "REPAIRS_SHA_MISMATCH", prepared };
  }

  const expectedGateId = gateId ?? inspection?.gate?.id;
  const identityMatches =
    prepared.snapshotHash === snapshot?.snapshotHash &&
    prepared.parentHeadSha === snapshot?.headSha &&
    prepared.stagedTreeSha === snapshot?.stagedTreeSha &&
    prepared.branch === snapshot?.branch &&
    hasMatchingFiles(prepared.stagedFiles, snapshot?.stagedFiles) &&
    (intent === undefined || prepared.intent === intent) &&
    (expectedGateId === undefined || prepared.gateId === expectedGateId);
  if (!identityMatches) {
    return { valid: false, reason: "PREPARED_EVIDENCE_SNAPSHOT_MISMATCH", prepared };
  }

  let loaded;
  try {
    loaded = await loadEvidenceRecord({ repoRoot: root, recordPath: prepared.recordPath });
  } catch {
    return { valid: false, reason: "PREPARED_EVIDENCE_RECORD_INVALID", prepared };
  }
  if (
    loaded.digest !== prepared.recordDigest ||
    loaded.record.status !== "passed" ||
    loaded.record.snapshotHash !== prepared.snapshotHash ||
    loaded.record.runKey !== prepared.runKey ||
    loaded.record.gate?.id !== prepared.gateId ||
    loaded.record.policy?.hash !== prepared.policyHash
  ) {
    return { valid: false, reason: "PREPARED_EVIDENCE_RECORD_MISMATCH", prepared };
  }

  return { valid: true, reason: null, prepared, record: loaded.record };
}

export async function consumePreparedEvidence({ repoRoot, commitSha } = {}) {
  const root = findRepoRoot(repoRoot);
  const prepared = await getLastPreparedEvidence({ repoRoot: root });
  if (!prepared) return null;
  const cleanSha = assertCommitSha(commitSha);
  const isRepair = Boolean(prepared.repairsSha) || prepared.gateId === "R" || prepared.intent === "repair_ci";
  const updated = {
    ...prepared,
    consumedByCommitSha: cleanSha,
    consumedAt: new Date().toISOString(),
    ...(isRepair
      ? {
          repairAuthState: "bound_to_commit",
          repairAuthSha: cleanSha,
        }
      : {}),
  };
  await writeJsonAtomic(root, LAST_PREPARED_FILE, updated);
  return updated;
}

export async function recordCommitEvidenceCore({
  repoRoot,
  commitSha,
  status = "passed",
  verificationStatus = null,
  notRunReason = null,
  snapshotHash = null,
  runKey = null,
  recordPath = null,
  recordDigest = null,
  branch = null,
  parentSha = null,
  treeSha = null,
  stagedFiles = [],
  gateId = null,
  policyHash = null,
  intent = "prepare_commit",
  usId = null,
  featureFile = null,
  scenarioName = null,
  scopeFiles = [],
  repairsSha = null,
  supersedes = [],
  repairStatus = null,
  repairedFailure = null,
  repairPushConsumed = false,
  repairPushConsumedAt = null,
  repairAuthState = null,
  repairAuthSha = null,
  manualRepairContextValidated = false,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);

  const effectiveStatus = verificationStatus || status || "passed";
  if (effectiveStatus !== "passed" && effectiveStatus !== "not_run") {
    throw new Error(`Invalid commit verification status: ${effectiveStatus}`);
  }

  const rawRepairsSha = repairsSha || null;
  const effectiveRepairsSha = rawRepairsSha ? rawRepairsSha.trim().toLowerCase() : null;
  const isRepair = Boolean(effectiveRepairsSha) || gateId === "R" || intent === "repair_ci";
  const effectiveSupersedes = Array.isArray(supersedes) && supersedes.length > 0
    ? sortedUnique(supersedes.map((s) => String(s).toLowerCase()))
    : (effectiveRepairsSha ? [effectiveRepairsSha] : []);
  const effectiveRepairStatus = repairStatus || (isRepair ? "unverified" : null);
  const effectiveRepairAuthState = isRepair
    ? (repairAuthState || (repairPushConsumed ? "submitted" : "bound_to_commit"))
    : null;
  const effectiveRepairAuthSha = isRepair ? (repairAuthSha || cleanSha) : null;

  const isNotRun = effectiveStatus === "not_run";
  const isValidatedManualRepair =
    isNotRun &&
    manualRepairContextValidated === true &&
    intent === "repair_ci" &&
    Boolean(effectiveRepairsSha);
  const entry = {
    schemaVersion: 2,
    commitSha: cleanSha,
    status: effectiveStatus,
    verificationStatus: effectiveStatus,
    ...(isNotRun
      ? {
          notRunReason: notRunReason || "UNVERIFIED_COMMIT",
          branch,
          parentSha,
          treeSha,
          stagedFiles: sortedUnique(stagedFiles),
          usId: usId || null,
          recordedAt: new Date().toISOString(),
          snapshotHash: null,
          runKey: null,
          recordPath: null,
          recordDigest: null,
          gateId: null,
          policyHash: null,
          intent: isValidatedManualRepair ? "repair_ci" : null,
          featureFile: null,
          scenarioName: null,
          scopeFiles: [],
          repairsSha: isValidatedManualRepair ? effectiveRepairsSha : null,
          supersedes: isValidatedManualRepair ? effectiveSupersedes : [],
          repairStatus: isValidatedManualRepair ? effectiveRepairStatus : null,
          repairedFailure: null,
          repairAuthState: isValidatedManualRepair ? effectiveRepairAuthState : null,
          repairAuthSha: isValidatedManualRepair ? effectiveRepairAuthSha : null,
          repairPushConsumed: false,
          repairPushConsumedAt: null,
          manualRepairContextValidated: isValidatedManualRepair,
        }
      : {
          notRunReason: null,
          snapshotHash: snapshotHash || null,
          runKey: runKey || null,
          recordPath: recordPath || null,
          recordDigest: recordDigest || null,
          branch,
          parentSha,
          treeSha,
          stagedFiles: sortedUnique(stagedFiles),
          gateId,
          policyHash,
          intent,
          usId,
          featureFile,
          scenarioName,
          scopeFiles: sortedUnique(scopeFiles),
          repairsSha: effectiveRepairsSha,
          supersedes: effectiveSupersedes,
          repairStatus: effectiveRepairStatus,
          repairedFailure: repairedFailure || null,
          repairAuthState: effectiveRepairAuthState,
          repairAuthSha: effectiveRepairAuthSha,
          repairPushConsumed: Boolean(repairPushConsumed || ["submitted", "ci_pending", "validated", "ci_failed"].includes(effectiveRepairAuthState)),
          repairPushConsumedAt: repairPushConsumedAt || null,
          manualRepairContextValidated: false,
          recordedAt: new Date().toISOString(),
        }),
  };

  // The consolidated ledger is a read/merge/write document.  Serialize the
  // whole transaction so concurrent post-commit/verify-head hooks cannot
  // overwrite one another's entries with a stale snapshot.
  const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
  try {
    await writeJsonAtomic(root, path.join(LEDGER_DIR, `${cleanSha}.json`), entry);

    const absLedgerFile = path.resolve(root, LEDGER_FILE);
    let ledgerMap = {};
    try {
      ledgerMap = JSON.parse(await fs.readFile(absLedgerFile, "utf8"));
    } catch {
      ledgerMap = {};
    }
    ledgerMap[cleanSha] = entry;
    await writeJsonAtomic(root, LEDGER_FILE, ledgerMap);
  } finally {
    await releaseLedgerLock();
  }

  return entry;
}

function sameFileIdentity(left, right) {
  return left && right && left.dev === right.dev && left.ino === right.ino;
}

function lockPidFromRaw(raw) {
  const match = /"pid"\s*:\s*(\d+)/.exec(String(raw || ""));
  return match ? Number(match[1]) : null;
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
}

async function readLockHandle(handle) {
  const stats = await handle.stat();
  const buffer = Buffer.alloc(stats.size);
  let offset = 0;
  while (offset < buffer.length) {
    const result = await handle.read(buffer, offset, buffer.length - offset, offset);
    if (!result.bytesRead) break;
    offset += result.bytesRead;
  }
  return buffer.subarray(0, offset).toString("utf8");
}

async function writeLockHandle(handle, value) {
  const payload = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  let offset = 0;
  while (offset < payload.length) {
    const result = await handle.write(payload, offset, payload.length - offset, offset);
    if (!result.bytesWritten) throw new Error("Unable to write repair lock");
    offset += result.bytesWritten;
  }
  // Write the replacement before shrinking the old contents. This never
  // exposes an empty lock and keeps renewal tied to the original inode.
  await handle.truncate(payload.length);
  await handle.sync();
}

export async function acquireRepairLock({
  repoRoot,
  targetSha = null,
  repairSha = null,
  lockName = null,
  timeoutMs = 5000,
  retryIntervalMs = 25,
  staleLockMs = 30000,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const lockKey = targetSha
    ? assertCommitSha(targetSha)
    : (repairSha ? assertCommitSha(repairSha) : "repair-global");
  if (lockName !== null && (!/^[A-Za-z0-9_-]+$/.test(String(lockName)) || String(lockName).length > 100)) {
    throw new Error(`Invalid lock name: ${String(lockName).slice(0, 100)}`);
  }
  const lockDir = path.resolve(root, REPAIR_LOCKS_DIR);
  await fs.mkdir(lockDir, { recursive: true, mode: 0o700 });
  const lockPath = path.join(lockDir, `${lockName ? String(lockName) : `repair-${lockKey}`}.lock`);
  const ownerToken = crypto.randomBytes(16).toString("hex");
  const leaseMs = Math.max(1000, Number(staleLockMs) || 30000);

  const startTime = Date.now();

  while (true) {
    let handle = null;
    try {
      handle = await fs.open(lockPath, "wx+", 0o600);
      const acquiredAt = new Date().toISOString();
      await writeLockHandle(handle, {
        pid: process.pid,
        ownerToken,
        acquiredAt,
        leaseUntil: Date.now() + leaseMs,
      });

      // Keep the descriptor for the entire lease. A later owner may replace
      // the pathname, but writes through this descriptor can then only touch
      // the old inode and can never overwrite the new owner's lock.
      const lockHandle = handle;
      handle = null;

      let released = false;
      let renewalTimer = null;
      let renewalInFlight = null;
      const renew = async () => {
        if (released || renewalInFlight) return false;
        renewalInFlight = (async () => {
          let current;
          try {
            const [raw, descriptorStat, pathStat] = await Promise.all([
              readLockHandle(lockHandle),
              lockHandle.stat(),
              fs.lstat(lockPath),
            ]);
            // The descriptor and pathname must still identify this lock. If
            // the pathname was replaced, never write through the pathname.
            if (!sameFileIdentity(descriptorStat, pathStat)) return false;
            current = JSON.parse(raw);
          } catch {
            return false;
          }
          if (released || current?.ownerToken !== ownerToken || current?.pid !== process.pid) return false;
          const renewed = { ...current, leaseUntil: Date.now() + leaseMs };
          try {
            await writeLockHandle(lockHandle, renewed);
            return true;
          } catch {
            return false;
          }
        })();
        try {
          return await renewalInFlight;
        } finally {
          renewalInFlight = null;
        }
      };
      renewalTimer = setInterval(() => { void renew(); }, Math.max(250, Math.floor(leaseMs / 3)));
      renewalTimer.unref?.();

      const release = async () => {
        released = true;
        if (renewalTimer) clearInterval(renewalTimer);
        try {
          if (renewalInFlight) await renewalInFlight;
          const [raw, descriptorStat, pathStat] = await Promise.all([
            readLockHandle(lockHandle),
            lockHandle.stat(),
            fs.lstat(lockPath),
          ]);
          const current = JSON.parse(raw);
          if (
            current?.ownerToken === ownerToken &&
            current?.pid === process.pid &&
            sameFileIdentity(descriptorStat, pathStat)
          ) {
            await fs.unlink(lockPath);
          }
        } catch (err) {
          if (err.code !== "ENOENT" && !(err instanceof SyntaxError)) throw err;
        } finally {
          try { await lockHandle.close(); } catch (err) {
            if (err.code !== "EBADF") throw err;
          }
        }
      };
      release.renew = renew;
      return release;
    } catch (err) {
      if (handle) {
        try { await handle.close(); } catch {}
      }
      if (err.code !== "EEXIST") throw err;

      try {
        const rawLock = await fs.readFile(lockPath, "utf8");
        let existingLock;
        try { existingLock = JSON.parse(rawLock); } catch { existingLock = null; }
        const lockStat = await fs.lstat(lockPath);
        const pid = Number.isInteger(existingLock?.pid) ? existingLock.pid : lockPidFromRaw(rawLock);
        // A crash can leave an empty/partial JSON file before pid is written.
        // Such a file has no owner to protect, but is recoverable only after
        // the stale-age threshold. Parsed legacy objects without a PID remain
        // conservative and are treated as owned.
        const ownerAlive = pid == null ? existingLock !== null : isProcessAlive(pid);
        const leaseUntil = existingLock && existingLock.leaseUntil != null
          ? Number(existingLock.leaseUntil)
          : Number.NaN;
        const acquiredAt = Date.parse(existingLock?.acquiredAt || "");
        const issuedAt = Number.isFinite(acquiredAt) ? acquiredAt : lockStat.mtimeMs;
        // Legacy locks have no leaseUntil. They are stale only after the
        // acquiredAt/mtime age threshold and a definitely dead owner.
        const stale = Number.isFinite(leaseUntil)
          ? Date.now() > leaseUntil
          : (existingLock === null && Date.now() - lockStat.mtimeMs >= leaseMs) ||
            (existingLock !== null && Date.now() - issuedAt >= leaseMs);

        // A lock is removable only after expiry and a dead, known owner. For
        // malformed JSON, extracting the PID from the prefix permits safe
        // recovery after a crash without trusting an unknown owner.
        if (stale && !ownerAlive) {
          try {
            const latestStat = await fs.lstat(lockPath);
            if (!sameFileIdentity(lockStat, latestStat)) continue;
            const latestRaw = await fs.readFile(lockPath, "utf8");
            let latest;
            try { latest = JSON.parse(latestRaw); } catch { latest = null; }
            const latestPid = Number.isInteger(latest?.pid) ? latest.pid : lockPidFromRaw(latestRaw);
            const latestAlive = latestPid == null ? latest !== null : isProcessAlive(latestPid);
            const latestLeaseUntil = latest && latest.leaseUntil != null
              ? Number(latest.leaseUntil)
              : Number.NaN;
            const latestAcquiredAt = Date.parse(latest?.acquiredAt || "");
            const latestIssuedAt = Number.isFinite(latestAcquiredAt) ? latestAcquiredAt : latestStat.mtimeMs;
            const latestStale = Number.isFinite(latestLeaseUntil)
              ? Date.now() > latestLeaseUntil
              : (latest === null && Date.now() - latestStat.mtimeMs >= leaseMs) ||
                (latest !== null && Date.now() - latestIssuedAt >= leaseMs);
            if (latestStale && !latestAlive) {
              await fs.unlink(lockPath);
              continue;
            }
          } catch {
            // ignore races with the owner/replacer
          }
        }
      } catch {
        // ignore
      }

      if (Date.now() - startTime >= timeoutMs) {
        const lockError = new Error(`Concurrent repair operation in progress for target ${lockKey.slice(0, 8)}`);
        lockError.code = "REPAIR_LOCK_TIMEOUT";
        throw lockError;
      }

      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }
}

/** Serialize read/merge/write updates to the consolidated ledger. */
export async function acquireLedgerLock({
  repoRoot,
  timeoutMs = 5000,
  retryIntervalMs = 25,
  staleLockMs = 30000,
} = {}) {
  return acquireRepairLock({
    repoRoot,
    lockName: "ledger",
    timeoutMs,
    retryIntervalMs,
    staleLockMs,
  });
}

export async function getCommitEvidence({ repoRoot, commitSha } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!commitSha || typeof commitSha !== "string") return null;
  let cleanSha;
  try {
    cleanSha = assertCommitSha(commitSha);
  } catch {
    return null;
  }

  const commitFilePath = path.resolve(root, LEDGER_DIR, `${cleanSha}.json`);
  const ledgerFilePath = path.resolve(root, LEDGER_FILE);

  let lastInconsistentError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let rawCommitEntry;
    try {
      rawCommitEntry = await fs.readFile(commitFilePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw evidenceReadError("COMMIT_EVIDENCE_FILE_UNREADABLE");
    }
    if (rawCommitEntry !== undefined) {
      let parsed;
      try {
        parsed = JSON.parse(rawCommitEntry);
      } catch {
        throw evidenceReadError("INVALID_COMMIT_EVIDENCE_FILE");
      }
      if (!isJsonObject(parsed)) throw evidenceReadError("INVALID_COMMIT_EVIDENCE_FILE");
      // An individual record is authoritative only when it can be reconciled
      // with the consolidated ledger. If the latter is absent, the historical
      // individual record remains verifiable on its own and can be rebuilt.
      let rawLedger;
      try {
        rawLedger = await fs.readFile(ledgerFilePath, "utf8");
      } catch (error) {
        if (error.code === "ENOENT") return parsed;
        throw evidenceReadError("CONSOLIDATED_LEDGER_UNREADABLE");
      }
      let parsedLedger;
      try {
        parsedLedger = JSON.parse(rawLedger);
      } catch {
        throw evidenceReadError("INVALID_CONSOLIDATED_LEDGER");
      }
      if (!isJsonObject(parsedLedger)) throw evidenceReadError("INVALID_CONSOLIDATED_LEDGER");
      const consolidatedKey = Object.keys(parsedLedger).find(
        (key) => key.toLowerCase() === cleanSha
      );
      if (!consolidatedKey) {
        lastInconsistentError = evidenceReadError("LEDGER_INCONSISTENT");
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          continue;
        }
        throw lastInconsistentError;
      }
      if (!isJsonObject(parsedLedger[consolidatedKey])) {
        throw evidenceReadError("INVALID_COMMIT_EVIDENCE_ENTRY");
      }
      if (canonicalJson(parsedLedger[consolidatedKey]) !== canonicalJson(parsed)) {
        lastInconsistentError = evidenceReadError("LEDGER_INCONSISTENT");
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          continue;
        }
        throw lastInconsistentError;
      }
      return parsed;
    }
    break;
  }
  if (lastInconsistentError) {
    throw lastInconsistentError;
  }

  let rawLedger;
  try {
    rawLedger = await fs.readFile(path.resolve(root, LEDGER_FILE), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw evidenceReadError("CONSOLIDATED_LEDGER_UNREADABLE");
  }
  let parsedLedger;
  try {
    parsedLedger = JSON.parse(rawLedger);
  } catch {
    throw evidenceReadError("INVALID_CONSOLIDATED_LEDGER");
  }
  if (!isJsonObject(parsedLedger)) throw evidenceReadError("INVALID_CONSOLIDATED_LEDGER");
  const consolidatedKey = Object.keys(parsedLedger).find(
    (key) => key.toLowerCase() === cleanSha
  );
  if (!consolidatedKey) return null;
  if (!isJsonObject(parsedLedger[consolidatedKey])) {
    throw evidenceReadError("INVALID_COMMIT_EVIDENCE_ENTRY");
  }

  // Never accept a consolidated-only entry once the ledger has been
  // initialized: its individual source is required for reconciliation.
  throw evidenceReadError("LEDGER_INCONSISTENT");
}

export async function validateCommitEvidenceEntryShape(entry, root = null, fileSha = null) {
  if (!isJsonObject(entry)) {
    throw ledgerError("LEDGER_CORRUPT", "Individual ledger record is not a valid JSON object", { fileSha });
  }
  if (entry.schemaVersion !== 2) {
    throw ledgerError(
      "LEDGER_CORRUPT",
      `Individual ledger record has unsupported schema version: ${entry.schemaVersion}`,
      { fileSha }
    );
  }
  if (!entry.commitSha || typeof entry.commitSha !== "string") {
    throw ledgerError("LEDGER_CORRUPT", "Individual ledger record missing commitSha", { fileSha });
  }
  let cleanSha;
  try {
    cleanSha = assertCommitSha(entry.commitSha);
  } catch {
    throw ledgerError("LEDGER_CORRUPT", `Individual ledger record has invalid commitSha: ${entry.commitSha}`, { fileSha });
  }
  if (fileSha && cleanSha !== fileSha.trim().toLowerCase()) {
    throw ledgerError(
      "LEDGER_CORRUPT",
      `Individual ledger record commitSha mismatch: ${entry.commitSha} vs filename ${fileSha}`,
      { fileSha }
    );
  }
  const effectiveStatus = entry.verificationStatus || entry.status || "passed";
  if (effectiveStatus !== "passed" && effectiveStatus !== "not_run") {
    throw ledgerError("LEDGER_CORRUPT", `Individual ledger record has invalid status: ${effectiveStatus}`, { fileSha });
  }
  if (entry.status && entry.verificationStatus && entry.verificationStatus !== entry.status) {
    throw ledgerError(
      "LEDGER_CORRUPT",
      `Individual ledger record has inconsistent verificationStatus: ${entry.verificationStatus} vs ${entry.status}`,
      { fileSha }
    );
  }
  if (effectiveStatus === "not_run") {
    if (!entry.notRunReason || typeof entry.notRunReason !== "string") {
      throw ledgerError("LEDGER_CORRUPT", "Individual ledger record with status not_run requires notRunReason", { fileSha });
    }
  }
  if (effectiveStatus === "passed") {
    if (!entry.recordPath || typeof entry.recordPath !== "string") {
      throw ledgerError("LEDGER_CORRUPT", "Individual ledger record with status passed requires recordPath", { fileSha });
    }
    if (!entry.recordDigest || typeof entry.recordDigest !== "string") {
      throw ledgerError("LEDGER_CORRUPT", "Individual ledger record with status passed requires recordDigest", { fileSha });
    }
    if (!/^[a-f0-9]{64}$/i.test(entry.recordDigest)) {
      throw ledgerError("LEDGER_CORRUPT", "Individual ledger record has invalid recordDigest", { fileSha });
    }
    if (root && entry.recordPath) {
      try {
        const loaded = await loadEvidenceRecord({ repoRoot: root, recordPath: entry.recordPath });
        if (loaded.digest !== entry.recordDigest) {
          throw ledgerError(
            "LEDGER_CORRUPT",
            `Individual ledger record digest mismatch for ${fileSha || cleanSha}`,
            { fileSha, expectedDigest: entry.recordDigest, actualDigest: loaded.digest }
          );
        }
      } catch (err) {
        if (err.code === "LEDGER_CORRUPT") throw err;
        throw ledgerError(
          "LEDGER_CORRUPT",
          `Individual ledger record execution file unreadable for ${fileSha || cleanSha}: ${err.message}`,
          { fileSha, recordPath: entry.recordPath }
        );
      }
    }
  }
  return true;
}

export async function rebuildLedgerFromIndividualRecords({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
  try {
    return await rebuildLedgerFromIndividualRecordsUnlocked({ root });
  } finally {
    await releaseLedgerLock();
  }
}

async function rebuildLedgerFromIndividualRecordsUnlocked({ root }) {
  const ledgerDir = path.resolve(root, LEDGER_DIR);

  let files;
  try {
    files = await fs.readdir(ledgerDir);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw ledgerError("LEDGER_CORRUPT", "Cannot rebuild delivery ledger: ledger directory does not exist");
    }
    throw ledgerError("LEDGER_CORRUPT", `Cannot read individual ledger directory: ${err.message}`);
  }

  const jsonFiles = files.filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"));
  if (jsonFiles.length === 0) {
    throw ledgerError("LEDGER_CORRUPT", "Cannot rebuild delivery ledger: no individual records found");
  }

  const reconstructedMap = {};
  for (const file of jsonFiles) {
    const fileSha = path.basename(file, ".json");
    if (!/^[a-f0-9]{7,40}$/i.test(fileSha)) {
      throw ledgerError("LEDGER_CORRUPT", `Invalid individual ledger record filename: ${file}`, { fileSha });
    }
    let raw;
    try {
      raw = await fs.readFile(path.join(ledgerDir, file), "utf8");
    } catch (err) {
      throw ledgerError("LEDGER_CORRUPT", `Cannot read individual ledger record ${file}: ${err.message}`, { fileSha });
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw ledgerError("LEDGER_CORRUPT", `Individual ledger record ${file} has invalid JSON: ${err.message}`, { fileSha });
    }

    await validateCommitEvidenceEntryShape(parsed, root, fileSha);
    reconstructedMap[parsed.commitSha.toLowerCase()] = parsed;
  }

  await writeJsonAtomic(root, LEDGER_FILE, reconstructedMap);

  return Object.values(reconstructedMap).sort((left, right) =>
    String(left.recordedAt || "").localeCompare(String(right.recordedAt || ""))
  );
}

export async function listCommitEvidence({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);

  // Writers update the individual record and the consolidated document as a
  // single locked transaction.  Readers must take the same lock before
  // comparing both representations; otherwise they can observe the short
  // interval between those two atomic renames and report a false
  // LEDGER_INCONSISTENT result.
  const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
  try {
    return await listCommitEvidenceUnlocked({ root });
  } finally {
    await releaseLedgerLock();
  }
}

async function listCommitEvidenceUnlocked({ root }) {
  const ledgerPath = path.resolve(root, LEDGER_FILE);
  const ledgerDir = path.resolve(root, LEDGER_DIR);

  const readIndividualFiles = async () => {
    try {
      return (await fs.readdir(ledgerDir)).filter((f) => f.endsWith(".json") && !f.endsWith(".tmp"));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw ledgerError("LEDGER_CORRUPT", `Cannot read individual ledger directory: ${error.message}`);
    }
  };

  const rebuildIfSafe = async () => {
    const files = await readIndividualFiles();
    if (files.length === 0) {
      throw ledgerError("LEDGER_CORRUPT", "Delivery ledger has no valid consolidated or individual records");
    }
    return rebuildLedgerFromIndividualRecordsUnlocked({ root });
  };

  let rawLedger;
  try {
    rawLedger = await fs.readFile(ledgerPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      const individualFiles = await readIndividualFiles();
      if (individualFiles.length === 0) {
        return [];
      }
      return await rebuildLedgerFromIndividualRecordsUnlocked({ root });
    }
    throw ledgerError("LEDGER_CORRUPT", `Cannot read consolidated delivery ledger: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawLedger);
  } catch {
    return rebuildIfSafe();
  }

  if (!isJsonObject(parsed)) {
    return rebuildIfSafe();
  }

  const entries = Object.values(parsed);
  if (entries.length === 0) {
    const individualFiles = await readIndividualFiles();
    if (individualFiles.length === 0) {
      return [];
    }
    return await rebuildLedgerFromIndividualRecordsUnlocked({ root });
  }

  for (const [key, entry] of Object.entries(parsed)) {
    try {
      await validateCommitEvidenceEntryShape(entry, root, key);
    } catch {
      // A malformed consolidated file can be safely repaired only when every
      // individual source record validates below.
      return rebuildIfSafe();
    }
  }

  const individualFiles = await readIndividualFiles();
  if (individualFiles.length === 0) {
    throw ledgerError("LEDGER_INCONSISTENT", "Consolidated ledger exists without individual records");
  }

  const consolidatedKeys = new Set(Object.keys(parsed).map((key) => key.toLowerCase()));
  const individualKeys = new Set();
  for (const file of individualFiles) {
    const fileSha = path.basename(file, ".json").toLowerCase();
    if (!/^[a-f0-9]{7,40}$/.test(fileSha)) {
      throw ledgerError("LEDGER_CORRUPT", `Invalid individual ledger record filename: ${file}`, { fileSha });
    }
    individualKeys.add(fileSha);
    let individual;
    try {
      individual = JSON.parse(await fs.readFile(path.join(ledgerDir, file), "utf8"));
    } catch (error) {
      throw ledgerError("LEDGER_CORRUPT", `Cannot read individual ledger record ${file}: ${error.message}`, { fileSha });
    }
    await validateCommitEvidenceEntryShape(individual, root, fileSha);
    const consolidated = parsed[fileSha] || parsed[individual.commitSha];
    if (!consolidated) {
      throw ledgerError("LEDGER_INCONSISTENT", "Individual record is absent from consolidated ledger", { fileSha });
    }
    if (canonicalJson(consolidated) !== canonicalJson(individual)) {
      throw ledgerError("LEDGER_INCONSISTENT", "Consolidated and individual ledger records differ", { fileSha });
    }
  }
  for (const sha of consolidatedKeys) {
    if (!individualKeys.has(sha)) {
      throw ledgerError("LEDGER_INCONSISTENT", "Consolidated ledger record has no individual source", { fileSha: sha });
    }
  }

  return entries.sort((left, right) =>
    String(left.recordedAt || "").localeCompare(String(right.recordedAt || ""))
  );
}

export async function getLedgerState({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
  try {
    return await getLedgerStateUnlocked({ root });
  } finally {
    await releaseLedgerLock();
  }
}

async function getLedgerStateUnlocked({ root }) {
  const ledgerPath = path.resolve(root, LEDGER_FILE);
  const ledgerDir = path.resolve(root, LEDGER_DIR);

  let ledgerExists = false;
  let rawLedger = null;
  try {
    rawLedger = await fs.readFile(ledgerPath, "utf8");
    ledgerExists = true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      return { state: "LEDGER_CORRUPT", reason: "LEDGER_FILE_UNREADABLE", message: err.message };
    }
  }

  let individualFiles = [];
  try {
    individualFiles = (await fs.readdir(ledgerDir)).filter(
      (f) => f.endsWith(".json") && !f.endsWith(".tmp")
    );
  } catch {
    individualFiles = [];
  }

  if (!ledgerExists) {
    if (individualFiles.length === 0) {
      return { state: "LEDGER_NOT_INITIALIZED", reason: "ENOENT" };
    }
    return { state: "LEDGER_CORRUPT", reason: "CONSOLIDATED_FILE_MISSING_INDIVIDUALS_EXIST" };
  }

  let parsedLedger;
  try {
    parsedLedger = JSON.parse(rawLedger);
  } catch (err) {
    return { state: "LEDGER_CORRUPT", reason: "INVALID_JSON", message: err.message };
  }

  if (!isJsonObject(parsedLedger)) {
    return { state: "LEDGER_CORRUPT", reason: "NOT_AN_OBJECT" };
  }

  const consolidatedKeys = Object.keys(parsedLedger);
  if (consolidatedKeys.length === 0) {
    if (individualFiles.length === 0) {
      return { state: "EMPTY_LEDGER" };
    }
    return { state: "LEDGER_INCONSISTENT", reason: "CONSOLIDATED_EMPTY_INDIVIDUALS_EXIST" };
  }

  for (const [sha, entry] of Object.entries(parsedLedger)) {
    try {
      await validateCommitEvidenceEntryShape(entry, root, sha);
    } catch (err) {
      return { state: "LEDGER_CORRUPT", reason: "INVALID_ENTRY_SCHEMA", commitSha: sha, message: err.message };
    }
  }

  const individualShas = new Set(individualFiles.map((f) => path.basename(f, ".json").toLowerCase()));
  const consolidatedShas = new Set(consolidatedKeys.map((k) => k.toLowerCase()));

  for (const sha of consolidatedShas) {
    if (!individualShas.has(sha)) {
      return { state: "LEDGER_INCONSISTENT", reason: "MISSING_INDIVIDUAL_RECORD", commitSha: sha };
    }
  }
  for (const sha of individualShas) {
    if (!consolidatedShas.has(sha)) {
      return { state: "LEDGER_INCONSISTENT", reason: "UNCONSOLIDATED_INDIVIDUAL_RECORD", commitSha: sha };
    }
  }

  for (const file of individualFiles) {
    const fileSha = path.basename(file, ".json").toLowerCase();
    let rawInd;
    try {
      rawInd = await fs.readFile(path.join(ledgerDir, file), "utf8");
    } catch (err) {
      return { state: "LEDGER_CORRUPT", reason: "INDIVIDUAL_RECORD_UNREADABLE", commitSha: fileSha };
    }
    let parsedInd;
    try {
      parsedInd = JSON.parse(rawInd);
    } catch {
      return { state: "LEDGER_CORRUPT", reason: "INDIVIDUAL_RECORD_INVALID_JSON", commitSha: fileSha };
    }

    try {
      await validateCommitEvidenceEntryShape(parsedInd, root, fileSha);
    } catch (err) {
      return { state: "LEDGER_CORRUPT", reason: err.message, commitSha: fileSha };
    }

    const consolidatedEntry = parsedLedger[fileSha] || parsedLedger[parsedInd.commitSha];
    if (canonicalJson(consolidatedEntry) !== canonicalJson(parsedInd)) {
      return { state: "LEDGER_INCONSISTENT", reason: "ENTRY_MISMATCH", commitSha: fileSha };
    }
  }

  return { state: "VALID_LEDGER", entriesCount: consolidatedKeys.length };
}

export const inspectLedgerState = getLedgerState;

function resolveCommitIdentity(root, commitSha) {
  const parentsLine = execFileSync("git", ["rev-list", "--parents", "-n", "1", commitSha], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const [, ...parents] = parentsLine.split(/\s+/).filter(Boolean);
  const treeSha = execFileSync("git", ["rev-parse", `${commitSha}^{tree}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  return { parents, treeSha };
}

export async function queryCommitEvidence({ repoRoot, commitSha } = {}) {
  const root = findRepoRoot(repoRoot);
  let cleanSha;
  try {
    cleanSha = assertCommitSha(commitSha);
  } catch {
    return { valid: false, state: "missing", reason: "INVALID_COMMIT_SHA", entry: null, record: null };
  }

  let entry;
  try {
    entry = await getCommitEvidence({ repoRoot: root, commitSha: cleanSha });
  } catch (error) {
    return {
      valid: false,
      state: "corrupt",
      reason: error.code || "EVIDENCE_LEDGER_UNREADABLE",
      entry: null,
      record: null,
    };
  }
  if (!entry) {
    return { valid: false, state: "missing", reason: "MISSING_EVIDENCE_IN_LEDGER", entry: null, record: null };
  }
  if (entry.schemaVersion !== 2) {
    return { valid: false, state: "corrupt", reason: "STALE_EVIDENCE_FORMAT", entry, record: null };
  }

  let identity;
  try {
    identity = resolveCommitIdentity(root, cleanSha);
  } catch {
    return { valid: false, state: "corrupt", reason: "COMMIT_IDENTITY_UNAVAILABLE", entry, record: null };
  }

  const isNotRun = entry.status === "not_run" && entry.verificationStatus === "not_run";
  const declaresNotRun = entry.status === "not_run" || entry.verificationStatus === "not_run";
  if (declaresNotRun && !isNotRun) {
    return {
      valid: false,
      state: "corrupt",
      reason: "INCONSISTENT_NOT_RUN_STATUS",
      entry,
      record: null,
    };
  }

  if (isNotRun) {
    const hasNoReceiptFields =
      entry.snapshotHash === null &&
      entry.runKey === null &&
      entry.recordPath === null &&
      entry.recordDigest === null &&
      entry.gateId === null &&
      entry.policyHash === null;
    const hasValidManualRepairAuthorization =
      (entry.repairPushConsumed === false &&
        entry.repairPushConsumedAt === null &&
        entry.repairAuthState === "bound_to_commit") ||
      (entry.repairPushConsumed === true &&
        typeof entry.repairPushConsumedAt === "string" &&
        ["submitted", "ci_pending", "validated", "ci_failed"].includes(entry.repairAuthState));
    const isValidatedManualRepair =
      entry.manualRepairContextValidated === true &&
      entry.intent === "repair_ci" &&
      typeof entry.repairsSha === "string" &&
      /^[a-f0-9]{7,40}$/i.test(entry.repairsSha) &&
      Array.isArray(entry.supersedes) &&
      entry.supersedes.includes(entry.repairsSha) &&
      hasCanonicalFiles(entry.supersedes) &&
      ["unverified", "validated", "failed"].includes(entry.repairStatus) &&
      entry.repairAuthSha === cleanSha &&
      hasValidManualRepairAuthorization;
    const isOrdinaryNotRun =
      entry.manualRepairContextValidated !== true &&
      entry.intent === null &&
      entry.repairsSha === null &&
      Array.isArray(entry.supersedes) &&
      entry.supersedes.length === 0 &&
      entry.repairStatus === null &&
      entry.repairAuthState === null &&
      entry.repairAuthSha === null;
    if (
      entry.commitSha !== cleanSha ||
      !hasNoReceiptFields ||
      (!isValidatedManualRepair && !isOrdinaryNotRun) ||
      !hasCanonicalFiles(entry.stagedFiles) ||
      typeof entry.treeSha !== "string" ||
      !/^[a-f0-9]{40}$/i.test(entry.treeSha) ||
      (entry.parentSha !== null &&
        (typeof entry.parentSha !== "string" || !/^[a-f0-9]{40}$/i.test(entry.parentSha)))
    ) {
      return { valid: false, state: "corrupt", reason: "INVALID_NOT_RUN_SHAPE", entry, record: null };
    }
    if (identity.parents.length > 1) {
      return { valid: false, state: "corrupt", reason: "MERGE_COMMIT_NOT_PREPARED", entry, record: null };
    }
    if ((identity.parents[0] || null) !== (entry.parentSha || null)) {
      return { valid: false, state: "corrupt", reason: "EVIDENCE_PARENT_MISMATCH", entry, record: null };
    }
    if (identity.treeSha !== entry.treeSha) {
      return { valid: false, state: "corrupt", reason: "EVIDENCE_TREE_MISMATCH", entry, record: null };
    }
    return {
      valid: false,
      state: "not_run",
      reason: entry.notRunReason || "UNVERIFIED_COMMIT",
      entry,
      record: null,
    };
  }

  // Declared as passed or legacy entry with receipt
  if (identity.parents.length > 1) {
    return { valid: false, state: "corrupt", reason: "MERGE_COMMIT_NOT_PREPARED", entry, record: null };
  }
  if ((identity.parents[0] || null) !== (entry.parentSha || null)) {
    return { valid: false, state: "corrupt", reason: "EVIDENCE_PARENT_MISMATCH", entry, record: null };
  }
  if (identity.treeSha !== entry.treeSha) {
    return { valid: false, state: "corrupt", reason: "EVIDENCE_TREE_MISMATCH", entry, record: null };
  }
  if (!entry.recordPath) {
    return { valid: false, state: "corrupt", reason: "EVIDENCE_RECORD_MISSING", entry, record: null };
  }

  let loaded;
  try {
    loaded = await loadEvidenceRecord({ repoRoot: root, recordPath: entry.recordPath });
  } catch {
    return { valid: false, state: "corrupt", reason: "EVIDENCE_RECORD_INVALID", entry, record: null };
  }

  const { record, digest } = loaded;
  if (digest !== entry.recordDigest) {
    return { valid: false, state: "corrupt", reason: "EVIDENCE_RECORD_CHANGED", entry, record };
  }
  if (
    record.status !== "passed" ||
    record.snapshotHash !== entry.snapshotHash ||
    record.runKey !== entry.runKey ||
    record.gate?.id !== entry.gateId ||
    record.policy?.hash !== entry.policyHash
  ) {
    return { valid: false, state: "corrupt", reason: "EVIDENCE_RECORD_MISMATCH", entry, record };
  }

  return { valid: true, state: "verified", reason: null, entry, record };
}

export async function verifyCommitEvidence({ repoRoot, commitSha } = {}) {
  return queryCommitEvidence({ repoRoot, commitSha });
}

export async function hasCommitEvidence({ repoRoot, commitSha } = {}) {
  const evidence = await getCommitEvidence({ repoRoot, commitSha });
  return Boolean(evidence);
}
