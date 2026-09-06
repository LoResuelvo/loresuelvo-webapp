import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  validateCommitMessage,
  runPreCommitHook,
  runCommitMsgHook,
  runPostCommitHook,
  runPrePushHook,
  installHooks,
  getHooksStatus,
} from "../lib/git-hooks.mjs";
import {
  hasCommitEvidence,
  getCommitEvidence,
  recordCommitEvidence,
} from "../lib/delivery-ledger.mjs";
import {
  saveDeliveryContext,
  loadDeliveryContext,
} from "../lib/delivery-context.mjs";
import { captureGitSnapshot } from "../lib/git-snapshot.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";
import { MockCiProvider } from "../lib/ci-provider.mjs";

test("validateCommitMessage: valida tipos gobernados y rechaza (agent) y scopes entre parentesis", () => {
  // 1. Mensajes validos
  assert.strictEqual(validateCommitMessage("chore: update build script").valid, true);
  assert.strictEqual(validateCommitMessage("docs: update readme").valid, true);
  assert.strictEqual(validateCommitMessage("test: add integration test").valid, true);
  assert.strictEqual(validateCommitMessage("ci: configure runner").valid, true);
  assert.strictEqual(validateCommitMessage("fix: resolve null pointer").valid, true);
  assert.strictEqual(validateCommitMessage("refactor: split component").valid, true);
  assert.strictEqual(validateCommitMessage("chore[30.1]: bump dependencies").valid, true);
  assert.strictEqual(validateCommitMessage("fix[US-01]: correct button style").valid, true);
  assert.strictEqual(validateCommitMessage("feat: add provider search").valid, true);
  assert.strictEqual(validateCommitMessage("feat[54]: add provider search").valid, true);

  // 3. Rechaza (agent) y scopes entre parentesis
  const agentRes = validateCommitMessage("chore(agent): do not commit this");
  assert.strictEqual(agentRes.valid, false);
  assert.strictEqual(agentRes.reason, "AGENT_SCOPE_FORBIDDEN");

  const parenRes = validateCommitMessage("fix(ui): button layout broken");
  assert.strictEqual(parenRes.valid, false);
  assert.strictEqual(parenRes.reason, "PAREN_SCOPE_FORBIDDEN");

  // 4. Rechaza tipos no permitidos
  const invalidTypeRes = validateCommitMessage("custom: something");
  assert.strictEqual(invalidTypeRes.valid, false);
  assert.strictEqual(invalidTypeRes.reason, "INVALID_TYPE");

  // 5. Rechaza descripcion vacia
  const emptyDesc = validateCommitMessage("chore: ");
  assert.strictEqual(emptyDesc.valid, false);
});

test("validateCommitMessage: valida US ID contra contexto activo", () => {
  const activeContext = {
    usId: "30.1",
    intent: "close_scenario",
    consumed: false,
  };

  // Coincide
  assert.strictEqual(validateCommitMessage("chore[30.1]: message", activeContext).valid, true);

  // Contradice
  const conflict = validateCommitMessage("chore[30.2]: message", activeContext);
  assert.strictEqual(conflict.valid, false);
  assert.strictEqual(conflict.reason, "CONTEXT_US_CONFLICT");

  // close_us exige US en mensaje
  const closeUsContext = { usId: "30.1", intent: "close_us", consumed: false };
  const missingUs = validateCommitMessage("chore: message without US", closeUsContext);
  assert.strictEqual(missingUs.valid, false);
  assert.strictEqual(missingUs.reason, "MISSING_US_IN_MESSAGE");
});

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-git-hooks-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));

  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  // Copy policy and schemas
  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  await fs.copyFile(".delivery/policy.v1.json", path.join(repoRoot, ".delivery", "policy.v1.json"));
  await fs.copyFile(
    ".delivery/schemas/policy.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "policy.schema.json")
  );
  await fs.copyFile(
    ".delivery/schemas/inspection-result.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "inspection-result.schema.json")
  );
  await fs.copyFile(
    ".delivery/schemas/execution-result.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "execution-result.schema.json")
  );
  await fs.copyFile(
    ".delivery/schemas/delivery-context.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "delivery-context.schema.json")
  );
  await fs.copyFile(
    ".delivery/schemas/ci-inspection-result.schema.json",
    path.join(repoRoot, ".delivery", "schemas", "ci-inspection-result.schema.json")
  );
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));

  // Initial commit
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Test Repo\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });

  return repoRoot;
}

test("hooks install y status: configura core.hooksPath e inspecciona hooks", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const initialStatus = await getHooksStatus({ repoRoot });
  assert.strictEqual(initialStatus.configured, false);

  const installResult = await installHooks({ repoRoot });
  assert.strictEqual(installResult.installed, true);

  const afterStatus = await getHooksStatus({ repoRoot });
  assert.strictEqual(afterStatus.configured, true);
  assert.strictEqual(afterStatus.configuredPath, ".githooks");
});

test("commit-msg hook: bloquea mensaje invalido y permite valido", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // 1. Mensaje con feat válido para trabajo productivo
  const featMsgFile = path.join(repoRoot, "msg-feat.txt");
  await fs.writeFile(featMsgFile, "feat: new component\n", "utf8");
  const featRes = await runCommitMsgHook({ repoRoot, messageFilePath: featMsgFile });
  assert.strictEqual(featRes.passed, true);

  // 2. Mensaje con (agent)
  const agentMsgFile = path.join(repoRoot, "msg-agent.txt");
  await fs.writeFile(agentMsgFile, "chore(agent): commit change\n", "utf8");
  const agentRes = await runCommitMsgHook({ repoRoot, messageFilePath: agentMsgFile });
  assert.strictEqual(agentRes.passed, false);
  assert.strictEqual(agentRes.reason, "AGENT_SCOPE_FORBIDDEN");

  // 3. Mensaje con scopes entre parentesis
  const parenMsgFile = path.join(repoRoot, "msg-paren.txt");
  await fs.writeFile(parenMsgFile, "fix(ui): button overflow\n", "utf8");
  const parenRes = await runCommitMsgHook({ repoRoot, messageFilePath: parenMsgFile });
  assert.strictEqual(parenRes.passed, false);
  assert.strictEqual(parenRes.reason, "PAREN_SCOPE_FORBIDDEN");

  // 4. Mensaje con US contradictoria a contexto actual
  await fs.writeFile(path.join(repoRoot, "context.txt"), "context", "utf8");
  execFileSync("git", ["add", "context.txt"], { cwd: repoRoot });
  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  await saveDeliveryContext({
    repoRoot,
    snapshot,
    usId: "30.1",
  });
  const conflictMsgFile = path.join(repoRoot, "msg-conflict.txt");
  await fs.writeFile(conflictMsgFile, "chore[30.2]: update something\n", "utf8");
  const conflictRes = await runCommitMsgHook({ repoRoot, messageFilePath: conflictMsgFile });
  assert.strictEqual(conflictRes.passed, false);
  assert.strictEqual(conflictRes.reason, "CONTEXT_US_CONFLICT");

  // 5. Mensaje valido
  const validMsgFile = path.join(repoRoot, "msg-valid.txt");
  await fs.writeFile(validMsgFile, "chore[30.1]: clean up code\n", "utf8");
  const validRes = await runCommitMsgHook({ repoRoot, messageFilePath: validMsgFile });
  assert.strictEqual(validRes.passed, true);
});

test("commit-msg hook: ignora contexto close_us vencido y conserva uno vigente", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const messageFilePath = path.join(repoRoot, "message.txt");
  await fs.writeFile(messageFilePath, "chore[30.2]: continue another story\n", "utf8");

  await saveDeliveryContext({
    repoRoot,
    snapshot: { branch: "main", headSha: "0".repeat(40), snapshotHash: "1".repeat(64) },
    intent: "close_us",
    usId: "30.1",
  });
  const stale = await runCommitMsgHook({ repoRoot, messageFilePath });
  assert.strictEqual(stale.passed, true);
  assert.strictEqual(stale.contextValidation.reason, "CONTEXT_HEAD_MISMATCH");

  await fs.writeFile(path.join(repoRoot, "context.txt"), "context", "utf8");
  execFileSync("git", ["add", "context.txt"], { cwd: repoRoot });
  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  await saveDeliveryContext({ repoRoot, snapshot, intent: "close_us", usId: "30.1" });
  const current = await runCommitMsgHook({ repoRoot, messageFilePath });
  assert.strictEqual(current.passed, false);
  assert.strictEqual(current.reason, "CONTEXT_US_CONFLICT");
});

test("pre-commit hook: en modo normal permite commit sin receipt con aviso, y en modo estricto bloquea", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // 1. Modo normal sin receipt -> pasa con warning y verified: false
  const resNormal = await runPreCommitHook({ repoRoot });
  assert.strictEqual(resNormal.passed, true);
  assert.strictEqual(resNormal.verified, false);
  assert.ok(resNormal.warning.includes("not_run"));

  // 2. Modo estricto (DELIVERY_REQUIRE_EVIDENCE=1) sin receipt -> bloquea
  const prevEnv = process.env.DELIVERY_REQUIRE_EVIDENCE;
  process.env.DELIVERY_REQUIRE_EVIDENCE = "1";
  try {
    const resStrict = await runPreCommitHook({ repoRoot });
    assert.strictEqual(resStrict.passed, false);
    assert.strictEqual(resStrict.verified, false);
    assert.strictEqual(resStrict.reason, "MISSING_PREPARED_EVIDENCE");
  } finally {
    if (prevEnv === undefined) delete process.env.DELIVERY_REQUIRE_EVIDENCE;
    else process.env.DELIVERY_REQUIRE_EVIDENCE = prevEnv;
  }
});

test("pre-commit hook: reutiliza receipt válido existente sin ejecutar checks", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const policyPath = path.join(repoRoot, ".delivery", "policy.v1.json");
  const policy = JSON.parse(await fs.readFile(policyPath, "utf8"));
  policy.gates.D.checkIds = [];
  await fs.writeFile(policyPath, `${JSON.stringify(policy, null, 2)}\n`, "utf8");
  execFileSync("git", ["add", ".delivery/policy.v1.json"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: simplify test gate"], { cwd: repoRoot });

  const featurePath = "features/close.feature";
  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, featurePath),
    "Feature: Close\n  Scenario: Done\n    Given ready\n",
    "utf8"
  );
  execFileSync("git", ["add", featurePath], { cwd: repoRoot });

  const first = await prepareDelivery({
    repoRoot,
    intent: "close_us",
    proposedCommitMessage: "test[55]: close delivery",
    scopeFiles: [featurePath],
  });
  assert.strictEqual(first.status, "passed");
  assert.strictEqual(first.gate.id, "D");

  const context = await loadDeliveryContext({ repoRoot });
  assert.strictEqual(context.intent, "close_us");
  assert.strictEqual(context.usId, "55");

  const start = Date.now();
  const second = await runPreCommitHook({ repoRoot });
  const duration = Date.now() - start;
  assert.strictEqual(second.passed, true);
  assert.strictEqual(second.verified, true);
  assert.strictEqual(second.gateId, "D");
  assert.ok(duration < 500, `pre-commit should be fast and read-only, took ${duration}ms`);
});

test("post-commit hook: asocia commitSha en el ledger y consume contexto activo", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // 1. Preparar exactamente el árbol que se convertirá en commit.
  await fs.writeFile(path.join(repoRoot, "note.txt"), "hello", "utf8");
  execFileSync("git", ["add", "note.txt"], { cwd: repoRoot });
  const snapshot = await captureGitSnapshot({ cwd: repoRoot });
  const prepared = await prepareDelivery({ repoRoot });
  assert.strictEqual(prepared.status, "passed");

  // 2. Contexto ligado al mismo snapshot.
  await saveDeliveryContext({
    repoRoot,
    snapshot,
    intent: "prepare_commit",
  });

  // 3. Crear commit en git
  execFileSync("git", ["commit", "-m", "docs: add note"], { cwd: repoRoot });
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // 4. Ejecutar post-commit
  const postRes = await runPostCommitHook({ repoRoot });
  assert.strictEqual(postRes.recorded, true);
  assert.strictEqual(postRes.commitSha, headSha);
  assert.strictEqual(postRes.verificationStatus, "passed");

  // 5. Verificar que el commit está en el ledger
  const hasEv = await hasCommitEvidence({ repoRoot, commitSha: headSha });
  assert.strictEqual(hasEv, true);
  const ev = await getCommitEvidence({ repoRoot, commitSha: headSha });
  assert.strictEqual(ev.snapshotHash, prepared.snapshotHash);
  assert.strictEqual(ev.treeSha, snapshot.stagedTreeSha);

  // 6. Verificar que el contexto fue consumido
  const ctx = await loadDeliveryContext({ repoRoot });
  assert.strictEqual(ctx.consumed, true);
});

test("post-commit hook: registra como not_run y no consume receipt si el árbol cambió después de prepare", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "note.txt"), "prepared", "utf8");
  execFileSync("git", ["add", "note.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");

  await fs.writeFile(path.join(repoRoot, "note.txt"), "different committed tree", "utf8");
  execFileSync("git", ["add", "note.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add changed note"], { cwd: repoRoot });
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  const postRes = await runPostCommitHook({ repoRoot });
  assert.strictEqual(postRes.recorded, true);
  assert.strictEqual(postRes.verificationStatus, "not_run");
  assert.strictEqual(postRes.reason, "PREPARED_EVIDENCE_MISMATCH");

  // El ledger registra el commit como not_run
  const ev = await getCommitEvidence({ repoRoot, commitSha: headSha });
  assert.strictEqual(ev.verificationStatus, "not_run");
  assert.strictEqual(ev.notRunReason, "PREPARED_EVIDENCE_MISMATCH");
});

test("post-commit hook: preserva una evidencia corrupta y no la reemplaza por not_run", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "corrupt.txt"), "corrupt", "utf8");
  execFileSync("git", ["add", "corrupt.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add corrupt evidence"], { cwd: repoRoot });
  const commitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const parentSha = execFileSync("git", ["rev-parse", "HEAD^"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const treeSha = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: repoRoot, encoding: "utf8" }).trim();

  await recordCommitEvidence({
    repoRoot,
    commitSha,
    verificationStatus: "passed",
    parentSha,
    treeSha,
    recordPath: ".delivery/runtime/records/missing.json",
  });

  const outcome = await runPostCommitHook({ repoRoot });
  assert.strictEqual(outcome.recorded, false);
  assert.strictEqual(outcome.blocked, true);
  assert.strictEqual(outcome.reason, "CORRUPT_COMMIT_EVIDENCE");
  assert.strictEqual(outcome.evidenceReason, "EVIDENCE_RECORD_INVALID");
  assert.strictEqual((await getCommitEvidence({ repoRoot, commitSha })).verificationStatus, "passed");
});

test("flujo humano: commit manual sin receipt se registra como not_run, push normal lo permite y strict lo bloquea", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });
  const baseSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // Commit manual humano (sin delivery:prepare)
  const start = Date.now();
  const preRes = await runPreCommitHook({ repoRoot });
  const preDuration = Date.now() - start;
  assert.strictEqual(preRes.passed, true);
  assert.strictEqual(preRes.verified, false);
  assert.ok(preDuration < 500, `Manual pre-commit took ${preDuration}ms (should be fast)`);

  await fs.writeFile(path.join(repoRoot, "manual.txt"), "manual edit", "utf8");
  execFileSync("git", ["add", "manual.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs[99]: human manual commit"], { cwd: repoRoot });
  const manualSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  const postRes = await runPostCommitHook({ repoRoot });
  assert.strictEqual(postRes.recorded, true);
  assert.strictEqual(postRes.verificationStatus, "not_run");
  assert.strictEqual(postRes.commitSha, manualSha);

  const pushLine = `refs/heads/main ${manualSha} refs/heads/main ${baseSha}`;

  // Push normal lo permite
  const pushNormal = await runPrePushHook({ repoRoot, stdinLines: [pushLine] });
  assert.strictEqual(pushNormal.passed, true);

  // Push con DELIVERY_REQUIRE_EVIDENCE=1 lo bloquea
  const prevEnv = process.env.DELIVERY_REQUIRE_EVIDENCE;
  process.env.DELIVERY_REQUIRE_EVIDENCE = "1";
  try {
    const pushStrict = await runPrePushHook({ repoRoot, stdinLines: [pushLine] });
    assert.strictEqual(pushStrict.passed, false);
    assert.strictEqual(pushStrict.reason, "UNVERIFIED_COMMIT_PUSH_BLOCKED");
  } finally {
    if (prevEnv === undefined) delete process.env.DELIVERY_REQUIRE_EVIDENCE;
    else process.env.DELIVERY_REQUIRE_EVIDENCE = prevEnv;
  }
});

test("pre-push hook: bloquea multiples commits y commits ausentes del ledger", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Crear remote bare
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  const baseSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // Commit 1
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: file 1"], { cwd: repoRoot });
  const sha1 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // Commit 2 (acumular 2 commits locales)
  await fs.writeFile(path.join(repoRoot, "file2.txt"), "2", "utf8");
  execFileSync("git", ["add", "file2.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: file 2"], { cwd: repoRoot });
  const sha2 = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // 1. Pre-push con 2 commits nuevos -> bloquea por MULTIPLE_COMMITS_PUSH
  const pushLineMultiple = `refs/heads/main ${sha2} refs/heads/main ${baseSha}`;
  const pushResMultiple = await runPrePushHook({ repoRoot, stdinLines: [pushLineMultiple] });
  assert.strictEqual(pushResMultiple.passed, false);
  assert.strictEqual(pushResMultiple.reason, "MULTIPLE_COMMITS_PUSH");

  // 2. Pre-push con 1 commit nuevo no registrado en el ledger -> bloquea
  const pushLineSingle = `refs/heads/main ${sha1} refs/heads/main ${baseSha}`;
  const pushResNoEv = await runPrePushHook({ repoRoot, stdinLines: [pushLineSingle] });
  assert.strictEqual(pushResNoEv.passed, false);
  assert.strictEqual(pushResNoEv.reason, "INVALID_COMMIT_EVIDENCE");
  assert.strictEqual(pushResNoEv.evidenceReason, "MISSING_EVIDENCE_IN_LEDGER");
});

test("pre-push hook: acepta evidencia exacta y bloquea si su record fue alterado", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });
  const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();

  await fs.writeFile(path.join(repoRoot, "file.txt"), "verified", "utf8");
  execFileSync("git", ["add", "file.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "docs: add verified file"], { cwd: repoRoot });
  const post = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post.recorded, true);

  const pushLine = `refs/heads/main ${post.commitSha} refs/heads/main ${baseSha}`;
  const valid = await runPrePushHook({ repoRoot, stdinLines: [pushLine] });
  assert.strictEqual(valid.passed, true);

  await fs.writeFile(path.join(repoRoot, post.ledgerEntry.recordPath), "{}\n", "utf8");
  const tampered = await runPrePushHook({ repoRoot, stdinLines: [pushLine] });
  assert.strictEqual(tampered.passed, false);
  assert.strictEqual(tampered.reason, "INVALID_COMMIT_EVIDENCE");
  assert.strictEqual(tampered.evidenceReason, "EVIDENCE_RECORD_INVALID");
});

test("repositorio sin hooks sigue pudiendo usar la CLI manualmente", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Status de hooks no configurados
  const status = await getHooksStatus({ repoRoot });
  assert.strictEqual(status.configured, false);

  // Inspección manual funciona sin hooks
  const { inspectDelivery } = await import("../lib/inspect-delivery.mjs");
  const res = await inspectDelivery({ repoRoot });
  assert.strictEqual(res.result.schemaVersion, 1);
  assert.strictEqual(res.result.status, "no_changes");
});

test("pre-push hook: si DELIVERY_SKIP_CI_CHECK está definida, pre-push es rechazado con DEPRECATED_CI_BYPASS_REJECTED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const pushLine = "refs/heads/main aaaa refs/heads/main bbbb";

  const origEnv = process.env.DELIVERY_SKIP_CI_CHECK;
  try {
    process.env.DELIVERY_SKIP_CI_CHECK = "1";
    const res = await runPrePushHook({ repoRoot, stdinLines: [pushLine] });
    assert.strictEqual(res.passed, false);
    assert.strictEqual(res.reason, "DEPRECATED_CI_BYPASS_REJECTED");
    assert.strictEqual(
      res.message,
      "DELIVERY_SKIP_CI_CHECK is deprecated and forbidden. Use repair_ci workflow for CI failure remediation."
    );

    // También con cualquier otro valor no vacío
    process.env.DELIVERY_SKIP_CI_CHECK = "true";
    const res2 = await runPrePushHook({ repoRoot, stdinLines: [pushLine] });
    assert.strictEqual(res2.passed, false);
    assert.strictEqual(res2.reason, "DEPRECATED_CI_BYPASS_REJECTED");
  } finally {
    if (origEnv === undefined) delete process.env.DELIVERY_SKIP_CI_CHECK;
    else process.env.DELIVERY_SKIP_CI_CHECK = origEnv;
  }
});

test("pre-push hook: si un commit previo devuelve status: provider_error, es bloqueado fail-closed (CI_PROVIDER_ERROR)", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 registrado en ledger y pusheado
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post1.recorded, true);
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Commit 2 nuevo local
  await fs.writeFile(path.join(repoRoot, "file2.txt"), "2", "utf8");
  execFileSync("git", ["add", "file2.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 2"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post2.recorded, true);

  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "provider_error" });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "CI_PROVIDER_ERROR");
  assert.strictEqual(
    pushRes.message,
    "Pre-push blocked: CI provider returned an error. Cannot determine remote CI safely."
  );
});

test("pre-push hook: si inspectCi arroja un error (excepción / offline), es bloqueado fail-closed (CI_INSPECTION_FAILED)", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 en ledger
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post1.recorded, true);
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Commit 2 nuevo local
  await fs.writeFile(path.join(repoRoot, "file2.txt"), "2", "utf8");
  execFileSync("git", ["add", "file2.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 2"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post2.recorded, true);

  const throwingCi = {
    async inspectCommit() {
      throw new Error("Network unreachable / offline");
    },
  };

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: throwingCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "CI_INSPECTION_FAILED");
  assert.strictEqual(pushRes.message, "Pre-push blocked: could not inspect remote CI.");
});

test("pre-push hook: flujo humano normal con not_run y límite de commits en vuelo", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 humano (not_run)
  await fs.writeFile(path.join(repoRoot, "h1.txt"), "h1", "utf8");
  execFileSync("git", ["add", "h1.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: human commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post1.verificationStatus, "not_run");
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Commit 2 humano (not_run)
  await fs.writeFile(path.join(repoRoot, "h2.txt"), "h2", "utf8");
  execFileSync("git", ["add", "h2.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: human commit 2"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post2.verificationStatus, "not_run");

  // CI de commit 1 está en progreso (pending)
  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "in_progress" });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  // En modo normal (DELIVERY_REQUIRE_EVIDENCE no es 1), un commit not_run pasa si CI está dentro del límite
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes.passed, true);
});

test("pre-commit y commit-msg hooks: rechazan DELIVERY_SKIP_CI_CHECK con DEPRECATED_CI_BYPASS_REJECTED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const origEnv = process.env.DELIVERY_SKIP_CI_CHECK;
  try {
    process.env.DELIVERY_SKIP_CI_CHECK = "1";
    const preCommitRes = await runPreCommitHook({ repoRoot });
    assert.strictEqual(preCommitRes.passed, false);
    assert.strictEqual(preCommitRes.reason, "DEPRECATED_CI_BYPASS_REJECTED");

    const msgFile = path.join(repoRoot, "msg.txt");
    await fs.writeFile(msgFile, "chore: test message\n", "utf8");
    const commitMsgRes = await runCommitMsgHook({ repoRoot, messageFilePath: msgFile });
    assert.strictEqual(commitMsgRes.passed, false);
    assert.strictEqual(commitMsgRes.reason, "DEPRECATED_CI_BYPASS_REJECTED");
  } finally {
    if (origEnv === undefined) delete process.env.DELIVERY_SKIP_CI_CHECK;
    else process.env.DELIVERY_SKIP_CI_CHECK = origEnv;
  }
});
