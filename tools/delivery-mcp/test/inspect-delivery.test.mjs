import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { inspectDelivery } from "../lib/inspect-delivery.mjs";

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-inspect-test-"));
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }));
  execFileSync("git", ["init", "-b", "main"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: repoRoot });
  execFileSync("git", ["config", "user.email", "tester@example.com"], { cwd: repoRoot });
  execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: repoRoot });

  await fs.mkdir(path.join(repoRoot, ".delivery", "schemas"), { recursive: true });
  for (const schema of [
    "ci-inspection-result.schema.json",
    "delivery-context.schema.json",
    "inspection-result.schema.json",
    "policy.schema.json",
  ]) {
    await fs.copyFile(
      path.join(".delivery", "schemas", schema),
      path.join(repoRoot, ".delivery", "schemas", schema)
    );
  }
  await fs.copyFile(".delivery/policy.v1.json", path.join(repoRoot, ".delivery", "policy.v1.json"));
  await fs.copyFile(".gitignore", path.join(repoRoot, ".gitignore"));
  await fs.writeFile(path.join(repoRoot, "README.md"), "# Initial\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  execFileSync("git", ["commit", "-m", "chore: initial commit"], { cwd: repoRoot });
  return repoRoot;
}

test("inspectDelivery: repair_ci bloquea y conserva el diagnóstico ante ledger corrupto", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  await fs.writeFile(path.join(repoRoot, "repair.txt"), "repair\n", "utf8");
  execFileSync("git", ["add", "repair.txt"], { cwd: repoRoot });
  await fs.mkdir(path.join(repoRoot, ".delivery", "runtime", "ledger"), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, ".delivery", "runtime", "ledger", "not-a-sha.json"),
    "{}\n",
    "utf8"
  );

  const inspection = await inspectDelivery({
    repoRoot,
    intent: "repair_ci",
    repairsSha: "a".repeat(40),
  });

  assert.strictEqual(inspection.result.status, "blocked");
  const diagnostic = inspection.result.diagnostics.find((item) => item.code === "LEDGER_CORRUPT");
  assert.ok(diagnostic, "must expose a compact ledger diagnostic");
  assert.strictEqual(diagnostic.retryable, false);
  assert.ok(diagnostic.message.length <= 280);
  assert.doesNotMatch(diagnostic.message, /at .*\.mjs:\d+/);
});
