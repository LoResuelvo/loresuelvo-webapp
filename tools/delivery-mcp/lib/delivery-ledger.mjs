import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";
import { validateExecutionResult } from "./validate-schema.mjs";
import { inspectCi } from "./ci-provider.mjs";
import { extractUsId } from "./git-snapshot.mjs";

export const LEDGER_DIR = ".delivery/runtime/ledger";
export const LEDGER_FILE = ".delivery/runtime/ledger.json";
export const LAST_PREPARED_FILE = ".delivery/runtime/last-prepared.json";
export const REPAIR_AUTH_DIR = ".delivery/runtime/repair-auth";
export const REPAIR_LOCKS_DIR = ".delivery/runtime/locks";
export const REPAIR_AUTH_STATES = Object.freeze([
  "prepared",
  "bound_to_commit",
  "submitted",
  "ci_pending",
  "validated",
  "ci_failed",
]);
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

function assertCommitSha(commitSha) {
  if (!commitSha || typeof commitSha !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitSha.trim())) {
    throw new Error(`Invalid commit SHA: ${commitSha}`);
  }
  return commitSha.trim().toLowerCase();
}

function evidenceReadError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isJsonObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function writeJsonAtomic(root, relativePath, value) {
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

export async function recordPreparedEvidence({
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

  if (isRepair && effectiveRepairsSha) {
    try {
      await saveRepairAuthorization({
        repoRoot: root,
        authorization: {
          targetSha: effectiveRepairsSha,
          state: "prepared",
          commitSha: null,
          snapshotHash: snapshot?.snapshotHash || null,
          intent,
          gateId: inspection?.gate?.id || null,
          policyHash: effectivePolicyHash,
          preparedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch {
      // Best-effort
    }
  }

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

function sortedUnique(values) {
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
    prepared.consumedByCommitSha
  ) {
    return { valid: false, reason: "STALE_PREPARED_EVIDENCE", prepared };
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

export async function recordCommitEvidence({
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
          intent: null,
          featureFile: null,
          scenarioName: null,
          scopeFiles: [],
          repairsSha: null,
          supersedes: [],
          repairStatus: null,
          repairedFailure: null,
          repairAuthState: null,
          repairAuthSha: null,
          repairPushConsumed: false,
          repairPushConsumedAt: null,
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
          recordedAt: new Date().toISOString(),
        }),
  };

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

  if (isRepair && effectiveRepairsSha && !isNotRun) {
    try {
      await saveRepairAuthorization({
        repoRoot: root,
        authorization: {
          targetSha: effectiveRepairsSha,
          commitSha: cleanSha,
          state: effectiveRepairAuthState || "bound_to_commit",
          snapshotHash: snapshotHash || null,
          intent,
          gateId,
          policyHash,
          boundAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch {
      // best-effort
    }
  }

  return entry;
}

export async function markRepairPushConsumed({ repoRoot, commitSha } = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);
  const entry = await getCommitEvidence({ repoRoot: root, commitSha: cleanSha });
  if (!entry) return null;
  entry.repairPushConsumed = true;
  entry.repairPushConsumedAt = new Date().toISOString();
  if (!entry.repairAuthState || entry.repairAuthState === "bound_to_commit" || entry.repairAuthState === "prepared") {
    entry.repairAuthState = "submitted";
  }
  entry.repairAuthSha = cleanSha;
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

  if (entry.repairsSha) {
    try {
      const existingAuth = await getRepairAuthorization({ repoRoot: root, targetSha: entry.repairsSha });
      await saveRepairAuthorization({
        repoRoot: root,
        authorization: {
          ...(existingAuth || {}),
          targetSha: entry.repairsSha.toLowerCase(),
          commitSha: cleanSha,
          state: entry.repairAuthState,
          attemptCount: (existingAuth?.attemptCount || 0) + 1,
          lastAttemptAt: entry.repairPushConsumedAt,
          updatedAt: entry.repairPushConsumedAt,
        },
      });
    } catch {
      // best-effort
    }
  }
  return entry;
}

export function isCommitInRemote(root, commitSha) {
  if (!commitSha || typeof commitSha !== "string") return false;
  let cleanSha;
  try {
    cleanSha = assertCommitSha(commitSha);
  } catch {
    return false;
  }
  try {
    const stdout = execFileSync("git", ["branch", "-r", "--contains", cleanSha], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return stdout.length > 0;
  } catch {
    return false;
  }
}

export async function acquireRepairLock({
  repoRoot,
  targetSha = null,
  repairSha = null,
  timeoutMs = 5000,
  retryIntervalMs = 25,
  staleLockMs = 30000,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const lockKey = targetSha
    ? assertCommitSha(targetSha)
    : (repairSha ? assertCommitSha(repairSha) : "repair-global");
  const lockDir = path.resolve(root, REPAIR_LOCKS_DIR);
  await fs.mkdir(lockDir, { recursive: true, mode: 0o700 });
  const lockPath = path.join(lockDir, `repair-${lockKey}.lock`);

  const startTime = Date.now();

  while (true) {
    let handle = null;
    try {
      handle = await fs.open(lockPath, "wx", 0o600);
      await handle.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }) + "\n");
      await handle.close();

      return async () => {
        try {
          await fs.unlink(lockPath);
        } catch (err) {
          if (err.code !== "ENOENT") throw err;
        }
      };
    } catch (err) {
      if (handle) {
        try { await handle.close(); } catch {}
      }
      if (err.code !== "EEXIST") throw err;

      try {
        const stat = await fs.stat(lockPath);
        if (Date.now() - stat.mtimeMs > staleLockMs) {
          try {
            await fs.unlink(lockPath);
            continue;
          } catch {
            // ignore
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

export async function getRepairAuthorization({ repoRoot, targetSha } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!targetSha) return null;
  const cleanTarget = assertCommitSha(targetSha);

  const authFile = path.resolve(root, REPAIR_AUTH_DIR, `${cleanTarget}.json`);
  try {
    const raw = await fs.readFile(authFile, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw error;
    }
  }

  // Fallback 1: inspect commit ledger
  const allEntries = await listCommitEvidence({ repoRoot: root });
  for (const entry of allEntries) {
    if (entry.repairsSha && entry.repairsSha.toLowerCase() === cleanTarget) {
      const state = entry.repairAuthState || (entry.repairPushConsumed ? "submitted" : "bound_to_commit");
      return {
        targetSha: cleanTarget,
        commitSha: entry.commitSha,
        state,
        snapshotHash: entry.snapshotHash || null,
        attemptCount: entry.repairPushConsumed ? 1 : 0,
        updatedAt: entry.repairPushConsumedAt || entry.recordedAt || new Date().toISOString(),
      };
    }
  }

  // Fallback 2: inspect LAST_PREPARED_FILE
  try {
    const prepared = await getLastPreparedEvidence({ repoRoot: root });
    if (prepared?.repairsSha && prepared.repairsSha.toLowerCase() === cleanTarget) {
      const commitSha = prepared.consumedByCommitSha || null;
      const state = prepared.repairAuthState || (commitSha ? "bound_to_commit" : "prepared");
      return {
        targetSha: cleanTarget,
        commitSha,
        state,
        snapshotHash: prepared.snapshotHash || null,
        attemptCount: 0,
        updatedAt: prepared.recordedAt || new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function saveRepairAuthorization({ repoRoot, authorization } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!authorization || !authorization.targetSha) {
    throw new Error("Invalid repair authorization: missing targetSha");
  }
  const cleanTarget = assertCommitSha(authorization.targetSha);
  const cleanCommit = authorization.commitSha ? assertCommitSha(authorization.commitSha) : null;
  const state = authorization.state || "prepared";
  if (!REPAIR_AUTH_STATES.includes(state)) {
    throw new Error(`Invalid repair authorization state: ${state}`);
  }

  // Enforce single-use commit binding: cannot overwrite an authorization bound to another commit
  const existing = await getRepairAuthorization({ repoRoot: root, targetSha: cleanTarget });
  if (existing?.commitSha && (!cleanCommit || existing.commitSha.toLowerCase() !== cleanCommit)) {
    const conflictError = new Error(
      `Repair authorization for commit ${cleanTarget.slice(0, 8)} is already bound to commit ${existing.commitSha.slice(0, 8)}`
    );
    conflictError.code = "REPAIR_RECEIPT_ALREADY_CONSUMED";
    conflictError.existing = existing;
    throw conflictError;
  }

  const record = {
    schemaVersion: 1,
    targetSha: cleanTarget,
    commitSha: cleanCommit,
    state,
    snapshotHash: authorization.snapshotHash || null,
    attemptCount: typeof authorization.attemptCount === "number" ? authorization.attemptCount : 0,
    lastAttemptAt: authorization.lastAttemptAt || null,
    updatedAt: new Date().toISOString(),
    ...(authorization.preparedAt ? { preparedAt: authorization.preparedAt } : {}),
    ...(authorization.boundAt ? { boundAt: authorization.boundAt } : {}),
  };

  const relativePath = path.join(REPAIR_AUTH_DIR, `${cleanTarget}.json`);
  await writeJsonAtomic(root, relativePath, record);
  return record;
}

export async function determineRepairCommitState({
  repoRoot,
  targetSha,
  commitSha,
  ciProvider = null,
  existingAuth = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanTarget = assertCommitSha(targetSha);
  const cleanCommit = assertCommitSha(commitSha);

  const inRemote = isCommitInRemote(root, cleanCommit);
  let ciStatus = null;
  let ciRecognized = false;

  try {
    const ci = await inspectCi({ sha: cleanCommit, repoRoot: root, provider: ciProvider });
    if (ci && ci.status !== "not_found" && ci.status !== "provider_error") {
      ciRecognized = true;
      ciStatus = ci.status;
    }
  } catch {
    // ignore
  }

  let derivedState = existingAuth?.state || "bound_to_commit";

  if (ciStatus === "passed") {
    derivedState = "validated";
  } else if (["failed", "cancelled", "timed_out"].includes(ciStatus)) {
    derivedState = "ci_failed";
  } else if (["queued", "in_progress"].includes(ciStatus)) {
    derivedState = "ci_pending";
  } else if (inRemote || ciRecognized) {
    derivedState = "submitted";
  } else if (existingAuth?.state === "submitted") {
    derivedState = "submitted";
  } else {
    derivedState = "bound_to_commit";
  }

  return {
    targetSha: cleanTarget,
    commitSha: cleanCommit,
    state: derivedState,
    inRemote,
    ciRecognized,
    ciStatus,
  };
}

export async function authorizeRepairPush({
  repoRoot,
  targetSha,
  commitSha,
  ciProvider = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanTarget = assertCommitSha(targetSha);
  const cleanCommit = assertCommitSha(commitSha);

  // 1. Get current authorization
  const auth = await getRepairAuthorization({ repoRoot: root, targetSha: cleanTarget });

  // 2. If already bound or consumed by another commit SHA, reject!
  if (auth?.commitSha && auth.commitSha.toLowerCase() !== cleanCommit) {
    return {
      authorized: false,
      reason: "REPAIR_RECEIPT_ALREADY_CONSUMED",
      message: `Pre-push blocked: repair authorization for commit ${cleanTarget.slice(0, 8)} has already been consumed for a push.`,
      authorization: auth,
    };
  }

  // Check snapshot hash consistency if available
  const commitEvidence = await getCommitEvidence({ repoRoot: root, commitSha: cleanCommit });
  if (auth?.snapshotHash && commitEvidence?.snapshotHash && auth.snapshotHash !== commitEvidence.snapshotHash) {
    return {
      authorized: false,
      reason: "REPAIR_AUTHORIZATION_MISMATCH",
      message: `Pre-push blocked: repair commit snapshot hash does not match authorized receipt for ${cleanTarget.slice(0, 8)}.`,
      authorization: auth,
    };
  }

  // 3. Determine current live state
  const live = await determineRepairCommitState({
    repoRoot: root,
    targetSha: cleanTarget,
    commitSha: cleanCommit,
    ciProvider,
    existingAuth: auth,
  });

  // 4. If CI for this commit has already failed:
  if (live.state === "ci_failed") {
    return {
      authorized: false,
      reason: "PRIOR_COMMIT_CI_FAILED",
      message: `Pre-push blocked: repair commit ${cleanCommit.slice(0, 8)} already failed CI in remote. A new repair cycle is required.`,
      authorization: live,
    };
  }

  // 5. Allowed states for this commit: "bound_to_commit", "submitted", "ci_pending", "validated"
  const allowed = ["bound_to_commit", "submitted", "ci_pending", "validated"];
  if (!allowed.includes(live.state) && auth?.state !== "prepared") {
    return {
      authorized: false,
      reason: "REPAIR_RECEIPT_ALREADY_CONSUMED",
      message: `Pre-push blocked: repair authorization for commit ${cleanTarget.slice(0, 8)} is in invalid state: ${live.state}.`,
      authorization: live,
    };
  }

  const nextState = (live.state === "ci_pending" || live.state === "validated")
    ? live.state
    : "submitted";

  const updatedAuth = {
    targetSha: cleanTarget,
    commitSha: cleanCommit,
    state: nextState,
    snapshotHash: auth?.snapshotHash || commitEvidence?.snapshotHash || null,
    attemptCount: (auth?.attemptCount || 0) + 1,
    lastAttemptAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preparedAt: auth?.preparedAt || null,
    boundAt: auth?.boundAt || null,
  };

  await saveRepairAuthorization({ repoRoot: root, authorization: updatedAuth });
  await markRepairPushConsumed({ repoRoot: root, commitSha: cleanCommit });

  return {
    authorized: true,
    state: nextState,
    authorization: updatedAuth,
  };
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
  let rawCommitEntry;
  try {
    rawCommitEntry = await fs.readFile(commitFilePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw evidenceReadError("COMMIT_EVIDENCE_FILE_UNREADABLE");
  }
  if (rawCommitEntry !== undefined) {
    try {
      const parsed = JSON.parse(rawCommitEntry);
      if (!isJsonObject(parsed)) throw evidenceReadError("INVALID_COMMIT_EVIDENCE_FILE");
      return parsed;
    } catch {
      throw evidenceReadError("INVALID_COMMIT_EVIDENCE_FILE");
    }
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
  if (!Object.hasOwn(parsedLedger, cleanSha)) return null;
  if (!isJsonObject(parsedLedger[cleanSha])) {
    throw evidenceReadError("INVALID_COMMIT_EVIDENCE_ENTRY");
  }
  return parsedLedger[cleanSha];
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
    if (root && entry.recordPath) {
      let raw;
      try {
        raw = await fs.readFile(path.resolve(root, entry.recordPath), "utf8");
        const digest = crypto.createHash("sha256").update(raw).digest("hex");
        if (digest !== entry.recordDigest) {
          throw ledgerError(
            "LEDGER_CORRUPT",
            `Individual ledger record digest mismatch for ${fileSha || cleanSha}`,
            { fileSha, expectedDigest: entry.recordDigest, actualDigest: digest }
          );
        }
      } catch (err) {
        if (err.code === "LEDGER_CORRUPT") throw err;
        if (err.code !== "ENOENT") {
          throw ledgerError(
            "LEDGER_CORRUPT",
            `Individual ledger record execution file unreadable for ${fileSha || cleanSha}: ${err.message}`,
            { fileSha, recordPath: entry.recordPath }
          );
        }
      }
    }
  }
  return true;
}

export async function rebuildLedgerFromIndividualRecords({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
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
  const ledgerPath = path.resolve(root, LEDGER_FILE);
  const ledgerDir = path.resolve(root, LEDGER_DIR);

  let rawLedger;
  try {
    rawLedger = await fs.readFile(ledgerPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      let individualFiles = [];
      try {
        individualFiles = (await fs.readdir(ledgerDir)).filter(
          (f) => f.endsWith(".json") && !f.endsWith(".tmp")
        );
      } catch {
        individualFiles = [];
      }
      if (individualFiles.length === 0) {
        return [];
      }
      return await rebuildLedgerFromIndividualRecords({ repoRoot: root });
    }
    return await rebuildLedgerFromIndividualRecords({ repoRoot: root });
  }

  let parsed;
  try {
    parsed = JSON.parse(rawLedger);
  } catch {
    return await rebuildLedgerFromIndividualRecords({ repoRoot: root });
  }

  if (!isJsonObject(parsed)) {
    return await rebuildLedgerFromIndividualRecords({ repoRoot: root });
  }

  const entries = Object.values(parsed);
  if (entries.length === 0) {
    let individualFiles = [];
    try {
      individualFiles = (await fs.readdir(ledgerDir)).filter(
        (f) => f.endsWith(".json") && !f.endsWith(".tmp")
      );
    } catch {
      individualFiles = [];
    }
    if (individualFiles.length === 0) {
      return [];
    }
    return await rebuildLedgerFromIndividualRecords({ repoRoot: root });
  }

  for (const entry of entries) {
    if (
      !isJsonObject(entry) ||
      entry.schemaVersion !== 2 ||
      !entry.commitSha ||
      (entry.status !== "passed" && entry.status !== "not_run") ||
      entry.verificationStatus !== entry.status
    ) {
      return await rebuildLedgerFromIndividualRecords({ repoRoot: root });
    }
  }

  return entries.sort((left, right) =>
    String(left.recordedAt || "").localeCompare(String(right.recordedAt || ""))
  );
}

export async function getLedgerState({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
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
    if (
      consolidatedEntry.status !== parsedInd.status ||
      consolidatedEntry.verificationStatus !== parsedInd.verificationStatus ||
      (consolidatedEntry.treeSha || null) !== (parsedInd.treeSha || null) ||
      (consolidatedEntry.parentSha || null) !== (parsedInd.parentSha || null) ||
      (consolidatedEntry.repairsSha || null) !== (parsedInd.repairsSha || null) ||
      (consolidatedEntry.repairStatus || null) !== (parsedInd.repairStatus || null)
    ) {
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
      entry.policyHash === null &&
      entry.intent === null;
    if (
      entry.commitSha !== cleanSha ||
      !hasNoReceiptFields ||
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

export async function updateCommitRepairStatus({
  repoRoot,
  commitSha,
  repairStatus,
  supersedes = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);
  const entry = await getCommitEvidence({ repoRoot: root, commitSha: cleanSha });
  if (!entry) return null;

  entry.repairStatus = repairStatus;
  if (repairStatus === "validated") {
    entry.repairAuthState = "validated";
  } else if (repairStatus === "failed") {
    entry.repairAuthState = "ci_failed";
  }
  if (Array.isArray(supersedes) && supersedes.length > 0) {
    entry.supersedes = sortedUnique([...(entry.supersedes || []), ...supersedes.map((s) => String(s).toLowerCase())]);
  }

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

    if (entry.repairsSha) {
      try {
        const auth = await getRepairAuthorization({ repoRoot: root, targetSha: entry.repairsSha });
        if (auth && auth.commitSha && auth.commitSha.toLowerCase() === cleanSha) {
          auth.state = entry.repairAuthState;
          auth.updatedAt = new Date().toISOString();
          await saveRepairAuthorization({ repoRoot: root, authorization: auth });
        }
      } catch {
        // Best-effort
      }
    }
  } catch {
    // Best-effort in constrained environments
  }
  return entry;
}

export function sortCommitsTopologically(root, shas) {
  if (!shas || shas.length <= 1) return shas ? [...shas] : [];
  try {
    const list = execFileSync("git", ["rev-list", "--topo-order", "--reverse", ...shas], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const shaSet = new Set(shas.map((s) => s.toLowerCase()));
    const result = [];
    for (const sha of list) {
      const lower = sha.toLowerCase();
      if (shaSet.has(lower) && !result.includes(lower)) {
        result.push(lower);
      }
    }
    for (const s of shas) {
      const lower = s.toLowerCase();
      if (!result.includes(lower)) result.push(lower);
    }
    return result;
  } catch {
    return [...shas];
  }
}

export async function validateRepairLineage({
  repoRoot,
  repairSha,
  targetSha = null,
  ciProvider = null,
  supersededSet = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanRepairSha = assertCommitSha(repairSha);

  // 1. Verify repair commit exists in git
  let repairInGit = false;
  try {
    execFileSync("git", ["rev-parse", `${cleanRepairSha}^{commit}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    repairInGit = true;
  } catch {
    repairInGit = false;
  }

  if (!repairInGit) {
    return {
      valid: false,
      reason: "REPAIR_COMMIT_NOT_FOUND",
      message: `Repair commit ${cleanRepairSha} does not exist in git.`,
      repairEntry: null,
      targetEntry: null,
      targetSha: null,
    };
  }

  // Load repair entry from ledger
  let repairEntry = null;
  try {
    repairEntry = await getCommitEvidence({ repoRoot: root, commitSha: cleanRepairSha });
  } catch {
    repairEntry = null;
  }

  // 2. Resolve target commit (repairsSha exists in git, ledger, or CI)
  const declaredRepairsSha = repairEntry?.repairsSha ? String(repairEntry.repairsSha).trim() : null;
  const expectedTargetSha = targetSha ? String(targetSha).trim() : null;

  if (!declaredRepairsSha && !expectedTargetSha) {
    return {
      valid: false,
      reason: "REPAIR_TARGET_NOT_FOUND",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} does not declare a target commit to repair.`,
      repairEntry,
      targetEntry: null,
      targetSha: null,
    };
  }

  if (expectedTargetSha && declaredRepairsSha) {
    const normDeclared = declaredRepairsSha.toLowerCase();
    const normExpected = expectedTargetSha.toLowerCase();
    if (normDeclared !== normExpected && !normExpected.startsWith(normDeclared) && !normDeclared.startsWith(normExpected)) {
      return {
        valid: false,
        reason: "REPAIR_TARGET_MISMATCH",
        message: `Repair commit ${cleanRepairSha.slice(0, 8)} declared repair for ${normDeclared.slice(0, 8)}, but target is ${normExpected.slice(0, 8)}.`,
        repairEntry,
        targetEntry: null,
        targetSha: expectedTargetSha,
      };
    }
  }

  const rawTargetSha = declaredRepairsSha || expectedTargetSha;
  let fullTargetSha = null;
  let targetInGit = false;
  try {
    fullTargetSha = execFileSync("git", ["rev-parse", `${rawTargetSha}^{commit}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .toLowerCase();
    targetInGit = true;
  } catch {
    const targetEvidence = await getCommitEvidence({ repoRoot: root, commitSha: rawTargetSha });
    if (targetEvidence) {
      fullTargetSha = targetEvidence.commitSha.toLowerCase();
    } else {
      try {
        const ci = await inspectCi({ sha: rawTargetSha, repoRoot: root, provider: ciProvider });
        if (ci && ci.status !== "provider_error" && ci.status !== "not_found") {
          fullTargetSha = rawTargetSha.toLowerCase();
        }
      } catch {
        // not found
      }
    }
  }

  if (!fullTargetSha) {
    return {
      valid: false,
      reason: "REPAIR_TARGET_NOT_FOUND",
      message: `Target commit ${rawTargetSha} was not found in git, ledger, or CI.`,
      repairEntry,
      targetEntry: null,
      targetSha: null,
    };
  }

  let targetEntry = null;
  try {
    targetEntry = await getCommitEvidence({ repoRoot: root, commitSha: fullTargetSha });
  } catch {
    // best-effort
  }

  // 3. Git descendant check
  let isAncestor = false;
  if (targetInGit) {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", fullTargetSha, cleanRepairSha], {
        cwd: root,
        stdio: ["ignore", "ignore", "ignore"],
      });
      isAncestor = fullTargetSha !== cleanRepairSha;
    } catch {
      isAncestor = false;
    }
  }

  if (!isAncestor) {
    return {
      valid: false,
      reason: "REPAIR_NOT_DESCENDANT",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} is not a git descendant of target commit ${fullTargetSha.slice(0, 8)}.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  // 4. Branch concordance
  const targetBranch = targetEntry?.branch ? String(targetEntry.branch).trim().toLowerCase() : null;
  const repairBranch = repairEntry?.branch ? String(repairEntry.branch).trim().toLowerCase() : null;
  if (targetBranch && repairBranch && targetBranch !== repairBranch) {
    return {
      valid: false,
      reason: "REPAIR_BRANCH_MISMATCH",
      message: `Repair commit registered on branch '${repairEntry.branch}', but target commit was on '${targetEntry.branch}'.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  // 5. US concordance
  function resolveUs(entry, sha) {
    if (entry?.usId) return String(entry.usId).trim().toLowerCase();
    try {
      const msg = execFileSync("git", ["log", "-1", "--format=%B", sha], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const parsed = extractUsId(msg);
      return parsed ? String(parsed).trim().toLowerCase() : null;
    } catch {
      return null;
    }
  }

  const targetUs = resolveUs(targetEntry, fullTargetSha);
  const repairUs = resolveUs(repairEntry, cleanRepairSha);
  if (targetUs && repairUs && targetUs !== repairUs) {
    return {
      valid: false,
      reason: "REPAIR_US_MISMATCH",
      message: `Repair commit US '${repairUs}' does not match target commit US '${targetUs}'.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  // 6. Gate R valid
  const hasGateR =
    repairEntry?.gateId === "R" &&
    (repairEntry?.status === "passed" || repairEntry?.verificationStatus === "passed");

  if (!hasGateR) {
    return {
      valid: false,
      reason: "REPAIR_GATE_INVALID",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} does not have an approved Gate R evidence.`,
      repairEntry: repairEntry || null,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  // 7. Absence of prior superseding repair
  if (supersededSet && supersededSet.has(fullTargetSha)) {
    return {
      valid: false,
      reason: "REPAIR_ALREADY_SUPERSEDED",
      message: `Target commit ${fullTargetSha.slice(0, 8)} has already been superseded by a prior repair.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  const allEvidence = await listCommitEvidence({ repoRoot: root });
  for (const entry of allEvidence) {
    if (entry.commitSha.toLowerCase() === cleanRepairSha) continue;
    const entrySupersedes = Array.isArray(entry.supersedes)
      ? entry.supersedes.map((s) => String(s).toLowerCase())
      : [];
    const declaresTarget = entry.repairsSha && entry.repairsSha.toLowerCase() === fullTargetSha;
    const supersedesTarget = entrySupersedes.includes(fullTargetSha);

    if (supersedesTarget || declaresTarget) {
      if (entry.repairStatus === "validated") {
        return {
          valid: false,
          reason: "REPAIR_ALREADY_SUPERSEDED",
          message: `Target commit ${fullTargetSha.slice(0, 8)} was already superseded by validated repair ${entry.commitSha.slice(0, 8)}.`,
          repairEntry,
          targetEntry,
          targetSha: fullTargetSha,
        };
      }
      try {
        const earlierCi = await inspectCi({ sha: entry.commitSha, repoRoot: root, provider: ciProvider });
        if (earlierCi && earlierCi.status === "passed") {
          return {
            valid: false,
            reason: "REPAIR_ALREADY_SUPERSEDED",
            message: `Target commit ${fullTargetSha.slice(0, 8)} was already superseded by green repair commit ${entry.commitSha.slice(0, 8)}.`,
            repairEntry,
            targetEntry,
            targetSha: fullTargetSha,
          };
        }
      } catch {
        // ignore
      }
    }
  }

  // 8. CI of target commit effectively failed
  let targetCi;
  try {
    targetCi = await inspectCi({ sha: fullTargetSha, repoRoot: root, provider: ciProvider });
    if (targetCi.status === "not_found" && rawTargetSha !== fullTargetSha) {
      targetCi = await inspectCi({ sha: rawTargetSha, repoRoot: root, provider: ciProvider });
    }
  } catch {
    return {
      valid: false,
      reason: "CI_INSPECTION_FAILED",
      message: `Could not inspect CI for target commit ${fullTargetSha.slice(0, 8)}.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  if (targetCi.status === "provider_error") {
    return {
      valid: false,
      reason: "CI_PROVIDER_ERROR",
      message: `CI provider returned an error inspecting target commit ${fullTargetSha.slice(0, 8)}.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  if (targetCi.status === "passed") {
    return {
      valid: false,
      reason: "REPAIR_TARGET_NOT_FAILED",
      message: `Target commit ${fullTargetSha.slice(0, 8)} passed CI (status: passed). Repair not needed.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  if (!["failed", "cancelled", "timed_out"].includes(targetCi.status)) {
    return {
      valid: false,
      reason: "REPAIR_TARGET_NOT_FAILED",
      message: `Target commit ${fullTargetSha.slice(0, 8)} is not in a failed state (status: ${targetCi.status}).`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  // 9. Snapshot / digest / policyHash verification
  let repairEvidence;
  try {
    repairEvidence = await queryCommitEvidence({ repoRoot: root, commitSha: cleanRepairSha });
  } catch (err) {
    return {
      valid: false,
      reason: "REPAIR_SNAPSHOT_MISMATCH",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} evidence is unreadable: ${err.message}`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  if (!repairEvidence?.valid || repairEvidence?.state !== "verified") {
    return {
      valid: false,
      reason: "REPAIR_SNAPSHOT_MISMATCH",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} evidence does not match its execution record, snapshot, or policy (${repairEvidence?.reason || "RECORD_INVALID"}).`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  return {
    valid: true,
    reason: null,
    message: null,
    repairEntry,
    targetEntry,
    targetSha: fullTargetSha,
  };
}

export const validateRepairCommit = validateRepairLineage;

export async function resolveRepairChain({
  repoRoot,
  commits = null,
  ciProvider = null,
} = {}) {
  const root = findRepoRoot(repoRoot);

  let candidateShas = [];
  if (Array.isArray(commits) && commits.length > 0) {
    candidateShas = commits
      .map((c) =>
        typeof c === "string"
          ? c.trim().toLowerCase()
          : c?.commitSha
          ? String(c.commitSha).trim().toLowerCase()
          : null
      )
      .filter(Boolean);
  } else {
    const allEvidence = await listCommitEvidence({ repoRoot: root });
    candidateShas = allEvidence.map((e) => e.commitSha.toLowerCase());
  }

  candidateShas = [...new Set(candidateShas)];

  const entriesBySha = new Map();
  for (const sha of candidateShas) {
    try {
      const entry = await getCommitEvidence({ repoRoot: root, commitSha: sha });
      if (entry) {
        entriesBySha.set(sha, entry);
      }
    } catch {
      // ignore
    }
  }

  const repairShas = [];
  for (const sha of candidateShas) {
    const entry = entriesBySha.get(sha);
    if (entry?.repairsSha) {
      repairShas.push(sha);
    }
  }

  const sortedRepairShas = sortCommitsTopologically(root, repairShas);

  const supersededFailures = new Set();
  const failedRepairs = [];
  const invalidRepairs = [];
  const validatedRepairs = [];
  const repairChainMap = new Map();

  for (const repairSha of sortedRepairShas) {
    const entry = entriesBySha.get(repairSha);
    const rawRepairsSha = String(entry.repairsSha).trim();

    const validation = await validateRepairLineage({
      repoRoot: root,
      repairSha,
      ciProvider,
      supersededSet: supersededFailures,
    });

    if (!validation.valid) {
      invalidRepairs.push({
        repairSha,
        repairsSha: rawRepairsSha,
        reason: validation.reason,
        message: validation.message,
      });
      continue;
    }

    const fullRepairsSha = validation.targetSha;

    // Inspect CI of the repair commit itself
    let repairCi;
    try {
      repairCi = await inspectCi({ sha: repairSha, repoRoot: root, provider: ciProvider });
    } catch {
      repairCi = { status: "provider_error" };
    }

    if (repairCi.status === "passed") {
      validatedRepairs.push(repairSha);

      const supersedesForThis = new Set([fullRepairsSha]);
      if (repairChainMap.has(fullRepairsSha)) {
        for (const s of repairChainMap.get(fullRepairsSha)) {
          supersedesForThis.add(s);
        }
      }
      if (Array.isArray(entry.supersedes)) {
        for (const s of entry.supersedes) {
          if (s && typeof s === "string") supersedesForThis.add(s.toLowerCase());
        }
      }

      repairChainMap.set(repairSha, supersedesForThis);
      for (const s of supersedesForThis) {
        supersededFailures.add(s);
      }

      await updateCommitRepairStatus({
        repoRoot: root,
        commitSha: repairSha,
        repairStatus: "validated",
        supersedes: [...supersedesForThis],
      });
    } else if (["failed", "cancelled", "timed_out"].includes(repairCi.status)) {
      failedRepairs.push(repairSha);

      const supersedesForThis = new Set([fullRepairsSha]);
      if (repairChainMap.has(fullRepairsSha)) {
        for (const s of repairChainMap.get(fullRepairsSha)) {
          supersedesForThis.add(s);
        }
      }
      repairChainMap.set(repairSha, supersedesForThis);

      await updateCommitRepairStatus({
        repoRoot: root,
        commitSha: repairSha,
        repairStatus: "failed",
      });
    }
  }

  return {
    supersededFailures: [...supersededFailures],
    failedRepairs: [...new Set(failedRepairs)],
    invalidRepairs,
    validatedRepairs: [...new Set(validatedRepairs)],
  };
}

export function matchesTarget(left, right) {
  if (!left || !right) return false;
  const l = String(left).trim().toLowerCase();
  const r = String(right).trim().toLowerCase();
  return l === r || l.startsWith(r) || r.startsWith(l);
}

export async function getActiveCiIncidents({
  repoRoot,
  ciProvider = null,
  excludeShas = [],
} = {}) {
  const root = findRepoRoot(repoRoot);
  const rawEntries = await listCommitEvidence({ repoRoot: root });
  const excludeSet = new Set(
    Array.from(excludeShas || []).map((s) => String(s).trim().toLowerCase())
  );
  const entries = (rawEntries || []).filter(
    (e) => !excludeSet.has(String(e.commitSha).trim().toLowerCase())
  );
  if (!entries || entries.length === 0) {
    const empty = [];
    empty.activeCiIncidents = empty;
    empty.allIncidents = [];
    return empty;
  }

  const repairResolution = await resolveRepairChain({ repoRoot: root, ciProvider });
  const supersededFailures = new Set(
    (repairResolution.supersededFailures || []).map((s) => s.toLowerCase())
  );

  // Mark historical failures in completed user stories whose close_us commit passed CI as superseded
  for (const entry of rawEntries || []) {
    if (entry.intent === "close_us" && entry.usId) {
      const closeSha = entry.commitSha.toLowerCase();
      let closeCi;
      try {
        closeCi = await inspectCi({ sha: closeSha, repoRoot: root, provider: ciProvider });
      } catch {
        closeCi = null;
      }
      if (closeCi?.status === "passed") {
        const usId = String(entry.usId).trim().toLowerCase();
        for (const candidate of rawEntries || []) {
          if (
            candidate.usId &&
            String(candidate.usId).trim().toLowerCase() === usId &&
            candidate.commitSha.toLowerCase() !== closeSha
          ) {
            const candSha = candidate.commitSha.toLowerCase();
            let isAnc = false;
            try {
              execFileSync("git", ["merge-base", "--is-ancestor", candSha, closeSha], {
                cwd: root,
                stdio: ["ignore", "ignore", "ignore"],
              });
              isAnc = true;
            } catch {
              isAnc = false;
            }
            if (isAnc) {
              supersededFailures.add(candSha);
            }
          }
        }
      }
    }
  }

  const repairsByTarget = new Map();
  for (const entry of entries) {
    if (entry.repairsSha) {
      const rawTarget = String(entry.repairsSha).trim().toLowerCase();
      if (!repairsByTarget.has(rawTarget)) {
        repairsByTarget.set(rawTarget, []);
      }
      repairsByTarget.get(rawTarget).push(entry);
    }
  }

  function findRepairsForSha(sha) {
    const matching = [];
    for (const [targetKey, list] of repairsByTarget.entries()) {
      if (matchesTarget(targetKey, sha)) {
        matching.push(...list);
      }
    }
    return matching;
  }

  const allIncidents = [];
  const activeCiIncidents = [];

  for (const entry of entries) {
    const sha = entry.commitSha.toLowerCase();
    const usId = entry.usId || null;
    const branch = entry.branch || null;

    let status = "pending";
    let repairSha = null;

    if (supersededFailures.has(sha)) {
      status = "superseded";
    } else {
      let ci;
      try {
        ci = await inspectCi({ sha, repoRoot: root, provider: ciProvider });
      } catch (err) {
        throw err;
      }

      if (ci.status === "passed") {
        status = "passed";
      } else if (ci.status === "provider_error") {
        status = "provider_error";
      } else if (["in_progress", "queued", "not_found"].includes(ci.status)) {
        status = "pending";
      } else if (["failed", "cancelled", "timed_out"].includes(ci.status)) {
        const repairs = findRepairsForSha(sha);
        if (repairs.length > 0) {
          const latestRepair = repairs[repairs.length - 1];
          const rSha = latestRepair.commitSha.toLowerCase();
          repairSha = rSha;

          let rCi;
          try {
            rCi = await inspectCi({ sha: rSha, repoRoot: root, provider: ciProvider });
          } catch (err) {
            throw err;
          }

          if (rCi.status === "passed") {
            status = supersededFailures.has(sha) ? "superseded" : "passed";
          } else if (["in_progress", "queued"].includes(rCi.status)) {
            status = "repair_submitted";
          } else if (["failed", "cancelled", "timed_out"].includes(rCi.status)) {
            status = "repair_failed";
          } else if (rCi.status === "provider_error") {
            status = "provider_error";
          } else {
            if (latestRepair.repairPushConsumed || isCommitInRemote(root, rSha)) {
              status = "repair_submitted";
            } else {
              status = "repair_prepared";
            }
          }
        } else {
          let auth = null;
          try {
            auth = await getRepairAuthorization({ repoRoot: root, targetSha: sha });
          } catch {
            auth = null;
          }
          let lastPrepared = null;
          try {
            lastPrepared = await getLastPreparedEvidence({ repoRoot: root });
          } catch {
            lastPrepared = null;
          }

          if (auth && (auth.state === "prepared" || auth.state === "bound_to_commit")) {
            status = "repair_prepared";
            repairSha = auth.commitSha || null;
          } else if (
            lastPrepared?.repairsSha &&
            matchesTarget(lastPrepared.repairsSha, sha) &&
            !lastPrepared.consumedByCommitSha
          ) {
            status = "repair_prepared";
            repairSha = null;
          } else {
            status = "repair_required";
            repairSha = null;
          }
        }
      }
    }

    const incidentRecord = {
      failedSha: sha,
      usId,
      branch,
      status,
      repairSha,
    };

    allIncidents.push(incidentRecord);

    if (["repair_required", "repair_failed", "repair_prepared", "repair_submitted"].includes(status)) {
      activeCiIncidents.push(incidentRecord);
    }
  }

  try {
    await writeJsonAtomic(root, ".delivery/runtime/active-incidents.json", {
      updatedAt: new Date().toISOString(),
      activeCiIncidents,
    });
  } catch {
    // best-effort
  }

  activeCiIncidents.activeCiIncidents = activeCiIncidents;
  activeCiIncidents.allIncidents = allIncidents;
  return activeCiIncidents;
}

