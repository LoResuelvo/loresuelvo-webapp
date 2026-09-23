import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findRepoRoot } from "./repo-root.mjs";
import { inspectCi } from "./ci-provider.mjs";
import {
  LEDGER_DIR, LEDGER_FILE, LAST_PREPARED_FILE, ledgerError,
  assertCommitSha, isJsonObject, canonicalJson, writeJsonAtomic, sortedUnique,
  acquireRepairLock, acquireLedgerLock, getLastPreparedEvidence,
  getCommitEvidence, listCommitEvidence, queryCommitEvidence,
} from "./ledger-evidence.mjs";

// Owns repair-auth and repair-audit records. Target repair locks are acquired
// here; ledger-evidence owns their inode-safe implementation and ledger lock.
export const REPAIR_AUTH_DIR = ".delivery/runtime/repair-auth";
export const REPAIR_AUDIT_DIR = ".delivery/runtime/repair-audit";
export const REPAIR_AUTH_STATES = Object.freeze([
  "prepared",
  "bound_to_commit",
  "submitted",
  "ci_pending",
  "validated",
  "ci_failed",
  "abandoned",
]);

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

// Cross-domain coordination stays here until callers import the owners directly:
// evidence is durable before best-effort repair authorization is persisted.
export async function markRepairPushConsumed({ repoRoot, commitSha, lockHeld = false } = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);
  let entry;
  const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
  try {
    // Re-read while holding the lock; otherwise a concurrent repair-status
    // transition could be silently discarded by this update.
    entry = await getCommitEvidence({ repoRoot: root, commitSha: cleanSha });
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
  } finally {
    await releaseLedgerLock();
  }

  if (entry.repairsSha) {
    try {
      const existingAuth = await getRepairAuthorization({ repoRoot: root, targetSha: entry.repairsSha });
      const authorization = {
        ...(existingAuth || {}),
        targetSha: entry.repairsSha.toLowerCase(),
        commitSha: cleanSha,
        state: entry.repairAuthState,
        attemptCount: (existingAuth?.attemptCount || 0) + 1,
        lastAttemptAt: entry.repairPushConsumedAt,
        updatedAt: entry.repairPushConsumedAt,
      };
      if (lockHeld) {
        const cleanTarget = assertCommitSha(authorization.targetSha);
        const cleanCommit = assertCommitSha(authorization.commitSha);
        await saveRepairAuthorizationLocked({
          root,
          authorization,
          cleanTarget,
          cleanCommit,
          state: authorization.state,
        });
      } else {
        await saveRepairAuthorization({ repoRoot: root, authorization });
      }
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

function resolveFullCommit(root, commitSha) {
  try {
    return execFileSync("git", ["rev-parse", `${commitSha}^{commit}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().toLowerCase();
  } catch {
    return null;
  }
}

function inspectCommitReachability(root, commitSha) {
  let refs;
  try {
    refs = execFileSync(
      "git",
      ["for-each-ref", "--contains", commitSha, "--format=%(refname)"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    )
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  } catch {
    return { known: false, refs: [], headReachable: false };
  }

  let headReachable = false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commitSha, "HEAD"], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    headReachable = true;
  } catch (error) {
    // Exit code 1 means the commit is not an ancestor. Other failures mean
    // Git could not prove the negative and must remain fail-closed.
    if (error?.status !== 1) {
      return { known: false, refs: [], headReachable: false };
    }
  }

  return { known: true, refs, headReachable };
}

async function readRepairAuditRecord({ repoRoot, repairSha } = {}) {
  const root = findRepoRoot(repoRoot);
  const auditPath = path.resolve(root, REPAIR_AUDIT_DIR, `${repairSha}.json`);
  try {
    const raw = await fs.readFile(auditPath, "utf8");
    const parsed = JSON.parse(raw);
    return { path: path.join(REPAIR_AUDIT_DIR, `${repairSha}.json`), record: parsed };
  } catch (error) {
    if (error.code === "ENOENT") return { path: path.join(REPAIR_AUDIT_DIR, `${repairSha}.json`), record: null };
    throw ledgerError("REPAIR_AUDIT_CORRUPT", `Repair audit record is unreadable for ${repairSha.slice(0, 8)}.`);
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
    if (
      prepared?.repairsSha &&
      prepared.repairsSha.toLowerCase() === cleanTarget &&
      prepared.repairStatus !== "abandoned"
    ) {
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

  // Serialize the read/validate/write sequence. Without this CAS-equivalent,
  // two concurrent repair SHAs can both observe an unbound authorization and
  // the last writer silently wins.
  const releaseLock = await acquireRepairLock({ repoRoot: root, targetSha: cleanTarget });
  try {
    return await saveRepairAuthorizationLocked({
      root,
      authorization,
      cleanTarget,
      cleanCommit,
      state,
    });
  } finally {
    await releaseLock();
  }
}

async function saveRepairAuthorizationLocked({ root, authorization, cleanTarget, cleanCommit, state }) {

  // Enforce single-use commit binding: cannot overwrite an authorization bound to another commit
  const existing = await getRepairAuthorization({ repoRoot: root, targetSha: cleanTarget });
  const existingIsAbandoned = existing?.state === "abandoned";
  let abandonedLedgerEntry = null;
  if (existingIsAbandoned) {
    try {
      abandonedLedgerEntry = await getCommitEvidence({
        repoRoot: root,
        commitSha: existing.commitSha,
      });
    } catch {
      abandonedLedgerEntry = null;
    }
  }
  const canReplaceAbandoned =
    existingIsAbandoned && abandonedLedgerEntry?.repairStatus === "abandoned";
  if (
    existing?.commitSha &&
    (!cleanCommit || existing.commitSha.toLowerCase() !== cleanCommit) &&
    !canReplaceAbandoned
  ) {
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

function recoveryFailure(reason, message, details = {}) {
  return {
    abandoned: false,
    status: "blocked",
    reason,
    message,
    ...details,
  };
}

function fullShaFromEntry(value) {
  if (!value || typeof value !== "string" || !/^[a-f0-9]{7,40}$/i.test(value.trim())) {
    return null;
  }
  return value.trim().toLowerCase();
}

function isDescendant(root, ancestorSha, descendantSha) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestorSha, descendantSha], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch (error) {
    if (error?.status === 1) return false;
    return null;
  }
}

function hashLedgerEntry(entry) {
  return crypto.createHash("sha256").update(canonicalJson(entry)).digest("hex");
}

/**
 * Abandons exactly one local Gate R attempt whose lineage context is invalid.
 * The commit evidence remains as a tombstone, while the repair authorization
 * is moved to an explicit terminal state so a fresh Gate R can bind safely.
 */
export async function abandonRepairAttempt({
  repoRoot,
  repairSha,
  targetSha,
  reason = "",
  ciProvider = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  let cleanRepairSha;
  let cleanTargetSha;
  try {
    cleanRepairSha = assertFullCommitSha(repairSha, "repairSha");
    cleanTargetSha = assertFullCommitSha(targetSha, "targetSha");
  } catch (error) {
    return recoveryFailure(error.code || "INVALID_REPAIR_SHA", error.message);
  }

  const normalizedReason = typeof reason === "string" ? reason.trim() : "";
  if (normalizedReason.length < 12 || normalizedReason.length > 500) {
    return recoveryFailure(
      "INVALID_RECOVERY_REASON",
      "reason must contain between 12 and 500 characters"
    );
  }
  if (cleanRepairSha === cleanTargetSha) {
    return recoveryFailure(
      "REPAIR_TARGET_MISMATCH",
      "repairSha and targetSha must identify different commits"
    );
  }

  const targetCommit = resolveFullCommit(root, cleanTargetSha);
  const repairCommit = resolveFullCommit(root, cleanRepairSha);
  if (!targetCommit) {
    return recoveryFailure(
      "REPAIR_TARGET_NOT_FOUND",
      `Target commit ${cleanTargetSha.slice(0, 8)} was not found in git.`
    );
  }
  if (!repairCommit) {
    return recoveryFailure(
      "REPAIR_COMMIT_NOT_FOUND",
      `Repair commit ${cleanRepairSha.slice(0, 8)} was not found in git.`
    );
  }
  if (targetCommit !== cleanTargetSha || repairCommit !== cleanRepairSha) {
    return recoveryFailure(
      "REPAIR_SHA_RESOLUTION_MISMATCH",
      "repairSha and targetSha must resolve to the supplied full commit SHAs"
    );
  }

  let repairEntry;
  let targetEntry;
  let existingAuthorization;
  let existingAudit;
  let lastPrepared;
  try {
    repairEntry = await getCommitEvidence({ repoRoot: root, commitSha: cleanRepairSha });
    targetEntry = await getCommitEvidence({ repoRoot: root, commitSha: cleanTargetSha });
    existingAuthorization = await getRepairAuthorization({
      repoRoot: root,
      targetSha: cleanTargetSha,
    });
    existingAudit = await readRepairAuditRecord({
      repoRoot: root,
      repairSha: cleanRepairSha,
    });
    lastPrepared = await getLastPreparedEvidence({ repoRoot: root });
  } catch (error) {
    return recoveryFailure(
      error.code || "LEDGER_UNAVAILABLE",
      `Delivery recovery could not validate its records: ${String(error.message || "unknown error").split("\n")[0]}`
    );
  }

  if (existingAudit.record) {
    return recoveryFailure(
      existingAudit.record.status === "abandoned"
        ? "REPAIR_ATTEMPT_ALREADY_ABANDONED"
        : "REPAIR_AUDIT_EXISTS",
      `A recovery audit already exists for repair commit ${cleanRepairSha.slice(0, 8)}.`
    );
  }
  if (!repairEntry) {
    return recoveryFailure(
      "REPAIR_EVIDENCE_NOT_FOUND",
      `Repair commit ${cleanRepairSha.slice(0, 8)} has no delivery evidence.`
    );
  }
  if (
    repairEntry.repairStatus === "abandoned" ||
    repairEntry.repairAuthState === "abandoned"
  ) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_ALREADY_ABANDONED",
      `Repair commit ${cleanRepairSha.slice(0, 8)} was already abandoned.`
    );
  }

  const declaredTarget = fullShaFromEntry(repairEntry.repairsSha);
  const declaredTargetFull = declaredTarget ? resolveFullCommit(root, declaredTarget) : null;
  if (!declaredTargetFull || declaredTargetFull !== cleanTargetSha) {
    return recoveryFailure(
      "REPAIR_TARGET_MISMATCH",
      `Repair commit ${cleanRepairSha.slice(0, 8)} does not declare target ${cleanTargetSha.slice(0, 8)}.`
    );
  }
  if (!targetEntry) {
    return recoveryFailure(
      "REPAIR_TARGET_EVIDENCE_NOT_FOUND",
      `Target commit ${cleanTargetSha.slice(0, 8)} has no delivery evidence.`
    );
  }
  if (
    repairEntry.commitSha?.toLowerCase() !== cleanRepairSha ||
    repairEntry.intent !== "repair_ci" ||
    repairEntry.gateId !== "R" ||
    repairEntry.status !== "passed" ||
    repairEntry.verificationStatus !== "passed"
  ) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_NOT_ELIGIBLE",
      `Repair commit ${cleanRepairSha.slice(0, 8)} is not an unverified Gate R attempt.`
    );
  }
  if (repairEntry.repairStatus !== "unverified") {
    return recoveryFailure(
      "REPAIR_ATTEMPT_NOT_ELIGIBLE",
      `Repair commit ${cleanRepairSha.slice(0, 8)} is already in terminal repair state '${repairEntry.repairStatus}'.`
    );
  }
  if (
    repairEntry.repairAuthState !== "bound_to_commit" ||
    repairEntry.repairAuthSha?.toLowerCase() !== cleanRepairSha
  ) {
    return recoveryFailure(
      "REPAIR_AUTHORIZATION_MISMATCH",
      `Repair authorization is not bound exactly to commit ${cleanRepairSha.slice(0, 8)}.`
    );
  }
  if (
    repairEntry.repairPushConsumed === true ||
    repairEntry.repairPushConsumedAt !== null
  ) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_PUSHED",
      `Repair commit ${cleanRepairSha.slice(0, 8)} already consumed a push authorization.`
    );
  }
  if (
    existingAuthorization?.commitSha &&
    existingAuthorization.commitSha.toLowerCase() !== cleanRepairSha
  ) {
    return recoveryFailure(
      "REPAIR_AUTHORIZATION_MISMATCH",
      `Repair authorization is bound to another commit for target ${cleanTargetSha.slice(0, 8)}.`
    );
  }
  if (
    existingAuthorization?.state &&
    !["prepared", "bound_to_commit"].includes(existingAuthorization.state)
  ) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_NOT_ELIGIBLE",
      `Repair authorization is in terminal state '${existingAuthorization.state}'.`
    );
  }

  const descendant = isDescendant(root, cleanTargetSha, cleanRepairSha);
  if (descendant === null) {
    return recoveryFailure(
      "REPAIR_REACHABILITY_UNKNOWN",
      "Git could not prove the repair commit's ancestry safely."
    );
  }
  if (!descendant) {
    return recoveryFailure(
      "REPAIR_NOT_DESCENDANT",
      `Repair commit ${cleanRepairSha.slice(0, 8)} is not a descendant of target ${cleanTargetSha.slice(0, 8)}.`
    );
  }

  let reachability = inspectCommitReachability(root, cleanRepairSha);
  if (!reachability.known) {
    return recoveryFailure(
      "REPAIR_REACHABILITY_UNKNOWN",
      `Git could not determine whether repair commit ${cleanRepairSha.slice(0, 8)} is reachable.`
    );
  }
  const remoteRefs = reachability.refs.filter((ref) => ref.startsWith("refs/remotes/"));
  if (remoteRefs.length > 0) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_PUSHED",
      `Repair commit ${cleanRepairSha.slice(0, 8)} is reachable from a remote ref.`
    );
  }

  let currentHead;
  try {
    currentHead = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().toLowerCase();
  } catch {
    return recoveryFailure("REPAIR_REACHABILITY_UNKNOWN", "Could not resolve current HEAD safely.");
  }
  if (currentHead === cleanRepairSha) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_CURRENT",
      `Repair commit ${cleanRepairSha.slice(0, 8)} is the current HEAD and cannot be abandoned.`
    );
  }

  if (reachability.headReachable || reachability.refs.length > 0) {
    return recoveryFailure(
      "REPAIR_ATTEMPT_REACHABLE",
      `Repair commit ${cleanRepairSha.slice(0, 8)} is still reachable from a local ref.`
    );
  }

  let lineage;
  try {
    lineage = await validateRepairLineage({
      repoRoot: root,
      repairSha: cleanRepairSha,
      targetSha: cleanTargetSha,
      ciProvider,
    });
  } catch (error) {
    return recoveryFailure(
      error.code || "REPAIR_LINEAGE_UNAVAILABLE",
      `Repair lineage could not be validated: ${String(error.message || "unknown error").split("\n")[0]}`
    );
  }
  if (lineage.valid) {
    return recoveryFailure(
      "REPAIR_CONTEXT_VALID",
      `Repair commit ${cleanRepairSha.slice(0, 8)} has valid lineage context and cannot be abandoned.`
    );
  }
  if (lineage.reason !== "REPAIR_CONTEXT_UNKNOWN") {
    return recoveryFailure(
      lineage.reason || "REPAIR_LINEAGE_INVALID",
      lineage.message || `Repair commit ${cleanRepairSha.slice(0, 8)} is not eligible for recovery.`
    );
  }

  const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
  let pendingAudit = null;
  try {
    const currentEntry = await getCommitEvidence({
      repoRoot: root,
      commitSha: cleanRepairSha,
    });
    if (!currentEntry || canonicalJson(currentEntry) !== canonicalJson(repairEntry)) {
      return recoveryFailure(
        "REPAIR_ATTEMPT_CHANGED",
        `Repair evidence for ${cleanRepairSha.slice(0, 8)} changed while recovery was validating it.`
      );
    }

    reachability = inspectCommitReachability(root, cleanRepairSha);
    if (!reachability.known) {
      return recoveryFailure(
        "REPAIR_REACHABILITY_UNKNOWN",
        `Git could not determine whether repair commit ${cleanRepairSha.slice(0, 8)} is reachable.`
      );
    }
    if (reachability.refs.some((ref) => ref.startsWith("refs/remotes/"))) {
      return recoveryFailure(
        "REPAIR_ATTEMPT_PUSHED",
        `Repair commit ${cleanRepairSha.slice(0, 8)} became reachable from a remote ref.`
      );
    }
    if (reachability.headReachable || reachability.refs.length > 0) {
      return recoveryFailure(
        currentHead === cleanRepairSha ? "REPAIR_ATTEMPT_CURRENT" : "REPAIR_ATTEMPT_REACHABLE",
        `Repair commit ${cleanRepairSha.slice(0, 8)} is reachable from a local ref.`
      );
    }

    const audit = await readRepairAuditRecord({
      repoRoot: root,
      repairSha: cleanRepairSha,
    });
    if (audit.record) {
      return recoveryFailure(
        audit.record.status === "abandoned"
          ? "REPAIR_ATTEMPT_ALREADY_ABANDONED"
          : "REPAIR_AUDIT_EXISTS",
        `A recovery audit already exists for repair commit ${cleanRepairSha.slice(0, 8)}.`
      );
    }

    let ledgerMap;
    try {
      ledgerMap = JSON.parse(await fs.readFile(path.resolve(root, LEDGER_FILE), "utf8"));
    } catch (error) {
      return recoveryFailure(
        "LEDGER_CORRUPT",
        `Delivery ledger could not be updated safely: ${String(error.message || "unknown error").split("\n")[0]}`
      );
    }
    if (!isJsonObject(ledgerMap) || !isJsonObject(ledgerMap[cleanRepairSha])) {
      return recoveryFailure(
        "LEDGER_INCONSISTENT",
        `Delivery ledger has no consolidated entry for repair commit ${cleanRepairSha.slice(0, 8)}.`
      );
    }

    const abandonedAt = new Date().toISOString();
    const entryBeforeHash = hashLedgerEntry(currentEntry);
    pendingAudit = {
      schemaVersion: 1,
      action: "abandon_repair",
      status: "pending",
      repairSha: cleanRepairSha,
      targetSha: cleanTargetSha,
      reason: normalizedReason,
      lineageReason: lineage.reason,
      entryBeforeHash,
      currentHeadSha: currentHead,
      createdAt: abandonedAt,
    };
    const auditRelativePath = path.join(REPAIR_AUDIT_DIR, `${cleanRepairSha}.json`);
    await writeJsonAtomic(root, auditRelativePath, pendingAudit);

    const abandonedEntry = {
      ...currentEntry,
      repairStatus: "abandoned",
      repairAuthState: "abandoned",
      repairAuthSha: null,
      repairPushConsumed: false,
      repairPushConsumedAt: null,
      abandonedAt,
      abandonmentReason: normalizedReason,
    };
    await writeJsonAtomic(root, path.join(LEDGER_DIR, `${cleanRepairSha}.json`), abandonedEntry);
    ledgerMap[cleanRepairSha] = abandonedEntry;
    await writeJsonAtomic(root, LEDGER_FILE, ledgerMap);

    await writeJsonAtomic(root, path.join(REPAIR_AUTH_DIR, `${cleanTargetSha}.json`), {
      schemaVersion: 1,
      targetSha: cleanTargetSha,
      commitSha: cleanRepairSha,
      state: "abandoned",
      snapshotHash: currentEntry.snapshotHash || existingAuthorization?.snapshotHash || null,
      attemptCount: existingAuthorization?.attemptCount || 0,
      lastAttemptAt: existingAuthorization?.lastAttemptAt || null,
      updatedAt: abandonedAt,
      ...(existingAuthorization?.preparedAt ? { preparedAt: existingAuthorization.preparedAt } : {}),
      ...(existingAuthorization?.boundAt ? { boundAt: existingAuthorization.boundAt } : {}),
      abandonedAt,
    });

    if (
      lastPrepared?.repairsSha &&
      matchesTarget(lastPrepared.repairsSha, cleanTargetSha) &&
      (!lastPrepared.consumedByCommitSha ||
        lastPrepared.consumedByCommitSha.toLowerCase() === cleanRepairSha)
    ) {
      await writeJsonAtomic(root, LAST_PREPARED_FILE, {
        ...lastPrepared,
        repairStatus: "abandoned",
        repairAuthState: "abandoned",
        abandonedAt,
        abandonmentReason: normalizedReason,
      });
    }

    const completedAudit = {
      ...pendingAudit,
      status: "abandoned",
      completedAt: new Date().toISOString(),
      entryAfterHash: hashLedgerEntry(abandonedEntry),
      auditPath: auditRelativePath,
    };
    await writeJsonAtomic(root, auditRelativePath, completedAudit);

    return {
      abandoned: true,
      status: "abandoned",
      reason: "REPAIR_ATTEMPT_ABANDONED",
      repairSha: cleanRepairSha,
      targetSha: cleanTargetSha,
      auditPath: auditRelativePath,
      previousStatus: currentEntry.repairStatus,
      lineageReason: lineage.reason,
    };
  } catch (error) {
    if (pendingAudit) {
      try {
        await writeJsonAtomic(root, path.join(REPAIR_AUDIT_DIR, `${cleanRepairSha}.json`), {
          ...pendingAudit,
          status: "incomplete",
          failedAt: new Date().toISOString(),
          failureCode: error.code || "REPAIR_RECOVERY_WRITE_FAILED",
        });
      } catch {
        // Preserve the original failure without masking it with audit I/O.
      }
    }
    return recoveryFailure(
      error.code || "REPAIR_RECOVERY_WRITE_FAILED",
      `Repair recovery could not be completed safely: ${String(error.message || "unknown error").split("\n")[0]}`
    );
  } finally {
    await releaseLedgerLock();
  }
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
  lockHeld = false,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanTarget = assertCommitSha(targetSha);
  const cleanCommit = assertCommitSha(commitSha);

  if (!lockHeld) {
    const release = await acquireRepairLock({ repoRoot: root, targetSha: cleanTarget });
    try {
      return await authorizeRepairPush({ repoRoot: root, targetSha: cleanTarget, commitSha: cleanCommit,
        ciProvider, lockHeld: true });
    } finally {
      await release();
    }
  }

  // 1. Get current authorization
  const auth = await getRepairAuthorization({ repoRoot: root, targetSha: cleanTarget });

  if (auth?.state === "abandoned") {
    return {
      authorized: false,
      reason: "REPAIR_ATTEMPT_ABANDONED",
      message: `Pre-push blocked: repair attempt for commit ${cleanTarget.slice(0, 8)} was explicitly abandoned and cannot be reused.`,
      authorization: auth,
    };
  }

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
  if (!auth || commitEvidence?.repairPushConsumed) {
    return {
      authorized: false,
      reason: !auth ? "REPAIR_AUTHORIZATION_MISSING" : "REPAIR_RECEIPT_ALREADY_CONSUMED",
      message: "Repair authorization is missing or has already been consumed by a local push attempt.",
      authorization: auth,
    };
  }
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

  if (lockHeld) {
    await saveRepairAuthorizationLocked({
      root,
      authorization: updatedAuth,
      cleanTarget,
      cleanCommit,
      state: nextState,
    });
  } else {
    await saveRepairAuthorization({ repoRoot: root, authorization: updatedAuth });
  }
  await markRepairPushConsumed({ repoRoot: root, commitSha: cleanCommit, lockHeld });

  return {
    authorized: true,
    state: nextState,
    authorization: updatedAuth,
  };
}


export async function updateCommitRepairStatus({
  repoRoot,
  commitSha,
  repairStatus,
  supersedes = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);
  let entry = null;
  try {
    const releaseLedgerLock = await acquireLedgerLock({ repoRoot: root });
    try {
      // Read under the same lock as the merge/write to preserve concurrent
      // repair transitions.
      entry = await getCommitEvidence({ repoRoot: root, commitSha: cleanSha });
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

    if (entry?.repairsSha) {
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
  } catch (error) {
    if (
      error?.code === "LEDGER_CORRUPT" ||
      error?.code === "LEDGER_INCONSISTENT" ||
      error?.message?.includes("LEDGER_CORRUPT") ||
      error?.message?.includes("LEDGER_INCONSISTENT")
    ) {
      throw error;
    }
    repairEntry = null;
  }

  if (repairEntry?.repairStatus === "abandoned" || repairEntry?.repairAuthState === "abandoned") {
    return {
      valid: false,
      reason: "REPAIR_ATTEMPT_ABANDONED",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} was explicitly abandoned and cannot resolve a CI incident.`,
      repairEntry,
      targetEntry: null,
      targetSha: targetSha || repairEntry.repairsSha || null,
    };
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

  // 4. Gate R valid
  const hasGateR =
    repairEntry?.gateId === "R" &&
    (repairEntry?.status === "passed" || repairEntry?.verificationStatus === "passed");
  const hasValidatedManualContext =
    repairEntry?.verificationStatus === "not_run" &&
    repairEntry?.intent === "repair_ci" &&
    repairEntry?.manualRepairContextValidated === true;

  if (!hasGateR && !hasValidatedManualContext) {
    return {
      valid: false,
      reason: "REPAIR_GATE_INVALID",
      message: `Repair commit ${cleanRepairSha.slice(0, 8)} has neither approved Gate R evidence nor a validated manual repair context.`,
      repairEntry: repairEntry || null,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }

  // 5. Branch and US metadata are part of the repair authorization context.
  // Never infer missing values from a commit message or the current checkout:
  // that would allow an otherwise unrelated green commit to resolve a failure.
  const targetBranch = targetEntry?.branch ? String(targetEntry.branch).trim().toLowerCase() : null;
  const repairBranch = repairEntry?.branch ? String(repairEntry.branch).trim().toLowerCase() : null;
  const targetUs = targetEntry?.usId ? String(targetEntry.usId).trim().toLowerCase() : null;
  const repairUs = repairEntry?.usId ? String(repairEntry.usId).trim().toLowerCase() : null;
  if (!targetBranch || !repairBranch || (targetUs && !repairUs) || (!targetUs && repairUs)) {
    return {
      valid: false,
      reason: "REPAIR_CONTEXT_UNKNOWN",
      message: `Repair ${cleanRepairSha.slice(0, 8)} is missing required branch or US metadata for lineage validation.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }
  if (targetBranch !== repairBranch) {
    return {
      valid: false,
      reason: "REPAIR_BRANCH_MISMATCH",
      message: `Repair commit registered on branch '${repairEntry.branch}', but target commit was on '${targetEntry.branch}'.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }
  if (targetUs !== repairUs) {
    return {
      valid: false,
      reason: "REPAIR_US_MISMATCH",
      message: `Repair commit US '${repairUs}' does not match target commit US '${targetUs}'.`,
      repairEntry,
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

  let allEvidence;
  try {
    allEvidence = await listCommitEvidence({ repoRoot: root });
  } catch (error) {
    return {
      valid: false,
      reason: "REPAIR_SNAPSHOT_MISMATCH",
      message: `Repair lineage ledger is not trustworthy: ${error.code || error.message}.`,
      repairEntry,
      targetEntry,
      targetSha: fullTargetSha,
    };
  }
  for (const entry of allEvidence) {
    if (
      entry.commitSha.toLowerCase() === cleanRepairSha ||
      entry.repairStatus === "abandoned"
    ) continue;
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

  const hasVerifiedReceipt = repairEvidence?.valid && repairEvidence?.state === "verified";
  const hasValidatedManualSnapshot =
    repairEvidence?.state === "not_run" &&
    repairEvidence?.entry?.intent === "repair_ci" &&
    repairEvidence?.entry?.manualRepairContextValidated === true;
  if (!hasVerifiedReceipt && !hasValidatedManualSnapshot) {
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
    if (entry?.repairsSha && entry.repairStatus !== "abandoned") {
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
