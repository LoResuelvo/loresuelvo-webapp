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
  resolveRepairChain,
  updateCommitRepairStatus,
  validateRepairLineage,
  acquireRepairLock,
  getRepairAuthorization,
  saveRepairAuthorization,
  determineRepairCommitState,
  authorizeRepairPush,
  listCommitEvidence,
  rebuildLedgerFromIndividualRecords,
  getLedgerState,
  LEDGER_STATES,
  LEDGER_DIR,
  LEDGER_FILE,
} from "../lib/delivery-ledger.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ledger-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "records"), { recursive: true });
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  for (const schema of [
    "ci-inspection-result.schema.json",
    "delivery-context.schema.json",
    "execution-result.schema.json",
    "policy.schema.json",
  ]) {
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

test("queryCommitEvidence: solo acepta not_run con ambos estados y shape canónico", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "unverified.txt"), "hello", "utf8");
  execFileSync("git", ["add", "unverified.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add unverified file"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity = getCommitIdentity(repoRoot, sha);

  const entry = await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "not_run",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["unverified.txt"],
  });
  const entryPath = path.join(repoRoot, LEDGER_DIR, `${sha}.json`);

  await fs.writeFile(
    entryPath,
    `${JSON.stringify({ ...entry, verificationStatus: "passed" }, null, 2)}\n`,
    "utf8"
  );
  const inconsistent = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(inconsistent.state, "corrupt");
  assert.strictEqual(inconsistent.reason, "INCONSISTENT_NOT_RUN_STATUS");

  await fs.writeFile(
    entryPath,
    `${JSON.stringify({ ...entry, treeSha: null }, null, 2)}\n`,
    "utf8"
  );
  const malformed = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(malformed.state, "corrupt");
  assert.strictEqual(malformed.reason, "INVALID_NOT_RUN_SHAPE");
});

test("queryCommitEvidence: un archivo de evidencia ilegible es corrupt y no usa el ledger como fallback", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "unverified.txt"), "hello", "utf8");
  execFileSync("git", ["add", "unverified.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add unverified file"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const identity = getCommitIdentity(repoRoot, sha);

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "not_run",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["unverified.txt"],
  });
  await fs.writeFile(path.join(repoRoot, LEDGER_DIR, `${sha}.json`), "{broken-json", "utf8");

  const result = await queryCommitEvidence({ repoRoot, commitSha: sha });
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.state, "corrupt");
  assert.strictEqual(result.reason, "INVALID_COMMIT_EVIDENCE_FILE");
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

async function commitFile(repoRoot, relativePath, content, message) {
  await fs.mkdir(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
  await fs.writeFile(path.join(repoRoot, relativePath), content, "utf8");
  execFileSync("git", ["add", relativePath], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", message], { cwd: repoRoot });
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

async function attachCommitEvidence({
  repoRoot,
  sha,
  gateId = "A",
  repairsSha = null,
  supersedes = [],
  repairStatus = null,
  intent = gateId === "R" ? "repair_ci" : "prepare_commit",
  branch = "main",
  usId = null,
}) {
  const identity = getCommitIdentity(repoRoot, sha);
  const mockEvidence = await createMockEvidenceRecord(repoRoot, sha, gateId);

  return recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    verificationStatus: "passed",
    snapshotHash: mockEvidence.snapshotHash,
    runKey: mockEvidence.runKey,
    recordPath: mockEvidence.recordPath,
    recordDigest: mockEvidence.recordDigest,
    branch,
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["file.txt"],
    gateId,
    policyHash: mockEvidence.policyHash,
    intent,
    usId,
    repairsSha,
    supersedes,
    repairStatus,
  });
}

test("resolveRepairChain: reparación válida pasa a validated y marca target en supersededFailures", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "a.txt", "a", "chore: fail commit");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "b.txt", "b", "fix: repair commit");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
    [shaB]: { status: "passed" },
  });

  const res = await resolveRepairChain({
    repoRoot,
    commits: [shaA, shaB],
    ciProvider,
  });

  assert.deepStrictEqual(res.supersededFailures, [shaA]);
  assert.deepStrictEqual(res.validatedRepairs, [shaB]);
  assert.deepStrictEqual(res.failedRepairs, []);
  assert.deepStrictEqual(res.invalidRepairs, []);

  const entryB = await getCommitEvidence({ repoRoot, commitSha: shaB });
  assert.strictEqual(entryB.repairStatus, "validated");
  assert.deepStrictEqual(entryB.supersedes, [shaA]);
});

test("resolveRepairChain: rechaza reparación fuera de rama o no ancestro en invalidRepairs", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "a.txt", "a", "chore: fail commit");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  // Crear commit shaB en rama huérfana / no descendiente de shaA
  execFileSync("git", ["checkout", "--orphan", "isolated-branch"], { cwd: repoRoot });
  execFileSync("git", ["rm", "-rf", "."], { cwd: repoRoot });
  const shaB = await commitFile(repoRoot, "isolated.txt", "isolated", "fix: repair outside branch");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
    [shaB]: { status: "passed" },
  });

  const res = await resolveRepairChain({
    repoRoot,
    commits: [shaA, shaB],
    ciProvider,
  });

  assert.strictEqual(res.supersededFailures.length, 0);
  assert.strictEqual(res.invalidRepairs.length, 1);
  assert.strictEqual(res.invalidRepairs[0].repairSha, shaB);
  assert.strictEqual(res.invalidRepairs[0].repairsSha, shaA);
  assert.strictEqual(res.invalidRepairs[0].reason, "REPAIR_NOT_DESCENDANT");
});

test("resolveRepairChain: rechaza reparación si el target CI era verde (passed)", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "a.txt", "a", "chore: green commit");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "b.txt", "b", "fix: invalid repair of green commit");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "passed" },
    [shaB]: { status: "passed" },
  });

  const res = await resolveRepairChain({
    repoRoot,
    commits: [shaA, shaB],
    ciProvider,
  });

  assert.strictEqual(res.supersededFailures.length, 0);
  assert.strictEqual(res.invalidRepairs.length, 1);
  assert.strictEqual(res.invalidRepairs[0].reason, "REPAIR_TARGET_NOT_FAILED");
});

test("resolveRepairChain: soporta cadena de dos reparaciones (A falla -> B falla -> C pasa)", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "a.txt", "a", "chore: fail A");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "b.txt", "b", "fix: repair B fails");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  const shaC = await commitFile(repoRoot, "c.txt", "c", "fix: repair C passes");
  await attachCommitEvidence({
    repoRoot,
    sha: shaC,
    gateId: "R",
    repairsSha: shaB,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
    [shaB]: { status: "failed" },
    [shaC]: { status: "passed" },
  });

  const res = await resolveRepairChain({
    repoRoot,
    commits: [shaA, shaB, shaC],
    ciProvider,
  });

  assert.ok(res.supersededFailures.includes(shaA));
  assert.ok(res.supersededFailures.includes(shaB));
  assert.deepStrictEqual(res.validatedRepairs, [shaC]);
  assert.deepStrictEqual(res.failedRepairs, [shaB]);
  assert.deepStrictEqual(res.invalidRepairs, []);

  const entryB = await getCommitEvidence({ repoRoot, commitSha: shaB });
  assert.strictEqual(entryB.repairStatus, "failed");

  const entryC = await getCommitEvidence({ repoRoot, commitSha: shaC });
  assert.strictEqual(entryC.repairStatus, "validated");
  assert.ok(entryC.supersedes.includes(shaA));
  assert.ok(entryC.supersedes.includes(shaB));
});

test("resolveRepairChain: reparación cuyo CI falla es registrada en failedRepairs", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "a.txt", "a", "chore: fail A");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "b.txt", "b", "fix: repair B fails");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
    [shaB]: { status: "failed" },
  });

  const res = await resolveRepairChain({
    repoRoot,
    commits: [shaA, shaB],
    ciProvider,
  });

  assert.strictEqual(res.supersededFailures.length, 0);
  assert.deepStrictEqual(res.failedRepairs, [shaB]);
  assert.deepStrictEqual(res.invalidRepairs, []);

  const entryB = await getCommitEvidence({ repoRoot, commitSha: shaB });
  assert.strictEqual(entryB.repairStatus, "failed");
});

test("validateRepairLineage: reparación válida en la misma rama y US retorna valid: true", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore[42]: fail commit");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A", branch: "main", usId: "42" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix[42]: repair commit");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
    branch: "main",
    usId: "42",
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaB,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.reason, null);
  assert.strictEqual(validation.targetSha, shaA);
});

test("validateRepairLineage: rechaza reparación con US mismatch con REPAIR_US_MISMATCH", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore[42]: fail commit");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A", branch: "main", usId: "42" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix[99]: repair commit");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
    branch: "main",
    usId: "99",
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaB,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_US_MISMATCH");
});

test("validateRepairLineage: rechaza reparación con rama mismatch con REPAIR_BRANCH_MISMATCH", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore[42]: fail commit");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A", branch: "main", usId: "42" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix[42]: repair commit on feature branch");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
    branch: "feature-branch",
    usId: "42",
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaB,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_BRANCH_MISMATCH");
});

test("validateRepairLineage: rechaza reparación no descendiente del fallo con REPAIR_NOT_DESCENDANT", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore: commit A");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "chore: commit B");
  await attachCommitEvidence({ repoRoot, sha: shaB, gateId: "A" });

  // shaA no es descendiente de shaB (shaA es ancestro de shaB)
  // Crear shaC que repara shaB pero dice ser shaA
  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaA,
    targetSha: shaB,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_NOT_DESCENDANT");
});

test("validateRepairLineage: rechaza reparación con Gate no R con REPAIR_GATE_INVALID", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore: commit A fails");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix: repair with Gate A instead of Gate R");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "A", // No es Gate R
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaB,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_GATE_INVALID");
});

test("validateRepairLineage: rechaza reparación contra target verde con REPAIR_TARGET_NOT_FAILED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore: commit A passed");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix: repair for green commit");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "passed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaB,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_TARGET_NOT_FAILED");
});

test("validateRepairLineage: rechaza reparación contra target ya subsanado con REPAIR_ALREADY_SUPERSEDED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore: commit A fails");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix: repair commit 1");
  await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
    repairStatus: "validated",
    supersedes: [shaA],
  });

  const shaC = await commitFile(repoRoot, "src/c.txt", "c", "fix: redundant repair for commit A");
  await attachCommitEvidence({
    repoRoot,
    sha: shaC,
    gateId: "R",
    repairsSha: shaA,
  });

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
    [shaB]: { status: "passed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaC,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_ALREADY_SUPERSEDED");
});

test("validateRepairLineage: rechaza reparación con snapshot alterado con REPAIR_SNAPSHOT_MISMATCH", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shaA = await commitFile(repoRoot, "src/a.txt", "a", "chore: commit A fails");
  await attachCommitEvidence({ repoRoot, sha: shaA, gateId: "A" });

  const shaB = await commitFile(repoRoot, "src/b.txt", "b", "fix: repair commit B");
  const evidenceB = await attachCommitEvidence({
    repoRoot,
    sha: shaB,
    gateId: "R",
    repairsSha: shaA,
  });

  // Alterar el archivo de registro de ejecución para que el digest no coincida
  const recordPath = path.join(repoRoot, evidenceB.recordPath);
  const raw = await fs.readFile(recordPath, "utf8");
  const parsed = JSON.parse(raw);
  parsed.status = "failed"; // Alterado
  await fs.writeFile(recordPath, JSON.stringify(parsed, null, 2), "utf8");

  const ciProvider = new MockCiProvider({
    [shaA]: { status: "failed" },
  });

  const validation = await validateRepairLineage({
    repoRoot,
    repairSha: shaB,
    targetSha: shaA,
    ciProvider,
  });

  assert.strictEqual(validation.valid, false);
  assert.strictEqual(validation.reason, "REPAIR_SNAPSHOT_MISMATCH");
});

test("máquina de estados de reparación: transitions from prepared -> bound_to_commit -> submitted -> ci_pending -> validated", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const targetSha = "1111111111111111111111111111111111111111";
  const repairSha = "2222222222222222222222222222222222222222";

  // 1. Prepared
  await saveRepairAuthorization({
    repoRoot,
    authorization: {
      targetSha,
      state: "prepared",
      commitSha: null,
    },
  });
  let auth = await getRepairAuthorization({ repoRoot, targetSha });
  assert.strictEqual(auth.state, "prepared");
  assert.strictEqual(auth.commitSha, null);

  // 2. Bound to commit
  await saveRepairAuthorization({
    repoRoot,
    authorization: {
      ...auth,
      commitSha: repairSha,
      state: "bound_to_commit",
    },
  });
  auth = await getRepairAuthorization({ repoRoot, targetSha });
  assert.strictEqual(auth.state, "bound_to_commit");
  assert.strictEqual(auth.commitSha, repairSha);

  // 3. Submitted
  await saveRepairAuthorization({
    repoRoot,
    authorization: {
      ...auth,
      state: "submitted",
    },
  });
  auth = await getRepairAuthorization({ repoRoot, targetSha });
  assert.strictEqual(auth.state, "submitted");

  // 4. CI pending
  const mockCi = new MockCiProvider({
    [repairSha]: { status: "in_progress" },
  });
  const liveStatePending = await determineRepairCommitState({
    repoRoot,
    targetSha,
    commitSha: repairSha,
    ciProvider: mockCi,
    existingAuth: auth,
  });
  assert.strictEqual(liveStatePending.state, "ci_pending");

  // 5. Validated
  mockCi.setFixture(repairSha, { status: "passed" });
  const liveStateValidated = await determineRepairCommitState({
    repoRoot,
    targetSha,
    commitSha: repairSha,
    ciProvider: mockCi,
    existingAuth: auth,
  });
  assert.strictEqual(liveStateValidated.state, "validated");

  // 6. CI failed
  mockCi.setFixture(repairSha, { status: "failed" });
  const liveStateFailed = await determineRepairCommitState({
    repoRoot,
    targetSha,
    commitSha: repairSha,
    ciProvider: mockCi,
    existingAuth: auth,
  });
  assert.strictEqual(liveStateFailed.state, "ci_failed");
});

test("acquireRepairLock: previene operaciones concurrentes en conflicto y respeta timeout", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const targetSha = "1111111111111111111111111111111111111111";

  const release1 = await acquireRepairLock({ repoRoot, targetSha, timeoutMs: 500 });
  assert.ok(typeof release1 === "function");

  // Segundo intento mientras el lock está retenido debe fallar con REPAIR_LOCK_TIMEOUT
  await assert.rejects(
    async () => {
      await acquireRepairLock({ repoRoot, targetSha, timeoutMs: 100, retryIntervalMs: 20 });
    },
    (err) => {
      assert.strictEqual(err.code, "REPAIR_LOCK_TIMEOUT");
      return true;
    }
  );

  // Liberar el lock
  await release1();

  // Ahora el segundo intento debe adquirir el lock exitosamente
  const release2 = await acquireRepairLock({ repoRoot, targetSha, timeoutMs: 200 });
  assert.ok(typeof release2 === "function");
  await release2();
});

test("authorizeRepairPush: rechaza un commit SHA diferente para la misma autorización con REPAIR_RECEIPT_ALREADY_CONSUMED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const targetSha = "1111111111111111111111111111111111111111";
  const commitA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const commitB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  await saveRepairAuthorization({
    repoRoot,
    authorization: {
      targetSha,
      commitSha: commitA,
      state: "bound_to_commit",
    },
  });

  const resA = await authorizeRepairPush({
    repoRoot,
    targetSha,
    commitSha: commitA,
  });
  assert.strictEqual(resA.authorized, true);
  assert.strictEqual(resA.state, "submitted");

  // Commit B intenta usar la misma autorización
  const resB = await authorizeRepairPush({
    repoRoot,
    targetSha,
    commitSha: commitB,
  });
  assert.strictEqual(resB.authorized, false);
  assert.strictEqual(resB.reason, "REPAIR_RECEIPT_ALREADY_CONSUMED");
});

test("authorizeRepairPush: reintento del mismo SHA es permitido y cuenta intentos", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const targetSha = "1111111111111111111111111111111111111111";
  const commitA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  await saveRepairAuthorization({
    repoRoot,
    authorization: {
      targetSha,
      commitSha: commitA,
      state: "bound_to_commit",
    },
  });

  const res1 = await authorizeRepairPush({ repoRoot, targetSha, commitSha: commitA });
  assert.strictEqual(res1.authorized, true);
  assert.strictEqual(res1.authorization.attemptCount, 1);

  // Segundo intento (mismo commitSha)
  const res2 = await authorizeRepairPush({ repoRoot, targetSha, commitSha: commitA });
  assert.strictEqual(res2.authorized, true);
  assert.strictEqual(res2.authorization.attemptCount, 2);
  assert.strictEqual(res2.state, "submitted");
});

test("listCommitEvidence y getLedgerState: ledger no inicializado (ENOENT) devuelve [] y LEDGER_NOT_INITIALIZED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.rm(path.join(repoRoot, LEDGER_FILE), { force: true });
  await fs.rm(path.join(repoRoot, LEDGER_DIR), { recursive: true, force: true });

  const entries = await listCommitEvidence({ repoRoot });
  assert.deepStrictEqual(entries, []);

  const ledgerState = await getLedgerState({ repoRoot });
  assert.strictEqual(ledgerState.state, LEDGER_STATES.LEDGER_NOT_INITIALIZED);
});

test("listCommitEvidence y getLedgerState: ledger realmente vacío devuelve [] y EMPTY_LEDGER", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.mkdir(path.join(repoRoot, path.dirname(LEDGER_FILE)), { recursive: true });
  await fs.writeFile(path.join(repoRoot, LEDGER_FILE), "{}\n", "utf8");
  await fs.rm(path.join(repoRoot, LEDGER_DIR), { recursive: true, force: true });

  const entries = await listCommitEvidence({ repoRoot });
  assert.deepStrictEqual(entries, []);

  const ledgerState = await getLedgerState({ repoRoot });
  assert.strictEqual(ledgerState.state, LEDGER_STATES.EMPTY_LEDGER);
});

test("listCommitEvidence: reconstruye exitosamente cuando el consolidado fue eliminado pero existen entradas individuales válidas", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "test1.txt"), "1", "utf8");
  execFileSync("git", ["add", "test1.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: test commit 1"], { cwd: repoRoot });
  const sha1 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity1 = getCommitIdentity(repoRoot, sha1);
  const mock1 = await createMockEvidenceRecord(repoRoot, sha1, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha1,
    verificationStatus: "passed",
    snapshotHash: mock1.snapshotHash,
    runKey: mock1.runKey,
    recordPath: mock1.recordPath,
    recordDigest: mock1.recordDigest,
    branch: "main",
    parentSha: identity1.parents[0] || null,
    treeSha: identity1.treeSha,
    stagedFiles: ["test1.txt"],
    gateId: "A",
    policyHash: mock1.policyHash,
  });

  // Eliminar LEDGER_FILE
  await fs.rm(path.join(repoRoot, LEDGER_FILE));

  // listCommitEvidence debe reconstruir atómicamente y devolver las entradas
  const entries = await listCommitEvidence({ repoRoot });
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].commitSha, sha1);

  // LEDGER_FILE debe existir nuevamente y ser válido
  const rawRebuilt = await fs.readFile(path.join(repoRoot, LEDGER_FILE), "utf8");
  const parsed = JSON.parse(rawRebuilt);
  assert.ok(parsed[sha1]);
  assert.strictEqual(parsed[sha1].commitSha, sha1);

  const state = await getLedgerState({ repoRoot });
  assert.strictEqual(state.state, LEDGER_STATES.VALID_LEDGER);
});

test("listCommitEvidence: reconstruye exitosamente cuando el consolidado tiene JSON corrupto pero existen entradas individuales válidas", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "test2.txt"), "2", "utf8");
  execFileSync("git", ["add", "test2.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: test commit 2"], { cwd: repoRoot });
  const sha2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity2 = getCommitIdentity(repoRoot, sha2);
  const mock2 = await createMockEvidenceRecord(repoRoot, sha2, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha2,
    verificationStatus: "passed",
    snapshotHash: mock2.snapshotHash,
    runKey: mock2.runKey,
    recordPath: mock2.recordPath,
    recordDigest: mock2.recordDigest,
    branch: "main",
    parentSha: identity2.parents[0] || null,
    treeSha: identity2.treeSha,
    stagedFiles: ["test2.txt"],
    gateId: "A",
    policyHash: mock2.policyHash,
  });

  // Corromper LEDGER_FILE con JSON inválido
  await fs.writeFile(path.join(repoRoot, LEDGER_FILE), "{\n  corrupt json here", "utf8");

  // Debe reconstruir
  const entries = await listCommitEvidence({ repoRoot });
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].commitSha, sha2);

  const state = await getLedgerState({ repoRoot });
  assert.strictEqual(state.state, LEDGER_STATES.VALID_LEDGER);
});

test("listCommitEvidence: lanza LEDGER_CORRUPT si el consolidado está corrupto y no existen entradas individuales", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.mkdir(path.join(repoRoot, path.dirname(LEDGER_FILE)), { recursive: true });
  await fs.writeFile(path.join(repoRoot, LEDGER_FILE), "{invalid-json", "utf8");
  await fs.rm(path.join(repoRoot, LEDGER_DIR), { recursive: true, force: true });

  await assert.rejects(
    async () => await listCommitEvidence({ repoRoot }),
    (err) => {
      assert.strictEqual(err.code, "LEDGER_CORRUPT");
      return true;
    }
  );
});

test("listCommitEvidence: lanza LEDGER_CORRUPT si el consolidado está corrupto y una entrada individual tiene JSON inválido", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const fakeSha = "1234567890abcdef1234567890abcdef12345678";
  await fs.mkdir(path.join(repoRoot, LEDGER_DIR), { recursive: true });
  await fs.writeFile(path.join(repoRoot, LEDGER_DIR, `${fakeSha}.json`), "broken json content", "utf8");
  await fs.writeFile(path.join(repoRoot, LEDGER_FILE), "{corrupt", "utf8");

  await assert.rejects(
    async () => await listCommitEvidence({ repoRoot }),
    (err) => {
      assert.strictEqual(err.code, "LEDGER_CORRUPT");
      return true;
    }
  );
});

test("rebuildLedgerFromIndividualRecords: lanza LEDGER_CORRUPT si una entrada individual tiene digest inválido", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "test3.txt"), "3", "utf8");
  execFileSync("git", ["add", "test3.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: test commit 3"], { cwd: repoRoot });
  const sha3 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity3 = getCommitIdentity(repoRoot, sha3);
  const mock3 = await createMockEvidenceRecord(repoRoot, sha3, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha3,
    verificationStatus: "passed",
    snapshotHash: mock3.snapshotHash,
    runKey: mock3.runKey,
    recordPath: mock3.recordPath,
    recordDigest: mock3.recordDigest,
    branch: "main",
    parentSha: identity3.parents[0] || null,
    treeSha: identity3.treeSha,
    stagedFiles: ["test3.txt"],
    gateId: "A",
    policyHash: mock3.policyHash,
  });

  // Alterar el archivo de record en el disco para que no coincida con recordDigest
  await fs.appendFile(path.join(repoRoot, mock3.recordPath), "\n// tampered content");

  await assert.rejects(
    async () => await rebuildLedgerFromIndividualRecords({ repoRoot }),
    (err) => {
      assert.strictEqual(err.code, "LEDGER_CORRUPT");
      return true;
    }
  );
});

test("getLedgerState: detecta LEDGER_INCONSISTENT ante divergencia entre consolidado e individuales", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "test4.txt"), "4", "utf8");
  execFileSync("git", ["add", "test4.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: test commit 4"], { cwd: repoRoot });
  const sha4 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity4 = getCommitIdentity(repoRoot, sha4);
  const mock4 = await createMockEvidenceRecord(repoRoot, sha4, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha4,
    verificationStatus: "passed",
    snapshotHash: mock4.snapshotHash,
    runKey: mock4.runKey,
    recordPath: mock4.recordPath,
    recordDigest: mock4.recordDigest,
    branch: "main",
    parentSha: identity4.parents[0] || null,
    treeSha: identity4.treeSha,
    stagedFiles: ["test4.txt"],
    gateId: "A",
    policyHash: mock4.policyHash,
  });

  // Alterar el archivo individual cambiando el status a not_run, creando inconsistencia con consolidado
  const indPath = path.join(repoRoot, LEDGER_DIR, `${sha4}.json`);
  const indContent = JSON.parse(await fs.readFile(indPath, "utf8"));
  indContent.status = "not_run";
  indContent.verificationStatus = "not_run";
  indContent.notRunReason = "DIVERGENT";
  await fs.writeFile(indPath, JSON.stringify(indContent, null, 2), "utf8");

  const state = await getLedgerState({ repoRoot });
  assert.strictEqual(state.state, LEDGER_STATES.LEDGER_INCONSISTENT);
  assert.strictEqual(state.reason, "ENTRY_MISMATCH");
});

test("rebuildLedgerFromIndividualRecords: reconstrucción concurrente segura mediante writeJsonAtomic", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "test5.txt"), "5", "utf8");
  execFileSync("git", ["add", "test5.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: test commit 5"], { cwd: repoRoot });
  const sha5 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const identity5 = getCommitIdentity(repoRoot, sha5);
  const mock5 = await createMockEvidenceRecord(repoRoot, sha5, "A");

  await recordCommitEvidence({
    repoRoot,
    commitSha: sha5,
    verificationStatus: "passed",
    snapshotHash: mock5.snapshotHash,
    runKey: mock5.runKey,
    recordPath: mock5.recordPath,
    recordDigest: mock5.recordDigest,
    branch: "main",
    parentSha: identity5.parents[0] || null,
    treeSha: identity5.treeSha,
    stagedFiles: ["test5.txt"],
    gateId: "A",
    policyHash: mock5.policyHash,
  });

  // Corromper el archivo consolidado
  await fs.writeFile(path.join(repoRoot, LEDGER_FILE), "{invalid", "utf8");

  // Reconstrucciones concurrentes
  const results = await Promise.all([
    rebuildLedgerFromIndividualRecords({ repoRoot }),
    rebuildLedgerFromIndividualRecords({ repoRoot }),
    rebuildLedgerFromIndividualRecords({ repoRoot }),
  ]);

  for (const res of results) {
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].commitSha, sha5);
  }

  const finalState = await getLedgerState({ repoRoot });
  assert.strictEqual(finalState.state, LEDGER_STATES.VALID_LEDGER);
});

