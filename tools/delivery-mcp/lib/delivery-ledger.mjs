import fs from "node:fs/promises";
import path from "node:path";
import { assertSafeRepoPath, findRepoRoot } from "./repo-root.mjs";

export const LEDGER_DIR = ".delivery/runtime/ledger";
export const LEDGER_FILE = ".delivery/runtime/ledger.json";
export const LAST_PREPARED_FILE = ".delivery/runtime/last-prepared.json";

export async function recordPreparedEvidence({
  repoRoot,
  snapshotHash,
  runKey = null,
  status,
  recordPath = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  const targetPath = path.resolve(root, LAST_PREPARED_FILE);
  assertSafeRepoPath(root, LAST_PREPARED_FILE, "Last prepared file");

  const data = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    snapshotHash,
    runKey,
    status,
    recordPath,
  };

  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempPath, targetPath);

  return data;
}

export async function getLastPreparedEvidence({ repoRoot } = {}) {
  const root = findRepoRoot(repoRoot);
  const targetPath = path.resolve(root, LAST_PREPARED_FILE);
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export async function recordCommitEvidence({
  repoRoot,
  commitSha,
  snapshotHash,
  runKey = null,
  recordPath = null,
} = {}) {
  const root = findRepoRoot(repoRoot);
  if (!commitSha || typeof commitSha !== "string" || !/^[a-f0-9]{7,40}$/i.test(commitSha.trim())) {
    throw new Error(`Invalid commit SHA: ${commitSha}`);
  }
  const cleanSha = commitSha.trim().toLowerCase();

  const entry = {
    schemaVersion: 1,
    commitSha: cleanSha,
    snapshotHash: snapshotHash || null,
    runKey: runKey || null,
    recordPath: recordPath || null,
    recordedAt: new Date().toISOString(),
  };

  // 1. Write per-commit file: .delivery/runtime/ledger/<commitSha>.json
  const commitFilePath = path.join(LEDGER_DIR, `${cleanSha}.json`);
  assertSafeRepoPath(root, commitFilePath, "Commit ledger file");
  const absCommitFile = path.resolve(root, commitFilePath);
  const tempCommitPath = `${absCommitFile}.${process.pid}.${Date.now()}.tmp`;

  await fs.mkdir(path.dirname(absCommitFile), { recursive: true, mode: 0o700 });
  await fs.writeFile(tempCommitPath, `${JSON.stringify(entry, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempCommitPath, absCommitFile);

  // 2. Update consolidated ledger: .delivery/runtime/ledger.json
  const absLedgerFile = path.resolve(root, LEDGER_FILE);
  let ledgerMap = {};
  try {
    const raw = await fs.readFile(absLedgerFile, "utf8");
    ledgerMap = JSON.parse(raw);
  } catch {
    ledgerMap = {};
  }
  ledgerMap[cleanSha] = entry;

  const tempLedgerPath = `${absLedgerFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempLedgerPath, `${JSON.stringify(ledgerMap, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tempLedgerPath, absLedgerFile);

  return entry;
}

export async function getCommitEvidence({ repoRoot, commitSha } = {}) {
  const root = findRepoRoot(repoRoot);
  if (!commitSha || typeof commitSha !== "string") return null;
  const cleanSha = commitSha.trim().toLowerCase();

  // Try direct file first
  const commitFilePath = path.resolve(root, LEDGER_DIR, `${cleanSha}.json`);
  try {
    const raw = await fs.readFile(commitFilePath, "utf8");
    return JSON.parse(raw);
  } catch {
    // Try consolidated file
  }

  try {
    const absLedgerFile = path.resolve(root, LEDGER_FILE);
    const raw = await fs.readFile(absLedgerFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed[cleanSha] || null;
  } catch {
    return null;
  }
}

export async function hasCommitEvidence({ repoRoot, commitSha } = {}) {
  const evidence = await getCommitEvidence({ repoRoot, commitSha });
  return Boolean(evidence);
}
