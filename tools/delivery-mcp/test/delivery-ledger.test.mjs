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
    branch: "main",
    parentSha: identity.parents[0] || null,
    treeSha: identity.treeSha,
    stagedFiles: ["file.txt"],
    gateId,
    policyHash: mockEvidence.policyHash,
    intent,
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
  assert.strictEqual(res.invalidRepairs[0].reason, "NOT_ANCESTOR");
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
  assert.strictEqual(res.invalidRepairs[0].reason, "TARGET_CI_PASSED");
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
