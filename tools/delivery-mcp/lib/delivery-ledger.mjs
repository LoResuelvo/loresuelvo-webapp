import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";
import { validateExecutionResult } from "./validate-schema.mjs";

export const LEDGER_DIR = ".delivery/runtime/ledger";
export const LEDGER_FILE = ".delivery/runtime/ledger.json";
export const LAST_PREPARED_FILE = ".delivery/runtime/last-prepared.json";

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
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
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
    policyHash: inspection?.policy?.hash || null,
    intent,
    usId: usId || snapshot?.proposedUsId || null,
    featureFile: featureFile || null,
    scenarioName: scenarioName || null,
    scopeFiles: [...new Set(scopeFiles || [])].sort(),
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

  const expectedGateId = gateId ?? inspection?.gate?.id;
  const expectedPolicyHash = policyHash ?? inspection?.policy?.hash;
  const identityMatches =
    prepared.snapshotHash === snapshot?.snapshotHash &&
    prepared.parentHeadSha === snapshot?.headSha &&
    prepared.stagedTreeSha === snapshot?.stagedTreeSha &&
    prepared.branch === snapshot?.branch &&
    hasMatchingFiles(prepared.stagedFiles, snapshot?.stagedFiles) &&
    (intent === undefined || prepared.intent === intent) &&
    (expectedGateId === undefined || prepared.gateId === expectedGateId) &&
    (expectedPolicyHash === undefined || prepared.policyHash === expectedPolicyHash);
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
  const updated = {
    ...prepared,
    consumedByCommitSha: assertCommitSha(commitSha),
    consumedAt: new Date().toISOString(),
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
} = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);

  const effectiveStatus = verificationStatus || status || "passed";
  if (effectiveStatus !== "passed" && effectiveStatus !== "not_run") {
    throw new Error(`Invalid commit verification status: ${effectiveStatus}`);
  }

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

  return entry;
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

export async function listCommitEvidence({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  try {
    const parsed = JSON.parse(await fs.readFile(path.resolve(root, LEDGER_FILE), "utf8"));
    return Object.values(parsed).sort((left, right) =>
      String(left.recordedAt || "").localeCompare(String(right.recordedAt || ""))
    );
  } catch {
    return [];
  }
}

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
