import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { evaluateCiWindow } from "../lib/delivery-ledger.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";
import { runPostCommitHook, runPrePushHook } from "../lib/git-hooks.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-ci-window-test-"));
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
    "inspection-result.schema.json",
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

const fakeExecute = async ({ check }) => ({
  id: check.id,
  status: "passed",
  durationMs: 2,
  exitCode: 0,
  summaryLines: [],
  diagnostic: null,
});

test("evaluateCiWindow: ventana con 0 a 3 commits en vuelo permite avanzar", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const shas = [];

  const mockCi = new MockCiProvider();

  // Commit 1
  await fs.writeFile(path.join(repoRoot, "f1.txt"), "1", "utf8");
  execFileSync("git", ["add", "f1.txt"], { cwd: repoRoot });
  assert.strictEqual(
    (await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi })).status,
    "passed"
  );
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const p1 = await runPostCommitHook({ repoRoot });
  shas.push(p1.commitSha);
  mockCi.setFixture(p1.commitSha, { status: "in_progress" });

  // Con 1 commit en vuelo -> allowed
  const eval1 = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(eval1.allowed, true);
  assert.strictEqual(eval1.pendingCount, 1);

  // Commit 2
  await fs.writeFile(path.join(repoRoot, "f2.txt"), "2", "utf8");
  execFileSync("git", ["add", "f2.txt"], { cwd: repoRoot });
  assert.strictEqual(
    (await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi })).status,
    "passed"
  );
  execFileSync("git", ["commit", "-m", "chore: commit 2"], { cwd: repoRoot });
  const p2 = await runPostCommitHook({ repoRoot });
  shas.push(p2.commitSha);
  mockCi.setFixture(p2.commitSha, { status: "queued" });

  // Con 2 commits en vuelo -> allowed
  const eval2 = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(eval2.allowed, true);
  assert.strictEqual(eval2.pendingCount, 2);

  // Commit 3
  await fs.writeFile(path.join(repoRoot, "f3.txt"), "3", "utf8");
  execFileSync("git", ["add", "f3.txt"], { cwd: repoRoot });
  assert.strictEqual(
    (await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi })).status,
    "passed"
  );
  execFileSync("git", ["commit", "-m", "chore: commit 3"], { cwd: repoRoot });
  const p3 = await runPostCommitHook({ repoRoot });
  shas.push(p3.commitSha);
  mockCi.setFixture(p3.commitSha, { status: "not_found" });

  // Con 3 commits en vuelo -> allowed
  const eval3 = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(eval3.allowed, true);
  assert.strictEqual(eval3.pendingCount, 3);
});

test("evaluateCiWindow: ventana con 4 commits en vuelo bloquea con CI_WINDOW_FULL y reabre cuando uno pasa a verde", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const mockCi = new MockCiProvider();
  const shas = [];

  for (let i = 1; i <= 4; i++) {
    await fs.writeFile(path.join(repoRoot, `f${i}.txt`), `${i}`, "utf8");
    execFileSync("git", ["add", `f${i}.txt`], { cwd: repoRoot });
    assert.strictEqual(
      (await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi })).status,
      "passed"
    );
    execFileSync("git", ["commit", "-m", `chore: commit ${i}`], { cwd: repoRoot });
    const post = await runPostCommitHook({ repoRoot });
    shas.push(post.commitSha);
    mockCi.setFixture(post.commitSha, { status: "in_progress" });
  }

  // Ahora hay 4 commits en vuelo -> CI_WINDOW_FULL
  const evalFull = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(evalFull.allowed, false);
  assert.strictEqual(evalFull.code, "CI_WINDOW_FULL");
  assert.strictEqual(evalFull.pendingCount, 4);
  assert.strictEqual(evalFull.maxInFlightCommits, 4);

  // Commit 1 pasa a verde en CI
  mockCi.setFixture(shas[0], { status: "passed" });

  // Ventana reabierta: ahora hay 3 commits pendientes
  const evalReopened = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(evalReopened.allowed, true);
  assert.strictEqual(evalReopened.pendingCount, 3);
});

test("prepareDelivery: con 4 commits en vuelo bloquea de inmediato con CI_WINDOW_FULL sin ejecutar checks", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const mockCi = new MockCiProvider();

  for (let i = 1; i <= 4; i++) {
    await fs.writeFile(path.join(repoRoot, `f${i}.txt`), `${i}`, "utf8");
    execFileSync("git", ["add", `f${i}.txt`], { cwd: repoRoot });
    await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi });
    execFileSync("git", ["commit", "-m", `chore: commit ${i}`], { cwd: repoRoot });
    const post = await runPostCommitHook({ repoRoot });
    mockCi.setFixture(post.commitSha, { status: "in_progress" });
  }

  // Intento de preparar commit 5
  await fs.writeFile(path.join(repoRoot, "f5.txt"), "5", "utf8");
  execFileSync("git", ["add", "f5.txt"], { cwd: repoRoot });

  let checksRun = 0;
  const spyExecute = async () => {
    checksRun++;
    return { id: "check", status: "passed", durationMs: 1 };
  };

  const result = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    ciProvider: mockCi,
    executeCheck: spyExecute,
  });

  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(checksRun, 0, "No debe ejecutar checks cuando la ventana está llena");
  assert.ok(result.diagnostics.some((d) => d.code === "CI_WINDOW_FULL"));
  assert.strictEqual(result.pendingCount, 4);
  assert.strictEqual(result.maxInFlightCommits, 4);
});

test("prepareDelivery: fallo detectado en CI responde con REPAIR_REQUIRED y failedSha sin correr gate ordinario", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const mockCi = new MockCiProvider();

  // Commit 1
  await fs.writeFile(path.join(repoRoot, "f1.txt"), "1", "utf8");
  execFileSync("git", ["add", "f1.txt"], { cwd: repoRoot });
  await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi });
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });

  // CI falla para commit 1
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  // Intento de preparar un commit ordinario
  await fs.writeFile(path.join(repoRoot, "f2.txt"), "2", "utf8");
  execFileSync("git", ["add", "f2.txt"], { cwd: repoRoot });

  let checksRun = 0;
  const spyExecute = async () => {
    checksRun++;
    return { id: "check", status: "passed", durationMs: 1 };
  };

  const result = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    ciProvider: mockCi,
    executeCheck: spyExecute,
  });

  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(checksRun, 0, "No debe ejecutar checks ordinarios ante fallo no reparado");
  const repairDiag = result.diagnostics.find((d) => d.code === "REPAIR_REQUIRED");
  assert.ok(repairDiag, "Debe incluir diagnóstico REPAIR_REQUIRED");
  assert.strictEqual(result.failedSha, post1.commitSha);
  assert.strictEqual(repairDiag.failedSha, post1.commitSha);
  assert.ok(repairDiag.message.includes("repair_ci"));
});

test("repair_ci con repairsSha válido permite Gate R y reabre la ventana tras reparar", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();

  // Commit 1 falla
  await fs.writeFile(path.join(repoRoot, "f1.txt"), "1", "utf8");
  execFileSync("git", ["add", "f1.txt"], { cwd: repoRoot });
  await prepareDelivery({ repoRoot, usId: "42", executeCheck: fakeExecute, ciProvider: mockCi });
  execFileSync("git", ["commit", "-m", "chore[42]: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  // Preparación con repair_ci y repairsSha correcto
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });

  const repairResult = await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    usId: "42",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });

  assert.strictEqual(repairResult.status, "passed");
  assert.strictEqual(repairResult.gate.id, "R");

  // Commit de reparación
  execFileSync("git", ["commit", "-m", "fix[42]: repair commit 1"], { cwd: repoRoot });
  const postRepair = await runPostCommitHook({ repoRoot });

  // Push del repair permitido autoritativamente por pre-push
  const pushLine = `refs/heads/main ${postRepair.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes.passed, true);
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Tras reparación verde en CI, la ventana se reabre
  mockCi.setFixture(postRepair.commitSha, { status: "passed" });

  const windowAfterRepair = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(windowAfterRepair.allowed, true);
  assert.strictEqual(windowAfterRepair.unresolvedIncidents.length, 0);

  // Nuevo commit ordinario ahora es permitido
  await fs.writeFile(path.join(repoRoot, "next.txt"), "next", "utf8");
  execFileSync("git", ["add", "next.txt"], { cwd: repoRoot });
  const nextPrep = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  assert.strictEqual(nextPrep.status, "passed");
});

test("fallo que aparece entre prepare y push: runPrePushHook bloquea autoritativamente", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();

  // Commit 1 en progreso
  await fs.writeFile(path.join(repoRoot, "f1.txt"), "1", "utf8");
  execFileSync("git", ["add", "f1.txt"], { cwd: repoRoot });
  await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi });
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });
  mockCi.setFixture(post1.commitSha, { status: "in_progress" });

  // Commit 2 se prepara mientras commit 1 sigue in_progress
  await fs.writeFile(path.join(repoRoot, "f2.txt"), "2", "utf8");
  execFileSync("git", ["add", "f2.txt"], { cwd: repoRoot });
  const prep2 = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  assert.strictEqual(prep2.status, "passed", "Prepare pasa mientras CI estaba in_progress");

  execFileSync("git", ["commit", "-m", "chore: commit 2"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // AHORA commit 1 falla en CI antes del push de commit 2
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  // runPrePushHook bloquea autoritativamente
  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "PRIOR_COMMIT_CI_FAILED");
  assert.strictEqual(pushRes.sha, post1.commitSha);
});

test("errores de provider o credenciales no se interpretan como passed", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const mockCi = new MockCiProvider();

  await fs.writeFile(path.join(repoRoot, "f1.txt"), "1", "utf8");
  execFileSync("git", ["add", "f1.txt"], { cwd: repoRoot });
  await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi });
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });

  // CI reporta provider_error
  mockCi.setFixture(post1.commitSha, { status: "provider_error" });

  const evalProviderError = await evaluateCiWindow({ repoRoot, ciProvider: mockCi });
  assert.strictEqual(evalProviderError.allowed, false);
  assert.strictEqual(evalProviderError.code, "CI_PROVIDER_ERROR");

  // prepareDelivery bloquea con CI_PROVIDER_ERROR
  await fs.writeFile(path.join(repoRoot, "f2.txt"), "2", "utf8");
  execFileSync("git", ["add", "f2.txt"], { cwd: repoRoot });
  const prep = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  assert.strictEqual(prep.status, "blocked");
  assert.ok(prep.diagnostics.some((d) => d.code === "CI_PROVIDER_ERROR"));
});

test("cero polling en prepareDelivery y evaluateCiWindow: a lo sumo una inspección por commit", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const mockCi = new MockCiProvider();

  // Crear 2 commits
  for (let i = 1; i <= 2; i++) {
    await fs.writeFile(path.join(repoRoot, `f${i}.txt`), `${i}`, "utf8");
    execFileSync("git", ["add", `f${i}.txt`], { cwd: repoRoot });
    await prepareDelivery({ repoRoot, executeCheck: fakeExecute, ciProvider: mockCi });
    execFileSync("git", ["commit", "-m", `chore: commit ${i}`], { cwd: repoRoot });
    const post = await runPostCommitHook({ repoRoot });
    mockCi.setFixture(post.commitSha, { status: "in_progress" });
  }

  // Instrumentar inspectCommit para verificar que no hay polling loops
  const inspections = [];
  const trackedCi = {
    async inspectCommit(sha, options) {
      inspections.push(sha);
      return mockCi.inspectCommit(sha, options);
    },
  };

  await fs.writeFile(path.join(repoRoot, "f3.txt"), "3", "utf8");
  execFileSync("git", ["add", "f3.txt"], { cwd: repoRoot });

  const result = await prepareDelivery({
    repoRoot,
    intent: "prepare_commit",
    ciProvider: trackedCi,
    executeCheck: fakeExecute,
  });

  assert.strictEqual(result.status, "passed");
  // Cada commit se inspecciona una sola vez, sin bucles
  const uniqueInspections = new Set(inspections);
  assert.strictEqual(inspections.length, uniqueInspections.size, "No debe haber inspecciones duplicadas ni loops");
  assert.ok(inspections.length <= 2, "Solo inspecciona los commits en vuelo requeridos");
});
