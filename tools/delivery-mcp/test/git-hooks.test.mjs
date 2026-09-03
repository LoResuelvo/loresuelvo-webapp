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
  recordPreparedEvidence,
  recordCommitEvidence,
  hasCommitEvidence,
  getCommitEvidence,
} from "../lib/delivery-ledger.mjs";
import {
  saveDeliveryContext,
  loadDeliveryContext,
} from "../lib/delivery-context.mjs";

test("validateCommitMessage: valida formato, rechaza feat, rechaza (agent) y scopes entre parentesis", () => {
  // 1. Mensajes validos
  assert.strictEqual(validateCommitMessage("chore: update build script").valid, true);
  assert.strictEqual(validateCommitMessage("docs: update readme").valid, true);
  assert.strictEqual(validateCommitMessage("test: add integration test").valid, true);
  assert.strictEqual(validateCommitMessage("ci: configure runner").valid, true);
  assert.strictEqual(validateCommitMessage("fix: resolve null pointer").valid, true);
  assert.strictEqual(validateCommitMessage("refactor: split component").valid, true);
  assert.strictEqual(validateCommitMessage("chore[30.1]: bump dependencies").valid, true);
  assert.strictEqual(validateCommitMessage("fix[US-01]: correct button style").valid, true);

  // 2. Rechaza 'feat'
  const featRes = validateCommitMessage("feat: new provider search");
  assert.strictEqual(featRes.valid, false);
  assert.strictEqual(featRes.reason, "FEAT_TYPE_FORBIDDEN");

  const featUsRes = validateCommitMessage("feat[54]: new provider search");
  assert.strictEqual(featUsRes.valid, false);
  assert.strictEqual(featUsRes.reason, "FEAT_TYPE_FORBIDDEN");

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

  // 1. Mensaje con feat
  const featMsgFile = path.join(repoRoot, "msg-feat.txt");
  await fs.writeFile(featMsgFile, "feat: new component\n", "utf8");
  const featRes = await runCommitMsgHook({ repoRoot, messageFilePath: featMsgFile });
  assert.strictEqual(featRes.passed, false);
  assert.strictEqual(featRes.reason, "FEAT_TYPE_FORBIDDEN");

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

  // 4. Mensaje con US contradictoria a contexto activo
  await saveDeliveryContext({
    repoRoot,
    snapshot: { branch: "main", headSha: "1".repeat(40), snapshotHash: "2".repeat(64) },
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

test("pre-commit hook: bloquea cuando delivery status no es passed", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Sin cambios staged -> status: no_changes (no passed)
  const res = await runPreCommitHook({ repoRoot });
  assert.strictEqual(res.passed, false);
  assert.strictEqual(res.outcome.status, "no_changes");
});

test("post-commit hook: asocia commitSha en el ledger y consume contexto activo", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // 1. Simular evidencia preparada previamente
  await recordPreparedEvidence({
    repoRoot,
    snapshotHash: "a".repeat(64),
    runKey: "b".repeat(64),
    status: "passed",
    recordPath: ".delivery/runtime/runs/test.json",
  });

  // 2. Simular contexto activo
  await saveDeliveryContext({
    repoRoot,
    snapshot: { branch: "main", headSha: "c".repeat(40), snapshotHash: "a".repeat(64) },
    intent: "close_scenario",
  });

  // 3. Crear commit en git
  await fs.writeFile(path.join(repoRoot, "note.txt"), "hello", "utf8");
  execFileSync("git", ["add", "note.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add note"], { cwd: repoRoot });
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();

  // 4. Ejecutar post-commit
  const postRes = await runPostCommitHook({ repoRoot });
  assert.strictEqual(postRes.recorded, true);
  assert.strictEqual(postRes.commitSha, headSha);

  // 5. Verificar que el commit está en el ledger
  const hasEv = await hasCommitEvidence({ repoRoot, commitSha: headSha });
  assert.strictEqual(hasEv, true);
  const ev = await getCommitEvidence({ repoRoot, commitSha: headSha });
  assert.strictEqual(ev.snapshotHash, "a".repeat(64));

  // 6. Verificar que el contexto fue consumido
  const ctx = await loadDeliveryContext({ repoRoot });
  assert.strictEqual(ctx.consumed, true);
});

test("pre-push hook: bloquea multiples commits ('un commit, un push') y verifica evidencia en ledger", async (t) => {
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

  // 2. Pre-push con 1 commit nuevo pero SIN evidencia en el ledger -> bloquea por MISSING_EVIDENCE_IN_LEDGER
  const pushLineSingle = `refs/heads/main ${sha1} refs/heads/main ${baseSha}`;
  const pushResNoEv = await runPrePushHook({ repoRoot, stdinLines: [pushLineSingle] });
  assert.strictEqual(pushResNoEv.passed, false);
  assert.strictEqual(pushResNoEv.reason, "MISSING_EVIDENCE_IN_LEDGER");

  // 3. Registrar evidencia para sha1 -> permite push
  await recordCommitEvidence({
    repoRoot,
    commitSha: sha1,
    snapshotHash: "e".repeat(64),
    recordPath: ".delivery/runtime/runs/test.json",
  });
  const pushResWithEv = await runPrePushHook({ repoRoot, stdinLines: [pushLineSingle] });
  assert.strictEqual(pushResWithEv.passed, true);
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
