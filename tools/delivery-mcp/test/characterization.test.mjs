import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  recordPreparedEvidence,
  getLastPreparedEvidence,
  verifyPreparedEvidence,
  recordCommitEvidence,
  queryCommitEvidence,
  LEDGER_DIR,
  LEDGER_FILE,
} from "../lib/delivery-ledger.mjs";
import { selectGate } from "../lib/select-gate.mjs";
import { loadDeliveryPolicy } from "../lib/policy-loader.mjs";
import { finalizeDelivery } from "../lib/delivery-finalize.mjs";
import { runPrePushHook } from "../lib/git-hooks.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-char-test-"));
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
  await fs.copyFile(
    path.join(".delivery", "policy.v1.json"),
    path.join(repoRoot, ".delivery", "policy.v1.json")
  );
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

async function createExecutionRecord(repoRoot, {
  snapshotHash,
  runKey,
  gateId = "A",
  policyHash,
  status = "passed",
  scopeFeatures = [],
}) {
  const recordPath = `.delivery/runtime/records/${runKey}.json`;
  const record = {
    schemaVersion: 1,
    status,
    snapshotHash,
    runKey,
    cached: false,
    policy: { version: 1, hash: policyHash },
    gate: {
      id: gateId,
      reasonCodes: ["TEST_EVIDENCE"],
      checkIds: [],
      parameters: { scopeFeatures },
      postPushChecks: gateId === "D" ? ["ci_green"] : [],
    },
    summary: { passed: 0, failed: 0, skipped: 0, durationMs: 0 },
    checks: [],
    diagnostics: [],
    evidence: { recordPath },
  };
  const rawRecord = `${JSON.stringify(record, null, 2)}\n`;
  await fs.writeFile(path.join(repoRoot, recordPath), rawRecord, "utf8");
  return { record, recordPath, digest: crypto.createHash("sha256").update(rawRecord).digest("hex") };
}

test("characterization: nuevos campos de receipt, invalidación por policyHash, validación de repairsSha y backwards compatibility", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const stagedTreeSha = execFileSync("git", ["write-tree"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const snapshotHash = crypto.createHash("sha256").update("snapshot:1").digest("hex");
  const runKey = crypto.createHash("sha256").update("run:1").digest("hex");
  const policyHash = crypto.createHash("sha256").update("policy:v1").digest("hex");

  const execRec = await createExecutionRecord(repoRoot, {
    snapshotHash,
    runKey,
    gateId: "A",
    policyHash,
  });

  const snapshot = {
    snapshotHash,
    headSha,
    stagedTreeSha,
    branch: "main",
    stagedFiles: ["README.md"],
    proposedUsId: "35.5",
  };
  const inspection = {
    gate: { id: "A" },
    policy: { hash: policyHash },
    repairsSha: "1111111111111111111111111111111111111111",
  };

  const repairedFailure = {
    checkId: "test-unit",
    message: "1 test failed",
  };

  // 1. Registrar evidencia preparada con nuevos campos de reparación
  const recorded = await recordPreparedEvidence({
    repoRoot,
    snapshot,
    inspection,
    intent: "repair_ci",
    runKey,
    status: "passed",
    recordPath: execRec.recordPath,
    repairsSha: "1111111111111111111111111111111111111111",
    supersedes: ["1111111111111111111111111111111111111111"],
    repairStatus: "prepared",
    repairedFailure,
  });

  assert.strictEqual(recorded.repairsSha, "1111111111111111111111111111111111111111");
  assert.deepStrictEqual(recorded.supersedes, ["1111111111111111111111111111111111111111"]);
  assert.strictEqual(recorded.repairStatus, "prepared");
  assert.deepStrictEqual(recorded.repairedFailure, repairedFailure);
  assert.strictEqual(recorded.policyHash, policyHash);

  // 2. Comprobar que getLastPreparedEvidence recupera los campos
  const lastPrepared = await getLastPreparedEvidence({ repoRoot });
  assert.strictEqual(lastPrepared.repairsSha, "1111111111111111111111111111111111111111");
  assert.deepStrictEqual(lastPrepared.supersedes, ["1111111111111111111111111111111111111111"]);
  assert.strictEqual(lastPrepared.repairStatus, "prepared");

  // 3. Verificación exitosa con policyHash y repairsSha coincidentes
  const verifiedMatch = await verifyPreparedEvidence({
    repoRoot,
    snapshot,
    inspection,
    intent: "repair_ci",
    policyHash,
    repairsSha: "1111111111111111111111111111111111111111",
  });
  assert.strictEqual(verifiedMatch.valid, true);

  // 4. Invalidación natural por cambio de policyHash -> POLICY_MISMATCH
  const differentPolicyHash = crypto.createHash("sha256").update("policy:v2-modified").digest("hex");
  const verifiedPolicyMismatch = await verifyPreparedEvidence({
    repoRoot,
    snapshot,
    inspection: { ...inspection, policy: { hash: differentPolicyHash } },
    policyHash: differentPolicyHash,
  });
  assert.strictEqual(verifiedPolicyMismatch.valid, false);
  assert.strictEqual(verifiedPolicyMismatch.reason, "POLICY_MISMATCH");

  // 5. Invalidación si repairsSha no coincide
  const verifiedShaMismatch = await verifyPreparedEvidence({
    repoRoot,
    snapshot,
    inspection,
    repairsSha: "2222222222222222222222222222222222222222",
  });
  assert.strictEqual(verifiedShaMismatch.valid, false);
  assert.strictEqual(verifiedShaMismatch.reason, "REPAIRS_SHA_MISMATCH");

  // 6. Backwards compatibility: lectura y verificación de un receipt antiguo (sin repairsSha, supersedes, etc.)
  const oldReceipt = {
    schemaVersion: 2,
    recordedAt: "2026-09-01T10:00:00.000Z",
    status: "passed",
    snapshotHash,
    runKey,
    recordPath: execRec.recordPath,
    recordDigest: execRec.digest,
    branch: "main",
    parentHeadSha: headSha,
    stagedTreeSha,
    stagedFiles: ["README.md"],
    gateId: "A",
    policyHash,
    intent: "prepare_commit",
    usId: "35.5",
    featureFile: null,
    scenarioName: null,
    scopeFiles: [],
    consumedByCommitSha: null,
    consumedAt: null,
    // Sin repairsSha, supersedes, repairStatus, repairedFailure
  };

  const verifiedOldReceipt = await verifyPreparedEvidence({
    repoRoot,
    prepared: oldReceipt,
    snapshot,
    inspection: { gate: { id: "A" }, policy: { hash: policyHash } },
  });
  assert.strictEqual(verifiedOldReceipt.valid, true);

  // 7. Backwards compatibility: commit ledger antiguo en queryCommitEvidence
  const legacyCommitSha = headSha;
  const legacyIdentity = getCommitIdentity(repoRoot, legacyCommitSha);
  const legacyEntry = {
    schemaVersion: 2,
    commitSha: legacyCommitSha,
    status: "passed",
    verificationStatus: "passed",
    snapshotHash,
    runKey,
    recordPath: execRec.recordPath,
    recordDigest: execRec.digest,
    branch: "main",
    parentSha: legacyIdentity.parents[0] || null,
    treeSha: legacyIdentity.treeSha,
    stagedFiles: ["README.md"],
    gateId: "A",
    policyHash,
    intent: "prepare_commit",
    usId: "35.5",
    featureFile: null,
    scenarioName: null,
    scopeFiles: [],
    recordedAt: "2026-09-01T10:00:00.000Z",
  };
  await fs.mkdir(path.join(repoRoot, LEDGER_DIR), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, LEDGER_DIR, `${legacyCommitSha}.json`),
    JSON.stringify(legacyEntry, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(repoRoot, LEDGER_FILE),
    JSON.stringify({ [legacyCommitSha]: legacyEntry }, null, 2),
    "utf8"
  );

  const queryLegacy = await queryCommitEvidence({ repoRoot, commitSha: legacyCommitSha });
  assert.strictEqual(queryLegacy.valid, true);
  assert.strictEqual(queryLegacy.state, "verified");
});

test("characterization: bypass ambiental DELIVERY_SKIP_CI_CHECK es rechazado con DEPRECATED_CI_BYPASS_REJECTED", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-char-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1: registrado en el ledger, pero su CI falló remotamente
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "c1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const sha1 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const id1 = getCommitIdentity(repoRoot, sha1);
  const rec1 = await createExecutionRecord(repoRoot, {
    snapshotHash: "s1",
    runKey: "r1",
    policyHash: "p1",
  });
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha1,
    snapshotHash: "s1",
    runKey: "r1",
    recordPath: rec1.recordPath,
    recordDigest: rec1.digest,
    branch: "main",
    parentSha: id1.parents[0] || null,
    treeSha: id1.treeSha,
    stagedFiles: ["file1.txt"],
    gateId: "A",
    policyHash: "p1",
  });

  // Push commit 1 al remote
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Commit 2: nuevo commit local a pushear
  await fs.writeFile(path.join(repoRoot, "file2.txt"), "c2", "utf8");
  execFileSync("git", ["add", "file2.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: commit 2"], { cwd: repoRoot });
  const sha2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const id2 = getCommitIdentity(repoRoot, sha2);
  const rec2 = await createExecutionRecord(repoRoot, {
    snapshotHash: "s2",
    runKey: "r2",
    policyHash: "p1",
  });
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha2,
    snapshotHash: "s2",
    runKey: "r2",
    recordPath: rec2.recordPath,
    recordDigest: rec2.digest,
    branch: "main",
    parentSha: id2.parents[0] || null,
    treeSha: id2.treeSha,
    stagedFiles: ["file2.txt"],
    gateId: "A",
    policyHash: "p1",
  });

  const ciProvider = new MockCiProvider();
  // sha1 falló en CI
  ciProvider.setFixture(sha1, {
    status: "failed",
    failure: { message: "Unit tests failed on remote CI" },
  });

  const pushLine = `refs/heads/main ${sha2} refs/heads/main ${sha1}`;

  // Comportamiento SIN bypass: pre-push bloquea porque el CI de sha1 está fallido
  const pushNormal = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider,
  });
  assert.strictEqual(pushNormal.passed, false);
  assert.strictEqual(pushNormal.reason, "PRIOR_COMMIT_CI_FAILED");
  assert.strictEqual(pushNormal.sha, sha1);

  // Comportamiento CON bypass DELIVERY_SKIP_CI_CHECK: es rechazado explícitamente
  const origEnv = process.env.DELIVERY_SKIP_CI_CHECK;
  process.env.DELIVERY_SKIP_CI_CHECK = "1";
  try {
    const pushBypassed = await runPrePushHook({
      repoRoot,
      stdinLines: [pushLine],
      ciProvider,
    });
    assert.strictEqual(pushBypassed.passed, false);
    assert.strictEqual(pushBypassed.reason, "DEPRECATED_CI_BYPASS_REJECTED");
    assert.strictEqual(
      pushBypassed.message,
      "DELIVERY_SKIP_CI_CHECK is deprecated and forbidden. Use repair_ci workflow for CI failure remediation."
    );
  } finally {
    if (origEnv === undefined) delete process.env.DELIVERY_SKIP_CI_CHECK;
    else process.env.DELIVERY_SKIP_CI_CHECK = origEnv;
  }
});

test("characterization: comportamiento actual de Gate 0 sobre steps existentes", async () => {
  const policy = await loadDeliveryPolicy();

  // Al modificar un step existente (con o sin su feature), actualmente la clasificación
  // solo mira prefijos/extensiones estáticas y asigna Gate 0 sin comprobar si el step
  // ya existe o si es consumido por una o más features.
  const result = selectGate({
    intent: "prepare_commit",
    snapshot: {
      stagedFiles: [
        "features/proposal/accept-proposal.feature",
        "features/proposal/steps/accept-proposal.steps.ts",
      ],
    },
    policy,
  });

  assert.strictEqual(result.gate.id, "0");
  assert.strictEqual(result.status, "ready");
  assert.deepStrictEqual(result.gate.checks, ["make test-e2e-steps-compatible"]);
  // Batch 3 incorporará el índice de impacto de Cucumber para resolver si este step
  // tiene consumidores y requiere Gate B o Gate C en vez de Gate 0 estático.
});

test("characterization: fallo de CI histórico en close_us cuando un commit previo no está passed", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-char-remote2-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  const policyHash = crypto.createHash("sha256").update("test-policy").digest("hex");

  // Commit 1 de US-35: commit con fallo de CI
  await fs.writeFile(path.join(repoRoot, "task.txt"), "task 1", "utf8");
  execFileSync("git", ["add", "task.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore[35]: first attempt"], { cwd: repoRoot });
  const sha1 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const id1 = getCommitIdentity(repoRoot, sha1);
  const rec1 = await createExecutionRecord(repoRoot, {
    snapshotHash: "s1",
    runKey: "r1",
    gateId: "A",
    policyHash,
  });
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha1,
    snapshotHash: "s1",
    runKey: "r1",
    recordPath: rec1.recordPath,
    recordDigest: rec1.digest,
    branch: "main",
    parentSha: id1.parents[0] || null,
    treeSha: id1.treeSha,
    stagedFiles: ["task.txt"],
    gateId: "A",
    policyHash,
    usId: "35",
  });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Commit 2 de US-35 (HEAD): Gate D passed
  await fs.mkdir(path.join(repoRoot, "features", "auth"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "features", "auth", "login.feature"), "Feature: Login\nScenario: Ok\n", "utf8");
  execFileSync("git", ["add", "features/auth/login.feature"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore[35]: close us"], { cwd: repoRoot });
  const sha2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const id2 = getCommitIdentity(repoRoot, sha2);
  const rec2 = await createExecutionRecord(repoRoot, {
    snapshotHash: "s2",
    runKey: "r2",
    gateId: "D",
    policyHash,
    scopeFeatures: ["features/auth/login.feature"],
  });
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha2,
    snapshotHash: "s2",
    runKey: "r2",
    recordPath: rec2.recordPath,
    recordDigest: rec2.digest,
    branch: "main",
    parentSha: id2.parents[0] || null,
    treeSha: id2.treeSha,
    stagedFiles: ["features/auth/login.feature"],
    gateId: "D",
    policyHash,
    intent: "close_us",
    usId: "35",
    scopeFiles: ["features/auth/login.feature"],
  });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // CI: commit 1 falló, commit 2 pasó
  const ciProvider = new MockCiProvider();
  ciProvider.setFixture(sha1, {
    status: "failed",
    failure: { message: "Prior commit CI broke" },
  });
  ciProvider.setFixture(sha2, {
    status: "passed",
  });

  // finalizeDelivery(close_us) inspecciona todos los commits de la US.
  // Actualmente, si sha1 falló en CI, bloquea el cierre con CI_NOT_GREEN,
  // aun cuando HEAD (sha2) pasó Gate D y tiene CI verde.
  const finalizeRes = await finalizeDelivery({
    repoRoot,
    intent: "close_us",
    usId: "35",
    scopeFiles: ["features/auth/login.feature"],
    ciProvider,
  });

  assert.strictEqual(finalizeRes.finalized, false);
  assert.strictEqual(finalizeRes.status, "blocked");
  assert.strictEqual(finalizeRes.reason, "CI_NOT_GREEN");
  assert.strictEqual(finalizeRes.sha, sha1);
  // Batch 5 introducirá 'repairs'/'supersedes' para permitir que sha2 subsane formalmente a sha1.
});

test("characterization: evidencia Gate D ligada directamente a HEAD", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-char-remote3-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  const policyHash = crypto.createHash("sha256").update("test-policy").digest("hex");

  // Crear commit que solo tiene Gate A (no Gate D)
  await fs.mkdir(path.join(repoRoot, "features", "auth"), { recursive: true });
  await fs.writeFile(path.join(repoRoot, "features", "auth", "login.feature"), "Feature: Login\nScenario: Ok\n", "utf8");
  execFileSync("git", ["add", "features/auth/login.feature"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "feat[35]: add feature without gate D"], { cwd: repoRoot });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const id = getCommitIdentity(repoRoot, sha);
  const recA = await createExecutionRecord(repoRoot, {
    snapshotHash: "sa",
    runKey: "ra",
    gateId: "A",
    policyHash,
  });
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    snapshotHash: "sa",
    runKey: "ra",
    recordPath: recA.recordPath,
    recordDigest: recA.digest,
    branch: "main",
    parentSha: id.parents[0] || null,
    treeSha: id.treeSha,
    stagedFiles: ["features/auth/login.feature"],
    gateId: "A",
    policyHash,
    intent: "close_us",
    usId: "35",
  });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const ciProvider = new MockCiProvider();
  ciProvider.setFixture(sha, { status: "passed" });

  // 1. HEAD tiene Gate A -> denegado por GATE_D_REQUIRED
  const resGateA = await finalizeDelivery({
    repoRoot,
    intent: "close_us",
    usId: "35",
    scopeFiles: ["features/auth/login.feature"],
    ciProvider,
  });
  assert.strictEqual(resGateA.finalized, false);
  assert.strictEqual(resGateA.reason, "GATE_D_REQUIRED");

  // 2. Si se registra evidencia Gate D para ese mismo HEAD
  const recD = await createExecutionRecord(repoRoot, {
    snapshotHash: "sd",
    runKey: "rd",
    gateId: "D",
    policyHash,
    scopeFeatures: ["features/auth/login.feature"],
  });
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha,
    snapshotHash: "sd",
    runKey: "rd",
    recordPath: recD.recordPath,
    recordDigest: recD.digest,
    branch: "main",
    parentSha: id.parents[0] || null,
    treeSha: id.treeSha,
    stagedFiles: ["features/auth/login.feature"],
    gateId: "D",
    policyHash,
    intent: "close_us",
    usId: "35",
    scopeFiles: ["features/auth/login.feature"],
  });

  // Ahora finalizeDelivery aprueba porque HEAD tiene evidencia Gate D válida
  const resGateD = await finalizeDelivery({
    repoRoot,
    intent: "close_us",
    usId: "35",
    scopeFiles: ["features/auth/login.feature"],
    ciProvider,
  });
  assert.strictEqual(resGateD.finalized, true);
  assert.strictEqual(resGateD.status, "passed");
  assert.strictEqual(resGateD.headSha, sha);
});
