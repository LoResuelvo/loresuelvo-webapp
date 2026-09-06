import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";
import { validateExecutionResult } from "./validate-schema.mjs";
import { inspectCi } from "./ci-provider.mjs";

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
  repairsSha = null,
  supersedes = [],
  repairStatus = null,
  repairedFailure = null,
  repairPushConsumed = false,
  repairPushConsumedAt = null,
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
          repairPushConsumed: Boolean(repairPushConsumed),
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

  return entry;
}

export async function markRepairPushConsumed({ repoRoot, commitSha } = {}) {
  const root = findRepoRoot(repoRoot);
  const cleanSha = assertCommitSha(commitSha);
  const entry = await getCommitEvidence({ repoRoot: root, commitSha: cleanSha });
  if (!entry) return null;
  entry.repairPushConsumed = true;
  entry.repairPushConsumedAt = new Date().toISOString();
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
    const normalizedRepairsSha = rawRepairsSha.toLowerCase();

    // 1. Verify repairsSha exists
    let fullRepairsSha = null;
    let targetInGit = false;
    try {
      fullRepairsSha = execFileSync("git", ["rev-parse", `${rawRepairsSha}^{commit}`], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .trim()
        .toLowerCase();
      targetInGit = true;
    } catch {
      const targetEvidence = await getCommitEvidence({ repoRoot: root, commitSha: rawRepairsSha });
      if (targetEvidence) {
        fullRepairsSha = targetEvidence.commitSha.toLowerCase();
      } else {
        try {
          const ci = await inspectCi({ sha: rawRepairsSha, repoRoot: root, provider: ciProvider });
          if (ci && ci.status !== "provider_error" && ci.status !== "not_found") {
            fullRepairsSha = normalizedRepairsSha;
          }
        } catch {
          // not found
        }
      }
    }

    if (!fullRepairsSha) {
      invalidRepairs.push({
        repairSha,
        repairsSha: rawRepairsSha,
        reason: "TARGET_NOT_FOUND",
      });
      continue;
    }

    // 2. Verify repair commit is a descendant of repairsSha
    if (!targetInGit) {
      invalidRepairs.push({
        repairSha,
        repairsSha: fullRepairsSha,
        reason: "NOT_ANCESTOR",
      });
      continue;
    }

    let isAncestor = false;
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", fullRepairsSha, repairSha], {
        cwd: root,
        stdio: ["ignore", "ignore", "ignore"],
      });
      isAncestor = fullRepairsSha !== repairSha;
    } catch {
      isAncestor = false;
    }

    if (!isAncestor) {
      invalidRepairs.push({
        repairSha,
        repairsSha: fullRepairsSha,
        reason: "NOT_ANCESTOR",
      });
      continue;
    }

    // 3. Verify CI of repairsSha was failed (failed, cancelled, timed_out)
    let targetCi;
    try {
      targetCi = await inspectCi({ sha: fullRepairsSha, repoRoot: root, provider: ciProvider });
      if (targetCi.status === "not_found" && rawRepairsSha !== fullRepairsSha) {
        targetCi = await inspectCi({ sha: rawRepairsSha, repoRoot: root, provider: ciProvider });
      }
    } catch {
      invalidRepairs.push({
        repairSha,
        repairsSha: fullRepairsSha,
        reason: "TARGET_CI_ERROR",
      });
      continue;
    }

    if (targetCi.status === "passed") {
      invalidRepairs.push({
        repairSha,
        repairsSha: fullRepairsSha,
        reason: "TARGET_CI_PASSED",
      });
      continue;
    }

    if (!["failed", "cancelled", "timed_out"].includes(targetCi.status)) {
      invalidRepairs.push({
        repairSha,
        repairsSha: fullRepairsSha,
        reason: "TARGET_CI_NOT_FAILED",
      });
      continue;
    }

    // 4. Verify repair commit passed Gate R
    const repairEvidence = await queryCommitEvidence({ repoRoot: root, commitSha: repairSha });
    const passedGateR =
      repairEvidence.valid &&
      repairEvidence.state === "verified" &&
      repairEvidence.entry?.gateId === "R" &&
      (repairEvidence.entry?.status === "passed" || repairEvidence.record?.status === "passed");

    if (!passedGateR) {
      invalidRepairs.push({
        repairSha,
        repairsSha: fullRepairsSha,
        reason: "GATE_R_REQUIRED",
      });
      continue;
    }

    // 5. Inspect CI of the repair commit itself
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
