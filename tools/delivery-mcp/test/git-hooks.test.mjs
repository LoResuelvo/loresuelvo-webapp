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
} from "../lib/delivery-ledger.mjs";
import {
  saveDeliveryContext,
  loadDeliveryContext,
} from "../lib/delivery-context.mjs";
import { captureGitSnapshot } from "../lib/git-snapshot.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";

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

test("pre-commit hook: conserva un close_us preparado para el mismo snapshot", async (t) => {
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

  const second = await runPreCommitHook({ repoRoot });
  assert.strictEqual(second.passed, true, JSON.stringify(second, null, 2));
  assert.strictEqual(second.outcome.gate.id, "D");
  assert.strictEqual(second.outcome.cached, true);
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

test("post-commit hook: no asocia evidencia si el árbol cambió después de prepare", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "note.txt"), "prepared", "utf8");
  execFileSync("git", ["add", "note.txt"], { cwd: repoRoot });
  assert.strictEqual((await prepareDelivery({ repoRoot })).status, "passed");

  await fs.writeFile(path.join(repoRoot, "note.txt"), "different committed tree", "utf8");
  execFileSync("git", ["add", "note.txt"], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "docs: add changed note"], { cwd: repoRoot });

  const postRes = await runPostCommitHook({ repoRoot });
  assert.strictEqual(postRes.recorded, false);
  assert.strictEqual(postRes.reason, "PREPARED_EVIDENCE_COMMIT_MISMATCH");
});

test("pre-push hook: bloquea multiples commits y commits sin evidencia exacta", async (t) => {
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

  // 2. Pre-push con 1 commit nuevo pero sin evidencia exacta.
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
