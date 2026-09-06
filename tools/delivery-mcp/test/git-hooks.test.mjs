import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
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
import { finalizeDelivery } from "../lib/delivery-finalize.mjs";

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

test("pre-push hook: un commit con receipt valido de Gate R para el SHA fallido previo puede pushearse", async (t) => {
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

  // CI de commit 1 falla
  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  // Commit 2: reparación con intent repair_ci para post1.commitSha
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });

  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });

  const prepRes = await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  assert.strictEqual(prepRes.status, "passed");
  assert.strictEqual(prepRes.gate.id, "R");

  execFileSync("git", ["commit", "-m", "fix: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });
  assert.strictEqual(post2.verificationStatus, "passed");
  assert.strictEqual(post2.ledgerEntry.gateId, "R");
  assert.strictEqual(post2.ledgerEntry.intent, "repair_ci");
  assert.strictEqual(post2.ledgerEntry.repairsSha, post1.commitSha);

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, true);
});

test("pre-push hook: reintento de red del mismo commit de reparación es permitido sin error (retry-safe)", async (t) => {
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
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  // Commit 2: reparación con Gate R
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  // Primer intento de push autoriza el commit
  const pushRes1 = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes1.passed, true);

  // Fallo de red simulado: git push no llegó al remoto, el remoto no tiene post2.commitSha.
  // Segundo intento de push con el MISMO commit SHA es permitido (retry-safe)
  const pushRes2 = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes2.passed, true);
});

test("pre-push hook: un segundo commit distinto intentando usar la misma reparación es bloqueado con REPAIR_RECEIPT_ALREADY_CONSUMED", async (t) => {
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
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  // Commit 2: reparación con Gate R para post1
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  const pushLine2 = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes1 = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine2],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes1.passed, true);

  // Commit 3: commit con diferente mensaje pero mismo árbol válido, intentando reutilizar la autorización de post1
  execFileSync("git", ["reset", "--hard", post1.commitSha], { cwd: repoRoot });
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "fix: second repair attempt different sha"], { cwd: repoRoot });
  const post3Sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  const entry2 = post2.ledgerEntry;
  await recordCommitEvidence({
    repoRoot,
    commitSha: post3Sha,
    verificationStatus: "passed",
    snapshotHash: entry2.snapshotHash,
    runKey: entry2.runKey,
    recordPath: entry2.recordPath,
    recordDigest: entry2.recordDigest,
    branch: "main",
    parentSha: post1.commitSha,
    treeSha: entry2.treeSha,
    stagedFiles: entry2.stagedFiles,
    gateId: "R",
    policyHash: entry2.policyHash,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    supersedes: entry2.supersedes,
  });

  const pushLine3 = `refs/heads/main ${post3Sha} refs/heads/main ${post1.commitSha}`;
  const pushRes3 = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine3],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes3.passed, false);
  assert.strictEqual(pushRes3.reason, "REPAIR_RECEIPT_ALREADY_CONSUMED");
});

test("pre-push hook: concurrencia de dos invocaciones simultáneas para el mismo receipt se resuelven de forma segura mediante lock", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;

  // Dos ejecuciones concurrentes de pre-push
  const [resA, resB] = await Promise.all([
    runPrePushHook({ repoRoot, stdinLines: [pushLine], ciProvider: mockCi }),
    runPrePushHook({ repoRoot, stdinLines: [pushLine], ciProvider: mockCi }),
  ]);

  assert.strictEqual(resA.passed, true);
  assert.strictEqual(resB.passed, true);
});

test("pre-push hook: commit de reparación ya presente en remoto o con CI pendiente se reconoce correctamente", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "failed" });

  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // Push inicial a remoto
  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({ repoRoot, stdinLines: [pushLine], ciProvider: mockCi });
  assert.strictEqual(pushRes.passed, true);
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // CI remoto ahora reconoce post2 con status in_progress
  mockCi.setFixture(post2.commitSha, { status: "in_progress" });

  // Reintento o push subsecuente del mismo commit es reconocido como ci_pending / submitted
  const pushRes2 = await runPrePushHook({ repoRoot, stdinLines: [pushLine], ciProvider: mockCi });
  assert.strictEqual(pushRes2.passed, true);
});

test("pre-push hook: un repair receipt para SHA A no puede autorizar el push de un fix para SHA B", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 pusheado
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // SHA A es algún otro commit hipotético
  const otherShaA = "a".repeat(40);
  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, { status: "failed" }); // SHA B falló
  mockCi.setFixture(otherShaA, { status: "failed" });

  // Commit 2 repara otherShaA, NO post1.commitSha
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: otherShaA,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit A"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // Intentamos pushear para arreglar el remoto donde post1.commitSha (SHA B) falló
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

test("pre-push hook: fallo previo subsanado por reparación verde no bloquea pushes posteriores", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // 1. Commit 1 que falló en CI
  await fs.writeFile(path.join(repoRoot, "src.txt"), "v1\n", "utf8");
  execFileSync("git", ["add", "src.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: bad commit"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider();
  mockCi.setFixture(post1.commitSha, {
    status: "failed",
    failure: { message: "CI failed for post1" },
  });

  // 2. Commit 2 de reparación Gate R
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed\n", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 1,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair bad commit"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // Pushear la reparación (válido)
  const pushLine1 = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes1 = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine1],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes1.passed, true);
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // 3. El CI de la reparación pasa a verde
  mockCi.setFixture(post2.commitSha, { status: "passed" });

  // 4. Commit 3 normal posterior (sin Gate R)
  await fs.writeFile(path.join(repoRoot, "subsequent.txt"), "next\n", "utf8");
  execFileSync("git", ["add", "subsequent.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: subsequent normal commit"], { cwd: repoRoot });
  const post3 = await runPostCommitHook({ repoRoot });

  // Pre-push para commit 3 debe permitir el push porque post1 fue formalmente subsanado
  const pushLine2 = `refs/heads/main ${post3.commitSha} refs/heads/main ${post2.commitSha}`;
  const pushRes2 = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine2],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes2.passed, true);
});

test("pre-push hook: reparación válida en la misma rama y US es permitida", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 con US 42
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot, usId: "42" })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore[42]: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "failed" },
  });

  // Commit 2 reparación para post1 en la misma rama ("main") y US ("42")
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    usId: "42",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix[42]: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, true);
});

test("pre-push hook: reparación de otra US es bloqueada con REPAIR_US_MISMATCH", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 con US 42
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot, usId: "42" })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore[42]: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "failed" },
  });

  // Commit 2 reparación declarando US 99 (mismatch con US 42 de commit 1)
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    usId: "99",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix[99]: repair commit 1 for wrong us"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_US_MISMATCH");
});

test("pre-push hook: reparación de otra rama es bloqueada con REPAIR_BRANCH_MISMATCH", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 en main
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1 on main"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "failed" },
  });

  // Cambiar a rama 'feature'
  execFileSync("git", ["checkout", "-b", "feature"], { cwd: repoRoot });
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit on feature"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  const pushLine = `refs/heads/feature ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_BRANCH_MISMATCH");
});

test("pre-push hook: reparación no descendiente del fallo es bloqueada con REPAIR_NOT_DESCENDANT", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 en main
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // Commit 2 en main (falla)
  await fs.writeFile(path.join(repoRoot, "file2.txt"), "2", "utf8");
  execFileSync("git", ["add", "file2.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 2"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "passed" },
    [post2.commitSha]: { status: "failed" },
  });

  // Rebobinar localmente a commit 1 y crear commit 3 que no desciende de commit 2
  execFileSync("git", ["reset", "--hard", post1.commitSha], { cwd: repoRoot });
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fix", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post2.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair attempt from old base"], { cwd: repoRoot });
  const post3 = await runPostCommitHook({ repoRoot });

  const pushLine = `refs/heads/main ${post3.commitSha} refs/heads/main ${post2.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_NOT_DESCENDANT");
});

test("pre-push hook: reparación con Gate no R es bloqueada con REPAIR_GATE_INVALID", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "failed" },
  });

  // Commit 2 con Gate A
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed"); // Gate A
  execFileSync("git", ["commit", "-m", "fix: repair attempt with Gate A"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // Forzar intent: repair_ci y repairsSha pero gateId: "A"
  const entry2 = await getCommitEvidence({ repoRoot, commitSha: post2.commitSha });
  entry2.intent = "repair_ci";
  entry2.repairsSha = post1.commitSha;
  await fs.writeFile(
    path.join(repoRoot, ".delivery/runtime/ledger", `${post2.commitSha}.json`),
    JSON.stringify(entry2, null, 2),
    "utf8"
  );

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_GATE_INVALID");
});

test("pre-push hook: reparación contra target ya verde es bloqueada con REPAIR_TARGET_NOT_FAILED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // Commit 1 pasa en CI
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "passed" }, // Ya pasó
  });

  // Commit 2 es una reparación para post1 que ya está verde
  await fs.writeFile(path.join(repoRoot, "fix.txt"), "fixed", "utf8");
  execFileSync("git", ["add", "fix.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  mockCi.setFixture(post1.commitSha, { status: "failed" });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: repair commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // Para el push, el CI de post1 ya es passed
  mockCi.setFixture(post1.commitSha, { status: "passed" });

  const pushLine = `refs/heads/main ${post2.commitSha} refs/heads/main ${post1.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_TARGET_NOT_FAILED");
});

test("pre-push hook: reparación contra target ya subsanado es bloqueada con REPAIR_ALREADY_SUPERSEDED", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  // 1. Commit 1 que falló
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "failed" },
  });

  // 2. Commit 2 repara commit 1
  await fs.writeFile(path.join(repoRoot, "fix1.txt"), "fix1", "utf8");
  execFileSync("git", ["add", "fix1.txt"], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "fix: first repair for commit 1"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  // El CI de post2 pasa (post1 queda subsanado)
  mockCi.setFixture(post2.commitSha, { status: "passed" });

  // 3. Commit 3 intenta reparar post1 de nuevo (ya subsanado)
  await fs.writeFile(path.join(repoRoot, "fix2.txt"), "fix2", "utf8");
  execFileSync("git", ["add", "fix2.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "fix: redundant repair for commit 1"], { cwd: repoRoot });
  const post3 = await runPostCommitHook({ repoRoot });

  // Registrar evidencia de reparación con Gate R válida para post3 apuntando al commit 1 ya subsanado
  const snapshotHash = crypto.createHash("sha256").update(`snapshot:${post3.commitSha}`).digest("hex");
  const runKey = crypto.createHash("sha256").update(`run:${post3.commitSha}:R`).digest("hex");
  const recordPath = `.delivery/runtime/records/${post3.commitSha}-R.json`;
  const policyHash = crypto.createHash("sha256").update("test-policy").digest("hex");
  const record = {
    schemaVersion: 1,
    status: "passed",
    snapshotHash,
    runKey,
    cached: false,
    policy: { version: 1, hash: policyHash },
    gate: {
      id: "R",
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
  await fs.mkdir(path.join(repoRoot, path.dirname(recordPath)), { recursive: true });
  await fs.writeFile(path.join(repoRoot, recordPath), rawRecord, "utf8");
  const recordDigest = crypto.createHash("sha256").update(rawRecord).digest("hex");

  const entry3 = await getCommitEvidence({ repoRoot, commitSha: post3.commitSha });
  entry3.intent = "repair_ci";
  entry3.repairsSha = post1.commitSha;
  entry3.gateId = "R";
  entry3.status = "passed";
  entry3.verificationStatus = "passed";
  entry3.snapshotHash = snapshotHash;
  entry3.runKey = runKey;
  entry3.recordPath = recordPath;
  entry3.recordDigest = recordDigest;
  entry3.policyHash = policyHash;
  await fs.writeFile(
    path.join(repoRoot, ".delivery/runtime/ledger", `${post3.commitSha}.json`),
    JSON.stringify(entry3, null, 2),
    "utf8"
  );

  const pushLine = `refs/heads/main ${post3.commitSha} refs/heads/main ${post2.commitSha}`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });

  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_ALREADY_SUPERSEDED");
});

test("paridad entre pre-push y finalizeDelivery en el rechazo de relaciones inválidas", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const remoteDir = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-remote-"));
  t.after(() => fs.rm(remoteDir, { recursive: true, force: true }));
  execFileSync("git", ["init", "--bare", "-b", "main"], { cwd: remoteDir });
  execFileSync("git", ["remote", "add", "origin", remoteDir], { cwd: repoRoot });
  execFileSync("git", ["push", "-u", "origin", "main"], { cwd: repoRoot });

  const initialSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // Commit 1 con US 42 que falla
  await fs.writeFile(path.join(repoRoot, "file1.txt"), "1", "utf8");
  execFileSync("git", ["add", "file1.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot, usId: "42" })).status, "passed");
  execFileSync("git", ["commit", "-m", "chore[42]: commit 1"], { cwd: repoRoot });
  const post1 = await runPostCommitHook({ repoRoot });
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot });

  const mockCi = new MockCiProvider({
    [post1.commitSha]: { status: "failed" },
  });

  // Commit 2 en rama aislada (no desciende de post1)
  execFileSync("git", ["checkout", "-b", "isolated-branch", initialSha], { cwd: repoRoot });
  const featurePath = "features/us42.feature";
  await fs.mkdir(path.join(repoRoot, "features"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, featurePath),
    "Feature: US42\n  Scenario: Done\n    Given ok\n",
    "utf8"
  );
  execFileSync("git", ["add", featurePath], { cwd: repoRoot });
  const fakeExecute = async ({ check }) => ({
    id: check.id,
    status: "passed",
    durationMs: 2,
    exitCode: 0,
    summaryLines: [],
    diagnostic: null,
  });
  await prepareDelivery({
    repoRoot,
    intent: "close_us",
    usId: "42",
    scopeFiles: [featurePath],
    repairsSha: post1.commitSha,
    ciProvider: mockCi,
    executeCheck: fakeExecute,
  });
  execFileSync("git", ["commit", "-m", "test[42]: repair outside branch"], { cwd: repoRoot });
  const post2 = await runPostCommitHook({ repoRoot });

  // 1. Pre-push hook bloquea con REPAIR_NOT_DESCENDANT
  const pushLine = `refs/heads/isolated-branch ${post2.commitSha} refs/heads/isolated-branch 0000000000000000000000000000000000000000`;
  const pushRes = await runPrePushHook({
    repoRoot,
    stdinLines: [pushLine],
    ciProvider: mockCi,
  });
  assert.strictEqual(pushRes.passed, false);
  assert.strictEqual(pushRes.reason, "REPAIR_NOT_DESCENDANT");

  // 2. finalizeDelivery bloquea con el mismo criterio (REPAIR_NOT_DESCENDANT)
  mockCi.setFixture(post2.commitSha, { status: "passed" });
  const prevAllow = process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE;
  process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE = "1";
  let finalizeRes;
  try {
    finalizeRes = await finalizeDelivery({
      repoRoot,
      intent: "close_us",
      usId: "42",
      scopeFiles: [featurePath],
      ciProvider: mockCi,
    });
  } finally {
    if (prevAllow === undefined) delete process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE;
    else process.env.DELIVERY_ALLOW_UNPUSHED_FINALIZE = prevAllow;
  }
  assert.strictEqual(finalizeRes.finalized, false);
  assert.strictEqual(finalizeRes.status, "blocked");
  assert.strictEqual(finalizeRes.invalidRepairs.length, 1);
  assert.strictEqual(finalizeRes.invalidRepairs[0].reason, pushRes.reason);
});
