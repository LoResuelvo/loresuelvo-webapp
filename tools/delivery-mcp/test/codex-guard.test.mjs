import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  parseCodexHookInput,
  runCodexGuard,
} from "../../../.codex/delivery-guard.mjs";
import { prepareDelivery } from "../lib/prepare-delivery.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-guard-test-"));
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
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });

  return repoRoot;
}

test("runCodexGuard: ignora comandos que no sean git commit", async () => {
  const res1 = await runCodexGuard({ rawCommand: "npm run test" });
  assert.strictEqual(res1.shouldIntercept, false);
  assert.strictEqual(res1.passed, true);

  const res2 = await runCodexGuard({ rawCommand: "git status" });
  assert.strictEqual(res2.shouldIntercept, false);
  assert.strictEqual(res2.passed, true);
});

test("Codex hook: usa la estructura PreToolUse oficial y lee tool_input.command", async () => {
  const config = JSON.parse(await fs.readFile(".codex/hooks.json", "utf8"));
  assert.ok(Array.isArray(config.hooks.PreToolUse));
  assert.strictEqual(config.hooks.PreToolUse[0].matcher, "^Bash$");
  assert.strictEqual(config.hooks.PreToolUse[0].hooks[0].type, "command");

  const parsed = parseCodexHookInput(
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "git commit -m test" } })
  );
  assert.strictEqual(parsed.toolName, "Bash");
  assert.strictEqual(parsed.rawCommand, "git commit -m test");
});

test("runCodexGuard: intercepta git commit y reporta no_changes si no hay cambios staged", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const outcome = await runCodexGuard({
    repoRoot,
    rawCommand: "git commit -m 'docs: update'",
  });

  assert.strictEqual(outcome.shouldIntercept, true);
  assert.strictEqual(outcome.passed, false);
  assert.strictEqual(outcome.status, "no_changes");
});

test("runCodexGuard: aprovecha evidencia en cache sin re-ejecutar cuando snapshot esta verde", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Staged documentation change (Gate NONE, passes without checks)
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Updated Docs\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: repoRoot });

  // 1. First run via prepareDelivery
  const firstPrep = await prepareDelivery({ repoRoot, intent: "prepare_commit" });
  assert.strictEqual(firstPrep.status, "passed");

  // 2. Codex guard intercepts git commit and reuses cached evidence
  const guardOutcome = await runCodexGuard({
    repoRoot,
    rawCommand: "git commit -m 'docs: update docs'",
  });

  assert.strictEqual(guardOutcome.shouldIntercept, true);
  assert.strictEqual(guardOutcome.passed, true);
  assert.strictEqual(guardOutcome.status, "passed");
  assert.strictEqual(guardOutcome.gateId, "NONE");
  assert.strictEqual(guardOutcome.cached, true);
});

test("runCodexGuard: devuelve passed false cuando snapshot esta bloqueado", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // Staged file with unstaged changes in the same file -> status blocked
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Staged Change\n", "utf8");
  execFileSync("git", ["add", "README.md"], { cwd: repoRoot });
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Unstaged Change Conflict\n", "utf8");

  const guardOutcome = await runCodexGuard({
    repoRoot,
    rawCommand: "git commit -m 'docs: conflict'",
  });

  assert.strictEqual(guardOutcome.shouldIntercept, true);
  assert.strictEqual(guardOutcome.passed, false);
  assert.strictEqual(guardOutcome.status, "blocked");
});

test("delivery-guard CLI script: ejecucion de proceso devuelve exit codes correctos", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  // 1. Comando no commit -> exit code 0
  const scriptPath = path.resolve(".codex/delivery-guard.mjs");
  const outIgnore = execFileSync("node", [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "git status" } }),
  });
  assert.strictEqual(outIgnore, "");

  // 2. Comando commit sin staged changes -> decisión estructurada deny
  const deniedOutput = execFileSync("node", [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
    input: JSON.stringify({
      tool_name: "Bash",
      tool_input: { command: "git commit -m 'chore: test'" },
    }),
  });
  const denied = JSON.parse(deniedOutput);
  assert.strictEqual(
    denied.hookSpecificOutput.permissionDecision,
    "deny"
  );
  assert.ok(denied.hookSpecificOutput.permissionDecisionReason.includes("no_changes"));
});
