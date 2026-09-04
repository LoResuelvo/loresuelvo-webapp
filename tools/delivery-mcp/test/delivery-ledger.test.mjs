import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  recordCommitEvidence,
  getCommitEvidence,
  queryCommitEvidence,
  verifyCommitEvidence,
  hasCommitEvidence,
  LEDGER_DIR,
  LEDGER_FILE,
} from "../lib/delivery-ledger.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ledger-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "records"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  for (const schema of ["execution-result.schema.json", "policy.schema.json"]) {
    await fs.copyFile(
      path.join(".delivery", "schemas", schema),
      path.join(repoRoot, ".delivery", "schemas", schema)
    );
  }
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));

  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });

  return repoRoot;
}

function getCommitIdentity(root, sha) {
  const parentsLine = execFileSync("git", ["rev-list", "--parents", "-n", "1", sha], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const [, ...parents] = parentsLine.split(/\s+/).filter(Boolean);
  const treeSha = execFileSync("git", ["rev-parse", `${sha}^{tree}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  return { parents, treeSha };
}

async function createMockEvidenceRecord(repoRoot, sha, gateId = "A") {
  const snapshotHash = crypto.createHash("sha256").update(`snapshot:${sha}`).digest("hex");
  const runKey = crypto.createHash("sha256").update(`run:${sha}:${gateId}`).digest("hex");
  const recordPath = `.delivery/runtime/records/${sha}-${gateId}.json`;
  const policyHash = crypto.createHash("sha256").update("test-policy").digest("hex");

  const record = {
    schemaVersion: 1,
    status: "passed",
    snapshotHash,
    runKey,
    cached: false,
    policy: { version: 1, hash: policyHash },
    gate: {
      id: gateId,
      reasonCodes: ["TEST_EVIDENCE"],
      checkIds: [],
      parameters: {},
      postPushChecks: [],
    },
    summary: { passed: 0, failed: 0, skipped: 0, durationMs: 0 },
    checks: [],
    diagnostics: [],
    evidence: { recordPath },
  };

  const rawRecord = `${JSON.stringify(record, null, 2)}\n`;
  await fs.writeFile(path.join(repoRoot, recordPath), rawRecord, "utf8");
  const recordDigest = crypto.createHash("sha256").update(rawRecord).digest("hex");

  return { snapshotHash, runKey, recordPath, recordDigest, policyHash };
}

test("queryCommitEvidence: devuelve state missing cuando el commit no está en el ledger", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  const query = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(query.valid, false);
  assert.strictEqual(query.state, "missing");
  assert.strictEqual(query.reason, "MISSING_EVIDENCE_IN_LEDGER");
  assert.strictEqual(query.entry, null);
});

test("queryCommitEvidence: registra y consulta commit con state not_run preservando metadatos", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Crear un commit sin receipt
  await fs.writeFile(path.join(repoRoot, "unverified.txt"), "hello", "utf8");
  execFileSync("git", ["add", "unverified.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs[42]: add unverified file"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity = getCommitIdentity(repoRoot, sha);

  const entry = await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "not_run",
    notRunReason: "NO_PREPARED_RECEIPT",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    branch: "main",
    stagedFiles: ["unverified.txt"],
    usId: "42",
  });

  assert.strictEqual(entry.status, "not_run");
  assert.strictEqual(entry.verificationStatus, "not_run");
  assert.strictEqual(entry.notRunReason, "NO_PREPARED_RECEIPT");
  assert.strictEqual(entry.commitSha, sha);
  assert.strictEqual(entry.parentSha, identity.parents[0]);
  assert.strictEqual(entry.treeSha, identity.treeSha);
  assert.strictEqual(entry.branch, "main");
  assert.deepStrictEqual(entry.stagedFiles, ["unverified.txt"]);
  assert.strictEqual(entry.usId, "42");
  assert.strictEqual(entry.recordPath, null);
  assert.strictEqual(entry.recordDigest, null);

  const query = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(query.valid, false);
  assert.strictEqual(query.state, "not_run");
  assert.strictEqual(query.reason, "NO_PREPARED_RECEIPT");
  assert.ok(query.entry);
  assert.strictEqual(query.entry.verificationStatus, "not_run");
});

test("queryCommitEvidence: devuelve state verified cuando existe receipt válido y coincide con Git", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  await fs.writeFile(path.join(repoRoot, "verified.txt"), "verified", "utf8");
  execFileSync("git", ["add", "verified.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add verified file"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity = getCommitIdentity(repoRoot, sha);

  const mockEvidence = await createMockEvidenceRecord(repoRoot, sha, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "passed",
    snapshotHash: mockEvidence.snapshotHash,
    runKey: mockEvidence.runKey,
    recordPath: mockEvidence.recordPath,
    recordDigest: mockEvidence.recordDigest,
    branch: "main",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["verified.txt"],
    gateId: "A",
    policyHash: mockEvidence.policyHash,
    intent: "prepare_commit",
  });

  const query = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(query.valid, true);
  assert.strictEqual(query.state, "verified");
  assert.strictEqual(query.reason, null);
  assert.ok(query.record);
  assert.strictEqual(query.record.status, "passed");

  // verifyCommitEvidence mantiene paridad
  const verified = await verifyCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.state, "verified");
});

test("queryCommitEvidence: evidencia declarada passed que es alterada da corrupt y JAMÁS not_run", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  await fs.writeFile(path.join(repoRoot, "corrupt.txt"), "corrupt", "utf8");
  execFileSync("git", ["add", "corrupt.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add corrupt file"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity = getCommitIdentity(repoRoot, sha);

  const mockEvidence = await createMockEvidenceRecord(repoRoot, sha, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "passed",
    snapshotHash: mockEvidence.snapshotHash,
    runKey: mockEvidence.runKey,
    recordPath: mockEvidence.recordPath,
    recordDigest: mockEvidence.recordDigest,
    branch: "main",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["corrupt.txt"],
    gateId: "A",
    policyHash: mockEvidence.policyHash,
  });

  // 1. Alterar el archivo de record manteniendo schema pero cambiando digest
  const validModifiedRecord = {
    schemaVersion: 1,
    status: "passed",
    snapshotHash: mockEvidence.snapshotHash,
    runKey: mockEvidence.runKey,
    cached: false,
    policy: { version: 1, hash: mockEvidence.policyHash },
    gate: {
      id: "A",
      reasonCodes: ["TEST_EVIDENCE"],
      checkIds: [],
      parameters: {},
      postPushChecks: [],
    },
    summary: { passed: 1, failed: 0, skipped: 0, durationMs: 999 },
    checks: [],
    diagnostics: [],
    evidence: { recordPath: mockEvidence.recordPath },
  };
  await fs.writeFile(
    path.join(repoRoot, mockEvidence.recordPath),
    `${JSON.stringify(validModifiedRecord, null, 2)}\n`,
    "utf8"
  );

  const queryChanged = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(queryChanged.valid, false);
  assert.strictEqual(queryChanged.state, "corrupt");
  assert.notStrictEqual(queryChanged.state, "not_run");
  assert.strictEqual(queryChanged.reason, "EVIDENCE_RECORD_CHANGED");

  // 2. Archivo con schema inválido
  await fs.writeFile(path.join(repoRoot, mockEvidence.recordPath), "{}\n", "utf8");
  const queryInvalid = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(queryInvalid.valid, false);
  assert.strictEqual(queryInvalid.state, "corrupt");
  assert.notStrictEqual(queryInvalid.state, "not_run");
  assert.strictEqual(queryInvalid.reason, "EVIDENCE_RECORD_INVALID");

  // 3. Eliminar el archivo de record
  await fs.rm(path.join(repoRoot, mockEvidence.recordPath));

  const queryDeleted = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(queryDeleted.valid, false);
  assert.strictEqual(queryDeleted.state, "corrupt");
  assert.notStrictEqual(queryDeleted.state, "not_run");
  assert.strictEqual(queryDeleted.reason, "EVIDENCE_RECORD_INVALID");
});

test("queryCommitEvidence: compatibilidad con entradas históricas schemaVersion: 2 sin status explícito", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  await fs.writeFile(path.join(repoRoot, "legacy.txt"), "legacy", "utf8");
  execFileSync("git", ["add", "legacy.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: legacy commit"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity = getCommitIdentity(repoRoot, sha);

  const mockEvidence = await createMockEvidenceRecord(repoRoot, sha, "A");

  // Escribir entrada manual exactamente como se guardaba en schemaVersion 2 histórico
  const legacyEntry = {
    schemaVersion: 2,
    commitSha: sha,
    snapshotHash: mockEvidence.snapshotHash,
    runKey: mockEvidence.runKey,
    recordPath: mockEvidence.recordPath,
    recordDigest: mockEvidence.recordDigest,
    branch: "main",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["legacy.txt"],
    gateId: "A",
    policyHash: mockEvidence.policyHash,
    intent: "prepare_commit",
    usId: null,
    featureFile: null,
    scenarioName: null,
    scopeFiles: [],
    recordedAt: "2026-09-01T12:00:00.000Z",
    // Notar que NO tiene status ni verificationStatus
  };

  await fs.mkdir(path.join(repoRoot, LEDGER_DIR), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, LEDGER_DIR, `${sha}.json`),
    JSON.stringify(legacyEntry, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(repoRoot, LEDGER_FILE),
    JSON.stringify({ [sha]: legacyEntry }, null, 2),
    "utf8"
  );

  // Consulta reconoce la entrada histórica como verified
  const query = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(query.valid, true);
  assert.strictEqual(query.state, "verified");
  assert.strictEqual(query.reason, null);

  // Si esa entrada histórica es alterada, pasa a corrupt (nunca not_run)
  await fs.writeFile(path.join(repoRoot, mockEvidence.recordPath), "{}\n", "utf8");
  const queryCorrupt = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(queryCorrupt.valid, false);
  assert.strictEqual(queryCorrupt.state, "corrupt");
});
