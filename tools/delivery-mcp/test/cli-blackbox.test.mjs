import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CLI_PATH = path.resolve("tools/delivery-mcp/cli.mjs");

async function createTempGitRepo(t) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "delivery-cli-blackbox-test-"));
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

function runCli(args, options = {}) {
  try {
    const stdout = execFileSync(process.execPath, [CLI_PATH, ...args], {
      encoding: "utf8",
      ...options,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status,
      stdout: err.stdout?.toString("utf8") || "",
      stderr: err.stderr?.toString("utf8") || "",
    };
  }
}

test("cli blackbox: delivery:context set e inspect normal", async (t) => {
  const repoRoot = await createTempGitRepo(t);

  const setResult = runCli(
    [
      "context",
      "--intent",
      "close_scenario",
      "--us-id",
      "US-88",
      "--feature",
      "features/test.feature",
      "--scenario",
      "Scenario 1",
      "--scope",
      "features/test.feature",
    ],
    { cwd: repoRoot }
  );
  assert.strictEqual(setResult.status, 0);
  const setJson = JSON.parse(setResult.stdout);
  assert.strictEqual(setJson.usId, "US-88");
  assert.strictEqual(setJson.intent, "close_scenario");

  const inspectResult = runCli(["context", "--inspect"], { cwd: repoRoot });
  assert.strictEqual(inspectResult.status, 0);
  const inspectJson = JSON.parse(inspectResult.stdout);
  assert.strictEqual(inspectJson.active, true);
  assert.strictEqual(inspectJson.context.usId, "US-88");
  assert.strictEqual(inspectJson.context.featureFile, "features/test.feature");
});

test("cli blackbox: delivery:context propaga y preserva --repairs-sha", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const failedSha = "abcdef0123456789abcdef0123456789abcdef01";

  const setResult = runCli(
    [
      "context",
      "--intent",
      "repair_ci",
      "--repairs-sha",
      failedSha,
    ],
    { cwd: repoRoot }
  );
  assert.strictEqual(setResult.status, 0);
  const setJson = JSON.parse(setResult.stdout);
  assert.strictEqual(setJson.intent, "repair_ci");
  assert.strictEqual(setJson.repairsSha, failedSha);

  const inspectResult = runCli(["context", "--inspect"], { cwd: repoRoot });
  assert.strictEqual(inspectResult.status, 0);
  const inspectJson = JSON.parse(inspectResult.stdout);
  assert.strictEqual(inspectJson.active, true);
  assert.strictEqual(inspectJson.context.repairsSha, failedSha);
});

test("cli blackbox: delivery:verify-head muestra ayuda con --force y ejecuta validación", async (t) => {
  const helpResult = runCli(["verify-head", "--help"]);
  assert.strictEqual(helpResult.status, 0);
  assert.ok(helpResult.stdout.includes("--force"));
  assert.ok(helpResult.stdout.includes("verify-head"));

  const repoRoot = await createTempGitRepo(t);
  const verifyResult = runCli(["verify-head", "--intent", "close_us"], { cwd: repoRoot });
  assert.strictEqual(verifyResult.status, 2);
  const verifyJson = JSON.parse(verifyResult.stdout);
  assert.strictEqual(verifyJson.verified, false);
  assert.strictEqual(verifyJson.status, "blocked");
  assert.strictEqual(verifyJson.reason, "MISSING_SCOPE_FOR_GATE_D");
});

test("cli blackbox: delivery:finalize falla inmediatamente si no hay evidencia de Gate D", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const finalizeResult = runCli(["finalize", "--intent", "close_us"], { cwd: repoRoot });
  assert.strictEqual(finalizeResult.status, 2);
  const finalizeJson = JSON.parse(finalizeResult.stdout);
  assert.strictEqual(finalizeJson.finalized, false);
  assert.strictEqual(finalizeJson.status, "blocked");
});

test("cli blackbox: delivery:finalize con --wait-for-ci respeta flags de timeout y polling", async (t) => {
  const repoRoot = await createTempGitRepo(t);
  const finalizeResult = runCli(
    [
      "finalize",
      "--intent",
      "close_us",
      "--wait-for-ci",
      "--timeout-ms",
      "200",
      "--poll-interval-ms",
      "50",
    ],
    { cwd: repoRoot }
  );
  assert.strictEqual(finalizeResult.status, 2);
  const finalizeJson = JSON.parse(finalizeResult.stdout);
  assert.strictEqual(finalizeJson.finalized, false);
});

test("cli blackbox: argumento inválido produce error compacto y salida estructurada", () => {
  const badResult = runCli(["inspect", "--non-existent-flag", "value"]);
  assert.strictEqual(badResult.status, 1);
  const errJson = JSON.parse(badResult.stdout);
  assert.strictEqual(errJson.status, "blocked");
  assert.strictEqual(errJson.diagnostics[0].code, "DELIVERY_CLI_ERROR");
  assert.ok(errJson.diagnostics[0].message.includes("Unknown option"));
});
